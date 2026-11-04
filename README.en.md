
# Moon Web Start

<p align="center">
  <a href="https://github.com/jic999/sprout-admin-api">
    <img alt="Moon Web Start" width="200" src="./public/favicon_neutral.svg">
  </a>
</p>
<p align="center">
  <a href="./LICENSE"><img alt="MIT License" src="https://badgen.net/github/license/jic999/moon-web-start"/></a>
  <a href="https://github.com/antfu/eslint-config"><img alt="MIT License" src="https://antfu.me/badge-code-style.svg"/></a>
</p>
<p align="center">
  <a href="https://start.heroism.me/">Live demo</a>
</p>
<p align="center">
  <a href="./README.md">简体中文</a> |
  <span>English</span>
</p>

## Introduction

A simple and elegant website navigation page, open source under the [MIT](./LICENSE) license. You can use it directly, or customize your own website navigation page based on it 😊.

![](https://cdn.jsdelivr.net/gh/jic999/images/blog/20231016103020.png)

## Features

- ⚡ Efficient navigation - minimalist style, fast access

- 🍎 Follow your heart - freely add, delete and modify websites, support custom website icons

- 🛫 Drag and drop sorting - quickly adjust the order of websites

- 🔍 Search word association - support Bing, Google, Baidu and other search engines

- 📱 Responsive layout - can be displayed normally on devices of any size

- 🎨 Theme switching - built-in multiple theme styles, can be switched freely

- 🌙 Dark mode - love your eyes

- 🌍 I18n - support Simplified Chinese, English and Japanese

- 📤 Import/export data - synchronize data between different devices

- 📦 Browser extension - open [Moon](https://start.heroism.me/) when opening a new tab

- 🚀 Containerized deployment - support Docker one-click deployment

## TODO

- Backend service

  - Get favicon

  - Synchronize data

- More...

## Quick start

Clone repository
```bash
git clone https://github.com/jic999/moon-web-start.git
```

Enter the project directory
```bash
cd moon-web-start
```

Install dependencies

```bash
pnpm install
```

## Cloudflare deployment

The project ships with Cloudflare Workers config: [wrangler.jsonc](./wrangler.jsonc) and [worker/index.ts](./worker/index.ts). The `dist` build output is served as static assets (SPA routes fall back to `index.html`), while `/api/*` is handled by the Worker for favicons and data sync.

```bash
# Install dependencies and log in
pnpm install
pnpm dlx wrangler login

# Build and deploy
pnpm deploy
```

For local development: `pnpm cf:preview` builds and then starts the local Worker with static assets.

When connecting the repository in the Cloudflare dashboard, set the build command to `pnpm build` and the deploy command to `npx wrangler deploy`.

#### Optional: enable data sync

Data sync requires a KV namespace:

```bash
pnpm dlx wrangler kv namespace create MOON_KV
```

Put the returned id into `kv_namespaces` in `wrangler.jsonc` and deploy again. Everything else keeps working without KV bound.

#### Favicon source

`FAVICON_SOURCE` in `wrangler.jsonc` accepts `google` (default, works well overseas) or `0x3` (reachable from mainland China). If the selected source misses, the fallback endpoints are tried in order, followed by parsing `<link rel="icon">` from the site HTML. Successful icons are cached at the edge for 7 days; domains confirmed to have no icon return 404 and are cached briefly, so the frontend renders its initial-letter placeholder.

## Docker deployment

```bash
docker run -d -p 80:80 --name moon-web-start jic999/moon-web-start
```

Start project
```bash
pnpm dev
```

## Browser extension

The extension is suitable for Google Chrome, which can automatically enter [Moon](https://start.heroism.me/) when opening a new tab.

The extension has not been released in the Chrome Web Store yet. To use it, please follow these steps:

1. Unzip `extension/moon-chrome-extension.zip` in this project.

2. In the extension interface of Google Chrome, open `Developer Mode` in the upper right corner.

3. Click `Load Unpacked` in the upper left corner.

4. Select the `moon-chrome-extension` directory that was just unzipped.

## Thanks

- [Iowen Api](https://api.iowen.cn/)，provides an open api for free get to website favicon.

- [0x3](https://0x3.com/), give me inspiration.
