package models

import (
	"appstore/server/global"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/sirupsen/logrus"
	"gopkg.in/natefinch/lumberjack.v2"
)

var (
	loggers     = make(map[string]*logrus.Logger)
	loggerMutex sync.RWMutex
)

// appLogFormatter 自定义日志格式化器
// 输出格式: [时间] [LEVEL] 内容
// 例如: [2024-03-21 10:30:00] [INFO] 这是一条信息日志
type appLogFormatter struct{}

func (f *appLogFormatter) Format(entry *logrus.Entry) ([]byte, error) {
	timestamp := entry.Time.Format("2006-01-02 15:04:05")
	level := strings.ToUpper(entry.Level.String())
	msg := entry.Message
	logLine := fmt.Sprintf("[%s] [%s] %s\n", timestamp, level, msg)
	return []byte(logLine), nil
}

// getLogger 获取或创建一个新的logger实例
func getLogger(appId string) *logrus.Logger {
	loggerMutex.RLock()
	if logger, exists := loggers[appId]; exists {
		loggerMutex.RUnlock()
		return logger
	}
	loggerMutex.RUnlock()

	loggerMutex.Lock()
	defer loggerMutex.Unlock()

	// 双重检查
	if logger, exists := loggers[appId]; exists {
		return logger
	}

	// 创建新的logger
	logger := logrus.New()
	logger.SetFormatter(&appLogFormatter{}) // 使用自定义格式化器
	logger.SetReportCaller(false)

	// 设置日志轮转
	logPath := filepath.Join(global.WorkDir, "log", appId+".log")
	writer := &lumberjack.Logger{
		Filename:   logPath,
		MaxSize:    10, // 10MB
		MaxBackups: 0,  // 不保留旧文件
		MaxAge:     0,  // 不限制保留时间
		Compress:   false,
	}

	// 同时输出到文件和控制台
	logger.SetOutput(writer)
	logger.SetLevel(logrus.InfoLevel)

	loggers[appId] = logger
	return logger
}

// AppLogInfo 写入信息日志
func AppLogInfo(appId string, content string) {
	logger := getLogger(appId)
	logger.Info(content)
}

// AppLogError 写入错误日志
func AppLogError(appId string, content string) {
	logger := getLogger(appId)
	logger.Error(content)
}

// AppLogWarn 写入警告日志
func AppLogWarn(appId string, content string) {
	logger := getLogger(appId)
	logger.Warn(content)
}

// AppLogDebug 写入调试日志
func AppLogDebug(appId string, content string) {
	logger := getLogger(appId)
	logger.Debug(content)
}

// GetAppLog 读取应用日志的最新 n 行
func GetAppLog(appId string, n int) ([]string, error) {
	if n <= 0 {
		return []string{}, nil
	}
	logPath := filepath.Join(global.WorkDir, "log", appId+".log")
	file, err := os.Open(logPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, err
	}
	defer file.Close()

	const avgLineLen = 200 // 估算每行平均长度
	fileInfo, err := file.Stat()
	if err != nil {
		return nil, err
	}
	fileSize := fileInfo.Size()

	// 预估需要读取的字节数
	readSize := int64(n * avgLineLen)
	if readSize > fileSize {
		readSize = fileSize
	}
	start := fileSize - readSize
	if start < 0 {
		start = 0
	}

	_, err = file.Seek(start, 0)
	if err != nil {
		return nil, err
	}

	buf := make([]byte, fileSize-start)
	_, err = file.Read(buf)
	if err != nil && err.Error() != "EOF" {
		return nil, err
	}

	lines := splitLines(string(buf))
	// 如果不是从文件头开始，可能第一行是不完整的，丢弃
	if start != 0 && len(lines) > 0 {
		lines = lines[1:]
	}

	if len(lines) > n {
		lines = lines[len(lines)-n:]
	}

	// 只返回格式化好的原始日志行
	return lines, nil
}

// splitLines 按行分割，兼容 \n 和 \r\n
func splitLines(s string) []string {
	res := []string{}
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			line := s[start:i]
			if len(line) > 0 && line[len(line)-1] == '\r' {
				line = line[:len(line)-1]
			}
			res = append(res, line)
			start = i + 1
		}
	}
	if start < len(s) {
		res = append(res, s[start:])
	}
	return res
}
