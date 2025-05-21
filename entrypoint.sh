#!/bin/bash

# 设置默认值
DEFAULT_WORK_DIR="/var/www/docker/appstore"
DEFAULT_HOST_WORK_DIR="${HOST_PWD}/docker/appstore"
DEFAULT_ENV_FILE="/var/www/.env"
DEFAULT_WEB_DIR="/usr/share/appstore/web"
DEFAULT_RUN_MODE="release"

# 使用环境变量（如果存在），否则使用默认值
WORK_DIR=${WORK_DIR:-$DEFAULT_WORK_DIR}
HOST_WORK_DIR=${HOST_WORK_DIR:-$DEFAULT_HOST_WORK_DIR}
ENV_FILE=${ENV_FILE:-$DEFAULT_ENV_FILE}
WEB_DIR=${WEB_DIR:-$DEFAULT_WEB_DIR}
RUN_MODE=${RUN_MODE:-$DEFAULT_RUN_MODE}

# 复制所有应用到工作目录
if [ -d "/usr/share/appstore/apps" ]; then
    for app_dir in /usr/share/appstore/apps/*/; do
        if [ -d "$app_dir" ]; then
            rsync -av --mkpath "$app_dir" "$WORK_DIR/"
        fi
    done
fi

# 显示运行配置
echo "Starting with:"
echo "WORK_DIR: $WORK_DIR"
echo "HOST_WORK_DIR: $HOST_WORK_DIR"
echo "ENV_FILE: $ENV_FILE"
echo "WEB_DIR: $WEB_DIR"
echo "RUN_MODE: $RUN_MODE"

# 执行启动命令
exec /usr/share/appstore/cli --work-dir "$WORK_DIR" --host-work-dir "$HOST_WORK_DIR" --env-file "$ENV_FILE" --web-dir "$WEB_DIR" --mode "$RUN_MODE"