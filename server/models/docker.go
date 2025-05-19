package models

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"appstore/server/global"
	"appstore/server/utils"

	"gopkg.in/yaml.v3"
)

// ProtectedNames 禁止使用的服务名称
var ProtectedNames = []string{
	"php",
	"nginx",
	"redis",
	"mariadb",
	"search",
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
		return fmt.Errorf("读取docker-compose模板失败: %v", err)
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
		return fmt.Errorf("解析docker-compose模板失败: %v", err)
	}

	// 检查services配置是否存在
	if _, ok := composeMap["services"].(map[string]interface{}); !ok {
		return fmt.Errorf("配置无效")
	}

	// 服务名称
	composeMap["name"] = "dootask-app-" + appId

	// 网络名称
	networkName := "dootask-networks-" + os.Getenv("APP_ID")

	// 处理挂载路径
	versionPwd := fmt.Sprintf("${HOST_PWD}/docker/appstore/apps/%s/%s", appId, version)

	// 判断网络是否存在
	if _, err := utils.Execf("docker network inspect " + networkName); err != nil {
		return fmt.Errorf("网络不存在: %v", err)
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
			return fmt.Errorf("服务名称 '%s' 被保护，不能使用", serviceName)
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
		return fmt.Errorf("序列化docker-compose配置失败: %v", err)
	}

	if err := os.WriteFile(outputPath, outputData, 0644); err != nil {
		return fmt.Errorf("保存docker-compose配置失败: %v", err)
	}

	return nil
}

// RunDockerCompose 执行docker-compose up/down命令
func RunDockerCompose(appId, action string) error {
	// 切换到应用配置目录
	configDir := filepath.Join(global.WorkDir, "config", appId)
	if err := os.Chdir(configDir); err != nil {
		return fmt.Errorf("切换目录失败: %v", err)
	}

	// 日志文件
	logPath := filepath.Join(global.WorkDir, "log", appId+".log")
	logFile, err := os.OpenFile(logPath, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		return fmt.Errorf("打开日志文件失败: %v", err)
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
		return fmt.Errorf("更新应用状态失败: %v", err)
	}

	// 写入日志
	_, _ = logFile.WriteString("\n[" + time.Now().Format("2006-01-02 15:04:05") + "]\n")
	_, _ = logFile.WriteString(action + " starting...\n")

	// 启动协程
	go func() {
		defer logFile.Close()

		// 执行docker-compose命令
		var cmd *exec.Cmd
		var status string
		if action == "up" {
			cmd = exec.Command("docker", "compose", "up", "-d", "--remove-orphans")
			status = "installed"
		} else if action == "down" {
			cmd = exec.Command("docker", "compose", "down", "--remove-orphans")
			status = "not_installed"
		} else {
			return
		}
		multiWriter := io.MultiWriter(os.Stdout, logFile)
		cmd.Stdout = multiWriter
		cmd.Stderr = multiWriter
		if runErr := cmd.Run(); runErr != nil {
			status = "error"
		}
		_, _ = logFile.WriteString(action + " " + status + "\n")

		if status == "installed" {
			// 重启nginx
			if hasNginxConfig, _ := HasNginxConfig(appId); hasNginxConfig {
				_, _ = logFile.WriteString("nginx reload starting...\n")
				time.Sleep(2 * time.Second)
				out, err := ReloadNginx(appId)
				if out != "" {
					_, _ = logFile.WriteString("nginx reload result: " + out + "\n")
				}
				if err != nil {
					_, _ = logFile.WriteString("nginx reload failed: " + err.Error() + "\n")
					status = "error"
				}
				_, _ = logFile.WriteString("nginx reload end\n")
			}
		}

		// 更新应用状态
		appConfig := GetAppConfig(appId)
		appConfig.Status = status
		if err := SaveAppConfig(appId, appConfig); err != nil {
			_, _ = logFile.WriteString("Failed to update application status: " + err.Error() + "\n")
		}
	}()

	return nil
}
