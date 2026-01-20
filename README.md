This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## OFFLINE WHISPER WEB - MODEL USAGE GUIDE

### 1. Model Overview (模型概述)
本專案使用 **Whisper Tiny (Multilingual)** 模型，基於 `sherpa-onnx` 框架透過 WASM 在瀏覽器端執行。
*   **完全離線**：模型下載後會儲存在瀏覽器 Cache (IndexedDB) 中，無需網路即可執行。
*   **硬體需求**：建議使用最新版 Chrome/Edge。初次載入需下載約 40MB 模型檔。

### 2. Language & Translation Settings (語言與翻譯設定)
在「Model Manager」介面中，您可以針對模型輸出進行詳細設定：

#### Target Language (目標語言)
選擇您語音輸入的語言，此設定會限制模型的解碼範圍，提高特定語言的準確度。目前支援：
*   **繁體中文 (Chinese)**
*   **English**
*   **Vietnamese**
*   **Indonesian**
*   **Thai**

#### Translation Feature (翻譯功能)
*   **Translate to English (翻譯為英文)** Checkbox
    *   **勾選 (Enabled)**：啟用翻譯模式 (Translate Task)。無論您說的是上述哪種語言，模型都會嘗試將其翻譯並輸出為**英文**。
    *   **未勾選 (Disabled)**：啟用轉錄模式 (Transcribe Task)。模型會將您的語音轉寫為您所選擇的**原始語言**文字。

### 3. Usage Tips (使用提示)
*   **初始化**：每次更改語言或翻譯設定後，建議點擊「Retry Init」或重新整理頁面以確保設定生效。
*   **混合輸出**：目前模型不支援同時輸出「原文 + 翻譯」。若需要對照，建議先進行原文轉錄，再透過外部工具翻譯。
*   **效能**：在手機或舊電腦上執行可能會較慢，這是因為所有運算都在您的設備上進行。

---

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
