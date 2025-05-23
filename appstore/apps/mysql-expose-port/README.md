# MySQL Port Exposure Plugin

## Plugin Overview

This plugin is designed to expose MySQL database ports in DooTask. With this plugin, you can map the MySQL port to the host machine, making it easier for external tools to connect to and manage the database.

## Key Features

* Support for custom proxy port configuration
* User-friendly configuration interface
* Secure and reliable port mapping

## Configuration Guide

The plugin provides the following configuration option:

### Proxy Port (PROXY_PORT)

* Type: Number
* Default Value: 3306
* Description: Specifies the MySQL port to expose
* Recommendation: For security reasons, it is recommended **not** to use the default port 3306 unless necessary; consider using an alternative port.

## How to Use

1. Install this plugin from the DooTask App Store
2. Go to the plugin configuration page
3. Set the desired proxy port
4. Save the configuration and enable the plugin

## Installation Instructions

1. Find and install this plugin from the DooTask App Store
2. Once installed, the plugin is automatically activated with no additional steps
3. Default configuration supports most use cases; advanced settings are available if needed
4. ⚠️ This plugin has a relatively large image size and may take some time to install—please refer to the installation log for progress updates

## Notes

* Ensure the selected port is not already in use by another service
* Use with caution in production environments and apply appropriate security measures
* After use, it is recommended to disable port exposure to ensure database security

## Technical Support

For any questions or feedback, please visit our official website: [https://www.dootask.com](https://www.dootask.com)