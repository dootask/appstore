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
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/spf13/cobra"
)

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
		v1.GET("/log/:appId", routeAppLog)                    // 获取应用日志
		v1.GET("/asset/:appId/*assetPath", routeAppAsset)     // 查看应用资源
		v1.GET("/download/:appId/*version", routeAppDownload) // 下载应用压缩包

		// 内部使用接口
		internal := v1.Group("/internal")
		{
			internal.POST("/install", routeInternalInstall)           // 安装应用
			internal.GET("/uninstall/:appId", routeInternalUninstall) // 卸载应用
			internal.GET("/installed", routeInternalInstalled)        // 获取已安装应用列表
		}
	}

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

// routeList 获取应用列表
func routeList(c *gin.Context) {
	response.SuccessWithData(c, models.NewApps())
}

// routeAppOne 获取应用详情
func routeAppOne(c *gin.Context) {
	appId := c.Param("appId")
	response.SuccessWithData(c, models.NewApp(appId))
}

// routeAppReadme 获取应用自述文件
func routeAppReadme(c *gin.Context) {
	appId := c.Param("appId")
	response.SuccessWithData(c, gin.H{
		"content": models.GetReadme(appId),
	})
}

// routeAppLog 获取应用日志
func routeAppLog(c *gin.Context) {
	appId := c.Param("appId")
	response.SuccessWithData(c, gin.H{
		"log": models.GetLog(appId, 200),
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

// routeInternalInstall 安装应用
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

// routeInternalUninstall 卸载应用
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

// routeInternalInstalled 获取已安装应用列表
func routeInternalInstalled(c *gin.Context) {
	apps := models.NewApps()
	var resp models.AppInternalInstalledResponse
	for _, app := range apps {
		if app.Config.Status == "installed" {
			resp.Names = append(resp.Names, app.Name)
			resp.Menus = append(resp.Menus, app.MenuItems...)
		}
	}
	response.SuccessWithData(c, resp)
}
