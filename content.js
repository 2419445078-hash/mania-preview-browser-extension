// content.js — osu.ppy.sh 页面脚本：检测 mania 难度 + 创建网页内悬浮预览窗
(function () {
  'use strict';

  if (window.__maniaPreviewContentLoaded) return;
  window.__maniaPreviewContentLoaded = true;

  var BEATMAP_RE = /#mania\/(\d+)/;
  var lastId = null;
  var PANEL_ID = 'mania-preview-panel-frame';

  function getCurrentBeatmapId() {
    var m = location.hash.match(BEATMAP_RE);
    return m ? m[1] : null;
  }

  function report() {
    var id = getCurrentBeatmapId();
    if (id === lastId) return;
    lastId = id;
    try {
      chrome.runtime.sendMessage({ type: 'beatmapId', id: id });
    } catch (e) { /* 忽略扩展上下文失效 */ }
  }

  // 创建悬浮预览 iframe：默认在网页右上角，始终浮在页面内容之上，可拖动
  function ensurePanel() {
    if (document.getElementById(PANEL_ID)) return;
    var frame = document.createElement('iframe');
    frame.id = PANEL_ID;
    frame.src = chrome.runtime.getURL('panel.html');
    frame.setAttribute('scrolling', 'no');
    var left = Math.max(16, window.innerWidth - 290 - 16);
    frame.style.cssText = [
      'position:fixed !important',
      'left:' + left + 'px',
      'top:16px',
      'width:290px',
      'height:690px',
      'border:1px solid rgba(255,255,255,0.15)',
      'border-radius:10px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.6)',
      'z-index:2147483647',
      'background:#0a0a0f',
      'overflow:hidden'
    ].join(';') + ';';
    (document.body || document.documentElement).appendChild(frame);
  }

  // 拖动悬浮窗
  var dragOffsetX = 0, dragOffsetY = 0;

  function clampFrame(frame, x, y) {
    var maxX = window.innerWidth - frame.offsetWidth;
    var maxY = window.innerHeight - frame.offsetHeight;
    x = Math.max(0, Math.min(x, Math.max(0, maxX)));
    y = Math.max(0, Math.min(y, Math.max(0, maxY)));
    frame.style.left = x + 'px';
    frame.style.top = y + 'px';
    frame.style.right = 'auto';
  }

  function onDragMove(e) {
    var frame = document.getElementById(PANEL_ID);
    if (!frame) return;
    clampFrame(frame, e.clientX - dragOffsetX, e.clientY - dragOffsetY);
  }

  function onDragMoveFromFrame(clientX, clientY) {
    var frame = document.getElementById(PANEL_ID);
    if (!frame) return;
    var x = frame.offsetLeft + clientX - dragOffsetX;
    var y = frame.offsetTop + clientY - dragOffsetY;
    clampFrame(frame, x, y);
  }

  function endDrag() {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', endDrag);
    var frame = document.getElementById(PANEL_ID);
    if (frame && frame.contentWindow) {
      try { frame.contentWindow.postMessage({ type: 'dragEnd' }, '*'); } catch (e) { /* ignore */ }
    }
  }

  function startDrag(offsetX, offsetY) {
    dragOffsetX = offsetX;
    dragOffsetY = offsetY;
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', endDrag);
  }

  function removePanel() {
    var f = document.getElementById(PANEL_ID);
    if (f) f.remove();
  }

  function togglePanel() {
    if (document.getElementById(PANEL_ID)) removePanel();
    else ensurePanel();
  }

  // iframe 内关闭按钮 / 拖动请求通知父页面
  window.addEventListener('message', function (e) {
    if (!e.data || !e.data.type) return;
    if (e.data.type === 'closePanel') removePanel();
    else if (e.data.type === 'dragStart') startDrag(e.data.offsetX, e.data.offsetY);
    else if (e.data.type === 'dragMove') onDragMoveFromFrame(e.data.clientX, e.data.clientY);
    else if (e.data.type === 'dragEnd') endDrag();
  });

  // osu.ppy.sh 是 SPA，hash 变化是难度切换的主要信号；定时器兜底处理 history 路由
  window.addEventListener('hashchange', report);
  setInterval(report, 1000);
  report();

  // 供 background/面板主动询问当前标签页选中的难度 ID；响应插件图标点击
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg || !msg.type) return;
    if (msg.type === 'getBeatmapId') {
      sendResponse({ id: getCurrentBeatmapId() });
    } else if (msg.type === 'togglePanel') {
      togglePanel();
    }
  });
})();
