package middlewares

import (
	"strings"

	"appstore/api/global"

	"github.com/gin-gonic/gin"
)

// LanguageMiddleware 是一个处理请求语言的中间件
func LanguageMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		langHeader := c.GetHeader("Accept-Language")
		global.Language = global.DefaultLanguage // 默认为DefaultLanguage

		if langHeader != "" {
			// 简单处理，取第一个语言偏好
			// 例如：en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7
			langs := strings.Split(langHeader, ",")
			if len(langs) > 0 {
				firstLang := strings.Split(langs[0], ";")[0]
				firstLang = strings.Split(firstLang, "-")[0] // 取语言代码，如 en, zh
				if firstLang != "" {
					global.Language = strings.ToLower(firstLang)
				}
			}
		}
		c.Next()
	}
}
