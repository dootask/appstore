package cmd

import (
	"appstore/server/global"
	"appstore/server/i18n"
	"appstore/server/middlewares"
	"appstore/server/models"
	"appstore/server/response"
	"appstore/server/utils"
	"archive/tar"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	_ "appstore/server/docs"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
	"github.com/spf13/cobra"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"gopkg.in/yaml.v3"
)

// @title           DooTask应用商店API
// @version         1.0
// @description     DooTask应用商店后端服务API文档
// @termsOfService  https://www.dootask.com

// @contact.name   DooTask团队
// @contact.url    https://www.dootask.com
// @contact.email  support@dootask.com

// @license.name  MIT
// @license.url   https://opensource.org/licenses/MIT

// @host      localhost
// @BasePath  /api/v1

var (
	mode    string
	rootCmd = &cobra.Command{
		Use:    "appstore",
		Short:  "DooTask应用商店后端服务",
		PreRun: runPre,
		Run:    runServer,
	}
)

func init() {
	rootCmd.PersistentFlags().StringVar(&global.WorkDir, "work-dir", ".", "工作目录路径")
	rootCmd.PersistentFlags().StringVar(&global.HostWorkDir, "host-work-dir", "", "宿主机工作目录路径")
	rootCmd.PersistentFlags().StringVar(&global.EnvFile, "env-file", "", "环境变量文件路径")
	rootCmd.PersistentFlags().StringVar(&global.WebDir, "web-dir", "", "前端静态文件目录")
	rootCmd.PersistentFlags().StringVar(&global.Port, "port", "80", "服务端口")
	rootCmd.PersistentFlags().StringVar(&mode, "mode", "debug", "运行模式 (debug/release/strict)")
}

func runPre(*cobra.Command, []string) {
	// 设置gin模式
	if mode == global.ModeRelease || mode == global.ModeStrict {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	// 加载环境变量
	if global.EnvFile != "" && utils.IsFileExists(global.EnvFile) {
		if err := godotenv.Load(global.EnvFile); err != nil {
			fmt.Printf("加载环境变量失败: %v\n", err)
			os.Exit(1)
		}
		if mode == global.ModeDebug {
			fmt.Printf("环境变量文件: %s\n", global.EnvFile)
		}
	}

	// 转换工作目录路径
	absPath, err := filepath.Abs(global.WorkDir)
	if err != nil {
		fmt.Printf("转换工作目录路径失败: %v\n", err)
		os.Exit(1)
	}

	// 检查工作目录是否存在
	if !utils.IsDirExists(absPath) {
		fmt.Printf("工作目录不存在: %s\n", absPath)
		os.Exit(1)
	}

	// 创建必要子目录
	dirs := []string{"apps", "config", "log", "temp"}
	for _, dir := range dirs {
		if !utils.IsDirExists(filepath.Join(absPath, dir)) {
			if err := os.MkdirAll(filepath.Join(absPath, dir), 0755); err != nil {
				fmt.Printf("创建目录失败: %s\n", err)
				os.Exit(1)
			}
		}
	}

	// 设置工作目录
	global.WorkDir = absPath
	if mode == global.ModeDebug {
		fmt.Printf("工作目录: %s\n", global.WorkDir)
	}
}

func runServer(*cobra.Command, []string) {
	// 创建默认的gin路由引擎
	r := gin.Default()

	// 注册基础中间件
	r.Use(middlewares.BaseMiddleware())

	// 注册静态文件中间件
	r.Use(middlewares.WebStaticMiddleware())

	// 创建v1路由组
	v1 := r.Group("/api/" + global.APIVersion)
	{
		// 中间件控制
		strictMiddleware := middlewares.EmptyMiddleware()
		if mode == global.ModeStrict {
			strictMiddleware = middlewares.DooTaskTokenMiddleware()
		}
		authMiddleware := middlewares.DooTaskTokenMiddleware()
		adminMiddleware := middlewares.DooTaskTokenMiddleware("admin")

		// 严谨模式需要会员
		v1.GET("/list", strictMiddleware, routeList)                                                       // 获取应用列表
		v1.GET("/one/:appId", strictMiddleware, routeAppOne)                                               // 获取单个应用
		v1.GET("/readme/:appId", strictMiddleware, routeAppReadme)                                         // 获取应用自述文件
		v1.Match([]string{"GET", "HEAD"}, "/download/:appId/*version", strictMiddleware, routeAppDownload) // 下载应用压缩包
		v1.Match([]string{"GET", "HEAD"}, "/sources/package", strictMiddleware, routeSourcesPackage)       // 下载应用商店资源包

		// 始终不需要身份
		v1.GET("/asset/:appId/*assetPath", routeAppAsset) // 查看应用资源

		// 内部使用接口
		internal := v1.Group("/internal")
		{
			// 需要管理员
			internal.POST("/install", adminMiddleware, routeInternalInstall)             // 安装应用
			internal.GET("/uninstall/:appId", adminMiddleware, routeInternalUninstall)   // 卸载应用
			internal.GET("/apps/update", adminMiddleware, routeInternalUpdateList)       // 更新应用列表
			internal.POST("/apps/download", adminMiddleware, routeInternalDownloadByURL) // 通过URL下载应用
			internal.POST("/apps/upload", adminMiddleware, routeInternalUpload)          // 上传本地应用

			// 需要会员
			internal.GET("/installed", authMiddleware, routeInternalInstalled) // 获取已安装应用列表
			internal.GET("/log/:appId", authMiddleware, routeInternalLog)      // 获取应用日志
		}
	}

	// 添加Swagger文档路由
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// 添加健康检查路由
	r.GET("/health", routeHealth)

	// 启动检测容器状态守护
	go models.StartCheckContainerStatusDaemon()

	// 启动服务器
	err := r.Run(":" + global.Port)
	if err != nil {
		fmt.Printf("启动服务器失败: %v\n", err)
		os.Exit(1)
	}
}

// Execute 执行命令
func Execute() error {
	global.Validator = validator.New()
	return rootCmd.Execute()
}

// ****************************************************************************
// ****************************************************************************
// ****************************************************************************

// @Summary 获取应用列表
// @Description 获取所有可用的应用列表
// @Tags 应用
// @Accept json
// @Produce json
// @Param appIds query string false "应用ID列表，多个应用ID用逗号分隔"
// @Success 200 {object} response.Response{data=[]models.App}
// @Router /list [get]
func routeList(c *gin.Context) {
	appIds := c.Query("appIds")
	var appIdList []string
	if appIds != "" {
		appIdList = strings.Split(appIds, ",")
	}
	response.SuccessWithData(c, models.NewApps(appIdList))
}

// @Summary 获取应用详情
// @Description 获取指定应用的详细信息
// @Tags 应用
// @Accept json
// @Produce json
// @Param appId path string true "应用ID"
// @Success 200 {object} response.Response{data=models.App}
// @Router /one/{appId} [get]
func routeAppOne(c *gin.Context) {
	appId := c.Param("appId")
	app, err := models.NewApp(appId)
	if err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("GetAppDetailFailed"), err)
		return
	}
	response.SuccessWithData(c, app)
}

// @Summary 获取应用自述文件
// @Description 获取指定应用的README文件内容
// @Tags 应用
// @Accept json
// @Produce json
// @Param appId path string true "应用ID"
// @Success 200 {object} response.Response{data=map[string]string}
// @Router /readme/{appId} [get]
func routeAppReadme(c *gin.Context) {
	appId := c.Param("appId")
	response.SuccessWithData(c, gin.H{
		"content": models.GetReadme(appId),
	})
}

// routeAppDownload 处理应用下载请求
func routeAppDownload(c *gin.Context) {
	appId := c.Param("appId")
	versionParam := strings.TrimPrefix(c.Param("version"), "/")

	if appId == "" {
		c.String(http.StatusBadRequest, i18n.T("AppIdRequired"))
		return
	}
	cleanedAppId := filepath.Clean(appId)
	if cleanedAppId != appId || strings.Contains(cleanedAppId, "..") || strings.Contains(cleanedAppId, "/") || strings.Contains(cleanedAppId, "\\") {
		c.String(http.StatusBadRequest, i18n.T("InvalidAppId"))
		return
	}

	appRootPath := filepath.Join(global.WorkDir, "apps", cleanedAppId)
	if !utils.IsDirExists(appRootPath) {
		c.String(http.StatusNotFound, i18n.T("AppDirectoryNotFound", appRootPath))
		return
	}

	var downloadFilename string
	effectiveVersion := versionParam
	versionRegex := regexp.MustCompile(`^v?\d+(\.\d+){1,2}$`)

	if versionParam == "latest" {
		latestV, err := models.FindLatestVersion(cleanedAppId)
		if err != nil {
			c.String(http.StatusNotFound, i18n.T("CannotDetermineLatestVersion", map[string]interface{}{
				"appId": cleanedAppId,
				"err":   err,
			}))
			return
		}
		effectiveVersion = latestV
		downloadFilename = fmt.Sprintf("%s-%s.tar.gz", cleanedAppId, effectiveVersion)
	} else if versionParam != "" {
		cleanedVersion := filepath.Clean(effectiveVersion)
		if cleanedVersion != effectiveVersion || strings.Contains(cleanedVersion, "..") || strings.Contains(cleanedVersion, "/") || strings.Contains(cleanedVersion, "\\") || !versionRegex.MatchString(cleanedVersion) {
			c.String(http.StatusBadRequest, i18n.T("InvalidVersionFormat"))
			return
		}
		if !utils.IsDirExists(filepath.Join(appRootPath, cleanedVersion)) {
			c.String(http.StatusNotFound, i18n.T("VersionNotFound", map[string]interface{}{
				"appId":   cleanedAppId,
				"version": cleanedVersion,
			}))
			return
		}
		downloadFilename = fmt.Sprintf("%s-%s.tar.gz", cleanedAppId, cleanedVersion)
	} else {
		downloadFilename = fmt.Sprintf("%s.tar.gz", cleanedAppId)
	}

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", downloadFilename))
	c.Header("Content-Type", "application/gzip")
	c.Header("Transfer-Encoding", "chunked")

	if c.Request.Method == "HEAD" {
		c.Status(http.StatusOK)
		return
	}

	gw := gzip.NewWriter(c.Writer)
	defer gw.Close()
	tw := tar.NewWriter(gw)
	defer tw.Close()

	err := filepath.Walk(appRootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(appRootPath, path)
		if err != nil {
			return err
		}
		if relPath == "." {
			return nil
		}

		if effectiveVersion != "" {
			parts := strings.Split(relPath, string(filepath.Separator))
			if len(parts) > 0 && info.IsDir() && versionRegex.MatchString(parts[0]) {
				if parts[0] != effectiveVersion {
					return filepath.SkipDir
				}
			}
		}

		header, err := tar.FileInfoHeader(info, info.Name())
		if err != nil {
			return err
		}
		header.Name = filepath.ToSlash(relPath)

		if err := tw.WriteHeader(header); err != nil {
			return err
		}

		if !info.IsDir() {
			f, err := os.Open(path)
			if err != nil {
				return err
			}
			defer f.Close()
			if _, err := io.Copy(tw, f); err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		fmt.Printf("创建 %s (版本: %s) 的 tar.gz 文件时发生错误: %v\n", cleanedAppId, effectiveVersion, err)
	}
}

// ****************************************************************************
// ****************************************************************************
// ****************************************************************************

// @Summary 安装应用
// @Description 安装或更新应用
// @Tags 内部接口
// @Accept json
// @Produce json
// @Param request body models.AppInternalInstallRequest true "安装参数"
// @Success 200 {object} response.Response
// @Router /internal/install [post]
func routeInternalInstall(c *gin.Context) {
	var req models.AppInternalInstallRequest
	if err := response.CheckBindAndValidate(&req, c); err != nil {
		return
	}

	// 处理latest版本
	if req.Version == "latest" {
		latestV, err := models.FindLatestVersion(req.AppID)
		if err != nil {
			response.ErrorWithDetail(c, global.CodeError, i18n.T("CannotDetermineLatestVersionSingle", req.AppID), err)
			return
		}
		req.Version = latestV
	}

	// 获取当前应用配置
	appConfig := models.GetAppConfig(req.AppID)

	// 判断当前状态
	if appConfig.Status == "installing" || appConfig.Status == "uninstalling" {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("AppIsRunning"), nil)
		return
	}

	// 检查是否需要先卸载
	if appConfig.Status == "installed" && appConfig.InstallVersion != "" {
		app, err := models.NewApp(req.AppID)
		if err != nil {
			response.ErrorWithDetail(c, global.CodeError, i18n.T("GetAppDetailFailed"), err)
			return
		}
		for _, require := range app.RequireUninstalls {
			if utils.CheckVersionRequirement(appConfig.InstallVersion, require.Operator, require.Version) {
				reason := require.Reason.(string)
				message := i18n.T("NeedUninstallBeforeUpdateSingle", req.Version)
				if reason == "" {
					message = i18n.T("NeedUninstallBeforeUpdate", map[string]interface{}{
						"version": req.Version,
						"reason":  reason,
					})
				}
				response.ErrorWithDetail(c, global.CodeError, message, errors.New(reason))
				return
			}
		}
	}

	// 创建配置目录
	configDir := filepath.Join(global.WorkDir, "config", req.AppID)
	if err := os.MkdirAll(configDir, 0755); err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("CreateConfigDirFailed"), err)
		return
	}

	// 更新配置
	appConfig.InstallVersion = req.Version
	appConfig.Params = req.Params
	appConfig.Resources = req.Resources

	// 保存配置到文件
	if err := models.SaveAppConfig(req.AppID, appConfig); err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("SaveConfigFailed"), err)
		return
	}

	// 生成docker-compose.yml文件
	if err := models.GenerateDockerCompose(req.AppID, req.Version, appConfig); err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("GenerateDockerComposeFailed"), err)
		return
	}

	// 生成nginx配置文件
	if err := models.GenerateNginxConfig(req.AppID, req.Version, appConfig); err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("GenerateNginxConfigFailed"), err)
		return
	}

	// 执行docker-compose up命令
	if err := models.RunDockerCompose(req.AppID, "up"); err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("StartAppFailed"), err)
		return
	}

	response.SuccessWithMsg(c, i18n.T("AppInstalling"))
}

// @Summary 卸载应用
// @Description 卸载指定的应用
// @Tags 内部接口
// @Accept json
// @Produce json
// @Param appId path string true "应用ID"
// @Success 200 {object} response.Response
// @Router /internal/uninstall/{appId} [get]
func routeInternalUninstall(c *gin.Context) {
	appId := c.Param("appId")

	// 获取当前应用配置
	appConfig := models.GetAppConfig(appId)

	// 判断当前状态
	if appConfig.Status != "installed" {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("AppNotInstalled"), nil)
		return
	}

	// 删除nginx配置
	models.DeleteNginxConfig(appId)

	// 执行docker-compose down命令
	if err := models.RunDockerCompose(appId, "down"); err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("UninstallAppFailed"), err)
		return
	}

	response.SuccessWithMsg(c, i18n.T("AppUninstalling"))
}

// @Summary 获取已安装应用列表
// @Description 获取所有已安装的应用列表
// @Tags 内部接口
// @Accept json
// @Produce json
// @Success 200 {object} response.Response{data=[]models.AppInternalInstalledResponse}
// @Router /internal/installed [get]
func routeInternalInstalled(c *gin.Context) {
	apps := models.NewApps(nil)
	resp := []models.AppInternalInstalledResponse{}
	for _, app := range apps {
		if app.Config.Status == "installed" {
			resp = append(resp, models.AppInternalInstalledResponse{
				ID:        app.ID,
				MenuItems: app.MenuItems,
			})
		}
	}
	response.SuccessWithData(c, resp)
}

// @Summary 获取应用日志
// @Description 获取指定应用的运行日志
// @Tags 内部接口
// @Accept json
// @Produce json
// @Param appId path string true "应用ID"
// @Param n query int false "行数" default(200) minimum(1) maximum(2000)
// @Success 200 {object} response.Response{data=map[string]string}
// @Router /internal/log/{appId} [get]
func routeInternalLog(c *gin.Context) {
	appId := c.Param("appId")
	n, err := strconv.Atoi(c.Query("n"))
	if err != nil || n <= 0 {
		n = 200
	}
	if n > 2000 {
		n = 2000
	}
	log, err := models.GetAppLog(appId, n)
	if err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("OpenLogFileFailed", err.Error()), err)
		return
	}
	response.SuccessWithData(c, gin.H{
		"log": strings.Join(log, "\n"),
	})
}

// @Summary 更新应用列表
// @Description 从远程仓库更新应用列表，给 DooTask 内部应用商店使用
// @Tags 内部接口
// @Accept json
// @Produce json
// @Success 200 {object} response.Response
// @Router /internal/apps/update [get]
func routeInternalUpdateList(c *gin.Context) {
	// 临时目录
	tempDir := filepath.Join(global.WorkDir, "temp", "sources")
	tarFile := filepath.Join(tempDir, "sources.tar.gz")

	// 清空临时目录
	if utils.IsDirExists(tempDir) {
		if err := os.RemoveAll(tempDir); err != nil {
			response.ErrorWithDetail(c, global.CodeError, i18n.T("CleanTempDirFailed"), err)
			return
		}
	}
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("CreateTempDirFailed"), err)
		return
	}

	// 下载源列表
	resp, err := http.Get("https://appstore.dootask.com/api/v1/sources/package")
	if err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("DownloadSourceListFailed"), err)
		return
	}
	defer resp.Body.Close()

	// 保存tar.gz文件
	tarData, err := io.ReadAll(resp.Body)
	if err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("ReadDownloadDataFailed"), err)
		return
	}
	if err := os.WriteFile(tarFile, tarData, 0644); err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("SaveTarFileFailed"), err)
		return
	}

	// 解压tar.gz文件
	if err := utils.UnTarGz(tarFile, tempDir); err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("ExtractFileFailed"), err)
		return
	}
	os.Remove(tarFile)

	// 遍历目录
	entries, err := os.ReadDir(tempDir)
	if err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("ReadDirectoryFailed"), err)
		return
	}

	results := struct {
		Success []map[string]string `json:"success"`
		Failed  []map[string]string `json:"failed"`
	}{
		Success: make([]map[string]string, 0),
		Failed:  make([]map[string]string, 0),
	}

	for _, entry := range entries {
		// 跳过当前目录、父目录和隐藏文件
		if entry.Name() == "." || entry.Name() == ".." || strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		appId := entry.Name()
		sourceDir := filepath.Join(tempDir, appId)
		if !entry.IsDir() {
			continue
		}

		// 检查config.yml文件
		configFile := filepath.Join(sourceDir, "config.yml")
		if !utils.IsFileExists(configFile) {
			results.Failed = append(results.Failed, map[string]string{
				"id":     appId,
				"reason": i18n.T("ConfigYmlNotFound"),
			})
			continue
		}

		// 解析配置文件
		configData, err := os.ReadFile(configFile)
		if err != nil {
			results.Failed = append(results.Failed, map[string]string{
				"id":     appId,
				"reason": i18n.T("ReadConfigFailed", err.Error()),
			})
			continue
		}

		var config map[string]interface{}
		if err := yaml.Unmarshal(configData, &config); err != nil {
			results.Failed = append(results.Failed, map[string]string{
				"id":     appId,
				"reason": i18n.T("YamlParseFailed", err.Error()),
			})
			continue
		}

		// 检查name字段
		if _, ok := config["name"]; !ok {
			results.Failed = append(results.Failed, map[string]string{
				"id":     appId,
				"reason": i18n.T("InvalidConfig"),
			})
			continue
		}

		// 使用目录名作为应用名称
		targetDir := filepath.Join(global.WorkDir, "apps", appId)

		// 复制目录
		if err := utils.CopyDir(sourceDir, targetDir, true); err != nil {
			results.Failed = append(results.Failed, map[string]string{
				"id":     appId,
				"reason": i18n.T("CopyFileFailed", err.Error()),
			})
			continue
		}

		results.Success = append(results.Success, map[string]string{
			"id": appId,
		})
	}

	// 清理临时目录
	os.RemoveAll(tempDir)

	response.SuccessWithData(c, results)
}

// @Summary 通过URL下载应用
// @Description 通过URL下载并安装应用
// @Tags 内部接口
// @Accept json
// @Produce json
// @Param request body models.AppInternalDownloadRequest true "下载参数"
// @Success 200 {object} response.Response{data=map[string]string}
// @Router /internal/apps/download [post]
func routeInternalDownloadByURL(c *gin.Context) {
	var req models.AppInternalDownloadRequest
	if err := response.CheckBindAndValidate(&req, c); err != nil {
		return
	}

	// 验证URL格式
	if !utils.IsValidURL(req.URL) {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("InvalidUrlFormat"), nil)
		return
	}

	// 验证URL协议
	scheme := utils.GetURLScheme(req.URL)
	if !slices.Contains([]string{"http", "https", "git"}, scheme) {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("InvalidUrlScheme"), nil)
		return
	}

	// 从表单提取appid，留空则从URL自动提取
	appId := req.AppID
	if appId == "" {
		appId = models.ExtractAppId(req.URL)
	}
	if appId == "" {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("InvalidUrlFormat"), nil)
		return
	}

	// 创建临时目录
	tempDir, stderr, err := models.GenerateTempAppDir(appId, req.URL)
	if tempDir == "" {
		response.ErrorWithDetail(c, global.CodeError, stderr, err)
		return
	}

	// 判断URL类型
	isGit := strings.HasSuffix(req.URL, ".git") || strings.Contains(req.URL, "github.com") || strings.Contains(req.URL, "gitlab.com")

	// 下载或克隆
	if isGit {
		// 克隆Git仓库
		cmd := exec.Command("git", "clone", "--depth=1", req.URL, tempDir)
		if err := cmd.Run(); err != nil {
			response.ErrorWithDetail(c, global.CodeError, i18n.T("GitCloneFailed"), err)
			return
		}
	} else {
		// 下载文件
		resp, err := http.Get(req.URL)
		if err != nil {
			response.ErrorWithDetail(c, global.CodeError, i18n.T("DownloadFailed"), err)
			return
		}
		defer resp.Body.Close()

		// 保存下载的文件
		downloadFile := filepath.Join(tempDir, "app.download")
		fileData, err := io.ReadAll(resp.Body)
		if err != nil {
			response.ErrorWithDetail(c, global.CodeError, i18n.T("ReadDownloadDataFailed"), err)
			return
		}
		if err := os.WriteFile(downloadFile, fileData, 0644); err != nil {
			response.ErrorWithDetail(c, global.CodeError, i18n.T("SaveFileFailed"), err)
			return
		}

		// 检测文件类型并解压
		output, stderr, err := models.CheckFileTypeAndUnzip(downloadFile, tempDir)
		if output == "" {
			response.ErrorWithDetail(c, global.CodeError, stderr, err)
			return
		}
	}

	// 检查应用是否符合要求
	output, stderr, err := models.CheckAppCompliance(appId, tempDir)
	if output == "" {
		response.ErrorWithDetail(c, global.CodeError, stderr, err)
		return
	}

	// 输出结果
	response.SuccessWithData(c, gin.H{
		"id": appId,
	})
}

// @Summary 上传本地应用
// @Description 上传本地应用
// @Tags 内部接口
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "应用文件"
// @Param appid formData string false "应用ID，留空则从文件名自动提取"
// @Success 200 {object} response.Response{data=map[string]string}
// @Router /internal/apps/upload [post]
func routeInternalUpload(c *gin.Context) {
	// 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("UploadFileFailed"), err)
		return
	}

	// 从表单提取appid，留空则从文件名自动提取
	appId := c.PostForm("appid")
	if appId == "" {
		appId = models.ExtractAppId(file.Filename)
	}
	if appId == "" {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("InvalidUrlFormat"), nil)
		return
	}

	// 创建临时目录
	tempDir, stderr, err := models.GenerateTempAppDir(appId, file.Filename)
	if tempDir == "" {
		response.ErrorWithDetail(c, global.CodeError, stderr, err)
		return
	}

	// 保存文件
	filePath := filepath.Join(tempDir, file.Filename)
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		response.ErrorWithDetail(c, global.CodeError, i18n.T("SaveFileFailed"), err)
		return
	}

	// 检查文件类型并解压
	output, stderr, err := models.CheckFileTypeAndUnzip(filePath, tempDir)
	if output == "" {
		response.ErrorWithDetail(c, global.CodeError, stderr, err)
		return
	}

	// 检查应用是否符合要求
	output, stderr, err = models.CheckAppCompliance(appId, tempDir)
	if output == "" {
		response.ErrorWithDetail(c, global.CodeError, stderr, err)
		return
	}

	// 输出结果
	response.SuccessWithData(c, gin.H{
		"id": appId,
	})
}

// @Summary 应用商店源列表
// @Description 获取应用商店源列表压缩包
// @Tags 资源
// @Accept json
// @Produce application/gzip
// @Success 200 {file} binary "sources.tar.gz"
// @Router /sources/package [get]
func routeSourcesPackage(c *gin.Context) {
	// 获取当前日期作为文件名
	currentDate := time.Now().Format("20060102")
	sourcesDir := filepath.Join(global.WorkDir, "temp", "sources_package")
	tarFile := filepath.Join(sourcesDir, currentDate+".tar.gz")

	// 设置响应头
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", "attachment; filename=sources.tar.gz")
	c.Header("Content-Type", "application/gzip")
	if c.Request.Method == "HEAD" {
		c.Status(http.StatusOK)
		return
	}

	// 如果文件已存在，直接下载
	if utils.IsFileExists(tarFile) {
		c.File(tarFile)
		return
	}

	// 获取apps目录
	appsDir := filepath.Join(global.WorkDir, "apps")
	if !utils.IsDirExists(appsDir) {
		c.String(http.StatusInternalServerError, i18n.T("AppsDirNotFound"))
		return
	}

	// 获取所有子目录
	appIds, err := utils.GetSubDirs(appsDir)
	if err != nil {
		c.String(http.StatusInternalServerError, i18n.T("GetAppListFailed"))
		return
	}

	// 清空并创建临时目录
	if utils.IsDirExists(sourcesDir) {
		if err := os.RemoveAll(sourcesDir); err != nil {
			c.String(http.StatusInternalServerError, i18n.T("CleanTempDirFailed"))
			return
		}
	}
	if err := os.MkdirAll(sourcesDir, 0755); err != nil {
		c.String(http.StatusInternalServerError, i18n.T("CreateTempDirFailed"))
		return
	}

	// 创建tar.gz文件
	file, err := os.Create(tarFile)
	if err != nil {
		c.String(http.StatusInternalServerError, i18n.T("CreateZipFileFailed"))
		return
	}
	defer file.Close()

	// 创建gzip写入器
	gw := gzip.NewWriter(file)
	defer gw.Close()

	// 创建tar写入器
	tw := tar.NewWriter(gw)
	defer tw.Close()

	// 遍历每个应用目录
	for _, appId := range appIds {
		appDir := filepath.Join(appsDir, appId)
		err := filepath.Walk(appDir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			// 获取相对路径
			relPath, err := filepath.Rel(appsDir, path)
			if err != nil {
				return err
			}

			// 创建tar文件头
			header, err := tar.FileInfoHeader(info, info.Name())
			if err != nil {
				return err
			}
			header.Name = filepath.ToSlash(relPath)

			// 写入文件头
			if err := tw.WriteHeader(header); err != nil {
				return err
			}

			// 如果是目录，跳过写入内容
			if info.IsDir() {
				return nil
			}

			// 如果是文件，写入文件内容
			file, err := os.Open(path)
			if err != nil {
				return err
			}
			defer file.Close()

			_, err = io.Copy(tw, file)
			return err
		})

		if err != nil {
			c.String(http.StatusInternalServerError, i18n.T("PackageFileFailed"))
			return
		}
	}

	// 发送文件
	c.File(tarFile)
}

// routeAppAsset 处理应用资源请求
func routeAppAsset(c *gin.Context) {
	appId := c.Param("appId")
	assetPath := c.Param("assetPath")
	filePath, err := models.FindAsset(appId, assetPath)
	if err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}
	c.File(filePath)
}

// routeHealth 健康检查
func routeHealth(c *gin.Context) {
	c.String(http.StatusOK, "ok")
}
