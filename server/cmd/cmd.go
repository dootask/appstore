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
		v1.GET("/icon/:appId/*iconPath", routeAppIcon)        // 查看应用图标
		v1.GET("/download/:appId/*version", routeAppDownload) // 下载应用压缩包
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

// routeAppIcon 处理应用图标请求
func routeAppIcon(c *gin.Context) {
	appId := c.Param("appId")
	iconPath := strings.TrimPrefix(c.Param("iconPath"), "/")

	if appId == "" || iconPath == "" {
		c.String(http.StatusBadRequest, "App ID and icon path are required")
		return
	}

	cleanedAppId := filepath.Clean(appId)
	cleanedIconPath := filepath.Clean(iconPath)

	if cleanedAppId != appId || strings.Contains(cleanedAppId, "..") || strings.Contains(cleanedAppId, "/") || strings.Contains(cleanedAppId, "\\") {
		c.String(http.StatusBadRequest, "Invalid App ID")
		return
	}

	if strings.Contains(cleanedIconPath, "..") || filepath.IsAbs(cleanedIconPath) {
		c.String(http.StatusBadRequest, "Invalid icon path")
		return
	}

	iconFullPath := filepath.Join(global.WorkDir, "apps", cleanedAppId, cleanedIconPath)

	if _, err := os.Stat(iconFullPath); os.IsNotExist(err) {
		c.String(http.StatusNotFound, "Icon not found")
		return
	}

	c.File(iconFullPath)
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
		latestV, err := models.FindLatestVersionForApp(cleanedAppId)
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
		if relPath == "." { // 跳过根目录
			return nil
		}

		// 当指定了版本时，只保留非版本目录的文件和指定版本的目录
		if effectiveVersion != "" {
			// 判断是否为版本目录
			parts := strings.Split(relPath, string(filepath.Separator))
			if len(parts) > 0 && info.IsDir() && versionRegex.MatchString(parts[0]) {
				// 如果是版本目录，但不是指定的版本，则跳过
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
