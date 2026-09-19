# 影音需求生成器 V1.1 Prototype

純前端、可直接部署到 GitHub Pages 的原型工具。

## V1.1 比對原則

- **字幕 A 是唯一文字基準**：畫面中顯示、後續簡報輸出的台詞，都優先使用影音夥伴提供的字幕 A。
- **字幕 B 只作新版定位／差異判斷**：用來辨識哪些片段還在、被移除、順序調換或疑似新增。
- **B 的小幅轉錄錯字不直接改寫 A**：高相似度視為同一句；差異較大時標記「需確認」。
- **台詞分段也以 A 為準**：可選擇「A 原始段落／A 自然句／A 合併長句」，B 的奇怪斷行不影響主文。

## 已完成

- 匯入 TXT / SRT / VTT，或直接貼字幕
- 以字幕 A 為 canonical 的雙版本比對
- 辨識：移除／疑似新增／順序調換／需確認／未變更
- 比對後自動帶入基礎剪輯需求
- 預設需求快捷按鈕，並可自行編輯／新增
- 自訂影音需求
- REF 超連結
- 參考圖片上傳
- 整支影片共通需求
- 強制換頁
- 舒適／標準／緊湊三種簡報密度
- 簡報分頁預覽
- **PPTX 簡報匯出**（Google Slides 可直接開啟／轉換）
- JSON 專案備份／還原
- LocalStorage 自動儲存
- UI 響應式調整，避免狀態文字與操作按鈕互相覆蓋

## PPTX 與 JSON 的差別

- `.pptx`：正式簡報輸出格式，可上傳 Google Drive 後用 Google 簡報開啟。
- `.json`：只用來保存這個工具裡的編輯進度，之後可重新匯入工具繼續編輯；不是 Google 簡報格式。

## 本機使用

直接雙擊 `index.html` 即可。若瀏覽器限制本機腳本，也可用任何靜態伺服器開啟。

## 部署到 GitHub Pages

1. 建立 GitHub repository，例如 `video-brief-builder`
2. 把此資料夾的檔案全部放在 repository 根目錄
3. GitHub → Settings → Pages
4. Source 選 `Deploy from a branch`
5. Branch 選 `main`，Folder 選 `/ (root)`
6. 儲存後即可取得 `https://<帳號>.github.io/video-brief-builder/`

## 比對邏輯

1. 解析 A 與 B 的時間碼
2. 只使用 A 產生 canonical 台詞區塊
3. 在 B 中以可跨多個字幕 cue 的滑動視窗尋找相符內容，因此 B 的分行方式不需要和 A 一致
4. 高相似度配對視為同一句，小幅轉錄錯字忽略
5. 用新版出現位置與 Longest Increasing Subsequence 判斷順序調換
6. A 有但 B 找不到 → 移除
7. B 中沒有任何 A 對應 → 疑似新增
8. 相似度不足但仍可能為同句 → 需確認，不直接改寫 A

這是 V1.1 prototype；重複句非常多、多人同時說話、或重剪幅度很大的素材仍可能需要人工確認。


## V1.1.1 修正
- 補入 `vendor/jszip.min.js`，並在 `pptxgen.min.js` 前載入。PptxGenJS 的瀏覽器版本需要 JSZip；缺少時會造成「PPTX 元件尚未載入」錯誤。
- PPTX 匯出仍為純前端、本機產生。
