package utils

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
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

// FormatNumber 格式化数字为带千位分隔符的字符串
func FormatNumber(n int) string {
	// 将数字转换为字符串
	s := fmt.Sprintf("%d", n)

	// 如果数字小于1000，直接返回
	if n < 1000 {
		return s
	}

	// 添加千位分隔符
	var result strings.Builder
	for i, digit := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result.WriteRune(',')
		}
		result.WriteRune(digit)
	}

	return result.String()
}

// HasPrefixInArray 判断字符串是否在数组前缀中
func HasPrefixInArray(str string, arr []string) bool {
	for _, prefix := range arr {
		if strings.HasPrefix(str, prefix) {
			return true
		}
	}
	return false
}
