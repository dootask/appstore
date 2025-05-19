package models

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"appstore/server/global"
	"appstore/server/utils"
)

// GenerateNginxConfig 生成nginx配置文件
func GenerateNginxConfig(appId string, version string, config *AppConfig) error {
	// 读取应用的nginx配置模板
	templatePath := filepath.Join(global.WorkDir, "apps", appId, version, "nginx.conf")
	templateData, err := os.ReadFile(templatePath)
	if err != nil {
		return fmt.Errorf("读取nginx配置模板失败: %v", err)
	}

	// 生成新的nginx配置文件
	outputPath := filepath.Join(global.WorkDir, "config", appId, "nginx.conf")
	if err := os.WriteFile(outputPath, templateData, 0644); err != nil {
		return fmt.Errorf("保存nginx配置失败: %v", err)
	}

	return nil
}

// DeleteNginxConfig 删除nginx配置
func DeleteNginxConfig(appId string) {
	nginxConfigPath := filepath.Join(global.WorkDir, "config", appId, "nginx.conf")
	if utils.IsFileExists(nginxConfigPath) {
		os.Remove(nginxConfigPath)
	}
}

// ReloadNginx 重启nginx
func ReloadNginx(appId string) (string, error) {
	nginxConfigPath := filepath.Join(global.WorkDir, "config", appId, "nginx.conf")
	if !utils.IsFileExists(nginxConfigPath) {
		return "", nil
	}

	// 容器名称
	nginxContainerName := "dootask-nginx-" + os.Getenv("APP_ID")
	if utils.CheckIllegal(nginxContainerName) {
		return "Invalid parameter", fmt.Errorf("nginx name contains illegal characters")
	}

	// 执行重启
	nginxCmd := fmt.Sprintf("docker exec -i %s %s", nginxContainerName, "nginx -s reload")
	out, err := utils.ExecWithTimeOut(nginxCmd, 20*time.Second)
	if err != nil {
		if out != "" {
			return "Command execution failed with output", fmt.Errorf(out)
		}
		return "Command execution failed", err
	}

	return out, nil
}
