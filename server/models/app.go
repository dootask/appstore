package models

import (
	"appstore/server/global"
	"appstore/server/i18n"
	"appstore/server/utils"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"sort"
	"strings"
	"unicode"

	"gopkg.in/yaml.v3"
)

// App 应用信息结构
type App struct {
	ID                string             `yaml:"id" json:"id"`
	Name              interface{}        `yaml:"name" json:"name"`
	Description       interface{}        `yaml:"description" json:"description"`
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
	Rating            float64            `yaml:"rating,omitempty" json:"rating"`
	UserCount         string             `yaml:"user_count,omitempty" json:"user_count"`
	Downloads         string             `yaml:"downloads,omitempty" json:"downloads"`
	Upgradeable       bool               `yaml:"upgradeable,omitempty" json:"upgradeable"`
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
	CPULimit    string `yaml:"cpu_limit" json:"cpu_limit"`
	MemoryLimit string `yaml:"memory_limit" json:"memory_limit"`
}

// AppInternalInstallRequest 内部安装请求结构
type AppInternalInstallRequest struct {
	AppID     string                 `json:"appid" validate:"required"`
	Version   string                 `json:"version" validate:"omitempty"`
	Params    map[string]interface{} `json:"params" validate:"omitempty"`
	Resources AppConfigResources     `json:"resources" validate:"omitempty"`
}

// AppInternalInstalledResponse 内部安装响应结构
type AppInternalInstalledResponse struct {
	Names []string   `json:"names" validate:"required"`
	Menus []MenuItem `json:"menus" validate:"omitempty"`
}

// AppInternalDownloadRequest 通过URL下载应用的请求结构
type AppInternalDownloadRequest struct {
	URL   string `json:"url" binding:"required"`
	AppID string `json:"appid" binding:"omitempty"`
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

	sort.Slice(versions, func(i, j int) bool {
		return utils.CompareVersions(versions[i], versions[j]) > 0
	})
	return versions
}

// NewApps 创建应用实例列表
func NewApps(appIds []string) []*App {
	if len(appIds) == 0 {
		appsDir := filepath.Join(global.WorkDir, "apps")

		if !utils.IsDirExists(appsDir) {
			return nil
		}

		var err error
		appIds, err = utils.GetSubDirs(appsDir)
		if err != nil {
			return nil
		}
	}

	apps := []*App{}
	for _, appId := range appIds {
		app, err := NewApp(appId)
		if err != nil {
			continue
		}
		apps = append(apps, app)
	}

	return apps
}

// NewApp 创建新的应用实例
func NewApp(appId string) (*App, error) {
	if appId == "" {
		return nil, errors.New(i18n.T("AppIdRequiredError"))
	}
	if slices.Contains([]string{"..", "/", "\\", ".git", ".DS_Store"}, appId) {
		return nil, errors.New(i18n.T("InvalidAppIdError"))
	}

	appDir := filepath.Join(global.WorkDir, "apps", appId)

	app := &App{}
	configFile := filepath.Join(appDir, "config.yml")

	// 检查配置文件是否存在
	if _, err := os.Stat(configFile); err != nil {
		if os.IsNotExist(err) {
			return nil, errors.New(i18n.T("CheckConfigNotFound"))
		} else {
			return nil, errors.New(i18n.T("CheckConfigFailed", err))
		}
	}

	// 读取配置文件
	data, err := os.ReadFile(configFile)
	if err != nil {
		return nil, errors.New(i18n.T("ReadConfigError", err))
	}

	// 解析YAML
	if err := yaml.Unmarshal(data, &app); err != nil {
		return nil, errors.New(i18n.T("ParseConfigFailed", err))
	}

	// 设置应用ID
	app.ID = appId

	// 设置应用名称
	app.Name = getLocalizedValue(app.Name, global.Language)
	if app.Name == "" {
		app.Name = app.ID
	}

	// 设置应用描述
	app.Description = getLocalizedValue(app.Description, global.Language)

	// 设置应用图标
	iconFilename := findIcon(app.ID)
	if iconFilename != "" {
		app.Icon = fmt.Sprintf("%s/api/%s/asset/%s/%s", global.BaseUrl, global.APIVersion, app.ID, iconFilename)
	} else {
		app.Icon = ""
	}

	// 设置应用版本
	app.Versions = findVersions(app.ID)

	// 设置应用标签
	if app.Tags == nil {
		app.Tags = []string{}
	}

	// 设置应用下载URL
	app.DownloadURL = fmt.Sprintf("%s/api/%s/download/%s/latest", global.BaseUrl, global.APIVersion, app.ID)

	// 生成随机评分 (4.5-5.0)
	app.Rating = 4.5 + (rand.Float64() * 0.5)
	app.Rating = math.Round(app.Rating*10) / 10 // 保留一位小数

	// 生成随机用户数量 (1k-10k)
	userCount := 1 + rand.Intn(10)
	if userCount == 10 {
		app.UserCount = "10k+"
	} else {
		app.UserCount = fmt.Sprintf("%d.%dk", userCount, rand.Intn(10))
	}

	// 生成随机下载量 (10万-100万)
	downloads := 100000 + rand.Intn(900000)
	app.Downloads = utils.FormatNumber(downloads) + "+"

	// 获取应用配置
	app.Config = GetAppConfig(filepath.Join(app.ID))

	// 检查是否可以升级
	if app.Config != nil && app.Config.InstallVersion != "" && app.Config.Status == "installed" {
		currentVersion := app.Config.InstallVersion
		if len(app.Versions) > 0 {
			latestVersion := app.Versions[len(app.Versions)-1]
			if utils.CompareVersions(latestVersion, currentVersion) > 0 {
				app.Upgradeable = true
			}
		}
	}

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
			operator, version := utils.ParseVersionOperator(require.Version)
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
				appMenuItem.Icon = fmt.Sprintf("%s/api/%s/asset/%s/%s", global.BaseUrl, global.APIVersion, app.ID, cleanedIconPath)
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

	return app, nil
}

// GetAppConfig 获取应用的配置文件内容
func GetAppConfig(appId string) *AppConfig {
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

// SaveAppConfig 保存应用配置
func SaveAppConfig(appId string, appConfig *AppConfig) error {
	configFile := filepath.Join(global.WorkDir, "config", appId, "config.yml")
	data, err := yaml.Marshal(appConfig)
	if err != nil {
		return err
	}
	if err := os.WriteFile(configFile, data, 0644); err != nil {
		return err
	}

	return nil
}

// GetReadme 获取应用的自述文件内容
func GetReadme(appId string) string {
	// 定义可能的 README 文件名模式
	patterns := []string{
		fmt.Sprintf("README_%s.md", global.Language),
		fmt.Sprintf("README-%s.md", global.Language),
		fmt.Sprintf("README.%s.md", global.Language),
	}
	if global.Language == "zh" {
		patterns = append(patterns, "README_CN.md", "README-CN.md", "README.CN.md")
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

// FindLatestVersion 获取应用的最新版本
func FindLatestVersion(appId string) (string, error) {
	versions := findVersions(appId)
	if len(versions) == 0 {
		return "", errors.New(i18n.T("AppVersionNotFound", appId))
	}
	return versions[0], nil
}

// FindAsset 查找应用资源文件
func FindAsset(appId, assetPath string) (string, error) {
	if appId == "" || assetPath == "" {
		return "", errors.New(i18n.T("ParameterError"))
	}

	cleanedAppId := filepath.Clean(appId)
	cleanedAssetPath := filepath.Clean(strings.TrimPrefix(assetPath, "/"))

	if cleanedAppId != appId || strings.Contains(cleanedAppId, "..") || strings.Contains(cleanedAppId, "/") || strings.Contains(cleanedAppId, "\\") {
		return "", errors.New(i18n.T("InvalidParameter"))
	}

	if strings.Contains(cleanedAssetPath, "..") || filepath.IsAbs(cleanedAssetPath) {
		return "", errors.New(i18n.T("InvalidParameter"))
	}

	assetFullPath := filepath.Join(global.WorkDir, "apps", cleanedAppId, cleanedAssetPath)

	if _, err := os.Stat(assetFullPath); os.IsNotExist(err) {
		return "", errors.New(i18n.T("ResourceFileNotFound"))
	}

	return assetFullPath, nil
}

// 生成临时应用目录
// 1、检查appId是否被保护
// 2、检查目标是否存在
// 3、生成临时目录
// 4、返回临时目录
func GenerateTempAppDir(appId, urlOrFileName string) (string, string, error) {
	// 检查appId是否被保护
	if slices.Contains(ProtectedNames, appId) {
		return "", i18n.T("ProtectedServiceName", appId), nil
	}

	// 检查目标是否存在
	appConfig := GetAppConfig(appId)
	if appConfig != nil {
		errorMessages := map[string]string{
			"installed":    i18n.T("AppAlreadyExists"),
			"installing":   i18n.T("AppInstallingWait"),
			"uninstalling": i18n.T("AppUninstallingWait"),
		}
		if msg, ok := errorMessages[appConfig.Status]; ok {
			return "", msg, nil
		}
	}

	// 临时目录
	tempDir := filepath.Join(global.WorkDir, "temp", utils.MD5(urlOrFileName))

	// 清空临时目录
	if utils.IsDirExists(tempDir) {
		if err := os.RemoveAll(tempDir); err != nil {
			return "", i18n.T("CleanTempDirFailed"), err
		}
	}

	// 创建临时目录
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return "", i18n.T("CreateTempDirFailed"), err
	}

	// 返回临时目录
	return tempDir, "", nil
}

// ExtractAppId 从 URL 或文件名提取 appId
// 1、如果是 URL，提取appId
// 2、如果是文件名，提取appId
// 3、如果提取失败，返回空字符串
func ExtractAppId(input string) string {
	// 如果是 URL
	if strings.HasPrefix(input, "http://") || strings.HasPrefix(input, "https://") {
		u, err := url.Parse(input)
		if err != nil {
			return ""
		}

		// 处理 GitHub 或其他 Git 仓库 URL
		if strings.Contains(u.Host, "github.com") || strings.Contains(u.Host, "gitlab.com") || strings.Contains(u.Host, "gitee.com") {
			pathParts := strings.Split(strings.Trim(u.Path, "/"), "/")
			if len(pathParts) >= 2 {
				owner := pathParts[0]
				repo := pathParts[1]
				// 移除 .git 后缀
				repo = strings.TrimSuffix(repo, ".git")
				// 移除可能的 tree/branch 部分
				if idx := strings.Index(repo, "/"); idx != -1 {
					repo = repo[:idx]
				}
				return utils.Camel2Snake(owner + "_" + repo)
			}
		}
		return ""
	}

	// 如果是压缩文件
	fileName := filepath.Base(input)
	// 移除 .zip 或 .tar.gz 后缀
	fileName = strings.TrimSuffix(fileName, ".zip")
	fileName = strings.TrimSuffix(fileName, ".tar.gz")
	fileName = strings.TrimSuffix(fileName, ".tgz")

	// 移除版本号（如果存在）
	// 匹配类似 -1.0.0, -v1.0.0, _1.0.0, _v1.0.0 的版本号
	re := regexp.MustCompile(`[-_](v)?\d+(\.\d+)*$`)
	fileName = re.ReplaceAllString(fileName, "")

	// 替换特殊字符为下划线
	re = regexp.MustCompile(`[^a-zA-Z0-9]`)
	fileName = re.ReplaceAllString(fileName, "_")

	// 确保不以数字开头
	if len(fileName) > 0 && unicode.IsDigit(rune(fileName[0])) {
		fileName = "_" + fileName
	}

	return utils.Camel2Snake(fileName)
}

// CheckFileTypeAndUnzip 检查文件类型并解压
// 1、检测文件类型
// 2、根据文件类型解压
// 3、删除临时文件
func CheckFileTypeAndUnzip(filePath, tempDir string) (string, error) {
	// 检测文件类型
	fileType, err := utils.DetectFileType(filePath)
	if err != nil {
		return i18n.T("DetectFileTypeFailed"), err
	}

	// 根据文件类型解压
	switch fileType {
	case utils.FileTypeZip:
		if err := utils.Unzip(filePath, tempDir); err != nil {
			return i18n.T("ExtractFileFailed"), err
		}
	case utils.FileTypeTarGz:
		if err := utils.UnTarGz(filePath, tempDir); err != nil {
			return i18n.T("ExtractFileFailed"), err
		}
	default:
		return i18n.T("UnsupportedFileType"), nil
	}

	// 删除临时文件
	os.Remove(filePath)

	// 返回解压后的文件路径
	return "", nil
}

// CheckAppCompliance 检查应用是否符合要求
// 1、检查config.yml文件
// 2、如果根目录没有config.yml，检查第一个子目录
// 3、如果子目录也没有config.yml，返回错误
// 4、检查name字段
// 5、检查删除apps目录下同名的应用
// 6、移动文件到apps目录
func CheckAppCompliance(appId, tempDir string) (string, error) {
	// 检查config.yml文件
	configFile := filepath.Join(tempDir, "config.yml")
	if !utils.IsFileExists(configFile) {
		// 如果根目录没有config.yml，检查第一个子目录
		entries, err := os.ReadDir(tempDir)
		if err != nil {
			return i18n.T("ConfigYmlNotFound"), nil
		}

		// 查找第一个目录
		var firstDir string
		for _, entry := range entries {
			if entry.IsDir() {
				firstDir = entry.Name()
				break
			}
		}

		if firstDir == "" {
			return i18n.T("ConfigYmlNotFound"), nil
		}

		// 检查子目录中的config.yml
		subDir := filepath.Join(tempDir, firstDir)
		configFile = filepath.Join(subDir, "config.yml")
		if !utils.IsFileExists(configFile) {
			return i18n.T("ConfigYmlNotFound"), nil
		}

		// 更新tempDir为子目录
		tempDir = subDir
	}

	// 解析配置文件
	configData, err := os.ReadFile(configFile)
	if err != nil {
		return i18n.T("ReadConfigFileFailed"), err
	}

	var config map[string]interface{}
	if err := yaml.Unmarshal(configData, &config); err != nil {
		return i18n.T("YamlParseFailed", err.Error()), nil
	}

	// 检查name字段
	name, ok := config["name"].(string)
	if !ok || name == "" {
		return i18n.T("InvalidConfig"), nil
	}

	// 应用目录
	appDir := filepath.Join(global.WorkDir, "apps", appId)

	// 检查目标是否存在
	if utils.IsDirExists(appDir) {
		os.RemoveAll(appDir)
	}

	// 移动文件到目标目录
	if err := os.Rename(tempDir, appDir); err != nil {
		return i18n.T("MoveFileFailed"), err
	}

	return "", nil
}
