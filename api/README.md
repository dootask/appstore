# DooTask AppStore Backend

这是DooTask应用商店的后端服务。

## 项目结构

```
backend/
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

## 目录结构要求

配置目录下必须包含 `apps` 目录，用于存放应用：

```
config/
  └── apps/
      ├── app1/
      ├── app2/
      └── app3/
```

## API 接口

### 获取应用列表

- 请求方法：GET
- 请求路径：/api/v1/list
- 响应示例：
```json
{
    "code": 200,
    "message": "success",
    "data": [
        {
            "id": "app1",
            "name": "",
            "description": "",
            "icon": "",
            "version": "0.0.1"
        }
    ]
}
```
