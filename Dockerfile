# Go 构建阶段
FROM golang:1.24.1 AS go-builder

WORKDIR /app

# 复制 server
COPY server/ .

# 构建 Go 应用
RUN go install github.com/swaggo/swag/cmd/swag@latest && \
    swag init -g cmd/cmd.go && \
    env CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o ./cli .

# =============================================================
# =============================================================
# =============================================================

# 前端构建阶段
FROM node:22 AS builder

# 定义构建参数
ARG MODE=internal

# 设置工作目录
WORKDIR /web

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建项目
RUN VITE_BASE_PATH=$([ "$MODE" = "internal" ] && echo "/appstore/" || echo "/") npm run build

# =============================================================
# =============================================================
# =============================================================

# 生产阶段
FROM docker:cli

# 定义构建参数
ARG MODE=internal

# 安装必要的工具
RUN apk add --no-cache bash curl rsync

# 创建工作目录
RUN mkdir -p /usr/share/appstore

# 复制资源目录
COPY ./appstore /usr/share/appstore/

# 复制前端构建产物
COPY --from=builder /web/dist /usr/share/appstore/web/

# 复制 Go 构建产物
COPY --from=go-builder /app/cli /usr/share/appstore/
RUN chmod +x /usr/share/appstore/cli

# 复制启动脚本
COPY ./entrypoint.sh /usr/share/appstore/entrypoint.sh
RUN chmod +x /usr/share/appstore/entrypoint.sh

# 设置入口点
ENTRYPOINT ["/usr/share/appstore/entrypoint.sh"]
