# Go 构建阶段
FROM golang:1.24.1 AS go-builder

WORKDIR /app

# 复制 dooso 仓库代码
COPY dooso/ .

# 构建 Go 应用
RUN mkdir -p release && \
    env CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o ./release/doocli ./cli

# =============================================================
# =============================================================
# =============================================================

# 前端构建阶段
FROM node:22 AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建项目
ENV VITE_BASE_PATH=/appstore/web/
RUN npm run build

# =============================================================
# =============================================================
# =============================================================

# 生产阶段
FROM docker:cli

# 安装必要的工具
RUN apk add --no-cache bash curl

# 创建工作目录
RUN mkdir -p /var/appstore/web

# 复制构建产物到 nginx 目录
COPY --from=builder /app/dist /var/appstore/web

# 复制 Go 构建产物
COPY --from=go-builder /app/release/doocli /usr/local/bin/

# 设置权限
RUN chmod +x /usr/local/bin/doocli

# 设置入口点
ENTRYPOINT ["doocli", "appstore", "--web", "/var/appstore/web"]
