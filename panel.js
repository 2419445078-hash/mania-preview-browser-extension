// panel.js — 网页内悬浮预览面板逻辑
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var preview = ManiaPreview.create($('cv'));

  function fmt(ms) {
    ms = Math.max(0, Math.round(ms / 1000));
    var h = Math.floor(ms / 3600);
    var m = Math.floor((ms % 3600) / 60);
    var s = ms % 60;
    var p = function (x) { return String(x).padStart(2, '0'); };
    return (h ? p(h) + ':' : '') + p(m) + ':' + p(s);
  }

  function setStatus(text, cls) {
    var chip = $('status');
    chip.textContent = text;
    chip.className = 'status' + (cls ? ' ' + cls : '');
  }

  function updateMeta(p) {
    $('metaTitle').textContent = p.metadata.title + ' [' + p.metadata.version + ']';
    var bpm = p.bpm != null ? Math.round(p.bpm) : '?';
    $('metaSub').textContent = 'by ' + p.metadata.creator + ' · ' + bpm + ' BPM · '
      + p.keys + 'K · ' + p.objectCount + ' 物件';
  }

  function enableControls(on) {
    $('btnPlay').disabled = !on;
    $('slider').disabled = !on;
  }

  function resetToWaiting() {
    preview.loadParsed(null);
    $('metaTitle').textContent = '等待谱面…';
    $('metaSub').textContent = '在 osu.ppy.sh 打开谱面并点击 mania 难度';
    $('timeLabel').textContent = '00:00 / 00:00';
    $('slider').max = '1';
    $('slider').value = '0';
    $('btnPlay').textContent = '▶';
    enableControls(false);
  }

  function loadOsu(osu, id) {
    try {
      var p = BeatmapParser.parse(osu);
      preview.loadParsed(p);
      $('slider').max = String(Math.round(p.totalTime));
      $('btnPlay').textContent = '⏸';
      updateMeta(p);
      var warn = p.warnings && p.warnings.length;
      setStatus(warn ? p.warnings.join('；') : ('已加载 · 难度 ID ' + id), warn ? 'warn' : 'ok');
      enableControls(true);
    } catch (e) {
      setStatus('解析失败: ' + (e && e.message ? e.message : e), 'err');
    }
  }

  function loadCurrent() {
    chrome.runtime.sendMessage({ type: 'getCurrent' }, function (res) {
      if (chrome.runtime.lastError) {
        setStatus('后台错误: ' + chrome.runtime.lastError.message, 'err');
        return;
      }
      if (!res) { resetToWaiting(); return; }
      if (res.id && res.osu) {
        loadOsu(res.osu, res.id);
      } else if (res.id && res.error) {
        setStatus('下载失败: ' + res.error, 'err');
      } else {
        resetToWaiting();
        setStatus('未检测到难度', '');
      }
    });
  }

  function updateSpeedUI() {
    var v = $('speedValue');
    if (v) v.textContent = preview.getState().speed.toFixed(1);
    var up = $('btnSpeedUp');
    var down = $('btnSpeedDown');
    if (up) up.disabled = preview.getState().speed >= ManiaPreview.SPEEDS[ManiaPreview.SPEEDS.length - 1];
    if (down) down.disabled = preview.getState().speed <= ManiaPreview.SPEEDS[0];
  }

  function changeSpeed(delta) {
    var sp = preview.getState().speed;
    var idx = ManiaPreview.SPEEDS.indexOf(sp);
    if (idx < 0) idx = ManiaPreview.SPEEDS.indexOf(Math.round(sp * 10) / 10);
    if (idx < 0) return;
    var ni = Math.max(0, Math.min(ManiaPreview.SPEEDS.length - 1, idx + (delta > 0 ? 1 : -1)));
    preview.setSpeed(ManiaPreview.SPEEDS[ni]);
    updateSpeedUI();
  }

  // 初始化速度控件（画布固定为 300×600）
  updateSpeedUI();

  // 事件
  // 拖动状态（模块级，便于父页面通知清理）
  var panelDragging = false;
  var panelOnMove = null;
  var panelOnUp = null;

  function stopPanelDrag() {
    if (!panelDragging) return;
    panelDragging = false;
    if (panelOnMove) document.removeEventListener('mousemove', panelOnMove);
    if (panelOnUp) document.removeEventListener('mouseup', panelOnUp);
    panelOnMove = null;
    panelOnUp = null;
  }

  $('dragHandle').addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    if (e.target === $('btnClose')) return;
    e.preventDefault();
    stopPanelDrag();
    panelDragging = true;
    try {
      window.parent.postMessage({ type: 'dragStart', offsetX: e.clientX, offsetY: e.clientY }, '*');
    } catch (err) { /* ignore */ }

    panelOnMove = function (ev) {
      if (!panelDragging) return;
      try {
        window.parent.postMessage({ type: 'dragMove', clientX: ev.clientX, clientY: ev.clientY }, '*');
      } catch (err) { /* ignore */ }
    };
    panelOnUp = function () {
      stopPanelDrag();
      try {
        window.parent.postMessage({ type: 'dragEnd' }, '*');
      } catch (err) { /* ignore */ }
    };
    document.addEventListener('mousemove', panelOnMove);
    document.addEventListener('mouseup', panelOnUp);
  });

  // 父页面在鼠标移出 iframe 后结束拖动时，通知 iframe 清理内部监听
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'dragEnd') stopPanelDrag();
  });

  $('btnClose').onclick = function () {
    try { window.parent.postMessage({ type: 'closePanel' }, '*'); } catch (e) { /* ignore */ }
  };
  $('btnPlay').onclick = function () {
    preview.toggle();
    $('btnPlay').textContent = preview.getState().playing ? '⏸' : '▶';
  };
  $('btnSpeedUp').onclick = function () { changeSpeed(0.5); };
  $('btnSpeedDown').onclick = function () { changeSpeed(-0.5); };
  $('btnRefresh').onclick = loadCurrent;
  $('slider').addEventListener('input', function () {
    preview.seek(parseFloat(this.value) || 0);
  });

  // 后台/内容脚本检测到用户切换难度时，实时更新悬浮窗
  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg && msg.type === 'beatmapChanged') {
      if (msg.osu) {
        loadOsu(msg.osu, msg.id);
      } else {
        resetToWaiting();
      }
    }
  });

  // 定时同步进度条与时间
  setInterval(function () {
    var st = preview.getState();
    if (!st.bm) return;
    $('slider').value = String(Math.round(st.t));
    $('timeLabel').textContent = fmt(st.t) + ' / ' + fmt(st.bm.totalTime);
  }, 100);

  resetToWaiting();
  loadCurrent();
})();
