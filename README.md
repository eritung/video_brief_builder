# 影音需求生成器 V1 Prototype

純前端、可直接部署到 GitHub Pages 的原型工具。

## 已完成

- 匯入 TXT / SRT / VTT，或直接貼字幕
- 兩版字幕比對：移除／新增／順序調換／文字修改／未變更
- 字幕先自動合併為台詞區塊，避免直接逐行 diff
- 比對後自動帶入基礎剪輯需求
- 預設需求快捷按鈕，並可自行編輯／新增
- 自訂影音需求
- REF 超連結
- 參考圖片上傳
- 整支影片共通需求
- 強制換頁
- 舒適／標準／緊湊三種簡報密度
- 簡報分頁預覽
- PPTX 匯出（PptxGenJS 已放在 vendor，無需 CDN）
- JSON 專案匯入／匯出
- LocalStorage 自動儲存

## 本機使用

直接雙擊 `index.html` 即可。若瀏覽器限制本機腳本，也可用任何靜態伺服器開啟。

## 部署到 GitHub Pages

1. 建立一個 GitHub repository，例如 `video-brief-builder`
2. 把此資料夾的檔案全部放在 repository 根目錄
3. GitHub → Settings → Pages
4. Source 選 `Deploy from a branch`
5. Branch 選 `main`，Folder 選 `/ (root)`
6. 儲存後即可取得 `https://<帳號>.github.io/video-brief-builder/`

## 比對邏輯

1. 解析時間碼
2. 依停頓、標點與字數自動合併字幕
3. 先做完全相同文字配對
4. 再以字串相似度做模糊配對
5. 用 Longest Increasing Subsequence 判斷哪些已配對片段改變相對順序

這是 V1 prototype；複雜改寫、多人同時講話、重複句非常多的素材仍可能需要人工確認。
