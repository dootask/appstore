# DooTask App Development Guide

This document will guide you through developing applications for [DooTask](https://www.dootask.com). By following these guidelines, you can create apps that meet the standards of the DooTask App Store.

## Create an App

### Directory Structure

A standard app directory structure looks like this:

```
├── AppDirectory
    ├── 1.0.0
        ├── ...
        ├── docker-compose.yml
        └── nginx.conf
    ├── ...
    ├── config.yml
    ├── logo.png    # logo.svg is also supported
    └── README.md   # Supports multiple languages (e.g., README.md, README_CN.md; default: README.md)
```

### `config.yml` Description

`config.yml` is a **required** configuration file that defines the app's basic information and configuration options:

```yaml
# Basic Information
name: App Name                        # App name (supports multiple languages)
description:                          # App description (supports multiple languages)
  en: English description
  zh: 中文描述
tags:                                 # App tags
  - tag1
  - tag2
author: Author Name                   # Author name
website: https://example.com          # Website URL
github: https://github.com/...        # GitHub repo (optional)
document: https://example.com         # Documentation URL (optional)

# Field Configuration (optional)
fields:                              # Define configurable fields for the app
  - name: PORT                       # Field variable name
    label:                           # Field label (supports multiple languages)
      en: Port
      zh: 端口
    placeholder:                     # Field placeholder (supports multiple languages)
      en: Service Port
      zh: 服务端口
    type: number                     # Field type (number, text, select)
    default: 3306                    # Default value
  - name: INSTALL_TYPE
    label:
      en: Install type
      zh: 安装类型
    type: select
    required: true                   # Whether the field is required (default: false)
    options:                         # Options for select type (optional)
      - label: Docker                # Option label (supports multiple languages)
        value: docker                # Option value
      - label: Docker Compose
        value: docker-compose
    default: docker

# Uninstall Requirements (optional)
require_uninstalls:                  # Specify versions that must be uninstalled first
  - version: "2.0.0"                 # Specific version to uninstall
    reason: "Structure changes"       # Reason for uninstall (supports multiple languages)
  - version: ">= 3.0.0"
    reason:
      en: Structure changes
      zh: 结构变化

# Menu Items (optional)
menu_items:                          # Define app menu entries
  - location: application            # Menu location (see below for supported values)
    label:                           # Menu label (supports multiple languages)
      en: App Management
      zh: 应用管理
    url: apps/example/list           # Menu URL
    icon: ./icon.png                 # Menu icon path
    # The following are optional
    onlyAdmin: true                  # Visible to admin only (optional, default: false)
    transparent: false               # Use transparent background (optional, default: false)
    autoDarkTheme: true              # Auto dark theme support (optional, default: true)
    keepAlive: true                  # Keep app state (optional, default: true)
```

#### Supported values for `menu_items.location`:
- `application` App common menu
- `application/admin` App admin menu
- `main/menu` Main menu

### `docker-compose.yml` Description

`docker-compose.yml` is a **required** configuration file for each app version, defining the app's container configuration:

```yaml
services:
  app-service:
    image: your-app-image:latest
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - APP_PORT=${PORT}  # PORT is defined in config.yml fields
    ports:
      - "${PORT}:8080"
    volumes:
      - ./data:/app/data
    restart: always
```

### `nginx.conf` Description

`nginx.conf` is optional and defines the Nginx proxy configuration for each app version:

```nginx
# This config will be included in the main server block

# App proxy configuration
location /apps/your-app/ {
    # Proxy headers for correct connection handling
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    # Proxy to app service
    proxy_pass http://app-service:8080/;
}
```

## App Development

### Frontend Development

Frontend development is similar to building a regular website. It is recommended to use TailwindCSS for consistent and efficient styling. 
To interact with the main DooTask app (e.g., get user info, open new windows, call main server APIs, etc.), use the official toolkit [@dootask/tools](https://www.npmjs.com/package/@dootask/tools). This library provides rich APIs—see its documentation for details and more features.

### Backend Development

Backend development is also the same as building a standard application. You are free to implement your business logic as needed, with no special restrictions.

### Packaging and Publishing

After development, package your app as a Docker container and configure it with `docker-compose.yml` and `nginx.conf` for deployment. This ensures standardized deployment and operation on the DooTask platform.

### Reference Examples

You can refer to the following open-source projects to learn about real-world DooTask app development and publishing:

- [DooTask App Store](https://github.com/dootask/appstore)
- [DooTask OKR App](https://github.com/hitosea/dootask-okr)

## App Installation

DooTask supports the following installation methods:

### 1. Local App Installation

1. **Prepare the app package**
   - Package the app directory as a zip or tar.gz
   - Ensure all necessary files are included
   - Check that configuration files are correct
2. **Installation steps**
   - Log in to DooTask as an administrator
   - Go to the App Store
   - Click "Upload Local App"
   - Select the app archive
   - Submit for installation

### 2. URL Installation

1. **Prepare the app package**
   - Package the app directory as a zip or tar.gz
   - Upload to your own server
   - Obtain a public URL
2. **Installation steps**
   - Log in to DooTask as an administrator
   - Go to the App Store
   - Click "Install from URL"
   - Enter the app package URL
   - Submit for installation

### 3. GitHub Installation

1. **Prepare the repository**
   - Push your app code to GitHub
   - Ensure the repo structure meets requirements
   - Set appropriate access permissions
2. **Installation steps**
   - Log in to DooTask as an administrator
   - Go to the App Store
   - Click "Install from URL"
   - Enter the GitHub repo URL
   - Submit for installation

## App Publishing

Submit your app to the DooTask App Store to reach more users. Steps:

1. **Prepare the app package**
   - Ensure your app meets all requirements
   - Provide complete documentation
   - Test all features
   - Package the app directory as a zip or tar.gz
2. **Submit your app**
   - Visit the [DooTask App Store](https://appstore.dootask.com/)
   - Log in to the user center
   - Click "Submit App"
   - Upload your app archive
   - Fill in app information
   - Submit for review
3. **Wait for review**
   - Your app will enter the review queue
   - Reviewers will check if your app meets requirements
   - You will receive feedback if there are issues
4. **Install the app**
   - Once approved, your app will be published automatically
   - Log in to DooTask as an administrator and update the app list to see your app
   - Install the app directly in DooTask
5. **Ongoing maintenance**
   - Respond to user feedback promptly
   - Update your app regularly
   - Maintain app quality

## Development Tips

1. **Version management**
   - Use a separate directory for each version
   - Follow semantic versioning
   - Maintain backward compatibility
2. **Configuration files**
   - Use environment variables for configuration
   - Provide reasonable defaults
   - Support multilingual configuration
3. **Security**
   - Use secure default settings
   - Avoid hardcoding sensitive information
   - Follow the principle of least privilege
4. **Performance optimization**
   - Optimize container image size
   - Set reasonable resource limits
   - Use caching mechanisms
5. **Documentation**
   - Provide detailed installation instructions
   - Explain configuration options
   - Include a FAQ section

## Support

If you have questions, get support via:

- GitHub Issues: [Submit an issue](https://github.com/kuaifan/dootask/issues)
- Community: [Join the discussion](https://github.com/kuaifan/dootask/discussions)
