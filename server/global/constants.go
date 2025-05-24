package global

import "github.com/go-playground/validator/v10"

// 常量
const (
	DefaultLanguage = "en" // 默认语言

	APIVersion = "v1" // API版本

	CodeSuccess = 200 // 成功
	CodeError   = 500 // 错误

	ModeDebug   = "debug"   // 调试模式
	ModeRelease = "release" // 发布模式
	ModeStrict  = "strict"  // 严格模式
)

// 全局变量
var (
	WorkDir     string // 程序工作目录，用于存储应用商店资源包
	HostWorkDir string // 宿主机工作目录，用于替换docker-compose.yml中的挂载路径
	EnvFile     string // 环境变量文件，需要加载的环境变量文件
	WebDir      string // 前端静态文件目录，用于存储前端静态文件

	BaseUrl  string // 基础URL
	Port     string // 服务端口
	Language string // 用户语言

	Validator *validator.Validate // 验证器
)
