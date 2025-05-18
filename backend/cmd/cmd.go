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
	"sort"
	"strings"

	"appstore/backend/global"
	"appstore/backend/middlewares"
	"appstore/backend/models"
	"appstore/backend/response"
	"appstore/backend/utils"

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

func runPre(cmd *cobra.Command, args []string) {
	// 设置gin运行模式
	if mode == global.ModeRelease {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	// 转换为绝对路径
	absPath, err := filepath.Abs(global.WorkDir)
	if err != nil {
		fmt.Printf("转换工作目录路径失败: %v\n", err)
		os.Exit(1)
	}

	// 检查目录是否存在
	if !utils.IsDirExists(absPath) {
		fmt.Printf("工作目录不存在: %s\n", absPath)
		os.Exit(1)
	}

	// 更新工作目录为绝对路径
	global.WorkDir = absPath
	fmt.Printf("工作目录: %s\n", global.WorkDir)
}

// findLatestVersion determines the latest version from a given app's directory.
// It reuses the logic from models.findVersions internally for consistency.
func findLatestVersionForApp(appId string) (string, error) {
	appRootPath := utils.JoinPath(global.WorkDir, "apps", appId)
	if !utils.IsDirExists(appRootPath) {
		return "", fmt.Errorf("application directory for %s not found", appId)
	}
	versions := []string{}
	versionRegex := regexp.MustCompile(`^v?\d+(\.\d+){1,2}$`)
	entries, err := os.ReadDir(appRootPath)
	if err != nil {
		return "", err
	}
	for _, entry := range entries {
		if entry.IsDir() {
			dirName := entry.Name()
			if versionRegex.MatchString(dirName) {
				composePath := filepath.Join(appRootPath, dirName, "docker-compose.yml")
				if _, err := os.Stat(composePath); err == nil {
					versions = append(versions, dirName)
				}
			}
		}
	}
	if len(versions) == 0 {
		return "", fmt.Errorf("no valid versions found for app %s", appId)
	}
	sort.Strings(versions)
	return versions[len(versions)-1], nil
}

func getAppsFromDir() ([]*models.App, error) {
	appsParentDir := utils.JoinPath(global.WorkDir, "apps")

	// 检查apps目录是否存在
	if !utils.IsDirExists(appsParentDir) {
		return nil, fmt.Errorf("apps目录不存在: %s", appsParentDir)
	}

	// 获取所有子目录 (即每个app的目录名，也就是appID)
	appIDs, err := utils.GetSubDirs(appsParentDir)
	if err != nil {
		return nil, err
	}

	// 转换为App对象
	var apps []*models.App
	for _, appID := range appIDs {
		appDir := utils.JoinPath(appsParentDir, appID)
		apps = append(apps, models.NewApp(appID, appDir))
	}

	return apps, nil
}

func routeList(c *gin.Context) {
	apps, err := getAppsFromDir()
	if err != nil {
		response.ErrorWithDetail(c, global.CodeError, "获取应用列表失败", err)
		return
	}

	// Determine scheme and host for full URLs
	scheme := "http"
	if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	host := c.Request.Host

	// Update Icon paths to be full URLs
	for _, app := range apps {
		if app.Icon != "" {
			app.Icon = fmt.Sprintf("%s://%s%s", scheme, host, app.Icon)
		}
		if app.DownloadURL != "" {
			app.DownloadURL = fmt.Sprintf("%s://%s%s", scheme, host, app.DownloadURL)
		}
	}

	response.SuccessWithData(c, apps)
}

// routeAppIcon handles requests for serving application icons.
func routeAppIcon(c *gin.Context) {
	appId := c.Param("appId")
	iconFilename := c.Param("iconFilename")

	// Basic validation for empty parameters
	if appId == "" || iconFilename == "" {
		c.String(http.StatusBadRequest, "App ID and icon filename are required")
		return
	}

	// Security: Clean and validate path components to prevent path traversal.
	// filepath.Clean resolves ".." but we also explicitly forbid "..".
	cleanedAppId := filepath.Clean(appId)
	cleanedIconFilename := filepath.Clean(iconFilename)

	if cleanedAppId != appId || strings.Contains(cleanedAppId, "..") || strings.Contains(cleanedAppId, "/") || strings.Contains(cleanedAppId, "\\") ||
		cleanedIconFilename != iconFilename || strings.Contains(cleanedIconFilename, "..") || strings.Contains(cleanedIconFilename, "/") || strings.Contains(cleanedIconFilename, "\\") {
		c.String(http.StatusBadRequest, "Invalid path components")
		return
	}

	// Construct the full path to the icon file.
	// Example: /path/to/workdir/apps/app1/logo.svg
	iconPath := utils.JoinPath(global.WorkDir, "apps", cleanedAppId, cleanedIconFilename)

	// Check if the file exists before attempting to serve it.
	if _, err := os.Stat(iconPath); os.IsNotExist(err) {
		c.String(http.StatusNotFound, "Icon not found")
		return
	}

	// Serve the file. Gin's c.File() automatically sets the Content-Type header.
	c.File(iconPath)
}

// routeAppDownload handles requests for downloading an application's directory as tar.gz.
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

	appRootPath := utils.JoinPath(global.WorkDir, "apps", cleanedAppId)
	if !utils.IsDirExists(appRootPath) {
		c.String(http.StatusNotFound, fmt.Sprintf("Application directory not found: %s", appRootPath))
		return
	}

	var downloadFilename string
	var effectiveVersion string = versionParam                // This is the version string we intend to include, or empty for all
	versionRegex := regexp.MustCompile(`^v?\d+(\.\d+){1,2}$`) // For identifying version dirs

	if versionParam == "latest" {
		latestV, err := findLatestVersionForApp(cleanedAppId)
		if err != nil {
			c.String(http.StatusNotFound, fmt.Sprintf("Could not determine latest version for %s: %v", cleanedAppId, err))
			return
		}
		effectiveVersion = latestV
		downloadFilename = fmt.Sprintf("%s-%s.tar.gz", cleanedAppId, effectiveVersion)
	} else if versionParam != "" { // Specific version provided
		// Validate the user-provided version string format if it's not 'latest'
		cleanedVersion := filepath.Clean(effectiveVersion)
		if cleanedVersion != effectiveVersion || strings.Contains(cleanedVersion, "..") || strings.Contains(cleanedVersion, "/") || strings.Contains(cleanedVersion, "\\") || !versionRegex.MatchString(cleanedVersion) {
			c.String(http.StatusBadRequest, "Invalid or malformed version parameter")
			return
		}
		// Check if this specific version directory exists
		if !utils.IsDirExists(utils.JoinPath(appRootPath, cleanedVersion)) {
			c.String(http.StatusNotFound, fmt.Sprintf("Specified version %s not found for app %s", cleanedVersion, cleanedAppId))
			return
		}
		downloadFilename = fmt.Sprintf("%s-%s.tar.gz", cleanedAppId, cleanedVersion)
	} else { // No version provided, download all
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
		if relPath == "." { // Skip the root directory itself
			return nil
		}

		// 判断是否包含此路径
		if effectiveVersion != "" { // 指定版本（或latest）的情况
			// 我们不需要单独使用isCurrentVersionDir变量，直接在条件判断中使用

			// 判断是否为其他版本目录（如果是目录且符合版本格式但不是当前指定版本）
			versionRegex := regexp.MustCompile(`^v?\d+(\.\d+){1,2}$`)
			parts := strings.Split(relPath, string(filepath.Separator))
			isOtherVersionDir := false

			if len(parts) > 0 && info.IsDir() && versionRegex.MatchString(parts[0]) && parts[0] != effectiveVersion {
				isOtherVersionDir = true
			}

			// 跳过其他版本目录，但包含当前版本目录和非版本目录的文件
			if isOtherVersionDir {
				return filepath.SkipDir // 跳过其他版本目录
			}
		} // 如果没有指定版本，包含所有文件（默认行为）

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

func runServer(cmd *cobra.Command, args []string) {
	// 创建默认的gin路由引擎
	r := gin.Default()

	// 注册语言中间件
	r.Use(middlewares.LanguageMiddleware())

	// 创建v1路由组
	v1 := r.Group("/api/" + global.APIVersion)
	{
		// 获取应用列表
		v1.GET("/list", routeList)
		v1.GET("/icons/:appId/:iconFilename", routeAppIcon)
		// Consolidated download route using a catch-all for version
		v1.GET("/apps/:appId/download/*version", routeAppDownload)
	}

	// 启动服务器
	fmt.Printf("服务器启动在 http://localhost:%s (模式: %s)\n", global.DefaultPort, gin.Mode())
	r.Run(":" + global.DefaultPort)
}

// Execute 执行命令
func Execute() error {
	return rootCmd.Execute()
}
