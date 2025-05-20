# Go 构建阶段
FROM golang:1.24.1 AS go-builder

WORKDIR /app

# 复制 server
COPY server/ .

# 构建 Go 应用
RUN mkdir -p release && \
    env CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o ./appstore .

# =============================================================
# =============================================================
# =============================================================

# 前端构建阶段
FROM node:22 AS builder

# 设置工作目录
WORKDIR /web

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 定义构建参数，默认值为 /appstore/
ARG VITE_BASE_PATH=/appstore/

# 构建项目
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
RUN npm run build

# =============================================================
# =============================================================
# =============================================================

# 生产阶段
FROM docker:cli

# 安装必要的工具
RUN apk add --no-cache bash curl

# 创建工作目录
RUN mkdir -p /usr/share/appstore

# 复制前端构建产物
COPY --from=builder /web/dist /usr/share/appstore/dist

# 复制 Go 构建产物
COPY --from=go-builder /app/appstore /usr/local/bin/

# 设置权限
RUN chmod +x /usr/local/bin/appstore

# 设置入口点
ENTRYPOINT ["appstore", "--work-dir", "/var/www/docker/appstore", "--env-file", "/var/www/.env", "--web-dir", "/usr/share/appstore/dist", "--mode", "release"]
