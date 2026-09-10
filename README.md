<div align="center">

<img src="public/assets/logo.svg" width="128" height="128" alt="buwryy.net Icon">

# buwryy.net

personal site & client-side tiktok patcher built with react & material design 3 expressive.

[![License: GPL v3](https://img.shields.io/badge/license-GPLv3-blue?style=flat-square)](LICENSE)

</div>

---

> [!WARNING]
> codebase is still premature. expect breaking changes, incomplete features, and rough edges as development continues.

## requirements
-   node.js 20+
-   npm or yarn
-   modern browser

## usage

```bash
git clone https://github.com/buwryme/buwryy.net.git
cd buwryy.net
npm install
npm run dev
```

site runs at `http://localhost:3000`. build for prod with `npm run build` → outputs to `dist/`.

> [!IMPORTANT]
> tiktok patching happens entirely in-browser via ffmpeg.wasm. no server uploads, but large files may spike ram usage.

## features

-   **tiktok patcher:** lossless video processing client-side using ffmpeg.wasm. supports mp4 files, with no backend.
-   **music player:** inline player with wavy progress bar animation & auto-pause.
-   **projects:** interactive cards with detail modals, repo links, and downloads.
-   **md3 expressive:** full material design 3 implementation with dark/light mode persistence.
-   **responsive:** adapts cleanly across mobile, tablet, and desktop viewports.

## tech stack

| category | technology |
| :--- | :--- |
| framework | react + typescript |
| bundler | vite |
| styling | tailwind css + md3 tokens |
| routing | react router |
| video | ffmpeg.wasm |
| fonts | google sans flex / code / roboto flex |

## customization

-   **colors:** edit md3 tokens in `src/index.css`.
-   **projects:** add new cards in `src/pages/AboutMePage.tsx`.
-   **socials:** update the socials array in `src/pages/HomePage.tsx`.

## deployment

push to github and import directly into **vercel** or **netlify**. for manual hosting, upload the `dist/` folder after building.

---

> licensed under gplv3. use patcher responsibly. patcher works as of september 2026

for inquiries contact **hello@buwryy.net**

<div align="center">

**made with ♥ by [buwryme](https://github.com/buwryme)**

</div>at your own risk.