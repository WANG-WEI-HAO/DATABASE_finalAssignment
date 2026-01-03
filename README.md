# TW-Stock-Quant (次世代量化交易系統核心)
## 資料庫系統期末專題報告實作

這是展示 **「混合式資料庫架構 (Hybrid Database Architecture)」** 的金融交易系統核心原型。本專案旨在驗證期末報告中關於 **傳統關聯式資料庫 (MySQL)**、**記憶體資料庫 (Redis)** 與 **雲端 NoSQL (Firebase)** 在現代高併發系統中的協作模式。

> (請在此處貼上您的系統實機截圖，以展示儀表板功能)

---

## 🎯 專案目標

本系統透過實作一個「即時市場模擬器」，來展示不同類型資料庫在交易系統中的角色定位：

1.  **MySQL (Persistent Layer)**: 負責 **ACID** 級別的交易紀錄存檔，確保每一筆買賣數據絕對安全、不遺失。
2.  **Redis (Cache/Speed Layer)**: 負責 **微秒級** 的即時行情快取與熱點數據存取，承擔高併發讀取壓力。
3.  **Firebase (Cloud/Push Layer)**: (模擬實作) 負責 **行動端即時推播**，展示無伺服器架構下的資料同步概念。

---

## 🚀 系統核心功能

### 1. 全方位戰情儀表板 (Dashboard)
前端介面即時視覺化了後端複雜的資料流，包含以下模組：

*   **系統健康狀態 (System Health)**: 
    *   即時監控 **Redis**、**Database (MySQL)** 與 **Firebase** 的連線狀態。
*   **模擬市場快照 (Simulation Market Snapshot)**:
    *   同時監控 10 支台股權值股 (如台積電 2330, 鴻海 2317 等) 的即時報價。
    *   視覺化呈現股價波動與漲跌幅顏色。
*   **雙軌資料流監控 (Dual Data Flow Monitor)**:
    *   **🔴 Redis Cache Activity**: 顯示快取層的高頻更新日誌與寫入速率 (OPS)。
    *   **🔵 SQL Database Activity**: 顯示持久層的交易寫入日誌與處理速率 (OPS)。

### 2. 高併發市場模擬引擎 (Market Simulator)
後端內建一個多執行緒的模擬引擎，具備以下特性：
*   **多股並行**: 同時模擬 10 支熱門股票的隨機漫步 (Random Walk) 價格走勢。
*   **自動交易機器人**: 模擬大量隨機買賣單，產生真實的 `INSERT` 壓力測試。
*   **即時速率計算**: 自動計算並回傳 SQL 與 Redis 的每秒操作數 (Operations Per Second)。

---

## 🛠 技術架構 (Tech Stack)

| 層級 | 技術選型 | 用途 |
| --- | --- | --- |
| **Frontend** | React, Vite | 使用者介面、即時數據渲染、WebSocket (模擬) |
| **Backend** | Python FastAPI | RESTful API、市場模擬引擎、日誌串流 |
| **Database** | **MySQL** | 交易數據持久化 (Transaction Persistence) |
| **Cache** | **Redis** | 即時行情快取 (Real-time Market Data) |
| **Cloud** | **Firebase SDK** | 行動端狀態同步 (模擬整合) |

---

## ⚡ 快速開始 (Quick Start)

### 1. 環境準備
請確保您的系統已安裝：
- Python 3.9+
- Node.js 16+
- Redis Server (若無則顯示 Offline)
- MySQL Server (或使用 SQLite 作為替代)

### 2. 啟動後端 (Backend)
```bash
cd backend
# 安裝依賴
pip install -r requirements.txt
# 啟動 FastAPI 伺服器 (包含模擬引擎)
uvicorn main:app --reload
```

### 3. 啟動前端 (Frontend)
```bash
cd frontend
# 安裝依賴
npm install
# 啟動開發伺服器
npm run dev
```

### 4. 開始體驗
打開瀏覽器訪問 `http://localhost:5173`。
您將看到即時的模擬交易在左右兩個監控視窗中跳動，展示 **Redis** 與 **SQL** 的協作。

---

## 📊 架構驗證 (Architecture Verification)

本專案成功驗證了以下論點：
1.  **讀寫分離**: 透過 Redis 處理高頻行情讀取，MySQL 專注於交易寫入，有效分流。
2.  **效能視覺化**: 透過即時的 OPS 監控，直接觀察到記憶體資料庫與關聯式資料庫在處理頻率上的量級差異。
3.  **混合雲概念**: 整合了地端效能 (Redis) 與雲端擴充性 (Firebase) 的設計思維。
4.  **成本優化策略**: 演示了利用 Redis 進行流量聚合 (Aggregation)，只將最終快照同步至 Firebase，解決雲端流量成本過高的實務問題。

---

*資料庫系統期末專題製作*
