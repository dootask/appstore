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

// 禁止使用的服务名称
var PROTECTED_NAMES = []string{
	"php",
	"nginx",
	"redis",
	"mariadb",
	"search",
	"appstore",
}

// DockerCompose 定义docker-compose.yml的结构
type DockerCompose struct {
	Name     string                 `yaml:"name"`
	Version  string                 `yaml:"version"`
	Services map[string]Service     `yaml:"services"`
	Volumes  map[string]interface{} `yaml:"volumes,omitempty"`
	Networks map[string]interface{} `yaml:"networks,omitempty"`
}

// Service 定义服务配置
type Service struct {
	Image         string        `yaml:"image"`
	ContainerName string        `yaml:"container_name"`
	Restart       string        `yaml:"restart"`
	Environment   []string      `yaml:"environment,omitempty"`
	Volumes       []string      `yaml:"volumes,omitempty"`
	Ports         []string      `yaml:"ports,omitempty"`
	Networks      []string      `yaml:"networks,omitempty"`
	Deploy        *DeployConfig `yaml:"deploy,omitempty"`
}

// DeployConfig 定义部署配置
type DeployConfig struct {
	Resources Resources `yaml:"resources"`
}

// Resources 定义资源限制
type Resources struct {
	Limits Limits `yaml:"limits"`
}

// Limits 定义资源限制值
type Limits struct {
	CPUs   string `yaml:"cpus"`
	Memory string `yaml:"memory"`
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

	//处理环境变量
	templateData = []byte(strings.ReplaceAll(string(templateData), "${HOST_PWD}", ""))
	templateData = []byte(strings.ReplaceAll(string(templateData), "${PUBLIC_PATH}", "${HOST_PWD}/public"))
	if config.Params != nil {
		for key, value := range config.Params {
			templateData = []byte(strings.ReplaceAll(string(templateData), "${"+key+"}", value.(string)))
		}
	}

	// 解析模板
	var compose DockerCompose
	if err := yaml.Unmarshal(templateData, &compose); err != nil {
		return fmt.Errorf("解析docker-compose模板失败: %v", err)
	}

	// 服务名称
	compose.Name = "dootask-app-" + appId

	// 网络名称
	networkName := "dootask-networks-" + os.Getenv("APP_ID")

	// 处理挂载路径
	versionPwd := fmt.Sprintf("${HOST_PWD}/docker/appstore/apps/%s/%s", appId, version)

	// 判断网络是否存在
	if _, err := utils.Execf("docker network inspect " + networkName); err != nil {
		return fmt.Errorf("网络不存在: %v", err)
	}

	// 加入网络
	compose.Networks = map[string]interface{}{
		networkName: map[string]interface{}{
			"external": true,
		},
	}

	// 处理服务配置
	for serviceName, service := range compose.Services {
		// 检查服务名称是否被保护
		if slices.Contains(PROTECTED_NAMES, serviceName) {
			return fmt.Errorf("服务名称 '%s' 被保护，不能使用", serviceName)
		}

		// 确保所有服务都有网络配置
		service.Networks = []string{networkName}

		// 处理短语法挂载
		if service.Volumes != nil {
			convertedVolumes := make([]string, len(service.Volumes))
			for i, volume := range service.Volumes {
				convertedVolumes[i] = convertVolumePath(volume, versionPwd)
			}
			service.Volumes = convertedVolumes
		}

		// 处理长语法挂载
		if service.Volumes != nil {
			for i, volume := range service.Volumes {
				if strings.Contains(volume, "source:") {
					// 解析长语法
					var volumeMap map[string]interface{}
					if err := yaml.Unmarshal([]byte(volume), &volumeMap); err == nil {
						if source, ok := volumeMap["source"].(string); ok {
							// 转换源路径
							volumeMap["source"] = convertSourcePath(source, versionPwd)
							// 重新序列化
							if newVolume, err := yaml.Marshal(volumeMap); err == nil {
								service.Volumes[i] = string(newVolume)
							}
						}
					}
				}
			}
		}

		// 资源限制
		if config.Resources.CPULimit > 0 || config.Resources.MemoryLimit > 0 {
			service.Deploy = &DeployConfig{
				Resources: Resources{
					Limits: Limits{
						CPUs:   fmt.Sprintf("%d", config.Resources.CPULimit),
						Memory: fmt.Sprintf("%dM", config.Resources.MemoryLimit),
					},
				},
			}
		}

		compose.Services[serviceName] = service
	}

	// 生成新的docker-compose.yml
	outputPath := filepath.Join(global.WorkDir, "config", appId, "docker-compose.yml")
	outputData, err := yaml.Marshal(compose)
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

		// 更新应用状态
		appConfig := GetAppConfig(appId)
		appConfig.Status = status
		if err := SaveAppConfig(appId, appConfig); err != nil {
			_, _ = logFile.WriteString("Failed to update application status: " + err.Error() + "\n")
		}
	}()

	return nil
}
