package models

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"

	"appstore/server/global"

	"gopkg.in/yaml.v3"
)

// App 应用信息结构
type App struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Icon        string   `json:"icon"`
	Versions    []string `json:"versions"`
	Tags        []string `json:"tags"`
	Author      string   `json:"author"`
	Website     string   `json:"website"`
	Github      string   `json:"github"`
	Document    string   `json:"document"`
	DownloadURL string   `json:"download_url"`
}

// AppYamlConfig 应用配置文件结构
type AppYamlConfig struct {
	Name        interface{} `yaml:"name"`
	Description interface{} `yaml:"description"`
	Tags        []string    `yaml:"tags"`
	Author      string      `yaml:"author"`
	Website     string      `yaml:"website"`
	Github      string      `yaml:"github"`
	Document    string      `yaml:"document"`
}

// getLocalizedValue 获取多语言字符串值
func getLocalizedValue(data interface{}, lang string) string {
	if data == nil {
		return ""
	}
	switch v := data.(type) {
	case string:
		return v
	case map[string]interface{}:
		if val, ok := v[lang]; ok {
			if strVal, okStr := val.(string); okStr {
				return strVal
			}
		}
		for _, val := range v {
			if strVal, okStr := val.(string); okStr {
				return strVal
			}
		}
	case map[interface{}]interface{}:
		if val, ok := v[lang]; ok {
			if strVal, okStr := val.(string); okStr {
				return strVal
			}
		}
		for _, val := range v {
			if strVal, okStr := val.(string); okStr {
				return strVal
			}
		}
	}
	return ""
}

// findIcon 查找应用图标文件
func findIcon(appDir string) string {
	iconCandidates := []string{"logo.svg", "logo.png", "icon.svg", "icon.png"}
	for _, candidate := range iconCandidates {
		iconPath := filepath.Join(appDir, candidate)
		if _, err := os.Stat(iconPath); err == nil {
			return candidate
		}
	}
	return ""
}

// findVersions 查找应用版本列表
func findVersions(appDir string) []string {
	versions := []string{}
	versionRegex := regexp.MustCompile(`^v?\d+(\.\d+){1,2}$`)

	entries, err := os.ReadDir(appDir)
	if err != nil {
		return versions
	}

	for _, entry := range entries {
		if entry.IsDir() {
			dirName := entry.Name()
			if versionRegex.MatchString(dirName) {
				composePath := filepath.Join(appDir, dirName, "docker-compose.yml")
				if _, err := os.Stat(composePath); err == nil {
					versions = append(versions, dirName)
				}
			}
		}
	}

	sort.Strings(versions)
	return versions
}

// NewApp 创建新的应用实例
func NewApp(id string, appDir string) *App {
	app := &App{
		ID:       id,
		Tags:     []string{},
		Versions: []string{},
	}

	iconFilename := findIcon(appDir)
	if iconFilename != "" {
		app.Icon = fmt.Sprintf("/api/%s/icons/%s/%s", global.APIVersion, id, iconFilename)
	} else {
		app.Icon = ""
	}

	app.DownloadURL = fmt.Sprintf("/api/%s/apps/%s/download/latest", global.APIVersion, id)
	app.Versions = findVersions(appDir)

	ymlFile := filepath.Join(appDir, "config.yml")
	var appYamlConfig AppYamlConfig

	if _, err := os.Stat(ymlFile); err == nil {
		data, err := os.ReadFile(ymlFile)
		if err == nil {
			yaml.Unmarshal(data, &appYamlConfig)
		}
	}

	app.Name = getLocalizedValue(appYamlConfig.Name, global.Language)
	if app.Name == "" {
		app.Name = id
	}
	app.Description = getLocalizedValue(appYamlConfig.Description, global.Language)

	app.Tags = appYamlConfig.Tags
	if app.Tags == nil {
		app.Tags = []string{}
	}
	app.Author = appYamlConfig.Author
	app.Website = appYamlConfig.Website
	app.Github = appYamlConfig.Github
	app.Document = appYamlConfig.Document

	return app
}
