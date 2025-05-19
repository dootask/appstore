package utils

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

// IsDirExists 检查目录是否存在
func IsDirExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}

// IsFileExists 检查文件是否存在
func IsFileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
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

// Unzip 解压zip文件到指定目录
func Unzip(zipFile string, destDir string) error {
	reader, err := zip.OpenReader(zipFile)
	if err != nil {
		return err
	}
	defer reader.Close()

	for _, file := range reader.File {
		path := filepath.Join(destDir, file.Name)

		if file.FileInfo().IsDir() {
			if err := os.MkdirAll(path, 0755); err != nil {
				return err
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return err
		}

		writer, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
		if err != nil {
			return err
		}

		reader, err := file.Open()
		if err != nil {
			writer.Close()
			return err
		}

		_, err = io.Copy(writer, reader)
		writer.Close()
		reader.Close()
		if err != nil {
			return err
		}
	}

	return nil
}

// CopyDir 复制目录
func CopyDir(src string, dest string, overwrite bool) error {
	// 获取源目录信息
	srcInfo, err := os.Stat(src)
	if err != nil {
		return err
	}

	// 创建目标目录
	if err := os.MkdirAll(dest, srcInfo.Mode()); err != nil {
		return err
	}

	// 读取源目录内容
	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		srcPath := filepath.Join(src, entry.Name())
		destPath := filepath.Join(dest, entry.Name())

		if entry.IsDir() {
			// 递归复制子目录
			if err := CopyDir(srcPath, destPath, overwrite); err != nil {
				return err
			}
		} else {
			// 复制文件
			if err := CopyFile(srcPath, destPath, overwrite); err != nil {
				return err
			}
		}
	}

	return nil
}

// CopyFile 复制文件
func CopyFile(src string, dest string, overwrite bool) error {
	// 检查目标文件是否存在
	if !overwrite {
		if _, err := os.Stat(dest); err == nil {
			return nil
		}
	}

	// 打开源文件
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	// 创建目标文件
	destFile, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer destFile.Close()

	// 复制文件内容
	_, err = io.Copy(destFile, srcFile)
	if err != nil {
		return err
	}

	// 获取源文件权限
	srcInfo, err := srcFile.Stat()
	if err != nil {
		return err
	}

	// 设置目标文件权限
	return os.Chmod(dest, srcInfo.Mode())
}
