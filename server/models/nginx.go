package models

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"appstore/server/global"
	"appstore/server/i18n"
	"appstore/server/utils"
)

// GenerateNginxConfig 生成nginx配置文件
func GenerateNginxConfig(appId string, version string, config *AppConfig) error {
	// 读取应用的nginx配置模板
	templatePath := filepath.Join(global.WorkDir, "apps", appId, version, "nginx.conf")
	templateData, err := os.ReadFile(templatePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		} else {
			return errors.New(i18n.T("ReadNginxTemplateFailed", err))
		}
	}

	// 生成新的nginx配置文件
	outputPath := filepath.Join(global.WorkDir, "config", appId, "nginx.conf")
	if err := os.WriteFile(outputPath, templateData, 0644); err != nil {
		return errors.New(i18n.T("SaveNginxConfigFailed", err))
	}

	return nil
}

// DeleteNginxConfig 删除nginx配置
func DeleteNginxConfig(appId string) {
	if hasNginxConfig, nginxConfigPath := HasNginxConfig(appId); hasNginxConfig {
		os.Remove(nginxConfigPath)
	}
}

// ReloadNginx 重启nginx
func ReloadNginx(appId string, retry int) (string, error) {
	if hasNginxConfig, _ := HasNginxConfig(appId); !hasNginxConfig {
		return "", nil
	}

	// 容器名称
	nginxContainerName := "dootask-nginx-" + os.Getenv("APP_ID")
	if utils.CheckIllegal(nginxContainerName) {
		return "Invalid parameter", errors.New("nginx name contains illegal characters")
	}

	// 执行重启
	nginxCmd := fmt.Sprintf("docker exec -i %s %s", nginxContainerName, "nginx -s reload")

	var out string
	var err error
	for i := 0; i <= retry; i++ {
		out, err = utils.ExecWithTimeOut(nginxCmd, 20*time.Second)
		if err == nil {
			return out, nil
		}

		// 如果不是最后一次重试，则等待后继续
		if i < retry {
			time.Sleep(time.Second * 3)
			continue
		}

		// 最后一次重试失败
		if out != "" {
			return "Command execution failed with output", errors.New(out)
		}
		return "Command execution failed", err
	}

	return out, nil
}

// HasNginxConfig 是否有nginx配置
func HasNginxConfig(appId string) (bool, string) {
	nginxConfigPath := filepath.Join(global.WorkDir, "config", appId, "nginx.conf")
	return utils.IsFileExists(nginxConfigPath), nginxConfigPath
}
