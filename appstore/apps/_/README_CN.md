# DooTask 应用开发指南

本文档将指导你如何为 [DooTask](https://www.dootask.com) 开发应用。通过遵循这些指南，你可以创建符合 DooTask 应用商店标准的应用。

## 创建应用

### 目录结构

应用的标准目录结构如下：

```
├── AppDirectory
    ├── 1.0.0
        ├── ...
        ├── docker-compose.yml
        └── nginx.conf
    ├── ...
    ├── config.yml
    ├── logo.png    # 也可以使用 logo.svg
    └── README.md   # 支持多语言（比如: README.md、README_CN.md，默认使用: README.md）
```

### `config.yml` 配置说明

`config.yml` 是应用 **必需** 的配置文件，用于定义应用的基本信息和配置选项：

```yaml
# 基本信息

name: 应用名称                          # 应用名称（支持多语言）
description:                           # 应用描述（支持多语言）
  en: English description
  zh: 中文描述
tags:                                  # 应用标签
  - 标签1
  - 标签2
author: 作者名称                        # 作者名称
website: https://example.com           # 网站地址
github: https://github.com/...         # GitHub 仓库地址（可选）
document: https://example.com          # 文档地址（可选）

# 字段配置选项（可选）
fields:                               # 定义应用的可配置字段
  - name: PORT                        # 字段变量名
    label:                            # 字段标签（支持多语言）
      en: Port
      zh: 端口
    placeholder:                      # 字段占位符（支持多语言）
      en: Service Port
      zh: 服务端口
    type: number                      # 字段类型（number, text, select）
    default: 3306                     # 默认值
  - name: INSTALL_TYPE
    label:
      en: Install type
      zh: 安装类型
    type: select
    required: true                    # 字段是否必填（默认：false）
    options:                          # 选择选项（可选，仅用于 select 类型）
      - label: Docker                 # 选项标签（支持多语言）
        value: docker                 # 选项值
      - label: Docker Compose
        value: docker-compose
    default: docker

# 版本卸载要求（可选）
require_uninstalls:                   # 指定需要先卸载的版本
  - version: "2.0.0"                  # 需要卸载的特定版本
    reason: "结构变更"                 # 卸载原因（支持多语言）

  - version: ">= 3.0.0"               # 需要卸载的版本范围
    reason:                           # 卸载原因（支持多语言）
      en: Structure changes
      zh: 结构变化

# 菜单项配置（可选）
menu_items:                           # 定义应用菜单入口
  - location: application             # 菜单位置（支持值见下文）
    label:                            # 菜单标签（支持多语言）
      en: App Management
      zh: 应用管理
    url: apps/example/list            # 菜单 URL
    icon: ./icon.png                  # 菜单图标路径
    # 以下配置可选
    onlyAdmin: true                   # 仅管理员可见（可选，默认：false）
    transparent: false                # 页面是否使用透明背景（可选，默认：false）
    autoDarkTheme: true               # 是否自动适配深色主题（可选，默认：true）
    keepAlive: true                   # 是否保持应用状态（可选，默认：true）
```

#### `menu_items.location` 支持的值：
- `application` 应用常用菜单
- `application/admin` 应用管理菜单
- `main/menu` 主菜单

### `docker-compose.yml` 配置说明

`docker-compose.yml` 是应用版本 **必需** 的配置文件，用于定义应用的容器配置：

```yaml
services:
  app-service:
    image: your-app-image:latest
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - APP_PORT=${PORT}  # PORT 在 config.yml 的 fields 部分定义
    ports:
      - "${PORT}:8080"
    volumes:
      - ./data:/app/data
    restart: always
```

### `nginx.conf` 配置说明

`nginx.conf` 文件是可选的，用于定义应用版本的 Nginx 代理配置：

```nginx
# 此配置将通过 include 指令包含在主服务器块中

# 应用代理配置
location /apps/your-app/ {
    # 代理头信息，用于正确处理连接
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    
    # 代理到应用服务
    proxy_pass http://app-service:8080/;
}
```

## 开发应用

### 前端开发

前端开发方式与开发普通网站类似。建议统一使用 TailwindCSS 进行样式规范，提升界面一致性和开发效率。
如需与 DooTask 主应用进行交互（如获取用户信息、打开新窗口、请求主服务器接口等），推荐使用官方工具库 [@dootask/tools](https://www.npmjs.com/package/@dootask/tools)。该库提供了丰富的 API，具体用法和更多功能请参考工具库文档。

### 后端开发

后端开发同样与常规应用开发一致。你可以根据业务需求自由实现后端逻辑，无需特殊限制。

### 应用打包与发布

开发完成后，请将你的应用打包为 Docker 容器，并结合 `docker-compose.yml` 和 `nginx.conf` 进行配置和发布。这样可以确保应用在 DooTask 平台上的标准化部署和运行。

### 参考示例

你可以参考以下开源项目，了解实际的 DooTask 应用开发与发布流程：

- [DooTask 应用商城](https://github.com/dootask/appstore)
- [DooTask OKR 应用](https://github.com/hitosea/dootask-okr)

## 安装应用

支持通过以下几种方式将应用安装到 DooTask 中：

### 1. 本地应用安装

1. **准备应用包**
   - 将应用目录打包成 zip 或 tar.gz 格式
   - 确保包含所有必要文件
   - 检查配置文件是否正确

2. **安装步骤**
   - 使用管理员登录 DooTask
   - 进入应用商店
   - 点击"上传本地应用"
   - 选择应用压缩包
   - 提交安装

### 2. URL 安装

1. **准备应用包**
   - 将应用目录打包成 zip 或 tar.gz 格式
   - 上传到自有服务器
   - 获取可访问的 URL 地址

2. **安装步骤**
   - 使用管理员登录 DooTask
   - 进入应用商店
   - 点击"从 URL 安装"
   - 输入应用包 URL
   - 提交安装

### 3. GitHub 安装

1. **准备仓库**
   - 将应用代码提交到 GitHub
   - 确保仓库结构符合要求
   - 设置适当的访问权限

2. **安装步骤**
   - 使用管理员登录 DooTask
   - 进入应用商店
   - 点击"从 URL 安装"
   - 输入 GitHub 仓库地址
   - 提交安装

## 发布应用

将应用提交到 DooTask 应用商店，可以让更多用户使用你的应用。提交步骤如下：

1. **准备应用包**
   - 确保应用符合所有要求
   - 提供完整的文档
   - 测试所有功能
   - 将应用目录打包成 zip 或 tar.gz 格式

2. **提交应用**
   - 访问 [DooTask 应用商店](https://appstore.dootask.com/)
   - 登录用户中心
   - 点击"提交应用"
   - 上传应用压缩包
   - 填写应用信息
   - 提交审核

3. **等待审核**
   - 应用将进入审核队列
   - 审核人员会检查应用是否符合要求
   - 如有问题会收到反馈通知

4. **安装应用**
   - 审核通过后应用将自动发布
   - 使用管理员登录 DooTask 通过"更新应用列表"看到此应用
   - 可直接在 DooTask 中安装应用

5. **后续维护**
   - 及时响应用户反馈
   - 定期更新应用
   - 保持应用质量

## 开发建议

1. **版本管理**
   - 每个版本使用独立的目录
   - 版本号遵循语义化版本规范
   - 保持向后兼容性

2. **配置文件**
   - 使用环境变量进行配置
   - 提供合理的默认值
   - 支持多语言配置

3. **安全性**
   - 使用安全的默认配置
   - 避免硬编码敏感信息
   - 遵循最小权限原则

4. **性能优化**
   - 优化容器镜像大小
   - 合理配置资源限制
   - 使用缓存机制

5. **文档**
   - 提供详细的安装说明
   - 说明配置选项的用途
   - 提供常见问题解答

## 支持

如有问题，请通过以下方式获取支持：

- GitHub Issues: [提交问题](https://github.com/kuaifan/dootask/issues)
- 社区: [加入讨论](https://github.com/kuaifan/dootask/discussions)
