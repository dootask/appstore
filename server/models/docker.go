package models

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"appstore/server/global"
	"appstore/server/i18n"
	"appstore/server/utils"

	"gopkg.in/yaml.v3"
)

// ProtectedNames 禁止使用的服务名称
var ProtectedNames = []string{
	"php",
	"nginx",
	"redis",
	"mariadb",
	"appstore",
}

// convertSourcePath 转换源路径
func convertSourcePath(src string, versionPwd string) string {
	var fullPath string
	// 处理源路径
	if strings.HasPrefix(src, "/") {
		// 如果是绝对路径，直接使用
		fullPath = filepath.Join(versionPwd, src)
	} else if strings.HasPrefix(src, "./") {
		// 如果是相对路径，去掉./
		fullPath = filepath.Join(versionPwd, strings.TrimPrefix(src, "./"))
	} else if strings.HasPrefix(src, "../") {
		// 如果是上级目录，保留../
		fullPath = filepath.Join(versionPwd, src)
	} else {
		// 其他情况，直接拼接
		fullPath = filepath.Join(versionPwd, src)
	}

	// 清理路径，移除冗余的分隔符和相对路径引用
	return filepath.Clean(fullPath)
}

// convertVolumePath 转换挂载路径
func convertVolumePath(volume string, versionPwd string) string {
	// 分割源路径和目标路径
	parts := strings.SplitN(volume, ":", 2)
	if len(parts) != 2 {
		return volume
	}

	src := convertSourcePath(parts[0], versionPwd)
	dst := parts[1]

	// 返回转换后的路径
	return fmt.Sprintf("%s:%s", src, dst)
}

// GenerateDockerCompose 生成docker-compose.yml文件
func GenerateDockerCompose(appId string, version string, config *AppConfig) error {
	// 读取应用的docker-compose.yml模板
	templatePath := filepath.Join(global.WorkDir, "apps", appId, version, "docker-compose.yml")
	templateData, err := os.ReadFile(templatePath)
	if err != nil {
		return errors.New(i18n.T("ReadDockerComposeTemplateFailed", err))
	}
	composeData := string(templateData)

	// 处理环境变量
	composeData = strings.ReplaceAll(composeData, "${HOST_PWD}", "")
	composeData = strings.ReplaceAll(composeData, "${PUBLIC_PATH}", "${HOST_PWD}/public")
	if config.Params != nil {
		for key, value := range config.Params {
			composeData = strings.ReplaceAll(composeData, "${"+key+"}", fmt.Sprintf("%v", value))
		}
	}

	// 解析模板
	composeMap := make(map[string]interface{})
	if err = yaml.Unmarshal([]byte(composeData), &composeMap); err != nil {
		return errors.New(i18n.T("ParseDockerComposeTemplateFailed", err))
	}

	// 检查services配置是否存在
	if _, ok := composeMap["services"].(map[string]interface{}); !ok {
		return errors.New(i18n.T("InvalidConfiguration"))
	}

	// 服务名称
	composeMap["name"] = "dootask-app-" + appId

	// 网络名称
	networkName := "dootask-networks-" + os.Getenv("APP_ID")

	// 处理挂载路径
	versionPwd := filepath.Join(global.HostWorkDir, "apps", appId, version)

	// 判断网络是否存在
	if _, err := utils.Execf("docker network inspect " + networkName); err != nil {
		return errors.New(i18n.T("NetworkNotFound", err))
	}

	// 加入网络
	composeMap["networks"] = map[string]interface{}{
		networkName: map[string]interface{}{
			"external": true,
		},
	}

	// 处理服务配置
	for serviceName, service := range composeMap["services"].(map[string]interface{}) {
		serviceMap := service.(map[string]interface{})

		// 检查服务名称是否被保护
		if slices.Contains(ProtectedNames, serviceName) {
			return errors.New(i18n.T("ProtectedServiceName", serviceName))
		}

		// 确保所有服务都有网络配置
		serviceMap["networks"] = []string{networkName}

		// 处理挂载路径
		if serviceMap["volumes"] != nil {
			volumes := serviceMap["volumes"].([]interface{})
			for i, volume := range volumes {
				if volumeMap, ok := volume.(map[string]interface{}); ok {
					// 处理长语法挂载
					if source, ok := volumeMap["source"].(string); ok {
						volumeMap["source"] = convertSourcePath(source, versionPwd)
					}
					volumes[i] = volumeMap
				} else if volumeStr, ok := volume.(string); ok {
					// 处理短语法挂载
					volumes[i] = convertVolumePath(volumeStr, versionPwd)
				}
			}
			serviceMap["volumes"] = volumes
		}

		// 资源限制
		cpus := config.Resources.CPULimit
		memory := config.Resources.MemoryLimit
		if cpus == "" {
			cpus = "0"
		}
		if memory == "" {
			memory = "0"
		}
		serviceMap["deploy"] = map[string]interface{}{
			"resources": map[string]interface{}{
				"limits": map[string]interface{}{
					"cpus":   cpus,
					"memory": memory,
				},
			},
		}

		// 更新服务配置
		composeMap["services"].(map[string]interface{})[serviceName] = serviceMap
	}

	// 生成新的docker-compose.yml
	outputPath := filepath.Join(global.WorkDir, "config", appId, "docker-compose.yml")
	outputData, err := yaml.Marshal(composeMap)
	if err != nil {
		return errors.New(i18n.T("SerializeDockerComposeFailed", err))
	}

	if err := os.WriteFile(outputPath, outputData, 0644); err != nil {
		return errors.New(i18n.T("SaveDockerComposeFailed", err))
	}

	return nil
}

// RunDockerCompose 执行docker-compose up/down命令
func RunDockerCompose(appId, action string) error {
	// 切换到应用配置目录
	configDir := filepath.Join(global.WorkDir, "config", appId)
	if err := os.Chdir(configDir); err != nil {
		return errors.New(i18n.T("ChangeDirectoryFailed", err))
	}

	// 更新状态
	appConfig := GetAppConfig(appId)
	if action == "up" {
		appConfig.Status = "installing"
		appConfig.InstallAt = time.Now().Format("2006-01-02 15:04:05")
		appConfig.InstallNum++
	} else if action == "down" {
		appConfig.Status = "uninstalling"
	}
	if err := SaveAppConfig(appId, appConfig); err != nil {
		return errors.New(i18n.T("UpdateAppStatusFailed", err))
	}

	// 写入日志
	AppLogInfo(appId, action+" starting...")

	// 启动协程
	go func() {
		// 创建带超时的上下文
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
		defer cancel()

		// 执行docker-compose命令
		var cmd *exec.Cmd
		var status string
		if action == "up" {
			cmd = exec.CommandContext(ctx, "docker", "compose", "up", "-d", "--remove-orphans")
			status = "installed"
		} else if action == "down" {
			cmd = exec.CommandContext(ctx, "docker", "compose", "down", "--remove-orphans")
			status = "not_installed"
		} else {
			return
		}

		// 创建管道来捕获输出
		stdout, _ := cmd.StdoutPipe()
		stderr, _ := cmd.StderrPipe()
		if err := cmd.Start(); err != nil {
			AppLogError(appId, "Failed to start command: "+err.Error())
			status = "error"
		} else {
			// 读取并记录输出
			go func() {
				scanner := bufio.NewScanner(stdout)
				for scanner.Scan() {
					AppLogInfo(appId, scanner.Text())
				}
			}()
			go func() {
				scanner := bufio.NewScanner(stderr)
				for scanner.Scan() {
					AppLogWarn(appId, scanner.Text())
				}
			}()

			if err := cmd.Wait(); err != nil {
				if errors.Is(ctx.Err(), context.DeadlineExceeded) {
					AppLogError(appId, "Command execution timeout after 30 minutes")
				} else {
					AppLogError(appId, "Command execution failed: "+err.Error())
				}
				status = "error"
			}
		}

		AppLogInfo(appId, action+" "+status)

		if status == "installed" {
			// 重启nginx
			if hasNginxConfig, _ := HasNginxConfig(appId); hasNginxConfig {
				AppLogInfo(appId, "nginx reload starting...")
				out, err := ReloadNginx(appId, 3)
				if out != "" {
					AppLogInfo(appId, "nginx reload output: "+out)
				}
				if err != nil {
					AppLogError(appId, "nginx reload failed: "+err.Error())
					status = "error"
				}
				AppLogInfo(appId, "nginx reload end")
			}
		}

		// 更新应用状态
		appConfig := GetAppConfig(appId)
		appConfig.Status = status
		if err := SaveAppConfig(appId, appConfig); err != nil {
			AppLogError(appId, "Failed to update application status: "+err.Error())
		}
	}()

	return nil
}

// StartCheckContainerStatusDaemon 启动检测容器状态守护
// - 如果 config.status=installed 且 docker-compose.yml 文件存在时，检查容器不存在则自动启动
// - 每隔10秒检查一次
// - 1分钟内只启动一次
func StartCheckContainerStatusDaemon() {
	configDir := filepath.Join(global.WorkDir, "config")
	lastUpTimes := make(map[string]time.Time) // 记录每个应用最后一次执行 up 命令的时间
	waitTime := 10 * time.Second              // 等待时间

	for {
		// 遍历 configsDir 目录下的所有子目录
		entries, err := os.ReadDir(configDir)
		if err != nil {
			fmt.Printf("[Daemon] Failed to read directory config: %v\n", err)
			time.Sleep(waitTime)
			continue
		}

		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}

			appId := entry.Name()

			// 检查是否在1分钟内执行过
			if lastTime, exists := lastUpTimes[appId]; exists {
				if time.Since(lastTime) < time.Minute {
					continue
				}
			}

			// 检查是否存在 docker-compose.yml 文件
			composeFile := filepath.Join(configDir, appId, "docker-compose.yml")
			if !utils.IsFileExists(composeFile) {
				continue
			}

			// 检查是否运行状态
			appConfig := GetAppConfig(appId)
			if appConfig.Status != "installed" {
				continue
			}

			// 检查容器状态
			stdout, err := utils.Execf("docker compose -f %s ps --format {{.Name}} 2>/dev/null", composeFile)
			if err != nil || strings.TrimSpace(stdout) != "" {
				continue
			}

			// 如果容器不存在，则执行 up 命令
			AppLogInfo(appId, "[Daemon] up starting...")
			stdout, err = utils.Execf("docker compose -f %s up -d --remove-orphans", composeFile)
			if stdout != "" {
				AppLogInfo(appId, "[Daemon] up output: "+stdout)
			}
			if err != nil {
				AppLogError(appId, "[Daemon] up failed")
			} else {
				AppLogInfo(appId, "[Daemon] up successful")
			}

			// 记录每个应用最后一次执行 up 命令的时间
			lastUpTimes[appId] = time.Now()
		}

		time.Sleep(waitTime)
	}
}
