package middlewares

import (
	"fmt"
	"strings"

	"appstore/server/global"
	"appstore/server/models"
	"appstore/server/response"

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

// DooTaskTokenMiddleware 是一个 DooTask 的 token 验证中间件
func DooTaskTokenMiddleware(identity ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		token = strings.TrimPrefix(token, "Bearer ")
		if token == "" {
			response.ErrorWithDetail(c, global.CodeError, "身份验证失败", nil)
			c.Abort()
			return
		}

		// 验证 token
		var err error
		if len(identity) > 0 {
			_, err = models.DooTaskCheckUserIdentity(token, identity[0])
		} else {
			_, err = models.DooTaskCheckUser(token)
		}
		if err != nil {
			response.ErrorWithDetail(c, global.CodeError, "权限不足", err)
			c.Abort()
			return
		}

		c.Next()
	}
}
