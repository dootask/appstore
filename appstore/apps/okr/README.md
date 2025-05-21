# DooTask OKR

The official repository for the [DooTask](https://github.com/kuaifan/dootask) OKR, can be installed via the [DooTask](https://github.com/kuaifan/dootask) App Store.

### DooTask OKR Listing Criteria:

- Well-known and active open-source projects
- Significant installation base
- Official Docker images provided
- Other approved projects

## Directory Structure

The directory structure of the DooTask OKR is as follows:

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

### `config.yml` example and description

```yaml
# Basic information

name: OKR                          # Application name (multi-language support)
description:                       # Application description (multi-language support)
  en: A tool that helps teams efficiently set, track, and achieve objectives and key results, making goal management simple and transparent.
  zh: 一款帮助团队高效设定、跟踪和实现目标与关键结果的工具，让目标管理变得简单透明。
tags:                              # Application tags
  - OKR
  - 目标管理
  - 项目管理
author: DooTask                    # Author name
website: https://www.dootask.com   # Website URL
github: https://github.com/...     # GitHub repository URL (optional)
document: https://example.com      # Documentation URL (optional)

# Field configuration options
fields:                           # Define configurable fields for the application
  - name: PORT                    # Field variable name
    label:                        # Field label (multi-language support)
      en: Port
      zh: 端口
    placeholder:                  # Field placeholder (multi-language support)
      en: Service Port
      zh: 服务端口
    type: number                  # Field type (number, text, select)
    default: 3306                 # Default value
  - name: INSTALL_TYPE
    label:
      en: Install type
      zh: 安装类型
    type: select
    required: true                # Whether the field is required (default: false)
    options:                      # Select options (optional, only for select type)
      - label: Docker             # Option label (multi-language support)
        value: docker             # Option value
      - label: Docker Compose
        value: docker-compose
    default: docker

# Version uninstallation requirements (optional)
require_uninstalls:               # Specify which versions require uninstallation first
  - version: "2.0.0"              # Specific version that requires uninstallation
    reason: "Structure changes"   # Reason for uninstallation (multi-language support)

  - version: ">= 3.0.0"           # Version range that requires uninstallation
    reason:                       # Reason for uninstallation (multi-language support)
      en: Structure changes
      zh: 结构变化

# Menu items configuration (optional)
menu_items:                       # Define application menu entries
  - location: application         # Menu location (supported values: application, application/admin, main/menu)
    label:                        # Menu label (multi-language support)
      en: App Management
      zh: 应用管理
    url: apps/okr/list            # Menu URL
    icon: ./icon.png              # Menu icon path
    transparent: false            # Whether the page uses transparent background (optional, default: false)
    autoDarkTheme: true           # Whether to automatically adapt to dark theme. If the app has its own dark theme, set to false (optional, default: true)
    keepAlive: true               # Whether to cache the app instead of destroying it when closed, to preserve state and improve performance (optional, default: true)
```

### `docker-compose.yml` example and description

```yaml
services:
  okr-service:
    image: dootask/okr:latest
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - APP_PORT=${PORT}  # PORT is defined in the fields section of config.yml
    ports:
      - "${PORT}:8080"    # Expose the configured port
    volumes:
      - ./data:/app/data
    restart: always
```

### `nginx.conf` example and description

```nginx
# This configuration will be included in the main server block via include directive

# Application proxy configuration
location /apps/okr/ {
    # Proxy headers for proper connection handling
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    
    # Proxy to the application service
    proxy_pass http://okr-service:8080/;
}
```

*Note: This configuration will be included in the existing server block through an include directive in the main Nginx configuration. No need to define a new server block.*
