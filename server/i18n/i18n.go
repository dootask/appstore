package i18n

import (
	"appstore/server/global"
	"embed"
	"fmt"
	"reflect"
	"regexp"
	"strings"
	"sync"

	"github.com/nicksnyder/go-i18n/v2/i18n"
	"golang.org/x/text/language"
	"gopkg.in/yaml.v3"
)

var (
	bundle      *i18n.Bundle
	localizer   *i18n.Localizer
	initialized bool
	initMutex   sync.Mutex
)

// T 获取翻译文本
// 参数说明:
//   - messageID: 翻译消息ID，对应翻译文件中的key
//   - args: 可变参数，支持以下两种格式:
//     1. 普通参数: 用于替换翻译文本中的 %s, %d 等占位符
//     2. map参数: 用于替换翻译文本中的 {{.Key}} 模板变量
//
// 返回值:
//   - string: 翻译后的文本，如果翻译失败则返回原始messageID
//
// 使用示例:
//
//  1. 基本翻译:
//     T("hello")  // 返回: "你好"
//
//  2. 带普通参数的翻译:
//     T("welcome", "小明")  // 假设翻译文本为 "欢迎 %s"，返回: "欢迎 小明"
//
//  3. 带map参数的翻译:
//     T("greeting", map[string]interface{}{"Name": "小明"})  // 假设翻译文本为 "你好，{{.Name}}"，返回: "你好，小明"
//
//  4. 合并多个map参数:
//     T("user_info",
//     map[string]interface{}{"Name": "小明"},
//     map[string]interface{}{"Age": 18})  // 假设翻译文本为 "用户信息：{{.Name}}，年龄：{{.Age}}"，返回: "用户信息：小明，年龄：18"
//
//  5. 不存在的翻译ID:
//     T("non_exist_id")  // 返回: "non_exist_id"
func T(messageID string, args ...interface{}) string {
	initI18n()

	if localizer == nil {
		return messageID
	}

	// 创建配置
	config := &i18n.LocalizeConfig{
		MessageID: messageID,
	}

	// 处理参数
	if len(args) > 0 {
		if reflect.TypeOf(args[0]).Kind() == reflect.Map {
			// 合并所有map参数
			mergedMap := make(map[string]interface{})
			for _, arg := range args {
				if m, ok := arg.(map[string]interface{}); ok {
					for k, v := range m {
						mergedMap[k] = v
					}
				}
			}
			config.TemplateData = mergedMap
		} else {
			// 非map参数手动替换
			message, err := localizer.Localize(config)
			if err != nil {
				message = messageID
			}
			matches := regexp.MustCompile(`%[sdv]`).FindAllString(message, -1)
			for i, match := range matches {
				if i < len(args) {
					message = strings.Replace(message, match, fmt.Sprintf("%"+match[1:], args[i]), 1)
				}
			}
			if len(args) > len(matches) {
				for i := len(matches); i < len(args); i++ {
					message += fmt.Sprintf(" %v", args[i])
				}
			}
			return message
		}
	}

	// 获取翻译
	message, err := localizer.Localize(config)
	if err != nil {
		return messageID
	}
	return message
}

// UpdateLocalizer 更新当前本地化器
func UpdateLocalizer(lang ...string) {
	initI18n()
	lang = append(lang, global.Language, global.DefaultLanguage)
	localizer = i18n.NewLocalizer(bundle, lang...)
}

// ****************************************************************************
// ****************************************************************************
// ****************************************************************************

//go:embed locales/*.yaml
var LocaleFS embed.FS

// initI18n 初始化国际化
func initI18n() {
	if initialized {
		return
	}

	initMutex.Lock()
	defer initMutex.Unlock()

	// 创建语言包
	bundle = i18n.NewBundle(language.English)
	bundle.RegisterUnmarshalFunc("yaml", yaml.Unmarshal)

	// 加载翻译文件
	entries, _ := LocaleFS.ReadDir("locales")
	for _, entry := range entries {
		if strings.HasSuffix(entry.Name(), ".yaml") {
			_, _ = bundle.LoadMessageFileFS(LocaleFS, "locales/"+entry.Name())
		}
	}

	// 创建默认本地化器
	localizer = i18n.NewLocalizer(bundle, global.Language, global.DefaultLanguage)
	initialized = true
}
