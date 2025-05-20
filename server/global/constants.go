package global

import "github.com/go-playground/validator/v10"

const (
	// 默认配置
	DefaultPort     = "8080"
	DefaultMode     = "debug"
	DefaultLanguage = "en"

	// API 版本
	APIVersion = "v1"

	// 响应码
	CodeSuccess = 200
	CodeError   = 500

	// 运行模式
	ModeDebug   = "debug"
	ModeRelease = "release"
)

// 全局变量
var (
	WorkDir string // 工作目录，用于存储应用商店资源包
	WebDir  string // 前端静态文件目录，用于存储前端静态文件

	BaseUrl  string // 基础URL
	Language string // 用户语言

	Validator *validator.Validate // 验证器
)
