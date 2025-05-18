package cmd

import (
	"fmt"
	"os"
	"path/filepath"

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

	response.SuccessWithData(c, apps)
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
	}

	// 启动服务器
	fmt.Printf("服务器启动在 http://localhost:%s (模式: %s)\n", global.DefaultPort, gin.Mode())
	r.Run(":" + global.DefaultPort)
}

// Execute 执行命令
func Execute() error {
	return rootCmd.Execute()
}
