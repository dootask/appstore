# DooTask AppStore Backend

这是DooTask应用商店的后端服务。

## 项目结构

```
server/
├── global/         # 全局常量和配置
├── models/         # 数据模型
├── response/       # 响应处理
├── utils/          # 工具函数
├── main.go         # 主程序入口
└── README.md       # 项目说明文档
```

## 环境要求

- Go 1.21 或更高版本

## 安装依赖

```bash
go mod tidy
```

## 运行服务

```bash
go run main.go --work-dir /path/to/your/config
```

服务将在 http://localhost:8080 启动
