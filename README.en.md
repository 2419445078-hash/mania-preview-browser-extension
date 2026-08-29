# osu!mania Web Preview — Browser Extension

A lightweight Chrome / Edge extension that shows a floating preview of osu!mania beatmaps directly on osu.ppy.sh.

## Features

- Open any beatmap page on **osu.ppy.sh**;
- Click a **mania difficulty** (URL changes to `#mania/难度ID` or `#mania/{id}`);
- Click the extension icon in the toolbar;
- A floating **250×500** preview window appears on the page, showing the selected difficulty in real time.

The floating window:

- Stays on top of the page content while browsing;
- Can be dragged by its title bar;
- Updates automatically when you switch difficulties;
- Supports regular osu!mania **SV** (green line scroll velocity);
- Includes a progress bar and time display;
- Speed can be adjusted with `↑` / `↓` buttons (1.0 ~ 10.0, step 0.5).

> Visual preview only. No audio. Only mania difficulties (`#mania/...`) are tracked.

## Installation

### Chrome / Edge (manual)

1. Open the extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `mania-preview-browser-extension`.

### Edge (helper script)

If you use Edge, you can also run `Install-To-Edge.bat` after closing all Edge windows.

## Usage

1. Open a beatmap page on osu.ppy.sh:
   ```
   https://osu.ppy.sh/beatmapsets/...
   ```
2. Click a **mania difficulty**.
3. Click the extension icon in the toolbar.

A floating preview window will appear on the page.

| Action | Effect |
| --- | --- |
| Click extension icon | Show / hide the floating preview |
| Drag the title bar | Move the preview window freely |
| Click ✕ | Close the preview window |
| Click `↑` / `↓` | Increase / decrease speed (1.0 ~ 10.0, step 0.5) |
| Drag the progress bar | Seek to any time |
| Click Refresh | Re-fetch the currently selected difficulty |
| Switch difficulty on the page | Preview updates automatically |

## Notes

- The extension only works on **osu.ppy.sh** beatmap pages;
- It downloads beatmap files from `https://osu.ppy.sh/osu/{id}`, so osu! website access is required;
- It does **not** read the osu! game client and does **not** require tosu;
- Only **mania** difficulties are supported;
- If you update the extension code, click **Reload** in `chrome://extensions` or `edge://extensions`.

## Files

```
mania-preview-browser-extension/
├── manifest.json      # Manifest V3 config
├── background.js      # Background: download/cache .osu, broadcast changes
├── content.js         # osu.ppy.sh page: detect #mania/ID + floating panel control
├── panel.html         # Floating preview panel
├── panel.js           # Panel logic
├── preview.js         # Beatmap rendering engine
├── beatmap-parser.js  # .osu parser
├── README.md          # Chinese README
└── README.en.md       # English README (this file)
```
