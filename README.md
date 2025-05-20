# DooTask 应用商店

## 项目结构

```
AppDirectory/
├── resources/  # 资源文件(应用列表、应用详情、应用安装包等)
├── server/     # 服务端（结构进入 server/README.md 查看）
├── src/        # 前端
├── Dockerfile  # 构建文件
└── ...
```

## Dockerfile 说明

环境变量要求：

```yml
environment:
  HOST_PWD: "${PWD}" # 宿主机工作目录
```

挂载目录及文件：

```yml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock # 宿主机 Docker 服务
  - ./:/var/www # DooTask 项目根目录
```
