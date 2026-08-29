/* beatmap-parser.js — osu!mania .osu 谱面解析器（浏览器与 Node 通用，零依赖）
 *
 * 输出说明：
 *   keys        : 键位数量（1~18，取自 CircleSize，异常时回退 4 并给出警告）
 *   notes       : [{ t: 毫秒, end: 长条尾毫秒(普通物件为 null), col: 列(0~keys-1) }]（按时间排序）
 *   bpm         : 主要 BPM（按每个红线区间的时长加权，取权重最大者）
 *   totalTime   : 最后一个物件的结束时间（下限 1000ms），作为进度条总时长
 *   previewTime : 谱面预览点（[General] PreviewTime，越界时钳制）
 *   warnings    : 解析过程中的异常提示（非 mania、键位缺失、无法解析的物件等）
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.BeatmapParser = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function parse(text) {
    if (typeof text !== 'string') { throw new Error('无效的文本输入'); }
    const warnings = [];

    // 去掉 BOM，统一换行
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const lines = text.replace(/\r\n?/g, '\n').split('\n');

    const general = {}; const metadata = {}; const difficulty = {};
    const timingRaw = []; const objectsRaw = [];
    let section = '';

    for (let raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('[') && line.endsWith(']')) { section = line.slice(1, -1).trim(); continue; }
      if (line.startsWith('//') || line.startsWith('osu file format')) continue;
      // HitObjects / TimingPoints 的行是逗号分隔的完整行（mania 物件行内含冒号），必须先按 section 分流
      if (section === 'HitObjects') { objectsRaw.push(line); continue; }
      if (section === 'TimingPoints') { timingRaw.push(line); continue; }
      const ci = line.indexOf(':');
      if (ci <= 0) continue;
      const k = line.slice(0, ci).trim();
      const v = line.slice(ci + 1).trim();
      if (section === 'General') general[k] = v;
      else if (section === 'Metadata') metadata[k] = v;
      else if (section === 'Difficulty') difficulty[k] = v;
    }

    // ---- 模式与键位 ----
    const mode = parseInt(general.Mode, 10) || 0;
    if (mode !== 3) warnings.push('该文件不是 osu!mania 谱面 (Mode=' + mode + ')，仍按 mania 方式预览');

    let cs = parseFloat(difficulty.CircleSize);
    if (isNaN(cs) || cs <= 0) { cs = 4; warnings.push('无法确定键位 (CircleSize)，按 4K 处理'); }
    let keys = Math.round(cs);
    if (keys < 1) keys = 1;
    if (keys > 18) { warnings.push('键位数 ' + keys + ' 超过 18，已截断为 18K'); keys = 18; }

    // ---- 时间点（红线/绿线） ----
    const timing = [];
    for (const l of timingRaw) {
      const p = l.split(',');
      if (p.length < 2) continue;
      const time = parseFloat(p[0]);
      const beatLength = parseFloat(p[1]);
      if (isNaN(time)) continue;
      const uninherited = (parseInt(p[6], 10) || 0) === 1;
      timing.push({ time, beatLength, uninherited });
    }
    timing.sort((a, b) => a.time - b.time);

    // ---- 物件 ----
    const notes = [];
    let malformed = 0;
    for (const l of objectsRaw) {
      const p = l.split(',');
      if (p.length < 5) { malformed++; continue; }
      const x = parseFloat(p[0]);
      const time = parseFloat(p[2]);
      const type = parseInt(p[3], 10) || 0;
      if (isNaN(x) || isNaN(time)) { malformed++; continue; }
      let col = Math.floor((x * keys) / 512);
      if (col < 0) col = 0;
      if (col > keys - 1) col = keys - 1;
      let end = null;
      if (type & 128) { // mania 长条：type 第 8 位，objectParams 首段为结束时间
        const params = p[5] || '';
        const e = parseInt(params.split(':')[0], 10);
        if (!isNaN(e) && e > 0) end = Math.max(e, time);
        if (end === null) { end = time + 1; malformed++; }
      }
      notes.push({ t: time, end, col, type });
    }
    if (malformed) warnings.push(malformed + ' 个物件无法解析，已跳过或修正');
    if (!notes.length) warnings.push('谱面没有任何物件');
    notes.sort((a, b) => a.t - b.t);

    let lastEnd = 0;
    for (const n of notes) { const e = n.end || n.t; if (e > lastEnd) lastEnd = e; }

    // ---- 主要 BPM：按红线区间时长加权 ----
    const reds = timing.filter(tp => tp.uninherited && tp.beatLength > 0);
    const bpmList = reds.map(tp => 60000 / tp.beatLength);
    let bpm = null;
    if (reds.length) {
      const mapEnd = Math.max(lastEnd, reds[reds.length - 1].time) + 1;
      let best = null;
      reds.forEach((r, i) => {
        const next = (reds[i + 1] && reds[i + 1].time) || mapEnd;
        const span = next - r.time;
        const value = 60000 / r.beatLength;
        if (!best || span > best.span) best = { value, span };
      });
      bpm = best ? best.value : null;
    } else {
      warnings.push('没有可用 TimingPoints，无法计算 BPM');
    }
    const minBpm = bpmList.length ? Math.min.apply(null, bpmList) : null;
    const maxBpm = bpmList.length ? Math.max.apply(null, bpmList) : null;

    const totalTime = Math.max(lastEnd, 1000);
    let previewTime = parseInt(general.PreviewTime, 10) || 0;
    previewTime = Math.max(0, Math.min(previewTime, Math.max(0, totalTime - 1)));

    return {
      general: { audioFilename: general.AudioFilename || '', mode, previewTime },
      metadata: {
        title: metadata.Title || '未知标题',
        artist: metadata.Artist || '未知艺术家',
        creator: metadata.Creator || '未知制图师',
        version: metadata.Version || '未知难度',
      },
      difficulty: { keys, circleSize: cs },
      keys, notes, timing,
      bpm, minBpm, maxBpm,
      lastEnd, totalTime, previewTime,
      objectCount: notes.length,
      warnings,
    };
  }

  return { parse };
});
