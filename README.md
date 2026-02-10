# WhatsApp Summarizer

> AI-Powered WhatsApp Chat Insights

Upload your WhatsApp chat exports, get AI-powered summaries with **Gemini**, and save to **Google Sheets**, **Firebase**, or **Supabase**.

## Features

- 📤 **Drag & Drop Upload** — Drop your `.txt` WhatsApp export
- 📋 **Paste Support** — Paste chat text directly
- 🤖 **Gemini AI Summaries** — Get instant conversation insights
- 📊 **Google Sheets** — Log messages to a spreadsheet
- 🔥 **Firebase** — Store messages in Firestore
- ⚡ **Supabase** — Store messages in Postgres
- 📱 **Responsive** — Works on desktop and mobile
- 🌙 **Dark Mode** — Premium glassmorphism design

## Quick Start

1. Open `index.html` in your browser
2. Go to **Settings** and add your API keys:
   - **Gemini API Key** — [Get one here](https://aistudio.google.com/apikey)
   - **Google Sheets** — Spreadsheet ID + API Key
   - **Firebase** or **Supabase** — Project config
3. Upload a WhatsApp chat export (`.txt`)
4. Click **Parse**, then **Summarize**

## How to Export WhatsApp Chat

1. Open a WhatsApp chat
2. Tap **⋮** (menu) → **More** → **Export Chat** → **Without Media**
3. Save the `.txt` file
4. Upload it here

## Deployment

### Vercel
```bash
npm install -g vercel
vercel
```

### GitHub Pages
Push this folder to a GitHub repo, then enable Pages in **Settings → Pages**.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Styling | Vanilla CSS (glassmorphism) |
| AI | Gemini 2.0 Flash |
| Storage | Firebase / Supabase |
| Logging | Google Sheets API |
