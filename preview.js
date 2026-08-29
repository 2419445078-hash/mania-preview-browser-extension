/* preview.js — osu!mania 谱面预览渲染引擎（浏览器扩展专用，零依赖）
 *
 * 渲染规则：
 * - 白砖物件；长条按头尾拉伸，按住段落高亮
 * - 基准 400×800 下 1.0 = 240px/s，其他分辨率按高度等比缩放
 * - 画布固定为 250×500
 * - 支持常规 osu!mania SV（绿线速度变化）；不处理通过 bug/异常参数卡出的 SV 效果
 */
(function () {
  'use strict';

  var RES_LIST = [
    { w: 250, h: 500 }
  ];

  var SPEEDS = (function () {
    var a = [];
    for (var s = 1; s <= 10.0001; s += 0.5) a.push(Math.round(s * 10) / 10);
    return a;
  })();

  function create(canvas) {
    var ctx = canvas.getContext('2d');
    var state = {
      bm: null,
      t: 0,
      playing: true,
      speed: 5,
      resW: 250,
      resH: 500,
      dirty: true,
      lastNow: performance.now()
    };
    var svPoints = null; // 常规 SV 速度模型：[{ time, sv, cum }]，cum 为加权毫秒

    function setSize(w, h) {
      state.resW = w;
      state.resH = h;
      state.dirty = true;
    }

    function setSpeed(s) {
      state.speed = s;
      state.dirty = true;
    }

    function loadParsed(p) {
      state.bm = p;
      state.t = (p && p.previewTime) || 0;
      state.playing = true;
      buildSvModel(p);
      state.dirty = true;
    }

    // 从 TimingPoints 构建常规 SV 模型：绿线 sv = 100 / -beatLength，红线 sv = 1
    function buildSvModel(p) {
      svPoints = null;
      if (!p || !p.timing || !p.timing.length) return;
      var raw = [];
      for (var i = 0; i < p.timing.length; i++) {
        var tp = p.timing[i];
        var sv = tp.uninherited ? 1 : (tp.beatLength < 0 ? 100 / -tp.beatLength : 1);
        if (!isFinite(sv) || sv <= 0) sv = 1; // 负/零/异常 SV 不处理
        raw.push({ time: tp.time, sv: sv });
      }
      raw.sort(function (a, b) { return a.time - b.time; });
      var pts = [];
      for (var j = 0; j < raw.length; j++) {
        if (pts.length && pts[pts.length - 1].time === raw[j].time) {
          pts[pts.length - 1].sv = raw[j].sv; // 同时间点后者覆盖
        } else {
          pts.push(raw[j]);
        }
      }
      if (!pts.length) return;
      if (pts[0].time > 0) pts.unshift({ time: 0, sv: 1 });
      var cum = 0;
      for (var k = 0; k < pts.length; k++) {
        pts[k].cum = cum;
        if (k + 1 < pts.length) {
          cum += pts[k].sv * (pts[k + 1].time - pts[k].time);
        }
      }
      svPoints = pts;
    }

    // 从 0 到 time 的加权时间（∫sv dt），单位 ms
    function weightedCum(time) {
      if (!svPoints || !svPoints.length) return time;
      var pts = svPoints;
      if (time <= pts[0].time) {
        return pts[0].cum + pts[0].sv * (time - pts[0].time);
      }
      var lo = 0, hi = pts.length - 1;
      while (lo < hi) {
        var mid = (lo + hi + 1) >> 1;
        if (pts[mid].time <= time) lo = mid;
        else hi = mid - 1;
      }
      return pts[lo].cum + pts[lo].sv * (time - pts[lo].time);
    }

    function seek(t) {
      if (!state.bm) return;
      state.t = Math.max(0, Math.min(t, state.bm.totalTime));
      state.dirty = true;
    }

    function toggle() {
      state.playing = !state.playing;
      state.dirty = true;
    }

    function play() { state.playing = true; state.dirty = true; }
    function pause() { state.playing = false; state.dirty = true; }

    function drawPlaceholder(line1, line2, W, H) {
      var s = H / 800;
      ctx.fillStyle = '#9a9ab0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var fs = Math.max(10, Math.round(12 * s));
      ctx.font = fs + 'px system-ui, "Microsoft YaHei", sans-serif';
      ctx.fillText(line1, W / 2, H / 2 - fs);
      var fs2 = Math.max(9, fs - 2);
      ctx.font = fs2 + 'px system-ui, "Microsoft YaHei", sans-serif';
      ctx.fillText(line2, W / 2, H / 2 + fs * 0.6);
    }

    function draw() {
      var W = state.resW, H = state.resH;
      var dpr = window.devicePixelRatio || 1;
      var bw = Math.round(W * dpr), bh = Math.round(H * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      var bm = state.bm;
      if (!bm) {
        drawPlaceholder('等待谱面…', '在 osu.ppy.sh 点选 mania 难度', W, H);
        return;
      }
      if (!bm.notes.length) {
        drawPlaceholder('该谱面没有物件', '（空谱面）', W, H);
        return;
      }

      var s = H / 800;
      var basePxPerMs = state.speed * 240 * s / 1000;
      var receptorY = H - 48 * s;
      var keys = bm.keys;
      var colW = W / keys;
      var t = state.t;

      // 列分隔线
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = 1; i < keys; i++) {
        var lx = Math.round(i * colW) + 0.5;
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, H);
      }
      ctx.stroke();

      // 判定线
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(0, receptorY, W, Math.max(1, Math.round(1.5 * s)));

      var noteW = Math.max(3, colW * 0.82);
      var noteH = Math.max(3, Math.round(14 * s));
      var notes = bm.notes;
      var n, x, yH, yT, y0, y1, ny, capH, endT;

      for (var k = 0; k < notes.length; k++) {
        n = notes[k];
        endT = n.end || n.t;
        yH = receptorY - (weightedCum(n.t) - weightedCum(t)) * basePxPerMs;
        yT = receptorY - (weightedCum(endT) - weightedCum(t)) * basePxPerMs;
        if (yH < -noteH || yT > H + noteH) continue;
        x = n.col * colW + (colW - noteW) / 2;

        if (n.end) {
          y0 = Math.max(yT, -noteH);
          y1 = Math.min(yH, H + noteH);
          if (y0 >= y1) continue;
          if (t >= n.t && t <= n.end) {
            ny = Math.min(Math.max(receptorY, y0), y1);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            if (ny > y0) ctx.fillRect(x, y0, noteW, ny - y0);
            ctx.fillStyle = '#ffffff';
            if (y1 > ny) ctx.fillRect(x, ny, noteW, y1 - ny);
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillRect(x, y0, noteW, y1 - y0);
            if (yH >= -1 && yH <= H + 1) {
              capH = Math.min(noteH * 0.7, Math.max(2, Math.round(6 * s)));
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(x, yH - capH, noteW, capH);
            }
          }
        } else if (yH <= H + 2) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, yH, noteW, noteH);
        }
      }
    }

    function frame(now) {
      var dt = Math.min(0.1, (now - state.lastNow) / 1000);
      state.lastNow = now;
      if (state.bm && state.playing) {
        state.t = Math.min(state.t + dt * 1000, state.bm.totalTime);
        if (state.t >= state.bm.totalTime) state.playing = false;
        state.dirty = true;
      }
      if (state.dirty) { draw(); state.dirty = false; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    return {
      loadParsed: loadParsed,
      setSpeed: setSpeed,
      setSize: setSize,
      seek: seek,
      toggle: toggle,
      play: play,
      pause: pause,
      getState: function () { return state; }
    };
  }

  window.ManiaPreview = {
    create: create,
    RES_LIST: RES_LIST,
    SPEEDS: SPEEDS
  };
})();
