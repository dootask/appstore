package utils

import (
	"regexp"
	"strconv"
	"strings"
)

// CompareVersions 比较两个版本号
func CompareVersions(v1, v2 string) int {
	// 移除版本号中的v前缀
	v1 = strings.TrimPrefix(v1, "v")
	v2 = strings.TrimPrefix(v2, "v")

	// 分割版本号
	parts1 := strings.Split(v1, ".")
	parts2 := strings.Split(v2, ".")

	// 确保两个版本号有相同的段数
	for len(parts1) < 3 {
		parts1 = append(parts1, "0")
	}
	for len(parts2) < 3 {
		parts2 = append(parts2, "0")
	}

	// 逐段比较
	for i := 0; i < 3; i++ {
		num1, _ := strconv.Atoi(parts1[i])
		num2, _ := strconv.Atoi(parts2[i])
		if num1 < num2 {
			return -1
		}
		if num1 > num2 {
			return 1
		}
	}
	return 0
}

// CheckVersionRequirement 检查版本是否满足要求
func CheckVersionRequirement(version, operator, requiredVersion string) bool {
	result := CompareVersions(version, requiredVersion)
	switch operator {
	case "<", "lt":
		return result < 0
	case "<=", "le":
		return result <= 0
	case ">", "gt":
		return result > 0
	case ">=", "ge":
		return result >= 0
	case "==", "=", "eq":
		return result == 0
	case "!=", "<>", "ne":
		return result != 0
	default:
		return false
	}
}

// ParseVersionOperator 解析版本字符串中的操作符
func ParseVersionOperator(version string) (string, string) {
	// 匹配操作符和版本号
	re := regexp.MustCompile(`^\s*([<>=!]*|lt|le|gt|ge|eq|ne)\s*(.+)$`)
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
