package middlewares

import (
	"fmt"
	"strings"

	"appstore/server/global"

	"github.com/gin-gonic/gin"
)

// Middleware 是一个处理请求的中间件
func Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 基础地址
		scheme := "http"
		if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
			scheme = "https"
		}
		host := c.Request.Host
		global.BaseUrl = fmt.Sprintf("%s://%s", scheme, host)

		// 语言偏好
		global.Language = global.DefaultLanguage
		langHeader := c.GetHeader("Accept-Language")
		if langHeader != "" {
			langs := strings.Split(langHeader, ",")
			if len(langs) > 0 {
				firstLang := strings.Split(langs[0], ";")[0]
				firstLang = strings.Split(firstLang, "-")[0]
				if firstLang != "" {
					global.Language = strings.ToLower(firstLang)
				}
			}
		}

		c.Next()
	}
}
