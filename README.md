# osu!mania 网页谱面实时预览 / osu!mania Web Preview

🌐 [中文](#中文) | [English](#english)

---

## 中文

一个轻量级 Chrome / Edge 浏览器扩展：

- 在 **osu.ppy.sh** 谱面页打开任意谱面；
- 点击一个 **mania 难度**（URL 变为 `#mania/难度ID`）；
- 点击浏览器工具栏的插件图标；
- 在当前网页内显示一个**悬浮预览窗**，实时预览该难度谱面的下落效果；
- 悬浮窗始终浮在网页内容上方，不随页面滚动消失，也不受页面点击影响。

> 纯视觉预览，不含音频。只跟随 mania 难度（`#mania/...`）。

### 安装

1. 打开 Chrome 或 Edge，进入扩展管理页：
   - Chrome：`chrome://extensions`
   - Edge：`edge://extensions`
2. 打开 **开发者模式**；
3. 点击 **加载已解压的扩展程序**；
4. 选择本目录：`mania-preview-browser-extension`；
5. 安装后，工具栏会出现插件图标。

### 使用

1. 在浏览器打开 `https://osu.ppy.sh/beatmapsets/...`；
2. 在谱面页点击任意 **mania 难度**；
3. 点击工具栏插件图标；
4. 网页内会浮出一个 **250×500** 预览窗，实时显示当前选中难度的下落效果。

- 再次点击插件图标可关闭悬浮窗；
- 悬浮窗右上角 ✕ 也可关闭；
- 拖动悬浮窗顶部标题栏，可在浏览器页面内自由移动位置；
- 切换网页中的难度时，悬浮窗会自动更新。

### 功能

- 支持常规 osu!mania **SV**（绿线速度变化）；
- 速度调节：`↑` / `↓`（1.0 ~ 10.0，步进 0.5）；
- 底部进度条，可拖动跳转；
- 画布固定为 **250×500**（轻量化）。

### 说明

- 插件通过 `https://osu.ppy.sh/osu/{难度ID}` 下载谱面文件，因此需要能正常访问 osu! 官网；
- 插件本身不读取 osu! 游戏客户端，也不依赖 tosu；
- 只跟随 mania 难度。

---

## English

A lightweight Chrome / Edge extension that shows a floating preview of osu!mania beatmaps directly on osu.ppy.sh.

- Open any beatmap page on **osu.ppy.sh**;
- Click a **mania difficulty** (URL changes to `#mania/{id}`);
- Click the extension icon in the toolbar;
- A floating **250×500** preview window appears on the page, showing the selected difficulty in real time.

> Visual preview only. No audio. Only mania difficulties are tracked.

### Installation

1. Open the extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `mania-preview-browser-extension`.

### Usage

1. Open a beatmap page on osu.ppy.sh:https://osu.ppy.sh/beatmapsets/...
2. Click a **mania difficulty**.
3. Click the extension icon in the toolbar.

- Click the icon again to hide the floating window;
- Click ✕ in the top-right corner to close it;
- Drag the title bar to move the preview window freely;
- The preview updates automatically when you switch difficulties.

### Features

- Supports regular osu!mania **SV** (green line scroll velocity);
- Speed control: `↑` / `↓` (1.0 ~ 10.0, step 0.5);
- Bottom progress bar with seek support;
- Fixed canvas size: **250×500**.

### Notes

- The extension downloads beatmap files from `https://osu.ppy.sh/osu/{id}`;
- It does **not** read the osu! game client and does **not** require tosu;
- Only **mania** difficulties are supported.

---

## 文件结构 / Files
mania-preview-browser-extension/ ├── manifest.json # Manifest V3 config ├── background.js # Background: download/cache .osu, broadcast changes ├── content.js # osu.ppy.sh page: detect #mania/ID + floating panel control ├── panel.html # Floating preview panel ├── panel.js # Panel logic ├── preview.js # Beatmap rendering engine ├── beatmap-parser.js # .osu parser └── README.md # This file
