package cmd

import (
	"appstore/server/global"
	"appstore/server/middlewares"
	"appstore/server/models"
	"appstore/server/response"
	"appstore/server/utils"
	"archive/tar"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"slices"
	"strings"

	_ "appstore/server/docs"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/spf13/cobra"
	"github.com/swaggo/files"
	"github.com/swaggo/gin-swagger"
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

// @host      localhost:8080
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
	rootCmd.PersistentFlags().StringVarP(&global.WorkDir, "work-dir", "w", ".", "工作目录路径")
	rootCmd.PersistentFlags().StringVarP(&mode, "mode", "m", global.DefaultMode, "运行模式 (debug/release)")
}

func runPre(*cobra.Command, []string) {
	if mode == global.ModeRelease {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	absPath, err := filepath.Abs(global.WorkDir)
	if err != nil {
		fmt.Printf("转换工作目录路径失败: %v\n", err)
		os.Exit(1)
	}

	if !utils.IsDirExists(absPath) {
		fmt.Printf("工作目录不存在: %s\n", absPath)
		os.Exit(1)
	}

	global.WorkDir = absPath
	fmt.Printf("工作目录: %s\n", global.WorkDir)
}

func runServer(*cobra.Command, []string) {
	// 创建默认的gin路由引擎
	r := gin.Default()

	// 注册语言中间件
	r.Use(middlewares.Middleware())

	// 创建v1路由组
	v1 := r.Group("/api/" + global.APIVersion)
	{
		v1.GET("/list", routeList)                            // 获取应用列表
		v1.GET("/one/:appId", routeAppOne)                    // 获取单个应用
		v1.GET("/readme/:appId", routeAppReadme)              // 获取应用自述文件
		v1.GET("/asset/:appId/*assetPath", routeAppAsset)     // 查看应用资源
		v1.GET("/download/:appId/*version", routeAppDownload) // 下载应用压缩包

		// 内部使用接口
		internal := v1.Group("/internal")
		{
			internal.POST("/install", routeInternalInstall)             // 安装应用
			internal.GET("/uninstall/:appId", routeInternalUninstall)   // 卸载应用
			internal.GET("/installed", routeInternalInstalled)          // 获取已安装应用列表
			internal.GET("/log/:appId", routeInternalLog)               // 获取应用日志
			internal.GET("/apps/update", routeInternalUpdateList)       // 更新应用列表
			internal.POST("/apps/download", routeInternalDownloadByURL) // 通过URL下载应用
		}
	}

	// 添加Swagger文档路由
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// 启动服务器
	err := r.Run(":" + global.DefaultPort)
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
// @Success 200 {object} response.Response{data=[]models.App}
// @Router /list [get]
func routeList(c *gin.Context) {
	response.SuccessWithData(c, models.NewApps())
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
	response.SuccessWithData(c, models.NewApp(appId))
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

// routeAppDownload 处理应用下载请求
func routeAppDownload(c *gin.Context) {
	appId := c.Param("appId")
	versionParam := strings.TrimPrefix(c.Param("version"), "/")

	if appId == "" {
		c.String(http.StatusBadRequest, "App ID 不能为空")
		return
	}
	cleanedAppId := filepath.Clean(appId)
	if cleanedAppId != appId || strings.Contains(cleanedAppId, "..") || strings.Contains(cleanedAppId, "/") || strings.Contains(cleanedAppId, "\\") {
		c.String(http.StatusBadRequest, "无效的App ID")
		return
	}

	appRootPath := filepath.Join(global.WorkDir, "apps", cleanedAppId)
	if !utils.IsDirExists(appRootPath) {
		c.String(http.StatusNotFound, fmt.Sprintf("未找到应用目录: %s", appRootPath))
		return
	}

	var downloadFilename string
	effectiveVersion := versionParam
	versionRegex := regexp.MustCompile(`^v?\d+(\.\d+){1,2}$`)

	if versionParam == "latest" {
		latestV, err := models.FindLatestVersion(cleanedAppId)
		if err != nil {
			c.String(http.StatusNotFound, fmt.Sprintf("无法确定应用 %s 的最新版本: %v", cleanedAppId, err))
			return
		}
		effectiveVersion = latestV
		downloadFilename = fmt.Sprintf("%s-%s.tar.gz", cleanedAppId, effectiveVersion)
	} else if versionParam != "" {
		cleanedVersion := filepath.Clean(effectiveVersion)
		if cleanedVersion != effectiveVersion || strings.Contains(cleanedVersion, "..") || strings.Contains(cleanedVersion, "/") || strings.Contains(cleanedVersion, "\\") || !versionRegex.MatchString(cleanedVersion) {
			c.String(http.StatusBadRequest, "无效或格式错误的版本参数")
			return
		}
		if !utils.IsDirExists(filepath.Join(appRootPath, cleanedVersion)) {
			c.String(http.StatusNotFound, fmt.Sprintf("未找到应用 %s 的指定版本 %s", cleanedAppId, cleanedVersion))
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
			response.ErrorWithDetail(c, global.CodeError, "无法确定应用 "+req.AppID+" 的最新版本", err)
			return
		}
		req.Version = latestV
	}

	// 获取当前应用配置
	appConfig := models.GetAppConfig(req.AppID)

	// 判断当前状态
	if appConfig.Status == "installing" || appConfig.Status == "uninstalling" {
		response.ErrorWithDetail(c, global.CodeError, "应用正在执行中，请稍后再试", nil)
		return
	}

	// 检查是否需要先卸载
	if appConfig.Status == "installed" && appConfig.InstallVersion != "" {
		app := models.NewApp(req.AppID)
		for _, require := range app.RequireUninstalls {
			if utils.CheckVersionRequirement(appConfig.InstallVersion, require.Operator, require.Version) {
				response.ErrorWithDetail(c, global.CodeError, fmt.Sprintf("更新版本 %s，需要先卸载已安装的版本%s", req.Version, require.Reason.(string)), fmt.Errorf(require.Reason.(string)))
				return
			}
		}
	}

	// 创建配置目录
	configDir := filepath.Join(global.WorkDir, "config", req.AppID)
	if err := os.MkdirAll(configDir, 0755); err != nil {
		response.ErrorWithDetail(c, global.CodeError, "创建配置目录失败", err)
		return
	}

	// 更新配置
	appConfig.InstallVersion = req.Version
	appConfig.Params = req.Params
	appConfig.Resources = req.Resources

	// 保存配置到文件
	if err := models.SaveAppConfig(req.AppID, appConfig); err != nil {
		response.ErrorWithDetail(c, global.CodeError, "保存配置失败", err)
		return
	}

	// 生成docker-compose.yml文件
	if err := models.GenerateDockerCompose(req.AppID, req.Version, appConfig); err != nil {
		response.ErrorWithDetail(c, global.CodeError, "生成docker-compose.yml失败", err)
		return
	}

	// 生成nginx配置文件
	if err := models.GenerateNginxConfig(req.AppID, req.Version, appConfig); err != nil {
		response.ErrorWithDetail(c, global.CodeError, "生成nginx配置失败", err)
		return
	}

	// 执行docker-compose up命令
	if err := models.RunDockerCompose(req.AppID, "up"); err != nil {
		response.ErrorWithDetail(c, global.CodeError, "启动应用失败", err)
		return
	}

	response.SuccessWithMsg(c, "应用安装中...")
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
		response.ErrorWithDetail(c, global.CodeError, "应用未安装，无需卸载", nil)
		return
	}

	// 删除nginx配置
	models.DeleteNginxConfig(appId)

	// 执行docker-compose down命令
	if err := models.RunDockerCompose(appId, "down"); err != nil {
		response.ErrorWithDetail(c, global.CodeError, "卸载应用失败", err)
		return
	}

	response.SuccessWithMsg(c, "应用卸载中...")
}

// @Summary 获取已安装应用列表
// @Description 获取所有已安装的应用列表
// @Tags 内部接口
// @Accept json
// @Produce json
// @Success 200 {object} response.Response{data=models.AppInternalInstalledResponse}
// @Router /internal/installed [get]
func routeInternalInstalled(c *gin.Context) {
	apps := models.NewApps()
	var resp models.AppInternalInstalledResponse
	for _, app := range apps {
		if app.Config.Status == "installed" {
			resp.Names = append(resp.Names, app.Name.(string))
			resp.Menus = append(resp.Menus, app.MenuItems...)
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
// @Success 200 {object} response.Response{data=map[string]string}
// @Router /internal/log/{appId} [get]
func routeInternalLog(c *gin.Context) {
	appId := c.Param("appId")
	response.SuccessWithData(c, gin.H{
		"log": models.GetLog(appId, 200),
	})
}

// @Summary 更新应用列表
// @Description 从远程仓库更新应用列表
// @Tags 内部接口
// @Accept json
// @Produce json
// @Success 200 {object} response.Response
// @Router /internal/apps/update [get]
func routeInternalUpdateList(c *gin.Context) {
	// 临时目录
	tempDir := filepath.Join(global.WorkDir, "temp", "sources")
	zipFile := filepath.Join(tempDir, "sources.zip")

	// 清空临时目录
	if utils.IsDirExists(tempDir) {
		if err := os.RemoveAll(tempDir); err != nil {
			response.ErrorWithDetail(c, global.CodeError, "清理临时目录失败", err)
			return
		}
	}
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		response.ErrorWithDetail(c, global.CodeError, "创建临时目录失败", err)
		return
	}

	// 下载源列表
	resp, err := http.Get("https://appstore.dootask.com/sources.list")
	if err != nil {
		response.ErrorWithDetail(c, global.CodeError, "下载源列表失败", err)
		return
	}
	defer resp.Body.Close()

	// 保存zip文件
	zipData, err := io.ReadAll(resp.Body)
	if err != nil {
		response.ErrorWithDetail(c, global.CodeError, "读取下载数据失败", err)
		return
	}
	if err := os.WriteFile(zipFile, zipData, 0644); err != nil {
		response.ErrorWithDetail(c, global.CodeError, "保存zip文件失败", err)
		return
	}

	// 解压文件
	if err := utils.Unzip(zipFile, tempDir); err != nil {
		response.ErrorWithDetail(c, global.CodeError, "解压文件失败", err)
		return
	}
	os.Remove(zipFile)

	// 遍历目录
	entries, err := os.ReadDir(tempDir)
	if err != nil {
		response.ErrorWithDetail(c, global.CodeError, "读取目录失败", err)
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
				"reason": "未找到config.yml配置文件",
			})
			continue
		}

		// 解析配置文件
		configData, err := os.ReadFile(configFile)
		if err != nil {
			results.Failed = append(results.Failed, map[string]string{
				"id":     appId,
				"reason": "读取配置文件失败：" + err.Error(),
			})
			continue
		}

		var config map[string]interface{}
		if err := yaml.Unmarshal(configData, &config); err != nil {
			results.Failed = append(results.Failed, map[string]string{
				"id":     appId,
				"reason": "YAML解析失败：" + err.Error(),
			})
			continue
		}

		// 检查name字段
		if _, ok := config["name"]; !ok {
			results.Failed = append(results.Failed, map[string]string{
				"id":     appId,
				"reason": "配置文件不正确",
			})
			continue
		}

		// 使用目录名作为应用名称
		targetDir := filepath.Join(global.WorkDir, "apps", appId)

		// 复制目录
		if err := utils.CopyDir(sourceDir, targetDir, true); err != nil {
			results.Failed = append(results.Failed, map[string]string{
				"id":     appId,
				"reason": "复制文件失败：" + err.Error(),
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
// @Success 200 {object} response.Response
// @Router /internal/apps/download [post]
func routeInternalDownloadByURL(c *gin.Context) {
	var req models.AppInternalDownloadRequest
	if err := response.CheckBindAndValidate(&req, c); err != nil {
		return
	}

	// 验证URL格式
	if !utils.IsValidURL(req.URL) {
		response.ErrorWithDetail(c, global.CodeError, "URL格式不正确", nil)
		return
	}

	// 验证URL协议
	scheme := utils.GetURLScheme(req.URL)
	if !slices.Contains([]string{"http", "https", "git"}, scheme) {
		response.ErrorWithDetail(c, global.CodeError, "不支持的URL协议，仅支持http、https和git协议", nil)
		return
	}

	// 从URL提取appId
	u, _ := url.Parse(req.URL)
	pathParts := strings.Split(strings.Trim(u.Path, "/"), "/")
	appId := pathParts[len(pathParts)-1]
	if lastDotIndex := strings.LastIndex(appId, "."); lastDotIndex != -1 {
		appId = appId[:lastDotIndex]
	}
	appId = strings.ReplaceAll(appId, ".", "_")
	appId = utils.Camel2Snake(appId)
	if appId == "" {
		response.ErrorWithDetail(c, global.CodeError, "URL格式不正确", nil)
		return
	}

	// 检查appId是否被保护
	if slices.Contains(models.PROTECTED_NAMES, appId) {
		response.ErrorWithDetail(c, global.CodeError, fmt.Sprintf("服务名称 '%s' 被保护，不能使用", appId), nil)
		return
	}

	// 检查目标是否存在
	appConfig := models.GetAppConfig(appId)
	if appConfig != nil {
		errorMessages := map[string]string{
			"installed":    "应用已存在，请先卸载后再安装",
			"installing":   "应用正在安装中，请稍后再试",
			"uninstalling": "应用正在卸载中，请稍后再试",
		}
		if msg, ok := errorMessages[appConfig.Status]; ok {
			response.ErrorWithDetail(c, global.CodeError, msg, nil)
			return
		}
	}

	// 临时目录
	tempDir := filepath.Join(global.WorkDir, "temp", utils.MD5(req.URL))

	// 清空临时目录
	if utils.IsDirExists(tempDir) {
		if err := os.RemoveAll(tempDir); err != nil {
			response.ErrorWithDetail(c, global.CodeError, "清理临时目录失败", err)
			return
		}
	}
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		response.ErrorWithDetail(c, global.CodeError, "创建临时目录失败", err)
		return
	}

	// 判断URL类型
	isGit := strings.HasSuffix(req.URL, ".git") || strings.Contains(req.URL, "github.com") || strings.Contains(req.URL, "gitlab.com")

	// 下载或克隆
	if isGit {
		// 克隆Git仓库
		cmd := exec.Command("git", "clone", "--depth=1", req.URL, tempDir)
		if err := cmd.Run(); err != nil {
			response.ErrorWithDetail(c, global.CodeError, "Git克隆失败", err)
			return
		}
	} else {
		// 下载ZIP文件
		resp, err := http.Get(req.URL)
		if err != nil {
			response.ErrorWithDetail(c, global.CodeError, "下载失败", err)
			return
		}
		defer resp.Body.Close()

		zipFile := filepath.Join(tempDir, "app.zip")
		zipData, err := io.ReadAll(resp.Body)
		if err != nil {
			response.ErrorWithDetail(c, global.CodeError, "读取下载数据失败", err)
			return
		}
		if err := os.WriteFile(zipFile, zipData, 0644); err != nil {
			response.ErrorWithDetail(c, global.CodeError, "保存zip文件失败", err)
			return
		}

		// 解压ZIP文件
		if err := utils.Unzip(zipFile, tempDir); err != nil {
			response.ErrorWithDetail(c, global.CodeError, "解压文件失败", err)
			return
		}
		os.Remove(zipFile)
	}

	// 检查config.yml文件
	configFile := filepath.Join(tempDir, "config.yml")
	if !utils.IsFileExists(configFile) {
		response.ErrorWithDetail(c, global.CodeError, "未找到config.yml配置文件", nil)
		return
	}

	// 解析配置文件
	configData, err := os.ReadFile(configFile)
	if err != nil {
		response.ErrorWithDetail(c, global.CodeError, "读取配置文件失败", err)
		return
	}

	var config map[string]interface{}
	if err := yaml.Unmarshal(configData, &config); err != nil {
		response.ErrorWithDetail(c, global.CodeError, "YAML解析失败："+err.Error(), nil)
		return
	}

	// 检查name字段
	name, ok := config["name"].(string)
	if !ok || name == "" {
		response.ErrorWithDetail(c, global.CodeError, "配置文件不正确", nil)
		return
	}

	// 使用目录名作为应用名称
	targetDir := filepath.Join(global.WorkDir, "apps", appId)

	// 检查目标是否存在
	if utils.IsDirExists(targetDir) {
		os.RemoveAll(targetDir)
	}

	// 移动文件到目标目录
	if err := os.Rename(tempDir, targetDir); err != nil {
		response.ErrorWithDetail(c, global.CodeError, "移动文件失败", err)
		return
	}

	response.SuccessWithData(c, gin.H{
		"id": appId,
	})
}
