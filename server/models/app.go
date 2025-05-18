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
	ID                string                `json:"id"`
	Name              string                `json:"name"`
	Description       string                `json:"description"`
	Icon              string                `json:"icon"`
	Versions          []string              `json:"versions"`
	Tags              []string              `json:"tags"`
	Author            string                `json:"author"`
	Website           string                `json:"website"`
	Github            string                `json:"github"`
	Document          string                `json:"document"`
	DownloadURL       string                `json:"download_url"`
	Fields            []AppFieldConfig      `json:"fields,omitempty"`
	RequireUninstalls []AppRequireUninstall `json:"require_uninstalls,omitempty"`
	MenuItems         []AppMenuItem         `json:"menu_items,omitempty"`
}

// AppFieldOption 是 App 结构中字段选项的表示
type AppFieldOption struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

// AppFieldConfig 是 App 结构中可配置字段的表示
type AppFieldConfig struct {
	Name        string           `json:"name"`
	Label       string           `json:"label"`
	Placeholder string           `json:"placeholder,omitempty"`
	Type        string           `json:"type"`
	Default     interface{}      `json:"default,omitempty"`
	Required    bool             `json:"required,omitempty"`
	Options     []AppFieldOption `json:"options,omitempty"`
}

// AppRequireUninstall 是 App 结构中卸载要求的表示
type AppRequireUninstall struct {
	Version string `json:"version"`
	Reason  string `json:"reason,omitempty"`
}

// AppMenuItem 是 App 结构中菜单项的表示
type AppMenuItem struct {
	Location      string `json:"location"`
	Label         string `json:"label"`
	URL           string `json:"url"`
	Icon          string `json:"icon,omitempty"`
	Transparent   bool   `json:"transparent"`
	AutoDarkTheme bool   `json:"autoDarkTheme"`
	KeepAlive     bool   `json:"keepAlive"`
}

// AppYamlConfig 应用配置文件结构
type AppYamlConfig struct {
	Name              interface{}        `yaml:"name"`
	Description       interface{}        `yaml:"description"`
	Tags              []string           `yaml:"tags"`
	Author            string             `yaml:"author"`
	Website           string             `yaml:"website"`
	Github            string             `yaml:"github"`
	Document          string             `yaml:"document"`
	Fields            []FieldConfig      `yaml:"fields,omitempty"`
	RequireUninstalls []RequireUninstall `yaml:"require_uninstalls,omitempty"`
	MenuItems         []MenuItem         `yaml:"menu_items,omitempty"`
}

// FieldOption 定义字段配置中的选项结构
type FieldOption struct {
	Label interface{} `yaml:"label"` // 支持多语言
	Value string      `yaml:"value"`
}

// FieldConfig 定义应用的可配置字段结构
type FieldConfig struct {
	Name        string        `yaml:"name"`
	Label       interface{}   `yaml:"label"`                 // 支持多语言
	Placeholder interface{}   `yaml:"placeholder,omitempty"` // 支持多语言
	Type        string        `yaml:"type"`
	Default     interface{}   `yaml:"default,omitempty"`
	Required    bool          `yaml:"required,omitempty"`
	Options     []FieldOption `yaml:"options,omitempty"`
}

// RequireUninstall 定义需要先卸载的版本结构
type RequireUninstall struct {
	Version string      `yaml:"version"`
	Reason  interface{} `yaml:"reason,omitempty"` // 支持多语言
}

// MenuItem 定义应用菜单入口结构
type MenuItem struct {
	Location      string      `yaml:"location"`
	Label         interface{} `yaml:"label"` // 支持多语言
	URL           string      `yaml:"url"`
	Icon          string      `yaml:"icon,omitempty"`
	Transparent   bool        `yaml:"transparent,omitempty"`
	AutoDarkTheme *bool       `yaml:"autoDarkTheme,omitempty"` // 使用指针以区分缺失和false，默认 true
	KeepAlive     *bool       `yaml:"keepAlive,omitempty"`     // 使用指针以区分缺失和false，默认 true
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
		ID:                id,
		Tags:              []string{},
		Versions:          []string{},
		Fields:            []AppFieldConfig{},
		RequireUninstalls: []AppRequireUninstall{},
		MenuItems:         []AppMenuItem{},
	}

	iconFilename := findIcon(appDir)
	if iconFilename != "" {
		app.Icon = fmt.Sprintf("/api/%s/icons/%s/%s", global.APIVersion, id, iconFilename)
	} else {
		app.Icon = ""
	}

	app.DownloadURL = fmt.Sprintf("/api/%s/download/%s/latest", global.APIVersion, id)
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

	// 处理 Fields
	if appYamlConfig.Fields != nil {
		for _, yamlField := range appYamlConfig.Fields {
			appField := AppFieldConfig{
				Name:        yamlField.Name,
				Label:       getLocalizedValue(yamlField.Label, global.Language),
				Placeholder: getLocalizedValue(yamlField.Placeholder, global.Language),
				Type:        yamlField.Type,
				Default:     yamlField.Default,
				Required:    yamlField.Required,
				Options:     []AppFieldOption{},
			}
			if yamlField.Options != nil {
				for _, yamlOption := range yamlField.Options {
					appField.Options = append(appField.Options, AppFieldOption{
						Label: getLocalizedValue(yamlOption.Label, global.Language),
						Value: yamlOption.Value,
					})
				}
			}
			app.Fields = append(app.Fields, appField)
		}
	}

	// 处理 RequireUninstalls
	if appYamlConfig.RequireUninstalls != nil {
		for _, yamlRequire := range appYamlConfig.RequireUninstalls {
			app.RequireUninstalls = append(app.RequireUninstalls, AppRequireUninstall{
				Version: yamlRequire.Version,
				Reason:  getLocalizedValue(yamlRequire.Reason, global.Language),
			})
		}
	}

	// 处理 MenuItems
	if appYamlConfig.MenuItems != nil {
		for _, yamlMenu := range appYamlConfig.MenuItems {
			appMenuItem := AppMenuItem{
				Location:    yamlMenu.Location,
				Label:       getLocalizedValue(yamlMenu.Label, global.Language),
				URL:         yamlMenu.URL,
				Transparent: yamlMenu.Transparent, // 默认为 false，直接赋值
			}

			if yamlMenu.Icon != "" {
				appMenuItem.Icon = fmt.Sprintf("/api/%s/icons/%s/%s", global.APIVersion, id, filepath.Clean(yamlMenu.Icon))
			} else {
				appMenuItem.Icon = ""
			}

			// 处理 AutoDarkTheme (默认 true)
			appMenuItem.AutoDarkTheme = true
			if yamlMenu.AutoDarkTheme != nil {
				appMenuItem.AutoDarkTheme = *yamlMenu.AutoDarkTheme
			}

			// 处理 KeepAlive (默认 true)
			appMenuItem.KeepAlive = true
			if yamlMenu.KeepAlive != nil {
				appMenuItem.KeepAlive = *yamlMenu.KeepAlive
			}

			app.MenuItems = append(app.MenuItems, appMenuItem)
		}
	}

	return app
}
