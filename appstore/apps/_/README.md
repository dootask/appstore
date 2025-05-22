# DooTask App Development Guide

This document will guide you through developing applications for [DooTask](https://www.dootask.com). By following these guidelines, you can create applications that meet the DooTask App Store standards.

## Directory Structure

The standard directory structure for applications is as follows:

```
├── AppDirectory
    ├── 1.0.0
        ├── ...
        ├── docker-compose.yml
        └── nginx.conf
    ├── ...
    ├── config.yml
    ├── logo.png    # logo.svg is also supported
    └── README.md
```

### `config.yml` Configuration Guide

`config.yml` is the application configuration file that defines basic information and configuration options:

```yaml
# Basic Information

name: App Name                          # Application name (multi-language support)
description:                           # Application description (multi-language support)
  en: English description
  zh: Chinese description
tags:                                  # Application tags
  - Tag1
  - Tag2
author: Author Name                    # Author name
website: https://example.com           # Website URL
github: https://github.com/...         # GitHub repository URL (optional)
document: https://example.com          # Documentation URL (optional)

# Field Configuration Options (Optional)
fields:                               # Define configurable fields for the application
  - name: PORT                        # Field variable name
    label:                            # Field label (multi-language support)
      en: Port
      zh: 端口
    placeholder:                      # Field placeholder (multi-language support)
      en: Service Port
      zh: 服务端口
    type: number                      # Field type (number, text, select)
    default: 3306                     # Default value
  - name: INSTALL_TYPE
    label:
      en: Install type
      zh: 安装类型
    type: select
    required: true                    # Whether the field is required (default: false)
    options:                          # Select options (optional, only for select type)
      - label: Docker                 # Option label (multi-language support)
        value: docker                 # Option value
      - label: Docker Compose
        value: docker-compose
    default: docker

# Version Uninstallation Requirements (Optional)
require_uninstalls:                   # Specify versions that require uninstallation first
  - version: "2.0.0"                  # Specific version that requires uninstallation
    reason: "Structure changes"       # Reason for uninstallation (multi-language support)

  - version: ">= 3.0.0"               # Version range that requires uninstallation
    reason:                           # Reason for uninstallation (multi-language support)
      en: Structure changes
      zh: 结构变化

# Menu Items Configuration (Optional)
menu_items:                           # Define application menu entries
  - location: application             # Menu location (supported values: application, application/admin, main/menu)
    label:                            # Menu label (multi-language support)
      en: App Management
      zh: 应用管理
    url: apps/example/list            # Menu URL
    icon: ./icon.png                  # Menu icon path
    transparent: false                # Whether the page uses transparent background (optional, default: false)
    autoDarkTheme: true               # Whether to automatically adapt to dark theme (optional, default: true)
    keepAlive: true                   # Whether to keep app state (optional, default: true)
```

### `docker-compose.yml` Configuration Guide

`docker-compose.yml` file defines the container configuration for the application:

```yaml
services:
  app-service:
    image: your-app-image:latest
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - APP_PORT=${PORT}  # PORT is defined in the fields section of config.yml
    ports:
      - "${PORT}:8080"
    volumes:
      - ./data:/app/data
    restart: always
```

### `nginx.conf` Configuration Guide

`nginx.conf` file defines the Nginx proxy configuration for the application:

```nginx
# This configuration will be included in the main server block via include directive

# Application proxy configuration
location /apps/your-app/ {
    # Proxy headers for proper connection handling
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    
    # Proxy to the application service
    proxy_pass http://app-service:8080/;
}
```

## Installation in DooTask

DooTask supports the following installation methods:

### 1. Local Application Installation

1. **Prepare Application Package**
   - Package the application directory into zip or tar.gz format
   - Ensure all necessary files are included
   - Verify configuration files are correct

2. **Installation Steps**
   - Log in to DooTask as administrator
   - Go to App Store
   - Click "Upload Local App"
   - Select the application package
   - Submit installation

### 2. URL Installation

1. **Prepare Application Package**
   - Package the application directory into zip or tar.gz format
   - Upload to your own server
   - Get an accessible URL

2. **Installation Steps**
   - Log in to DooTask as administrator
   - Go to App Store
   - Click "Install from URL"
   - Enter the application package URL
   - Submit installation

### 3. GitHub Installation

1. **Prepare Repository**
   - Submit application code to GitHub
   - Ensure repository structure meets requirements
   - Set appropriate access permissions

2. **Installation Steps**
   - Log in to DooTask as administrator
   - Go to App Store
   - Click "Install from URL"
   - Enter GitHub repository address
   - Submit installation

## Publishing Application

Submitting your application to the DooTask App Store allows more users to use your application. The submission process is as follows:

1. **Prepare Application Package**
   - Ensure the application meets all requirements
   - Provide complete documentation
   - Test all functionality
   - Package the application directory into zip or tar.gz format

2. **Submit Application**
   - Visit [DooTask App Store](https://appstore.dootask.com/)
   - Log in to user center
   - Click "Submit Application"
   - Upload application package
   - Fill in application information
   - Submit for review

3. **Wait for Review**
   - Application will enter review queue
   - Reviewers will check if the application meets requirements
   - You will receive feedback notifications if there are issues

4. **Install Application**
   - After approval, the application will be automatically published
   - Administrators can see the application in DooTask by updating the application list
   - The application can be installed directly in DooTask

5. **Maintenance**
   - Respond to user feedback promptly
   - Update application regularly
   - Maintain application quality

## Development Recommendations

1. **Version Management**
   - Use separate directories for each version
   - Follow semantic versioning
   - Maintain backward compatibility

2. **Configuration**
   - Use environment variables for configuration
   - Provide reasonable default values
   - Support multi-language configuration

3. **Security**
   - Use secure default configurations
   - Avoid hardcoding sensitive information
   - Follow the principle of least privilege

4. **Performance Optimization**
   - Optimize container image size
   - Configure resource limits appropriately
   - Use caching mechanisms

5. **Documentation**
   - Provide detailed installation instructions
   - Explain configuration options
   - Provide FAQ

## Support

If you have any questions, please get support through the following channels:

- GitHub Issues: [Submit Issues](https://github.com/kuaifan/dootask/issues)
- Community: [Join Discussion](https://github.com/kuaifan/dootask/discussions)
