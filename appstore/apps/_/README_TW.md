# DooTask 應用開發指南

本文件將指引你如何為 [DooTask](https://www.dootask.com) 開發應用。依照這些指引，你可以建立符合 DooTask 應用商店標準的應用。

## 建立應用

### 目錄結構

標準應用目錄結構如下：

```
├── AppDirectory
    ├── 1.0.0
        ├── ...
        ├── docker-compose.yml
        └── nginx.conf
    ├── ...
    ├── config.yml
    ├── logo.png    # 也可使用 logo.svg
    └── README.md   # 支援多語系（如：README.md、README_CN.md，預設使用 README.md）
```

### `config.yml` 配置說明

`config.yml` 是**必要**的配置檔，用於定義應用的基本資訊與設定選項：

```yaml
# 基本資訊
name: 應用名稱                          # 應用名稱（支援多語系）
description:                           # 應用描述（支援多語系）
  en: English description
  zh: 中文描述
tags:                                  # 應用標籤
  - 標籤1
  - 標籤2
author: 作者名稱                        # 作者名稱
website: https://example.com           # 網站網址
github: https://github.com/...         # GitHub 倉庫網址（選填）
document: https://example.com          # 文件網址（選填）

# 欄位設定選項（選填）
fields:                               # 定義應用可設定欄位
  - name: PORT                        # 欄位變數名稱
    label:                            # 欄位標籤（支援多語系）
      en: Port
      zh: 端口
    placeholder:                      # 欄位預設提示（支援多語系）
      en: Service Port
      zh: 服務端口
    type: number                      # 欄位型態（number, text, select）
    default: 3306                     # 預設值
  - name: INSTALL_TYPE
    label:
      en: Install type
      zh: 安裝類型
    type: select
    required: true                    # 是否必填（預設：false）
    options:                          # 選項（選填，僅 select 類型適用）
      - label: Docker                 # 選項標籤（支援多語系）
        value: docker                 # 選項值
      - label: Docker Compose
        value: docker-compose
    default: docker

# 版本卸載要求（選填）
require_uninstalls:                   # 指定需先卸載的版本
  - version: "2.0.0"                  # 需卸載的特定版本
    reason: "結構變更"                 # 卸載原因（支援多語系）
  - version: ">= 3.0.0"
    reason:
      en: Structure changes
      zh: 結構變更

# 選單項設定（選填）
menu_items:                           # 定義應用選單入口
  - location: application             # 選單位置（支援值見下文）
    label:                            # 選單標籤（支援多語系）
      en: App Management
      zh: 應用管理
    url: apps/example/list            # 選單 URL
    icon: ./icon.png                  # 選單圖示路徑
    # 以下設定為選填
    onlyAdmin: true                   # 僅管理員可見（選填，預設：false）
    transparent: false                # 是否使用透明背景（選填，預設：false）
    autoDarkTheme: true               # 是否自動適應深色主題（選填，預設：true）
    keepAlive: true                   # 是否保持應用狀態（選填，預設：true）
```

#### `menu_items.location` 支援的值：
- `application` 應用常用選單
- `application/admin` 應用管理選單
- `main/menu` 主選單

### `docker-compose.yml` 配置說明

`docker-compose.yml` 是每個應用版本**必要**的配置檔，用於定義應用的容器設定：

```yaml
services:
  app-service:
    image: your-app-image:latest
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - APP_PORT=${PORT}  # PORT 於 config.yml 的 fields 定義
    ports:
      - "${PORT}:8080"
    volumes:
      - ./data:/app/data
    restart: always
```

### `nginx.conf` 配置說明

`nginx.conf` 為選填，用於定義每個應用版本的 Nginx 代理設定：

```nginx
# 此設定將透過 include 指令包含於主伺服器區塊

# 應用代理設定
location /apps/your-app/ {
    # 代理標頭資訊，正確處理連線
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    # 代理至應用服務
    proxy_pass http://app-service:8080/;
}
```

## 開發應用

### 前端開發

前端開發方式與一般網站開發相同。建議統一使用 TailwindCSS 進行樣式規範，提升介面一致性與開發效率。
如需與 DooTask 主應用互動（如取得使用者資訊、開啟新視窗、呼叫主伺服器 API 等），建議使用官方工具庫 [@dootask/tools](https://www.npmjs.com/package/@dootask/tools)。該工具庫提供豐富 API，詳細用法請參考其文件。

### 後端開發

後端開發同樣與一般應用開發一致。你可依業務需求自由實現後端邏輯，無特殊限制。

### 應用打包與發佈

開發完成後，請將你的應用打包為 Docker 容器，並搭配 `docker-compose.yml` 及 `nginx.conf` 進行設定與發佈。如此可確保應用於 DooTask 平台上的標準化部署與運作。

### 參考範例

你可參考以下開源專案，了解實際 DooTask 應用開發與發佈流程：

- [DooTask 應用商城](https://github.com/dootask/appstore)
- [DooTask OKR 應用](https://github.com/hitosea/dootask-okr)

## 安裝應用

DooTask 支援以下幾種安裝方式：

### 1. 本地應用安裝

1. **準備應用包**
   - 將應用目錄打包成 zip 或 tar.gz 格式
   - 確認包含所有必要檔案
   - 檢查設定檔是否正確
2. **安裝步驟**
   - 以管理員身份登入 DooTask
   - 進入應用商店
   - 點擊「上傳本地應用」
   - 選擇應用壓縮包
   - 提交安裝

### 2. URL 安裝

1. **準備應用包**
   - 將應用目錄打包成 zip 或 tar.gz 格式
   - 上傳至自有伺服器
   - 取得可存取的 URL
2. **安裝步驟**
   - 以管理員身份登入 DooTask
   - 進入應用商店
   - 點擊「從 URL 安裝」
   - 輸入應用包 URL
   - 提交安裝

### 3. GitHub 安裝

1. **準備倉庫**
   - 將應用程式碼提交至 GitHub
   - 確認倉庫結構符合要求
   - 設定適當存取權限
2. **安裝步驟**
   - 以管理員身份登入 DooTask
   - 進入應用商店
   - 點擊「從 URL 安裝」
   - 輸入 GitHub 倉庫網址
   - 提交安裝

## 發佈應用

將應用提交至 DooTask 應用商店，讓更多用戶使用你的應用。提交步驟如下：

1. **準備應用包**
   - 確認應用符合所有要求
   - 提供完整文件
   - 測試所有功能
   - 將應用目錄打包成 zip 或 tar.gz 格式
2. **提交應用**
   - 造訪 [DooTask 應用商店](https://appstore.dootask.com/)
   - 登入用戶中心
   - 點擊「提交應用」
   - 上傳應用壓縮包
   - 填寫應用資訊
   - 提交審核
3. **等待審核**
   - 應用將進入審核隊列
   - 審核人員會檢查應用是否符合要求
   - 若有問題會收到反饋通知
4. **安裝應用**
   - 審核通過後應用將自動發佈
   - 以管理員身份登入 DooTask，透過「更新應用列表」即可看到此應用
   - 可直接於 DooTask 中安裝應用
5. **後續維護**
   - 及時回應用戶反饋
   - 定期更新應用
   - 維持應用品質

## 開發建議

1. **版本管理**
   - 每個版本使用獨立目錄
   - 版本號遵循語意化版本規範
   - 保持向下相容性
2. **設定檔**
   - 使用環境變數進行設定
   - 提供合理預設值
   - 支援多語系設定
3. **安全性**
   - 採用安全預設設定
   - 避免硬編碼敏感資訊
   - 遵循最小權限原則
4. **效能優化**
   - 優化容器映像檔大小
   - 合理配置資源限制
   - 使用快取機制
5. **文件**
   - 提供詳細安裝說明
   - 說明設定選項用途
   - 提供常見問題解答

## 支援

如有問題，請透過以下方式取得支援：

- GitHub Issues: [提交問題](https://github.com/kuaifan/dootask/issues)
- 社群: [加入討論](https://github.com/kuaifan/dootask/discussions) 