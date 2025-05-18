# DooTask OKR

这是 [DooTask](https://github.com/kuaifan/dootask) OKR 的官方仓库，可通过 [DooTask](https://github.com/kuaifan/dootask) 应用商店安装。

### DooTask OKR 收录标准：

- 知名且活跃的开源项目
- 具有显著的安装基础
- 提供官方 Docker 镜像
- 其他经批准的项目

## 目录结构

DooTask OKR 的目录结构如下：

```
├── AppDirectory
    ├── 1.0.0
        ├── ...
        ├── docker-compose.yml
        └── nginx.conf
    ├── ...
    ├── config.yml
    ├── logo.png    # 支持 logo.svg
    └── README.md
```

### `config.yml` 示例和说明

```yaml
# 基本信息

name: OKR                          # 应用名称（支持多语言）
description:                       # 应用描述（支持多语言）
  en: A tool that helps teams efficiently set, track, and achieve objectives and key results, making goal management simple and transparent.
  zh: 一款帮助团队高效设定、跟踪和实现目标与关键结果的工具，让目标管理变得简单透明。
tags:                              # 应用标签
  - OKR
  - 目标管理
  - 项目管理
  - 绩效管理
  - 团队协作
author: DooTask                    # 作者名称
website: https://www.dootask.com   # 网站地址
github: https://github.com/...     # GitHub 仓库地址（可选）
document: https://example.com      # 文档地址（可选）

# 字段配置选项
fields:                           # 定义应用的可配置字段
  - name: PORT                    # 字段变量名
    label:                        # 字段标签（支持多语言）
      en: Port
      zh: 端口
    placeholder:                  # 字段占位符（支持多语言）
      en: Service Port
      zh: 服务端口
    type: number                  # 字段类型（number, text, select）
    default: 3306                 # 默认值
  - name: INSTALL_TYPE
    label:
      en: Install type
      zh: 安装类型
    type: select
    required: true                # 字段是否必填（默认：false）
    options:                      # 选择选项（可选，仅用于 select 类型）
      - label: Docker             # 选项标签（支持多语言）
        value: docker             # 选项值
      - label: Docker Compose
        value: docker-compose
    default: docker

# 版本卸载要求（可选）
require_uninstalls:               # 指定需要先卸载的版本
  - version: "2.0.0"              # 需要卸载的特定版本
    reason: "结构变更"             # 卸载原因（支持多语言）

  - version: ">= 3.0.0"           # 需要卸载的版本范围
    reason:                       # 卸载原因（支持多语言）
      en: Structure changes
      zh: 结构变化

# 菜单项配置（可选）
menu_items:                       # 定义应用菜单入口
  - location: application         # 菜单位置（支持值：application, application/admin, main/menu）
    label:                        # 菜单标签（支持多语言）
      en: App Management
      zh: 应用管理
    url: apps/okr/list            # 菜单 URL
    icon: ./icon.png              # 菜单图标路径
    transparent: false            # 页面是否使用透明背景（可选，默认：false）
    autoDarkTheme: true           # 是否自动适配深色主题，如果应用自己有深色主题，请设置为 false（可选，默认：true）
    keepAlive: true               # 关闭时是否缓存应用而不是销毁，以保持状态并提高性能（可选，默认：true）
```

### `docker-compose.yml` 示例和说明

```yaml
services:
  okr-service:
    image: dootask/okr:latest
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - APP_PORT=${PORT}  # PORT 在 config.yml 的 fields 部分定义
    ports:
      - "${PORT}:8080"    # 暴露配置的端口
    volumes:
      - ./data:/app/data
    restart: always
```

### `nginx.conf` 示例和说明

```nginx
# 此配置将通过 include 指令包含在主服务器块中

# 应用代理配置
location /apps/okr/ {
    # 代理头信息，用于正确处理连接
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    
    # 代理到应用服务
    proxy_pass http://okr-service:8080/;
}
```

*注意：此配置将通过主 Nginx 配置中的 include 指令包含在现有的服务器块中。无需定义新的服务器块。*
