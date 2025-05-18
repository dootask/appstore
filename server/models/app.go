package models

import (
	"appstore/server/utils"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"appstore/server/global"

	"gopkg.in/yaml.v3"
)

// App 应用信息结构
type App struct {
	ID                string             `yaml:"id" json:"id"`
	Name              string             `yaml:"name" json:"name"`
	Description       string             `yaml:"description" json:"description"`
	Icon              string             `yaml:"icon" json:"icon"`
	Versions          []string           `yaml:"versions" json:"versions"`
	Tags              []string           `yaml:"tags" json:"tags"`
	Author            string             `yaml:"author" json:"author"`
	Website           string             `yaml:"website" json:"website"`
	Github            string             `yaml:"github" json:"github"`
	Document          string             `yaml:"document" json:"document"`
	DownloadURL       string             `yaml:"download_url" json:"download_url"`
	Fields            []FieldConfig      `yaml:"fields" json:"fields"`
	RequireUninstalls []RequireUninstall `yaml:"require_uninstalls" json:"require_uninstalls"`
	MenuItems         []MenuItem         `yaml:"menu_items" json:"menu_items"`
	Config            *AppConfig         `yaml:"config,omitempty" json:"config,omitempty"`
}

// FieldConfig 定义应用的可配置字段结构
type FieldConfig struct {
	Name        string        `yaml:"name" json:"name"`
	Label       interface{}   `yaml:"label" json:"label"`
	Placeholder interface{}   `yaml:"placeholder" json:"placeholder"`
	Type        string        `yaml:"type" json:"type"`
	Default     interface{}   `yaml:"default" json:"default"`
	Required    bool          `yaml:"required" json:"required"`
	Options     []FieldOption `yaml:"options" json:"options"`
}

// FieldOption 定义字段配置中的选项结构
type FieldOption struct {
	Label interface{} `yaml:"label" json:"label"`
	Value string      `yaml:"value" json:"value"`
}

// RequireUninstall 定义需要先卸载的版本结构
type RequireUninstall struct {
	Version  string      `yaml:"version" json:"version"`
	Reason   interface{} `yaml:"reason" json:"reason"`
	Operator string      `yaml:"operator" json:"operator"`
}

// MenuItem 定义应用菜单入口结构
type MenuItem struct {
	Location      string      `yaml:"location" json:"location"`
	Label         interface{} `yaml:"label" json:"label"`
	URL           string      `yaml:"url" json:"url"`
	Icon          string      `yaml:"icon" json:"icon"`
	Transparent   bool        `yaml:"transparent" json:"transparent"`
	AutoDarkTheme *bool       `yaml:"autoDarkTheme" json:"autoDarkTheme"`
	KeepAlive     *bool       `yaml:"keepAlive" json:"keepAlive"`
}

// AppConfig 应用配置结构
type AppConfig struct {
	InstallAt      string                 `yaml:"install_at" json:"install_at"`
	InstallNum     int                    `yaml:"install_num" json:"install_num"`
	InstallVersion string                 `yaml:"install_version" json:"install_version"`
	Status         string                 `yaml:"status" json:"status"` // installing, installed, uninstalling, not_installed, error
	Params         map[string]interface{} `yaml:"params" json:"params"`
	Resources      AppConfigResources     `yaml:"resources" json:"resources"`
}

// AppConfigResources 应用配置资源结构
type AppConfigResources struct {
	CPULimit    int `yaml:"cpu_limit" json:"cpu_limit"`
	MemoryLimit int `yaml:"memory_limit" json:"memory_limit"`
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
func findIcon(appId string) string {
	appDir := filepath.Join(global.WorkDir, "apps", appId)

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
func findVersions(appId string) []string {
	appDir := filepath.Join(global.WorkDir, "apps", appId)

	versions := []string{}
	entries, err := utils.GetSubDirs(appDir)
	if err != nil {
		return versions
	}

	versionRegex := regexp.MustCompile(`^v?\d+(\.\d+){1,2}$`)
	for _, dirName := range entries {
		if versionRegex.MatchString(dirName) {
			composePath := filepath.Join(appDir, dirName, "docker-compose.yml")
			if _, err := os.Stat(composePath); err == nil {
				versions = append(versions, dirName)
			}
		}
	}

	sort.Strings(versions)
	return versions
}

// parseVersionOperator 解析版本字符串中的操作符
func parseVersionOperator(version string) (string, string) {
	// 匹配操作符和版本号
	re := regexp.MustCompile(`^\s*([<>=!]*)\s*(.+)$`)
	matches := re.FindStringSubmatch(version)
	if len(matches) == 3 {
		operator := matches[1]
		versionNum := matches[2]
		if operator == "" {
			operator = "="
		}
		return operator, versionNum
	}
	return "=", version
}

// getAppConfig 获取应用的配置文件内容
func getAppConfig(appId string) *AppConfig {
	appConfig := &AppConfig{}
	configFile := filepath.Join(global.WorkDir, "config", appId, "config.yml")
	if _, err := os.Stat(configFile); err == nil {
		data, err := os.ReadFile(configFile)
		if err == nil {
			_ = yaml.Unmarshal(data, &appConfig)
		}
	}

	if appConfig.Status == "" {
		appConfig.Status = "not_installed"
	}

	if appConfig.Params == nil {
		appConfig.Params = make(map[string]interface{})
	}

	return appConfig
}

// NewApps 创建应用实例列表
func NewApps() []*App {
	appsDir := filepath.Join(global.WorkDir, "apps")

	if !utils.IsDirExists(appsDir) {
		return nil
	}

	appIds, err := utils.GetSubDirs(appsDir)
	if err != nil {
		return nil
	}

	apps := []*App{}
	for _, appId := range appIds {
		apps = append(apps, NewApp(appId))
	}

	return apps
}

// NewApp 创建新的应用实例
func NewApp(appId string) *App {
	appDir := filepath.Join(global.WorkDir, "apps", appId)

	app := &App{}
	configFile := filepath.Join(appDir, "config.yml")
	if _, err := os.Stat(configFile); err == nil {
		data, err := os.ReadFile(configFile)
		if err == nil {
			_ = yaml.Unmarshal(data, &app)
		}
	}

	app.ID = appId

	app.Name = getLocalizedValue(app.Name, global.Language)
	if app.Name == "" {
		app.Name = app.ID
	}

	app.Description = getLocalizedValue(app.Description, global.Language)

	iconFilename := findIcon(app.ID)
	if iconFilename != "" {
		app.Icon = fmt.Sprintf("%s/api/%s/icon/%s/%s", global.BaseUrl, global.APIVersion, app.ID, iconFilename)
	} else {
		app.Icon = ""
	}

	app.Versions = findVersions(app.ID)

	if app.Tags == nil {
		app.Tags = []string{}
	}

	app.DownloadURL = fmt.Sprintf("%s/api/%s/download/%s/latest", global.BaseUrl, global.APIVersion, app.ID)

	// 处理 Fields
	fields := []FieldConfig{}
	if app.Fields != nil {
		for _, field := range app.Fields {
			field := FieldConfig{
				Name:        field.Name,
				Label:       getLocalizedValue(field.Label, global.Language),
				Placeholder: getLocalizedValue(field.Placeholder, global.Language),
				Type:        field.Type,
				Default:     field.Default,
				Required:    field.Required,
				Options:     []FieldOption{},
			}
			if field.Options != nil {
				for _, option := range field.Options {
					field.Options = append(field.Options, FieldOption{
						Label: getLocalizedValue(option.Label, global.Language),
						Value: option.Value,
					})
				}
			}
			fields = append(fields, field)
		}
	}
	app.Fields = fields

	// 处理 RequireUninstalls
	requireUninstalls := []RequireUninstall{}
	if app.RequireUninstalls != nil {
		for _, require := range app.RequireUninstalls {
			operator, version := parseVersionOperator(require.Version)
			// 如果配置中明确指定了操作符，则使用配置中的操作符
			if require.Operator != "" {
				operator = require.Operator
			}
			// 创建新的 RequireUninstall 实例
			requireUninstall := RequireUninstall{
				Version:  version,
				Reason:   getLocalizedValue(require.Reason, global.Language),
				Operator: operator,
			}
			requireUninstalls = append(requireUninstalls, requireUninstall)
		}
	}
	app.RequireUninstalls = requireUninstalls

	// 处理 MenuItems
	menuItems := []MenuItem{}
	if app.MenuItems != nil {
		for _, menu := range app.MenuItems {
			appMenuItem := MenuItem{
				Location:    menu.Location,
				Label:       getLocalizedValue(menu.Label, global.Language),
				URL:         menu.URL,
				Transparent: menu.Transparent, // 默认为 false，直接赋值
			}

			if menu.Icon != "" {
				// 使用 filepath.Clean 来处理相对路径，确保路径的正确性
				cleanedIconPath := filepath.Clean(menu.Icon)
				appMenuItem.Icon = fmt.Sprintf("%s/api/%s/icons/%s/%s", global.BaseUrl, global.APIVersion, app.ID, cleanedIconPath)
			} else {
				appMenuItem.Icon = ""
			}

			// 处理 AutoDarkTheme (默认 true)
			appMenuItem.AutoDarkTheme = menu.AutoDarkTheme
			if appMenuItem.AutoDarkTheme == nil {
				defaultTrue := true
				appMenuItem.AutoDarkTheme = &defaultTrue
			}

			// 处理 KeepAlive (默认 true)
			appMenuItem.KeepAlive = menu.KeepAlive
			if appMenuItem.KeepAlive == nil {
				defaultTrue := true
				appMenuItem.KeepAlive = &defaultTrue
			}

			menuItems = append(menuItems, appMenuItem)
		}
	}
	app.MenuItems = menuItems

	app.Config = getAppConfig(filepath.Join(app.ID))

	return app
}

// GetReadme 获取应用的自述文件内容
func GetReadme(appId string) string {
	// 定义可能的 README 文件名模式
	patterns := []string{
		fmt.Sprintf("README_%s.md", global.Language),
		fmt.Sprintf("README-%s.md", global.Language),
		fmt.Sprintf("README.%s.md", global.Language),
	}
	if global.Language == "zh-cht" {
		patterns = append(patterns, "README_TW.md", "README-TW.md", "README.TW.md")
	}
	patterns = append(patterns, "README.md")

	// 获取目录中的所有文件
	appDir := filepath.Join(global.WorkDir, "apps", appId)
	entries, err := os.ReadDir(appDir)
	if err != nil {
		return ""
	}

	// 创建一个映射来存储文件名（小写）到实际文件名的映射
	fileMap := make(map[string]string)
	for _, entry := range entries {
		if !entry.IsDir() {
			fileMap[strings.ToLower(entry.Name())] = entry.Name()
		}
	}

	// 按优先级尝试读取文件
	for _, pattern := range patterns {
		lowerPattern := strings.ToLower(pattern)
		if actualName, exists := fileMap[lowerPattern]; exists {
			readmePath := filepath.Join(appDir, actualName)
			if content, err := os.ReadFile(readmePath); err == nil {
				return string(content)
			}
		}
	}

	return ""
}

// GetLog 获取应用日志
func GetLog(appId string, limit int) string {
	logFile := filepath.Join(global.WorkDir, "log", appId+".log")
	if _, err := os.Stat(logFile); os.IsNotExist(err) {
		return ""
	}

	content, err := os.ReadFile(logFile)
	if err != nil {
		return ""
	}

	lines := strings.Split(string(content), "\n")
	if len(lines) > limit {
		lines = lines[len(lines)-limit:]
	}

	return strings.Join(lines, "\n")
}

// FindLatestVersionForApp 获取应用的最新版本
func FindLatestVersionForApp(appId string) (string, error) {
	versions := findVersions(appId)
	if len(versions) == 0 {
		return "", fmt.Errorf("no versions found for app %s", appId)
	}
	return versions[len(versions)-1], nil
}
