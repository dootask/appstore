package middlewares

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"appstore/server/global"
	"appstore/server/models"
	"appstore/server/response"
	"appstore/server/utils"

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
		host := c.GetHeader("X-Forwarded-Host")
		if host == "" {
			host = c.Request.Host
		}
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

// WebStaticMiddleware 处理前端静态文件
func WebStaticMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		prePaths := []string{"/api/", "/swagger/"}
		if global.WebDir != "" && !utils.HasPrefixInArray(c.Request.URL.Path, prePaths) {
			// 尝试访问请求的文件
			filePath := filepath.Join(global.WebDir, c.Request.URL.Path)
			if _, err := os.Stat(filePath); err == nil {
				c.File(filePath)
				c.Abort()
				return
			}
			// 如果文件不存在，返回 index.html
			c.File(filepath.Join(global.WebDir, "index.html"))
			c.Abort()
			return
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
