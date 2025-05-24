# ZincSearch Search Engine Plugin

## Overview
ZincSearch is a high-performance full-text search engine plugin, optimized for the Dootask system. Developed in Go and based on the bluge indexing library, it serves as a lightweight alternative to Elasticsearch.

## Key Features
- Lightweight design with minimal resource usage
- High-performance full-text search for message content
- Automatic indexing of system messages
- Significantly faster search speeds
- Zero configuration—ready to use after installation

## Use Cases
If your Dootask system contains a large volume of messages, the default search may become slow. By installing the ZincSearch plugin, the system will automatically index messages, greatly improving search efficiency.

## Technical Advantages
- Developed in Go for excellent performance
- Uses bluge as the underlying indexing library
- Consumes far fewer resources than Elasticsearch
- Quick deployment with no complex configuration required

## Recommendations
Install this plugin if:
- You have a large number of messages
- You need to frequently search historical messages
- Fast search response is important
- System resources are limited and you need a lightweight solution

## Notes
- After the first installation, wait for the system to complete message indexing
- Regularly back up your index data
- Ensure your system has enough memory for indexing
- ⚠️ The plugin is large (about 23MB); installation may take some time. Please check the installation log for progress