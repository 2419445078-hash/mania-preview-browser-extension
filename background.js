// background.js — 扩展后台：缓存并下载 .osu，向悬浮预览面板广播难度切换
'use strict';

var osuCache = new Map(); // id -> .osu 文本

// 下载并缓存 .osu；同一难度只下载一次
async function fetchOsu(id) {
  if (osuCache.has(id)) return osuCache.get(id);
  var resp = await fetch('https://osu.ppy.sh/osu/' + encodeURIComponent(id), {
    credentials: 'include',
    cache: 'no-store'
  });
  if (!resp.ok) throw new Error('下载失败 HTTP ' + resp.status);
  var text = await resp.text();
  if (!text || text.indexOf('osu file format') === -1) {
    throw new Error('响应不是有效 .osu 文件');
  }
  osuCache.set(id, text);
  return text;
}

function broadcast(message) {
  try {
    chrome.runtime.sendMessage(message, function () {
      // 没有接收端（悬浮窗未打开）时忽略 lastError
      void chrome.runtime.lastError;
    });
  } catch (e) { /* ignore */ }
}

async function handleBeatmapId(id) {
  if (!id) {
    await chrome.storage.local.remove('beatmapId');
    broadcast({ type: 'beatmapChanged', id: null, osu: null });
    return { ok: true, id: null };
  }
  try {
    var osu = await fetchOsu(id);
    await chrome.storage.local.set({ beatmapId: id });
    broadcast({ type: 'beatmapChanged', id: id, osu: osu });
    return { ok: true, id: id, osu: osu };
  } catch (e) {
    // 即使下载失败也记录“当前用户选中的 id”，避免悬浮窗继续显示上一个旧谱面
    await chrome.storage.local.set({ beatmapId: id });
    return { ok: false, id: id, error: e.message || String(e) };
  }
}

async function getCurrentIdFromActiveTab() {
  try {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs.length || tabs[0].id == null) return null;
    var resp = await chrome.tabs.sendMessage(tabs[0].id, { type: 'getBeatmapId' });
    return resp && resp.id ? resp.id : null;
  } catch (e) {
    return null;
  }
}

async function getCurrent() {
  var stored = await chrome.storage.local.get('beatmapId');
  var id = stored.beatmapId || null;
  if (!id) id = await getCurrentIdFromActiveTab();
  if (!id) return { id: null };
  try {
    var osu = await fetchOsu(id);
    return { id: id, osu: osu };
  } catch (e) {
    return { id: id, error: e.message || String(e) };
  }
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || !msg.type) return;

  if (msg.type === 'beatmapId') {
    handleBeatmapId(msg.id).then(sendResponse);
    return true; // 异步响应
  }

  if (msg.type === 'getCurrent') {
    getCurrent().then(sendResponse);
    return true;
  }
});

// 点击插件图标：在当前 osu.ppy.sh 页面显示/隐藏悬浮预览窗
chrome.action.onClicked.addListener(function (tab) {
  if (!tab || tab.id == null) return;
  try {
    chrome.tabs.sendMessage(tab.id, { type: 'togglePanel' }, function () {
      void chrome.runtime.lastError;
    });
  } catch (e) { /* ignore */ }
});
