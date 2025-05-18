package utils

import (
	"fmt"
	"os"
)

// IsDirExists 检查目录是否存在
func IsDirExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}

// GetSubDirs 获取指定目录下的所有子目录
func GetSubDirs(dir string) ([]string, error) {
	dirs := []string{}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("读取目录失败: %v", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			dirs = append(dirs, entry.Name())
		}
	}

	return dirs, nil
}
