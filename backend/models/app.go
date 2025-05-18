package models

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"

	"appstore/backend/global"

	"gopkg.in/yaml.v3"
)

// AppConfig 代表 config.yml 的结构
type AppConfig struct {
	Name        interface{} `yaml:"name"`
	Description interface{} `yaml:"description"`
	Tags        []string    `yaml:"tags"`
	Author      string      `yaml:"author"`
	Website     string      `yaml:"website"`
	Github      string      `yaml:"github"`
	Document    string      `yaml:"document"`
}

// App 应用信息结构体，用于API响应
type App struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Icon        string   `json:"icon"` // 将是完整的URL路径, 但在这里先生成相对路径
	Versions    []string `json:"versions"`
	Tags        []string `json:"tags"`
	Author      string   `json:"author"`
	Website     string   `json:"website"`
	Github      string   `json:"github"`
	Document    string   `json:"document"`
	DownloadURL string   `json:"download_url"` // 新增下载地址字段
}

// getLocalizedValue 从 interface{} 中获取指定语言的字符串值
// data 可以是 string 或 map[string]string
func getLocalizedValue(data interface{}, lang string) string {
	if data == nil {
		return ""
	}
	switch v := data.(type) {
	case string:
		return v
	case map[string]interface{}:
		// 尝试获取指定语言
		if val, ok := v[lang]; ok {
			if strVal, okStr := val.(string); okStr {
				return strVal
			}
		}
		// 如果指定语言不存在，或者v中没有string类型的value，则返回第一个值
		for _, val := range v {
			if strVal, okStr := val.(string); okStr {
				return strVal
			}
		}
	case map[interface{}]interface{}: // YAML可能解析为这种类型
		// 尝试获取指定语言
		if val, ok := v[lang]; ok {
			if strVal, okStr := val.(string); okStr {
				return strVal
			}
		}
		// 如果指定语言不存在，或者v中没有string类型的value，则返回第一个值
		for _, val := range v {
			if strVal, okStr := val.(string); okStr {
				return strVal
			}
		}
	}
	return ""
}

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

	// 版本排序 (简单字符串排序，对于v1.0.0, v1.10.0, v1.2.0 可能不够完美，但暂时满足需求)
	// 如果需要更精确的语义版本排序，需要引入专门的库或实现更复杂的排序逻辑。
	sort.Strings(versions)
	return versions
}

// NewApp 从应用目录创建新的App实例
func NewApp(id string, appDir string) *App {
	app := &App{
		ID:       id,
		Tags:     []string{},
		Versions: []string{},
	}

	iconFilename := findIcon(appDir)
	if iconFilename != "" {
		// 生成相对路径，将在handler中转换为完整URL
		app.Icon = fmt.Sprintf("/api/%s/icons/%s/%s", global.APIVersion, id, iconFilename)
	} else {
		app.Icon = "" // 确保空字符串而不是nil
	}

	// 设置下载URL的相对路径
	app.DownloadURL = fmt.Sprintf("/api/%s/apps/%s/download/latest", global.APIVersion, id)

	app.Versions = findVersions(appDir)

	configFile := filepath.Join(appDir, "config.yml")
	var appConfig AppConfig

	if _, err := os.Stat(configFile); err == nil {
		data, err := os.ReadFile(configFile)
		if err == nil {
			yaml.Unmarshal(data, &appConfig)
		}
	}

	// 处理多语言字段
	app.Name = getLocalizedValue(appConfig.Name, global.Language)
	if app.Name == "" {
		app.Name = id // 如果名称为空，默认为ID
	}
	app.Description = getLocalizedValue(appConfig.Description, global.Language)

	app.Tags = appConfig.Tags
	if app.Tags == nil {
		app.Tags = []string{}
	}
	app.Author = appConfig.Author
	app.Website = appConfig.Website
	app.Github = appConfig.Github
	app.Document = appConfig.Document

	return app
}
