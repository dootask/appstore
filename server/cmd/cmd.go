package cmd

import (
	"archive/tar"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"appstore/server/global"
	"appstore/server/middlewares"
	"appstore/server/models"
	"appstore/server/response"
	"appstore/server/utils"

	"github.com/gin-gonic/gin"
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
			internal.GET("/install", routeInternalInstall)     // 安装应用
			internal.GET("/uninstall", routeInternalUninstall) // 卸载应用
			internal.GET("/installed", routeInternalInstalled) // 获取已安装应用列表
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
		c.String(http.StatusBadRequest, "App ID is required")
		return
	}
	cleanedAppId := filepath.Clean(appId)
	if cleanedAppId != appId || strings.Contains(cleanedAppId, "..") || strings.Contains(cleanedAppId, "/") || strings.Contains(cleanedAppId, "\\") {
		c.String(http.StatusBadRequest, "Invalid App ID")
		return
	}

	appRootPath := filepath.Join(global.WorkDir, "apps", cleanedAppId)
	if !utils.IsDirExists(appRootPath) {
		c.String(http.StatusNotFound, fmt.Sprintf("Application directory not found: %s", appRootPath))
		return
	}

	var downloadFilename string
	effectiveVersion := versionParam
	versionRegex := regexp.MustCompile(`^v?\d+(\.\d+){1,2}$`)

	if versionParam == "latest" {
		latestV, err := models.FindLatestVersion(cleanedAppId)
		if err != nil {
			c.String(http.StatusNotFound, fmt.Sprintf("Could not determine latest version for %s: %v", cleanedAppId, err))
			return
		}
		effectiveVersion = latestV
		downloadFilename = fmt.Sprintf("%s-%s.tar.gz", cleanedAppId, effectiveVersion)
	} else if versionParam != "" {
		cleanedVersion := filepath.Clean(effectiveVersion)
		if cleanedVersion != effectiveVersion || strings.Contains(cleanedVersion, "..") || strings.Contains(cleanedVersion, "/") || strings.Contains(cleanedVersion, "\\") || !versionRegex.MatchString(cleanedVersion) {
			c.String(http.StatusBadRequest, "Invalid or malformed version parameter")
			return
		}
		if !utils.IsDirExists(filepath.Join(appRootPath, cleanedVersion)) {
			c.String(http.StatusNotFound, fmt.Sprintf("Specified version %s not found for app %s", cleanedVersion, cleanedAppId))
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
		fmt.Printf("Error during tar.gz creation for %s (version: %s): %v\n", cleanedAppId, effectiveVersion, err)
	}
}

// ****************************************************************************
// ****************************************************************************
// ****************************************************************************

func routeInternalInstall(c *gin.Context) {
	c.String(http.StatusOK, "Hello, World!")
}

func routeInternalUninstall(c *gin.Context) {
	c.String(http.StatusOK, "Hello, World!")
}

func routeInternalInstalled(c *gin.Context) {
	c.String(http.StatusOK, "Hello, World!")
}
