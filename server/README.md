# DooTask 应用商店服务端

DooTask 应用商店服务端是一个基于 Golang 和 Gin 框架开发的应用商店后端服务，提供应用列表、安装、卸载等功能。

## API 接口

API 文档可通过 Swagger UI 访问：http://localhost/swagger/index.html


## 启动服务

```bash
# 开发模式启动（后端开发）
go run main.go --work-dir /path/to/workdir
```

### 命令行参数

| 参数              | 说明                          | 默认值      |
|-----------------|-----------------------------|----------|
| --work-dir      | 指定工作目录路径                    | 当前目录 (.) |
| --host-work-dir | 指定宿主机工作目录路径                 | 空        |
| --env-file      | 环境变量文件路径                    | 空        |
| --web-dir       | 前端静态文件目录                    | 空        |
| --port          | 服务端口                          | 80       |
| --mode          | 运行模式 (debug/release/strict) | debug    |

## 更新文档

```bash
swag init -g cmd/cmd.go

# 如果提示错误，请先安装 swag
go install github.com/swaggo/swag/cmd/swag@latest

# 还是不行可以尝试下面命令
export PATH=$PATH:$(go env GOPATH)/bin && swag init -g cmd/cmd.go
```

## 目录结构

```
server/
├── cmd/         - 命令行工具与路由处理
├── docs/        - Swagger 文档
├── global/      - 全局变量与常量
├── middlewares/ - 中间件
├── models/      - 数据模型
├── response/    - 响应处理
├── utils/       - 工具函数
└── main.go      - 主程序入口
```

## 配置说明

应用工作目录结构：

```
workdir/
├── apps/        - 应用源文件目录
├── config/      - 应用配置目录
├── docker/      - Docker 相关文件
├── log/         - 应用日志
└── temp/        - 临时文件目录
```
