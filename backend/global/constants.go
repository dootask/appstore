package global

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
	WorkDir  string
	Language string
)
