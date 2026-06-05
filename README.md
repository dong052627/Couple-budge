<div align="center">
  <img width="100%" alt="Couple Budget App Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
  
  # 💖 Couple Budget (雙人記帳本)
  
  一款專為情侶、夫妻或死黨設計的**雙人共同記帳與預算規劃 PWA 應用程式**。
  本專案採用 **React 19**、**TypeScript**、**Vite 6**、**Tailwind CSS v4** 與 **Firebase** (Firestore + Auth) 建構。

  [![Deploy to GitHub Pages](https://github.com/dong052627/Couple-budge/actions/workflows/deploy.yml/badge.svg)](https://github.com/dong052627/Couple-budge/actions/workflows/deploy.yml)
</div>

---

## ✨ 核心特色
- 🔒 **Firebase 驗證**：支援 Google 帳號一鍵快速登入。
- 🔗 **雙向邀請綁定**：簡單的邀請碼對齊機制，秒速開通兩人的專屬記帳空間。
- 💸 **靈活拆帳方式**：支援 50/50 對半均分、單方全額支付或自訂雙方負擔比例。
- ⚡ **即時同步資料**：基於 Firestore 監聽器，雙方資料即時更新無需手動重新整理。
- 🎨 **現代設計美學**：極致流暢的 Motion 微動畫，搭配舒適和諧的深/淺色質感色調。

---

## 🛠️ 本機開發與啟動指南

### 前置準備
請確保您的本機已安裝 **Node.js** (建議 v20 以上) 與 `npm`。

### 1. 安裝依賴套件
```bash
npm install
```

### 2. 環境變數設定
專案中包含 Firebase 的前端配置。若需要額外的 AI 功能或調整：
1. 複製 `.env.example` 並命名為 `.env.local`
2. 將您的 Gemini API 密鑰填入：
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

### 3. 本機啟動
```bash
npm run dev
```
啟動後，瀏覽器打開 [http://localhost:3000](http://localhost:3000) 即可開始開發調試！

### 4. 生產環境打包測試
```bash
npm run build
```
打包產物將生成於 `dist/` 資料夾下。

---

## 🚀 GitHub Actions 自動化部署 (GitHub Pages)

本專案已完美整合 GitHub Actions CI/CD 管線。當您將程式碼 push 到 `main` 或 `master` 分支時，系統會自動將專案打包並直接發布到 **GitHub Pages**！

> [!IMPORTANT]
> **請在首次部署前，在您的 GitHub Repository 完成以下設定，以避免權限錯誤：**

### 步驟 1. 設定 GitHub Pages 來源
1. 前往您的 GitHub 專案頁面，點選右上角的 **Settings** (設定)。
2. 在左側選單中找到並點選 **Pages**。
3. 在 **Build and deployment** 下方的 **Source**，將其從 `Deploy from a branch` 改為 **`GitHub Actions`**。

### 步驟 2. 設定 Actions 寫入權限
1. 在相同的 **Settings** 頁面中，點選左側選單的 **Actions** -> **General**。
2. 滾動至最下方的 **Workflow permissions**。
3. 將預設的 `Read repository contents and packages permissions` 修改為 **`Read and write permissions`**。
4. 點選 **Save** 儲存設定。

設定完成後，只要您 Push 新代碼到 GitHub，GitHub Actions 將會自動進行一鍵部署！

---

## 📂 專案目錄結構簡介
```text
Couple-budge/
├── .github/workflows/    # GitHub Actions 工作流設定
│   └── deploy.yml        # 自動打包與部署管線
├── src/
│   ├── components/       # 共用 React 元件 (表單、圖表、互動區)
│   ├── types.ts          # TypeScript 型別與資料結構介面
│   ├── firebase.ts       # Firebase 初始化與 Firestore CRUD 核心邏輯
│   ├── data.ts           # 靜態資料與模擬測試資料
│   ├── App.tsx           # 主頁面邏輯與狀態機
│   └── main.tsx          # 應用程式入口
├── firebase-blueprint.json # Firestore 資料庫結構藍圖說明
├── firestore.rules       # Firestore 安全規則
├── vite.config.ts        # Vite 建置與 Server 設定
└── package.json          # 專案相依套件與腳本設定
```

## 📝 版本更新紀錄

### v1.4.0 (2026-06-05)
- 📔 **新增個人記帳模式 (Individual Mode)**：解除伴侶綁定後或首次使用時，可不配對直接進入單人記帳，資料儲存於個人專屬空間，隨時可再綁定新伴侶。
- 🔗 **解綁後自動轉為個人模式**：解除伴侶綁定不再停留在「無法使用」的卡畫面，歷史共同帳本自動封存為唯讀，立即切換至個人記帳模式繼續使用。
- 👁️ **配對頁新增「進入個人記帳模式」按鈕**：未綁定用戶可直接點選跳過配對，開始單人記帳。
- 📊 **AddExpenseForm 個人模式優化**：個人模式下自動隱藏「誰代墊」選擇器與拆帳區塊，介面更為簡潔。
- 📈 **Dashboard 個人模式優化**：個人模式下標題改為「個人支出統計」，隱藏伴侶欄、結算狀態與數學分析區。
- 🔄 **訂閱層修正（資料消失 Bug）**：綁定新伴侶後，個人帳目不再消失。訂閱器同時監聽共同空間與個人空間，合併過程中資料持續可見。
- 🛡️ **Firestore 安全規則修正**：
  - 新增 `archivedSpaces` 至 Partner Update 允許欄位，解決封存通知靜默失敗問題。
  - 新增 `individual` 至 Partner Update 允許 status 列表。
- ⚠️ **合併錯誤 Toast 通知**：個人帳目合併失敗時，現在會顯示 Toast 錯誤提示，不再靜默失敗。

---

### v1.3.0 (2026-06-05)
- 📊 **新增記帳資料報表匯出功能**：支援匯出 Excel 相容的 UTF-8 BOM CSV 格式，包含完整消費明細、動態暱稱對齊與詳細應付/實付分攤比例計算。
- 🔄 **智慧歷史資料顯示名稱對齊**：針對無 `payerId` 的歷史或匯入帳目，自動進行智慧字串比對與暱稱轉換，確保統計金額精準無誤。
- 🎨 **首頁看板介面優化**：移除了首頁進度條，只保留直觀的金額對比，並將「已付」字樣修正為「支出金額」，版面更為清爽。
- ⚙️ **設定儲存按鈕常駐**：側邊欄個人設定儲存按鈕改為常駐顯示，改善滑鼠懸停才顯示的互動體驗。
- 🚫 **數值輸入框優化**：全域阻斷數值輸入框 (Number Input) 的滑鼠滾輪事件以防止誤觸數值，並隱藏瀏覽器預設的上下增減按鈕。
- 🐛 **程式碼與樣式修正**：修復了 `AddExpenseForm` 中的重複標籤與 Tailwind 樣式無效顏色類別。

---

## 🔒 授權條款
本專案為私有項目。若有任何問題，歡迎隨時與開發者聯繫！
