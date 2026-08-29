# osu!mania 网页谱面实时预览（浏览器插件）

一个轻量级 Chrome / Edge 浏览器扩展：

- 在 **osu.ppy.sh** 谱面页打开任意谱面；
- 点击一个 **mania 难度**（URL 变为 `#mania/难度ID`）；
- 点击浏览器工具栏的插件图标；
- 在当前网页内显示一个**悬浮预览窗**，实时预览该难度谱面的下落效果；
- 悬浮窗始终浮在网页内容上方，不随页面滚动消失，也不受页面点击影响。

> 纯视觉预览，不含音频。只跟随 mania 难度（`#mania/...`）。

## 安装

1. 打开 Chrome 或 Edge，进入扩展管理页：
   - Chrome：`chrome://extensions`
2. 点击 **加载已解压的扩展程序**；
3. 选择本目录：`mania-preview-browser-extension`；
4. 安装后，工具栏会出现插件图标。
（若在该步骤出现问题，尝试打开 **开发者模式**再进行尝试）

## 使用

1. 在浏览器打开 `https://osu.ppy.sh/beatmapsets/...`；
2. 在谱面页点击任意 **mania 难度**；
3. 点击工具栏插件图标；
4. 网页内会浮出一个预览窗，实时显示当前选中难度的下落效果。

- 再次点击插件图标可关闭悬浮窗；
- 悬浮窗右上角 ✕ 也可关闭；
- 拖动悬浮窗顶部标题栏，可在浏览器页面内自由移动位置；
- 切换网页中的难度时，悬浮窗会自动更新。

## 说明

- 插件通过 `https://osu.ppy.sh/osu/{难度ID}` 下载谱面文件，因此需要能正常访问 osu! 官网；
- 插件本身不读取 osu! 游戏客户端，也不依赖 tosu；

## 文件结构

```
mania-preview-browser-extension/
├── manifest.json      # Manifest V3 配置
├── background.js      # 后台：下载/缓存 .osu，广播难度切换
├── content.js         # osu.ppy.sh 页面：检测 #mania/ID + 悬浮窗控制
├── panel.html         # 悬浮预览窗页面
├── panel.js           # 悬浮窗逻辑
├── preview.js         # 谱面渲染引擎
├── beatmap-parser.js  # .osu 解析器（与原项目共用）
└── README.md
```
