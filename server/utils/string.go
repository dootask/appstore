package utils

import (
	"crypto/md5"
	"encoding/hex"
	"net/url"
	"strings"
	"unicode"
)

// IsValidURL 检查URL是否有效
func IsValidURL(str string) bool {
	u, err := url.Parse(str)
	return err == nil && u.Scheme != "" && u.Host != ""
}

// GetURLScheme 获取URL的协议
func GetURLScheme(str string) string {
	u, err := url.Parse(str)
	if err != nil {
		return ""
	}
	return u.Scheme
}

// MD5 计算字符串的MD5值
func MD5(str string) string {
	h := md5.New()
	h.Write([]byte(str))
	return hex.EncodeToString(h.Sum(nil))
}

// Camel2Snake 驼峰转下划线
func Camel2Snake(s string) string {
	var result strings.Builder
	for i, r := range s {
		if i > 0 && unicode.IsUpper(r) {
			result.WriteRune('_')
		}
		result.WriteRune(unicode.ToLower(r))
	}
	return result.String()
}
