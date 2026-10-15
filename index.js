/* Expression Extractor 1.1.0 · 표정 추출기 (SillyTavern)
 * 캐릭터 카드에서 외형을 읽고 → Gemini로 감정별 표정 이미지를 만들고 → (선택) 배경을 지운 뒤
 * SillyTavern 기본 표정 스프라이트 폴더( characters/<캐릭터 이름>/<감정>.png )에 자동으로 저장해요.
 * 기본 "Character Expressions" 확장이 그대로 읽어 가요.
 * - 외형 태그 추출: 장면 생성기(Scene Studio)와 같은 방식 (카드 설명 → 텍스트 모델 → 영어 태그 한 줄, 해시 캐시, 직접 수정하면 고정)
 * - 화풍 프롬프트 프리셋 / 제외 요소: 장면 생성기와 같은 방식
 * - 배경 제거 + 가장자리 조절(흰 테두리 제거 / 줄이기 / 부드럽게): 미리보기 포함
 */
(() => {
  'use strict';
  const MODULE = 'expr_extractor';
  const DEFAULT_MODEL = 'gemini-3.1-flash-image';
  const ctx = () => SillyTavern.getContext();
  const say = (kind, msg) => window.toastr?.[kind]?.(msg);

  /* ================= 상수 ================= */
  const EMO_DESC = {
    neutral: 'relaxed natural standing pose, weight on one leg, one hand lightly holding the bag strap or hem, slight three-quarter body turn, soft calm face',
    joy: 'laughing happily, leaning slightly forward, hands clasped near the chest, bright smile',
    sadness: 'head lowered, hugging their own arm, teary eyes, drooping shoulders',
    anger: 'arms crossed, sharp glare, one foot forward, furrowed brows',
    surprise: 'startled, both hands raised near the chest, leaning back, wide eyes and open mouth',
    embarrassment: 'blushing, looking away, one hand touching hair or cheek, fidgeting',
    nervousness: 'fidgeting with fingers, tense shoulders, uneasy sideways glance',
    annoyance: 'pouting, one hand on hip, half-lidded eyes, head turned slightly away',
    love: 'one hand on chest, soft loving gaze, gentle smile, slight blush, head tilted',
    curiosity: 'head tilted, leaning toward the viewer, one hand near the chin, interested eyes',
    admiration: 'eyes sparkling, hands pressed together near the chin, looking up with awe',
    amusement: 'trying not to laugh, hand covering the mouth, shoulders shaking, playful eyes',
    approval: 'confident nod, small satisfied smile, one thumb up or a hand on hip',
    caring: 'gentle concerned look, one hand reaching out slightly, soft warm smile',
    confusion: 'puzzled frown, head tilted, one hand scratching the head, eyebrows raised',
    desire: 'half-lidded alluring gaze, slight blush, lip bitten lightly, leaning in a little',
    disappointment: 'deflated posture, downcast eyes, a small sigh, arms hanging loosely',
    disapproval: 'stern look, arms crossed, one eyebrow raised, chin slightly lifted',
    disgust: 'wrinkled nose, leaning away, one hand raised as if pushing something off',
    excitement: 'bouncing with energy, both fists clenched near the chest, wide sparkling eyes, big grin',
    fear: 'frightened, shrinking back, hands held close to the chest, wide trembling eyes',
    gratitude: 'warm smile, hands held over the heart, a slight bow of the head',
    grief: 'overwhelmed with sorrow, face half hidden by a hand, tears running, slumped shoulders',
    optimism: 'looking up and forward with a hopeful smile, chest open, one fist lightly raised',
    pride: 'chin lifted, hands on hips, confident smirk, chest out',
    realization: 'sudden realization, eyes widening, one finger raised, mouth slightly open',
    relief: 'letting out a breath, shoulders relaxing, soft smile with eyes closed',
    remorse: 'guilty look, head bowed, hands clasped in front, avoiding eye contact',
  };
  const ALL = Object.keys(EMO_DESC);
  const SET6 = ['neutral', 'joy', 'sadness', 'anger', 'surprise', 'embarrassment'];
  const CORE10 = ['neutral', 'joy', 'sadness', 'anger', 'surprise', 'embarrassment', 'nervousness', 'annoyance', 'love', 'curiosity'];

  const defaults = {
    enabled: true,
    provider: 'gemini', geminiKey: '', geminiModel: DEFAULT_MODEL, vertexProject: '', vertexLocation: 'global', llmProfile: '',
    imgGapSec: 6,
    cutout: true, cutTol: 34, edgeFringe: 30, edgeShrink: 1, edgeSoft: 1, keepOrig: true,
    stylePreset: 'custom', styleText: 'visual novel character sprite, clean lines, high detail', stylePresets: [], customText: '', negative: '',
    overwrite: false, emosDefault: [...SET6],
    chars: {},        // 캐릭터별: { outfit, emos }
    appearance: {},   // 캐릭터별 외형 태그: { [avatar]: { h, t, manual } }   (장면 생성기와 같은 구조)
    origs: {},        // 배경 제거 전 원본 이미지 경로: { 'avatar|감정': url }
    win: null, imported: false, _mig: 0,
  };

  /* ================= 저장소/유틸 ================= */
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
  const uid = () => 'p' + Math.random().toString(36).slice(2, 9);
  const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };
  const $ = (sel, root = document) => root.querySelector(sel);

  function S() {
    const { extensionSettings } = ctx();
    if (!extensionSettings[MODULE]) extensionSettings[MODULE] = structuredClone(defaults);
    const s = extensionSettings[MODULE];
    for (const k of Object.keys(defaults)) if (s[k] === undefined) s[k] = structuredClone(defaults[k]);
    if (s._mig < 1) {   // 1.0 → 1.1 한 번만: 모델을 기본값으로, 예전 화풍 칸 이전
      s.geminiModel = DEFAULT_MODEL;
      if (typeof s.style === 'string' && s.style.trim()) { s.styleText = s.style; s.customText = s.style; }
      delete s.style; delete s.lookModel; delete s.lookVision;
      for (const c of Object.values(s.chars || {})) delete c.look;   // 예전 방식으로 뽑은 외형은 버린다 (새 방식으로 다시 추출)
      s._mig = 1;
    }
    if (!s.geminiModel?.trim()) s.geminiModel = DEFAULT_MODEL;
    return s;
  }
  const save = () => ctx().saveSettingsDebounced();
  const cd = (ch) => { const s = S(); return (s.chars[ch.avatar] ||= { outfit: '', emos: null }); };

  /* VN Studio 설정(API 키 등)을 처음 한 번 가져온다. 모델은 가져오지 않고 기본값을 써요. */
  function importFromVN(force = false) {
    const s = S(), v = ctx().extensionSettings?.vnstudio;
    if (!v) { if (force) say('info', 'VN Studio 설정을 찾지 못했어요.'); return false; }
    if (!force && (s.imported || s.geminiKey)) return false;
    s.provider = v.imgProvider || s.provider; s.geminiKey = v.geminiKey || s.geminiKey;
    s.vertexProject = v.vertexProject ?? s.vertexProject; s.vertexLocation = v.vertexLocation || s.vertexLocation;
    s.imgGapSec = v.imgGapSec ?? s.imgGapSec; s.cutout = v.cutout ?? s.cutout; s.cutTol = v.cutTol ?? s.cutTol;
    s.negative = v.negative ?? s.negative; s.llmProfile = v.llmProfile || s.llmProfile;
    s.imported = true; save();
    if (force) say('success', 'VN Studio에서 설정을 가져왔어요. (모델은 기본값을 유지해요)');
    return true;
  }

  /* ================= 캐릭터/스프라이트 폴더 ================= */
  const chars = () => ctx().characters || [];
  /* ST 표정 확장은 캐릭터 이름 폴더를 쓰고, 폴더 덮어쓰기(expressionOverrides)가 있으면 그 경로를 써요 */
  function folderOf(ch) {
    const base = String(ch.avatar || '').replace(/\.[^.]+$/, '');
    const ov = ctx().extensionSettings?.expressionOverrides;
    const hit = Array.isArray(ov) && ov.find((e) => e?.name === base);
    return hit?.path || ch.name;
  }
  const st = { avatar: '', sprites: [], bust: {}, busy: false, stop: false };
  const curChar = () => chars().find((c) => c.avatar === st.avatar) || null;
  function defaultAvatar() { const c = ctx(); return c.characters?.[c.characterId]?.avatar || c.characters?.[0]?.avatar || ''; }
  const jsonHeaders = () => ctx().getRequestHeaders();
  const spriteUrl = (sp) => sp.path + (st.bust[sp.label] ? (sp.path.includes('?') ? '&' : '?') + 't=' + st.bust[sp.label] : '');
  const hasSprite = (label) => st.sprites.some((x) => x.label === label);
  const origKey = (ch, label) => ch.avatar + '|' + label;

  async function loadSprites(ch) {
    try {
      const r = await fetch('/api/sprites/get?name=' + encodeURIComponent(folderOf(ch)), { headers: jsonHeaders() });
      const j = r.ok ? await r.json() : [];
      st.sprites = (Array.isArray(j) ? j : []).filter((x) => x?.label && x?.path).sort((a, b) => a.label.localeCompare(b.label));
    } catch { st.sprites = []; }
  }
  /* 스프라이트 폴더에 바로 저장 (같은 감정 파일은 서버가 덮어써요) */
  async function uploadSprite(ch, label, blob) {
    const fd = new FormData();
    fd.append('name', folderOf(ch)); fd.append('label', label); fd.append('spriteName', label);
    fd.append('avatar', new File([blob], label + '.png', { type: 'image/png' }));
    const h = { ...jsonHeaders() }; delete h['Content-Type']; delete h['content-type'];   // FormData는 브라우저가 경계를 붙인다
    const r = await fetch('/api/sprites/upload', { method: 'POST', headers: h, body: fd });
    if (!r.ok) throw new Error('스프라이트 저장 실패 (' + r.status + ')');
    st.bust[label] = Date.now();
  }
  async function deleteSprite(ch, label) {
    const r = await fetch('/api/sprites/delete', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ name: folderOf(ch), label, spriteName: label }) });
    return r.ok;
  }
  /* 배경 제거 전 원본을 따로 보관해 두면, 가장자리 조절을 몇 번이든 원본에서 다시 계산할 수 있어요 */
  async function saveOrig(ch, label, b64, mime) {
    try {
      const fmt = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const r = await fetch('/api/images/upload', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ image: b64, format: fmt, ch_name: 'expression-extractor', filename: `${ch.name}_${label}_orig_${Date.now()}` }) });
      if (!r.ok) throw new Error(r.status);
      const url = '/' + String((await r.json()).path).replace(/^\\+|^\/+/, '');
      S().origs[origKey(ch, label)] = url; save();
    } catch (e) { console.warn('[EE] 원본 보관 실패 (스프라이트 저장에는 영향 없어요)', e); }
  }

  /* ================= 이미지 유틸 ================= */
  const b64ToBlob = (b64, mime) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); };
  const loadImg = (obj) => new Promise((ok, no) => { const i = new Image(); const t = setTimeout(() => no(new Error('timeout')), 10000); i.onload = () => { clearTimeout(t); ok(i); }; i.onerror = (e) => { clearTimeout(t); no(e); }; i.src = obj; });
  const canvasBlob = (cv) => new Promise((ok, no) => cv.toBlob((b) => (b ? ok(b) : no(new Error('PNG 변환 실패'))), 'image/png'));
  async function toPngBlob(blob) {   // 원본이 jpg/webp여도 PNG로 통일
    if (blob.type === 'image/png') return blob;
    const obj = URL.createObjectURL(blob);
    try { const img = await loadImg(obj), cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; cv.getContext('2d').drawImage(img, 0, 0); return await canvasBlob(cv); }
    finally { URL.revokeObjectURL(obj); }
  }
  /* URL/Blob → 픽셀 데이터 (긴 변이 max를 넘으면 줄임) */
  async function pixelsOf(src, max) {
    let blob = src;
    if (typeof src === 'string') { const r = await fetch(src); if (!r.ok) throw new Error('이미지를 불러오지 못했어요 (' + r.status + ')'); blob = await r.blob(); }
    const obj = URL.createObjectURL(blob);
    try {
      const img = await loadImg(obj);
      const k = Math.min(1, max / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
      return { w, h, data: g.getImageData(0, 0, w, h) };
    } finally { URL.revokeObjectURL(obj); }
  }

  /* 아바타/스프라이트를 줄여서 참조 이미지로 (투명 PNG는 흰 배경으로 합성) */
  const refCache = {};
  async function refInline(url, max = 768) {
    if (!url) return null;
    if (refCache[url]) return refCache[url];
    let out = null;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      const obj = URL.createObjectURL(await r.blob());
      try {
        const img = await loadImg(obj);
        const k = Math.min(1, max / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
        const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
        out = { inlineData: { mimeType: 'image/jpeg', data: cv.toDataURL('image/jpeg', 0.88).split(',')[1] } };
      } finally { URL.revokeObjectURL(obj); }
    } catch { out = null; }
    if (out) refCache[url] = out;
    return out;
  }

  /* ---------- 배경 제거: 가장자리에서부터 배경색과 비슷한 픽셀만 투명하게 ---------- */
  function cutoutPixels(d, w, h, tol = 34) {
    const idx = (x, y) => (y * w + x) * 4, med = (arr) => arr.sort((a, b) => a - b)[arr.length >> 1];
    const rs = [], gs = [], bs = [];
    const pushPx = (x, y) => { const i = idx(x, y); rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]); };
    for (let x = 0; x < w; x += 2) { pushPx(x, 0); pushPx(x, h - 1); }
    for (let y = 0; y < h; y += 2) { pushPx(0, y); pushPx(w - 1, y); }
    const bg = [med(rs), med(gs), med(bs)];
    const dist = (i) => { const a = d[i] - bg[0], b = d[i + 1] - bg[1], c = d[i + 2] - bg[2]; return Math.sqrt(a * a + b * b + c * c); };
    const mark = new Uint8Array(w * h), stack = [];
    const tryPush = (x, y) => { const p = y * w + x; if (!mark[p] && dist(p * 4) < tol) { mark[p] = 1; stack.push(p); } };
    for (let x = 0; x < w; x++) { tryPush(x, 0); tryPush(x, h - 1); }
    for (let y = 0; y < h; y++) { tryPush(0, y); tryPush(w - 1, y); }
    while (stack.length) {
      const p = stack.pop(), x = p % w, y = (p / w) | 0;
      if (x > 0) tryPush(x - 1, y); if (x < w - 1) tryPush(x + 1, y); if (y > 0) tryPush(x, y - 1); if (y < h - 1) tryPush(x, y + 1);
    }
    let cnt = 0; for (let p = 0; p < mark.length; p++) if (mark[p]) cnt++;
    const ratio = cnt / (w * h);
    if (ratio < 0.08 || ratio > 0.88) return { ok: false, ratio };   // 배경이 균일하지 않거나 인물까지 지워질 위험
    for (let p = 0; p < mark.length; p++) {
      const i = p * 4;
      if (mark[p]) { d[i + 3] = 0; continue; }
      const x = p % w, y = (p / w) | 0; let near = 0;      // 배경과 맞닿은 1~2픽셀은 부드럽게
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && mark[yy * w + xx]) { near = Math.max(Math.abs(dx), Math.abs(dy)); break; } }
      if (near) { const k = clamp((dist(i) - tol * 0.5) / (tol * 1.2), 0, 1); d[i + 3] = Math.round(255 * (near === 1 ? Math.min(k, 0.75) : k)); }
    }
    return { ok: true, ratio };
  }
  /* 이미 투명한 이미지인지 (테두리 픽셀 대부분이 투명하면 true) */
  function borderTransparent(d, w, h) {
    let n = 0, t = 0;
    const px = (x, y) => { n++; if (d[(y * w + x) * 4 + 3] < 128) t++; };
    for (let x = 0; x < w; x += 2) { px(x, 0); px(x, h - 1); }
    for (let y = 0; y < h; y += 2) { px(0, y); px(w - 1, y); }
    return n > 0 && t / n > 0.5;
  }
  /* ---------- 가장자리 조절 (알파 채널만 다뤄요; 이미지 테두리에 닿은 부분은 건드리지 않아요) ---------- */
  /* 흰 테두리 제거: 투명 영역에 맞닿은 최대 3픽셀 중 '거의 흰색'인 픽셀을 투명하게 */
  function peelFringe(d, A, w, h, thr, depth = 3) {
    for (let pass = 0; pass < depth; pass++) {
      const kill = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const p = y * w + x; if (!A[p]) continue;
        if ((x > 0 && !A[p - 1]) || (x < w - 1 && !A[p + 1]) || (y > 0 && !A[p - w]) || (y < h - 1 && !A[p + w])) {
          const i = p * 4, a = 255 - d[i], b = 255 - d[i + 1], c = 255 - d[i + 2];
          if (Math.sqrt(a * a + b * b + c * c) < thr) kill.push(p);
        }
      }
      if (!kill.length) break;
      for (const p of kill) A[p] = 0;
    }
  }
  /* 가장자리 줄이기: n픽셀 안쪽으로 깎기 */
  function erodeAlpha(A, w, h, n) {
    for (let p = 0; p < A.length; p++) if (A[p] < 64) A[p] = 0;
    for (let pass = 0; pass < n; pass++) {
      const src = A.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const p = y * w + x; if (!src[p]) continue;
        if ((x > 0 && !src[p - 1]) || (x < w - 1 && !src[p + 1]) || (y > 0 && !src[p - w]) || (y < h - 1 && !src[p + w])) A[p] = 0;
      }
    }
  }
  /* 가장자리 부드럽게: 알파를 r픽셀 흐리게 (바깥으로 번지지는 않아요) */
  function softAlpha(A, w, h, r) {
    const n = w * h, T = new Float32Array(n), B = new Float32Array(n), k = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      const row = y * w; let sum = 0;
      for (let x = -r; x <= r; x++) sum += A[row + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) { T[row + x] = sum / k; sum += A[row + Math.min(w - 1, x + r + 1)] - A[row + Math.max(0, x - r)]; }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += T[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) { B[y * w + x] = sum / k; sum += T[Math.min(h - 1, y + r + 1) * w + x] - T[Math.max(0, y - r) * w + x]; }
    }
    for (let p = 0; p < n; p++) A[p] = Math.min(A[p], Math.round(B[p]));
  }
  /* 배경 제거 → 흰 테두리 제거 → 줄이기 → 부드럽게. o = { removeBg, tol, fringe(0~100), shrink(px), soft(px) } */
  function processPixels(d, w, h, o) {
    const info = { bgFailed: false, ratio: null, wasTransparent: false };
    if (borderTransparent(d, w, h)) info.wasTransparent = true;
    else if (o.removeBg) {
      const r = cutoutPixels(d, w, h, o.tol);
      info.ratio = r.ratio;
      if (!r.ok) { info.bgFailed = true; return info; }
    }
    const A = new Uint8Array(w * h);
    for (let p = 0; p < A.length; p++) A[p] = d[p * 4 + 3];
    if (o.fringe > 0) peelFringe(d, A, w, h, o.fringe * 1.5);
    if (o.shrink > 0) erodeAlpha(A, w, h, o.shrink);
    if (o.soft > 0) softAlpha(A, w, h, o.soft);
    for (let p = 0; p < A.length; p++) d[p * 4 + 3] = A[p];
    return info;
  }
  const edgeOpts = (s = S()) => ({ removeBg: !!s.cutout, tol: s.cutTol, fringe: s.edgeFringe, shrink: s.edgeShrink, soft: s.edgeSoft });
  /* 생성 직후 처리: 배경 제거가 켜져 있고 성공하면 처리본, 아니면 원본(PNG) */
  async function finalizeSprite(blob) {
    const s = S();
    if (!s.cutout) return toPngBlob(blob);
    const { w, h, data } = await pixelsOf(blob, 1600);
    const info = processPixels(data.data, w, h, edgeOpts(s));
    if (info.bgFailed) { say('info', `배경 제거를 건너뛰었어요 (배경이 균일하지 않아요, 인식 ${(info.ratio * 100).toFixed(0)}%). 원본으로 저장했어요.`); return toPngBlob(blob); }
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').putImageData(data, 0, 0);
    return canvasBlob(cv);
  }

  /* ================= Gemini 이미지 호출 ================= */
  function apiUrl(action, model) {
    const s = S(), m = encodeURIComponent((model || s.geminiModel).trim());
    if (s.provider !== 'vertex') return `https://generativelanguage.googleapis.com/v1beta/models/${m}:${action}`;
    const proj = s.vertexProject.trim(), loc = (s.vertexLocation || 'global').trim();
    if (!proj) return `https://aiplatform.googleapis.com/v1/publishers/google/models/${m}:${action}`;
    const host = loc === 'global' ? 'aiplatform.googleapis.com' : `${loc}-aiplatform.googleapis.com`;
    return `https://${host}/v1/projects/${encodeURIComponent(proj)}/locations/${loc}/publishers/google/models/${m}:${action}`;
  }
  /* 이미지 요청은 한 번에 하나씩, 간격을 두고 보낸다. 429/503이면 기다렸다가 다시 시도한다. */
  let imgChain = Promise.resolve(), imgLast = 0;
  function imgQueue(label, fn) {
    const run = async () => {
      const gap = Math.max(0, (+S().imgGapSec || 0) * 1000), waitMs = imgLast + gap - Date.now();
      if (waitMs > 0) await sleepMs(waitMs);
      const delays = [20, 45, 90];
      for (let a = 0; a <= delays.length; a++) {
        try { const r = await fn(); imgLast = Date.now(); return r; }
        catch (e) {
          imgLast = Date.now();
          if ((e.status === 429 || e.status === 503) && a < delays.length) {
            const d = Math.max(e.retryAfter || 0, delays[a]);
            for (let s = d; s > 0; s--) { if (st.stop) throw e; setProg(`요청이 몰려 ${s}초 뒤 다시 시도해요 (${label})`); await sleepMs(1000); }
            continue;
          }
          throw e;
        }
      }
    };
    const p = imgChain.then(run, run); imgChain = p.catch(() => {}); return p;
  }
  async function geminiImage(prompt, refs = [], aspect = '3:4', label = '표정') {
    const s = S();
    if (!s.geminiKey.trim()) throw new Error('설정에 이미지 API 키를 입력해 주세요 (확장 프로그램 → 표정 추출기)');
    const parts = [...refs.filter(Boolean), { text: prompt }];
    const endpoint = apiUrl('generateContent');
    const call = async (withCfg) => {
      const body = { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } };
      if (withCfg) body.generationConfig.imageConfig = { aspectRatio: aspect };
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.geminiKey.trim() }, body: JSON.stringify(body) });
      return { r, j: await r.json().catch(() => ({})) };
    };
    return imgQueue(label, async () => {
      let { r, j } = await call(true);
      if (r.status === 400 && /imageConfig|aspect/i.test(JSON.stringify(j))) ({ r, j } = await call(false));
      if (!r.ok) {
        const e = new Error(`${s.provider === 'vertex' ? 'Agent Platform' : 'Gemini'} ${r.status}: ${j?.error?.message || '요청 실패'}`);
        e.status = r.status;
        const ra = Number(r.headers?.get?.('retry-after')) || parseFloat(String(j?.error?.details?.find((d) => d.retryDelay)?.retryDelay || '').replace('s', ''));
        if (ra) e.retryAfter = Math.min(120, ra);
        throw e;
      }
      const cand = j.candidates?.[0];
      const img = cand?.content?.parts?.map((p) => p.inlineData || p.inline_data).find(Boolean);
      if (!img?.data) {
        if (j.promptFeedback?.blockReason) throw new Error(`요청이 차단됐어요 (${j.promptFeedback.blockReason})`);
        throw new Error(cand?.finishReason ? `이미지가 생성되지 않았어요 (${cand.finishReason}). 안전 필터에 걸렸을 수 있어요.` : '응답에 이미지가 없어요');
      }
      return { b64: img.data, mime: img.mimeType || img.mime_type || 'image/png' };
    });
  }
  async function testConnection() {
    const s = S();
    if (!s.geminiKey.trim()) { say('warning', 'API 키를 먼저 입력해 주세요.'); return; }
    try {
      const h = { 'Content-Type': 'application/json', 'x-goog-api-key': s.geminiKey.trim() };
      const r = s.provider === 'vertex'
        ? await fetch(apiUrl('countTokens'), { method: 'POST', headers: h, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] }) })
        : await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.geminiModel.trim())}`, { headers: h });
      const j = await r.json().catch(() => ({}));
      if (r.ok) say('success', `연결 성공: ${s.geminiModel}`); else say('error', `${r.status}: ${j?.error?.message || '실패'}`);
    } catch (e) { say('error', '요청 실패 (네트워크/CORS): ' + (e.message || e)); }
  }

  /* ================= 텍스트 모델 + 외형 추출 (장면 생성기 방식) ================= */
  let profWarned = false;
  const profileList = () => { const cm = ctx().extensionSettings?.connectionManager; return Array.isArray(cm?.profiles) ? cm.profiles : []; };
  /* 연결 프로필을 골랐으면 그 프로필로(채팅 내용 없이), 아니면 채팅에 연결된 모델로 */
  async function llm(prompt) {
    const s = S();
    const prof = s.llmProfile ? profileList().find((p) => p.id === s.llmProfile) : null;
    const svc = ctx().ConnectionManagerRequestService;
    let out = '';
    if (prof && svc?.sendRequest) {
      try {
        const r = await svc.sendRequest(prof.id, [{ role: 'user', content: prompt }], 4096, { stream: false, extractData: true }, {});
        out = typeof r === 'string' ? r : (r?.content ?? '');
        if (!String(out).trim()) throw new Error('프로필 응답이 비어 있어요');
      } catch (e) {
        console.warn('[EE] 연결 프로필 호출 실패', e);
        if (!profWarned) { profWarned = true; say('warning', `연결 프로필 "${prof.name}" 호출에 실패해서 채팅 모델로 대신 실행해요: ${e.message || e}`); }
        out = '';
      }
    } else if (s.llmProfile && !profWarned) { profWarned = true; say('warning', '선택한 연결 프로필을 찾지 못해 채팅 모델로 실행해요. (Connection Manager 확장이 켜져 있는지 확인해 주세요)'); }
    if (!String(out).trim()) out = await ctx().generateQuietPrompt(prompt, false, false);
    if (typeof out !== 'string' || !out.trim()) throw new Error('모델 응답이 비어 있어요');
    return out;
  }
  const descOf = (ch) => [ch.description, ch.personality].filter(Boolean).join('\n');
  /* 카드 설명 → 영어 외형 태그 한 줄. 직접 고친 것(manual)은 그대로, 설명이 안 바뀌었으면(해시) 저장된 것을 써요 */
  async function appearanceOf(ch) {
    const s = S(), key = ch.avatar, a = s.appearance[key], text = descOf(ch);
    if (a?.manual) return a.t;
    if (!text?.trim()) return a?.t || '';
    const h = hash(text);
    if (a && a.h === h) return a.t;
    const out = (await llm(`Do NOT roleplay. From the description below, write ONE line of comma-separated English visual tags describing only the physical appearance and outfit (age impression, hair, eyes, skin, build, clothing, armor, accessories). No names, no personality, under 45 words. Output only that line.\n\n${text.slice(0, 3000)}`)).trim().replace(/\s*\n+\s*/g, ' ').slice(0, 450);
    s.appearance[key] = { h, t: out };
    save(); renderLook();
    return out;
  }
  async function ensureLook(ch) {
    try { const v = await appearanceOf(ch); if (v) return v; } catch (e) { console.warn('[EE] 외형 추출 실패', e); say('warning', '외형 추출에 실패해서 카드 설명을 그대로 써요: ' + (e.message || e)); }
    return descOf(ch).replace(/\s+/g, ' ').slice(0, 300);   // 저장하지 않는 임시 대체
  }

  /* ================= 화풍 프리셋 (장면 생성기 방식) ================= */
  const presetText = (id) => (id === 'custom' ? (S().customText || '') : (S().stylePresets.find((x) => x.id === id)?.text ?? null));
  function normalizeStyle() {
    const s = S();
    if (presetText(s.stylePreset) === null) s.stylePreset = 'custom';
    if (s.stylePreset === 'custom' && !s.customText && s.styleText) s.customText = s.styleText;
  }
  function renderStyle() {
    const sel = $('#ee-style-sel', root); if (!sel) return;
    normalizeStyle();
    const s = S();
    sel.innerHTML = '<option value="custom">직접 입력</option>' + s.stylePresets.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
    sel.value = presetText(s.stylePreset) !== null ? s.stylePreset : 'custom';
    const cur = s.stylePresets.find((x) => x.id === sel.value);
    $('#ee-style-name', root).value = cur ? cur.name : '';
    $('#ee-style-text', root).value = s.styleText || '';
    $('#ee-neg', root).value = s.negative || '';
    $('#ee-stylecur', root).textContent = `(${cur ? cur.name : '직접 입력'})`;
  }

  /* ================= 표정 생성 ================= */
  async function refsFor(ch, emo) {
    const refs = [], notes = [];
    const neutral = st.sprites.find((x) => x.label === 'neutral');
    if (neutral && emo !== 'neutral') {
      const r = await refInline(spriteUrl(neutral), 1024);
      if (r) { refs.push(r); notes.push(`Reference image ${refs.length} is the established look of "${ch.name}". Keep EXACTLY the same face, hair color and style, eye color, skin tone, body proportions, outfit and art style.`); }
    }
    if (ch.avatar) {
      const r = await refInline('/characters/' + encodeURIComponent(ch.avatar), 1024);
      if (r) { refs.push(r); notes.push(`Reference image ${refs.length} is the character card image of "${ch.name}". Match face, hair and eyes.`); }
    }
    return { refs, notes };
  }
  async function makeSprite(ch, emo) {
    const s = S(), d = cd(ch), look = await ensureLook(ch), { refs, notes } = await refsFor(ch, emo);
    const outfit = d.outfit?.trim() || "the character's signature default outfit (as in the reference)";
    const neg = String(s.negative || '').trim();
    const prompt = `${notes.join(' ')}\nGenerate one image: a visual novel character sprite, waist-up portrait of "${ch.name}" (${look || 'as in the reference'}). Outfit: ${outfit}. Expression and pose: ${EMO_DESC[emo] || emo}. Natural, expressive, candid body language and a slight three-quarter angle, NOT a stiff straight-on attention stance. Rendering style: ${String(s.styleText || '').trim()}. Match EXACTLY the rendering style, level of realism, lighting and color grading of the reference image (if the reference is photorealistic, make this photorealistic too, NOT anime or illustration). Background: plain flat solid pure white, no floor, no shadow, no gradient, no props behind. Single character, no text, no UI, no watermark.${neg ? `\nAvoid: ${neg}.` : ''}`;
    const { b64, mime } = await geminiImage(prompt, refs, '3:4', `${ch.name}·${emo}`);
    if (s.keepOrig && s.cutout) await saveOrig(ch, emo, b64, mime);
    const blob = await finalizeSprite(b64ToBlob(b64, mime));
    await uploadSprite(ch, emo, blob);   // ST 스프라이트 폴더에 바로 저장 (같은 감정은 덮어씀)
  }

  /* ================= UI: 창 ================= */
  let root = null;
  const selected = (ch) => { const d = cd(ch); if (!Array.isArray(d.emos)) d.emos = [...(S().emosDefault || SET6)]; return d.emos; };
  const todoList = (ch) => {
    const sel = selected(ch), over = S().overwrite;
    const list = ALL.filter((e) => sel.includes(e) && (over || !hasSprite(e)));
    if (list.length && !hasSprite('neutral') && !list.includes('neutral')) list.unshift('neutral');   // neutral을 먼저 만들어 기준으로 삼는다
    return list;
  };
  function setProg(t) { const el = root && $('#ee-prog', root); if (el) el.textContent = t || ''; }

  /* 위치·크기: 끌어서 옮기고, 오른쪽 아래 모서리를 끌어서 조절. 값은 저장돼요. */
  function winApply() {
    if (!root) return;
    const w0 = S().win || {}, vw = window.innerWidth, vh = window.innerHeight;
    const W = clamp(w0.w || Math.min(980, vw - 16), Math.min(320, vw), vw), H = clamp(w0.h || Math.min(780, vh - 16), Math.min(260, vh), vh);
    const X = clamp(w0.x ?? Math.round((vw - W) / 2), 0, Math.max(0, vw - W)), Y = clamp(w0.y ?? Math.round((vh - H) / 2), 0, Math.max(0, vh - H));
    Object.assign(root.style, { left: X + 'px', top: Y + 'px', width: W + 'px', height: H + 'px' });
  }
  function winSave() { const r = root.getBoundingClientRect(); S().win = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; save(); }
  function bindWindow() {
    const bar = $('.ee-bar', root), grip = $('.ee-grip', root);
    const track = (el, onMove) => el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || (e.button !== undefined && e.button > 0)) return;
      e.preventDefault(); el.setPointerCapture?.(e.pointerId);
      const sx = e.clientX, sy = e.clientY, r = root.getBoundingClientRect();
      const mv = (ev) => onMove(ev.clientX - sx, ev.clientY - sy, r);
      const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); winSave(); };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
    track(bar, (dx, dy, r) => {
      const vw = window.innerWidth, vh = window.innerHeight;
      root.style.left = clamp(r.left + dx, 60 - r.width, vw - 60) + 'px';   // 제목줄이 화면 안에 남도록
      root.style.top = clamp(r.top + dy, 0, vh - 40) + 'px';
    });
    track(grip, (dx, dy, r) => {
      const vw = window.innerWidth, vh = window.innerHeight;
      root.style.width = clamp(r.width + dx, Math.min(320, vw), vw - r.left) + 'px';
      root.style.height = clamp(r.height + dy, Math.min(260, vh), vh - r.top) + 'px';
    });
    window.addEventListener('resize', () => { if (root && !root.classList.contains('ee-off')) winApply(); });
  }
  function buildModal() {
    if (root) return;
    root = document.createElement('div'); root.id = 'ee-modal'; root.className = 'ee-off';
    root.innerHTML = `<div class="ee-bar" title="끌어서 옮기기"><b>🎭 표정 추출기</b><span class="ee-grow"></span><button class="ee-btn sm" data-act="close" aria-label="닫기">✕</button></div>
      <div id="ee-body" class="ee-bodywrap"></div><div id="ee-edge" class="ee-edge ee-off"></div><div class="ee-grip" title="끌어서 크기 조절"></div>`;
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('input', onInput);
    bindWindow();
  }
  async function openModal() {
    if (!S().enabled) { say('info', '표정 추출기가 꺼져 있어요. 확장 설정에서 "사용"을 켜 주세요.'); return; }
    buildModal();
    if (!st.avatar || !curChar()) st.avatar = defaultAvatar();
    winApply(); root.classList.remove('ee-off');
    await renderBody();
  }
  const closeModal = () => { closeEdge(); root?.classList.add('ee-off'); };

  async function renderBody() {
    const body = $('#ee-body', root), ch = curChar();
    if (!ch) { body.innerHTML = '<p class="ee-hint">캐릭터가 없어요. SillyTavern에서 캐릭터를 먼저 만들어 주세요.</p>'; return; }
    await loadSprites(ch);
    const d = cd(ch), s = S();
    body.innerHTML = `
      <div class="ee-row"><label>캐릭터</label>
        <select id="ee-char">${chars().map((c) => `<option value="${esc(c.avatar)}" ${c.avatar === st.avatar ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <span class="ee-hint">저장 폴더: <code>characters/${esc(folderOf(ch))}/</code></span></div>
      <div class="ee-top">
        <img class="ee-card" data-act="zoom" src="/characters/${encodeURIComponent(ch.avatar)}" alt="카드 이미지" title="카드 이미지 (표정 생성의 기준)">
        <div class="ee-col">
          <label class="ee-lbl">외형 태그 <small id="ee-lookstat"></small></label>
          <textarea id="ee-look" rows="4" placeholder="비워 두면 표정을 만들 때 카드 설명에서 영어 외형 태그를 한 번 만들어 저장해요. 직접 고치면 그 내용으로 고정돼요."></textarea>
          <div class="ee-row tight"><button class="ee-btn sm" data-act="look-ai">카드 설명에서 외형 다시 추출 (텍스트 모델 1회)</button></div>
          <label class="ee-lbl">의상 (선택, 영어 권장)</label>
          <input type="text" id="ee-outfit" placeholder="비우면 카드의 기본 의상 그대로. 예: white sailor school uniform with red ribbon" value="${esc(d.outfit || '')}">
        </div>
      </div>
      <details class="ee-more"><summary>화풍 프롬프트 · 제외 요소 <small id="ee-stylecur"></small></summary>
        <div class="ee-row tight"><label>화풍 프롬프트</label><select id="ee-style-sel"></select><input type="text" id="ee-style-name" class="ee-name" placeholder="이름"><button class="ee-btn sm" data-act="style-save" title="저장 (같은 이름이면 덮어써요)">💾</button><button class="ee-btn sm" data-act="style-del" title="이 프리셋 삭제">🗑</button></div>
        <textarea id="ee-style-text" rows="4"></textarea>
        <p class="ee-hint">"직접 입력"에 글을 쓰고 이름을 정해 저장 아이콘을 누르면 프리셋으로 저장돼요. 같은 이름이면 덮어써요.</p>
        <div class="ee-row tight"><label>제외 요소</label><input type="text" id="ee-neg" placeholder="생성에서 빼고 싶은 요소 (선택)"></div></details>
      <details class="ee-more" open><summary>만들 표정 선택 <span id="ee-selcount"></span></summary>
        <div class="ee-row tight"><button class="ee-btn sm" data-act="preset" data-p="6">기본 6</button><button class="ee-btn sm" data-act="preset" data-p="10">핵심 10</button><button class="ee-btn sm" data-act="preset" data-p="all">전체 28</button><button class="ee-btn sm" data-act="preset" data-p="none">해제</button></div>
        <div class="ee-chips" id="ee-chips"></div>
        <p class="ee-hint">SillyTavern 기본 표정 확장과 같은 28개 이름이에요. 점(•)이 붙은 표정은 이미 스프라이트가 있어요.</p></details>
      <div class="ee-row">
        <label class="ee-ck"><input type="checkbox" id="ee-over" ${s.overwrite ? 'checked' : ''}><span>이미 있는 표정도 다시 만들어 덮어쓰기</span></label>
        <span class="ee-grow"></span>
        <button class="ee-btn primary" data-act="gen" id="ee-gen"></button><button class="ee-btn danger ee-off" data-act="stop" id="ee-stop">중지</button></div>
      <div id="ee-prog" class="ee-prog"></div>
      <h4>현재 스프라이트 <span id="ee-spcount"></span></h4>
      <div class="ee-grid" id="ee-grid"></div>
      <p class="ee-hint">만든 표정은 확인 없이 바로 스프라이트 폴더에 <code>감정이름.png</code>로 저장돼요. 이미지 1장마다 이미지 API가 1번 호출돼서 요금이 발생해요. ST 표정 확장은 채팅을 열 때 목록을 새로 읽으니, 바로 안 보이면 채팅을 다시 열어 보세요. ↻ 다시 생성 · ✂ 배경/가장자리 조절 · ✕ 삭제</p>`;
    renderLook(); renderStyle(); renderChips(); renderGrid(); refreshGen();
  }
  function renderLook() {
    const ch = curChar(), ta = root && $('#ee-look', root); if (!ch || !ta) return;
    const a = S().appearance[ch.avatar];
    ta.value = a?.t || '';
    $('#ee-lookstat', root).textContent = !a?.t ? '· 아직 없음 (표정을 만들 때 자동 추출)' : a.manual ? '· 직접 수정함 (고정)' : '· 자동 추출됨';
  }
  function renderChips() {
    const ch = curChar(); if (!ch) return;
    const sel = selected(ch);
    $('#ee-chips', root).innerHTML = ALL.map((e) => `<button class="ee-chip ${sel.includes(e) ? 'on' : ''}" data-act="chip" data-l="${e}">${hasSprite(e) ? '• ' : ''}${e}</button>`).join('');
    $('#ee-selcount', root).textContent = `(${sel.length}/${ALL.length})`;
  }
  function renderGrid() {
    const grid = $('#ee-grid', root); if (!grid) return;
    $('#ee-spcount', root).textContent = `(${st.sprites.length}장)`;
    grid.innerHTML = st.sprites.map((sp) => `<figure class="ee-th"><img src="${esc(spriteUrl(sp))}" alt="${esc(sp.label)}" data-act="zoom" title="클릭하면 크게 보기"><figcaption>${esc(sp.label)}</figcaption>
      <button class="ee-x" data-act="del" data-l="${esc(sp.label)}" aria-label="삭제">✕</button><button class="ee-rg" data-act="regen" data-l="${esc(sp.label)}" title="이 표정 다시 생성" aria-label="다시 생성">↻</button><button class="ee-cutb" data-act="edge" data-l="${esc(sp.label)}" title="배경 제거 · 가장자리 조절" aria-label="가장자리 조절">✂</button></figure>`).join('') || '<span class="ee-hint">아직 스프라이트가 없어요. 위에서 표정을 골라 만들어 보세요.</span>';
  }
  function refreshGen() {
    const ch = curChar(), b = $('#ee-gen', root); if (!ch || !b) return;
    const n = todoList(ch).length;
    b.textContent = n ? `선택한 표정 만들기 (${n}장)` : '만들 표정이 없어요';
    b.disabled = !n || st.busy;
    $('#ee-stop', root).classList.toggle('ee-off', !st.busy);
  }

  async function runGen() {
    const ch = curChar(); if (!ch || st.busy) return;
    const list = todoList(ch);
    if (!list.length) return;
    if (!S().geminiKey.trim()) { say('warning', '설정에 이미지 API 키를 입력해 주세요. (확장 프로그램 → 표정 추출기)'); return; }
    if (!window.confirm(`표정 ${list.length}장을 만들어요.\n이미지 API가 ${list.length}번 호출되고 요금이 발생해요. 계속할까요?`)) return;
    st.busy = true; st.stop = false; refreshGen();
    let made = 0;
    for (let i = 0; i < list.length; i++) {
      if (st.stop) break;
      const e = list[i];
      setProg(`${i + 1}/${list.length} · ${e} 만드는 중…`);
      try { await makeSprite(ch, e); made++; await loadSprites(ch); renderGrid(); renderChips(); }
      catch (err) { if (st.stop) break; say('error', `${e} 생성 실패: ${err.message || err}`); if (e === 'neutral' && !hasSprite('neutral')) break; }
    }
    st.busy = false; setProg(st.stop ? `중지했어요 (${made}장 완료)` : `끝! ${made}장을 스프라이트 폴더에 저장했어요.`);
    refreshGen();
  }
  async function regen(label) {
    const ch = curChar(); if (!ch || st.busy) return;
    if (!window.confirm(`"${label}" 표정을 다시 만들어요. 이미지 API 1회 호출이에요. 계속할까요?`)) return;
    st.busy = true; st.stop = false; refreshGen(); setProg(`${label} 다시 만드는 중…`);
    try { await makeSprite(ch, label); await loadSprites(ch); renderGrid(); setProg(`${label} 완료`); }
    catch (err) { say('error', `${label} 생성 실패: ${err.message || err}`); setProg(''); }
    st.busy = false; refreshGen();
  }
  async function delSprite(label) {
    const ch = curChar(); if (!ch || st.busy) return;
    if (!window.confirm(`"${label}" 스프라이트를 삭제할까요?`)) return;
    if (!(await deleteSprite(ch, label))) say('error', '삭제하지 못했어요.');
    delete S().origs[origKey(ch, label)]; save();
    await loadSprites(ch); renderGrid(); renderChips(); refreshGen();
  }
  function zoom(src) {
    const o = document.createElement('div'); o.className = 'ee-zoom'; o.innerHTML = `<img src="${esc(src)}" alt="">`;
    o.addEventListener('click', () => o.remove()); document.body.appendChild(o);
  }

  /* ================= 배경 · 가장자리 조절 창 (미리보기) ================= */
  const edge = { label: '', url: '', fromOrig: false, base: null, o: null, bg: 'checker', timer: 0, token: 0 };
  const EDGE_SLIDERS = [
    ['tol', '배경 민감도', 10, 80, 1, '클수록 배경색과 덜 비슷해도 지워요 (불투명 배경일 때만 사용)'],
    ['fringe', '흰 테두리 제거', 0, 100, 1, '인물 가장자리에 남은 흰 띠를 3픽셀 깊이까지 지워요'],
    ['shrink', '가장자리 줄이기 (px)', 0, 6, 1, '경계를 안쪽으로 깎아요'],
    ['soft', '가장자리 부드럽게 (px)', 0, 3, 1, '경계를 흐리게 해서 계단을 줄여요'],
  ];
  async function openEdge(label) {
    const ch = curChar(), sp = st.sprites.find((x) => x.label === label); if (!ch || !sp || st.busy) return;
    const s = S(), origUrl = s.origs[origKey(ch, label)], token = ++edge.token;
    edge.label = label; edge.o = { tol: s.cutTol, fringe: s.edgeFringe, shrink: s.edgeShrink, soft: s.edgeSoft };
    let px = null;
    if (origUrl) { try { px = await pixelsOf(origUrl, 720); edge.fromOrig = true; edge.url = origUrl; } catch { px = null; } }
    if (!px) { try { px = await pixelsOf(spriteUrl(sp), 720); edge.fromOrig = false; edge.url = spriteUrl(sp); } catch (e) { say('error', '이미지를 불러오지 못했어요: ' + (e.message || e)); return; } }
    if (token !== edge.token) return;
    edge.base = px;
    const box = $('#ee-edge', root);
    box.innerHTML = `<div class="ee-edge-in">
      <div class="ee-row tight"><b>${esc(label)}</b> <span class="ee-hint" id="ee-edgesrc"></span><span class="ee-grow"></span><button class="ee-btn sm" data-act="edge-close">닫기</button></div>
      <div class="ee-row tight"><span class="ee-hint">미리보기 배경</span>${[['checker', '체커'], ['black', '검정'], ['green', '초록'], ['white', '흰색']].map(([k, n]) => `<button class="ee-btn sm ${edge.bg === k ? 'primary' : ''}" data-act="edge-bg" data-k="${k}">${n}</button>`).join('')}</div>
      <div class="ee-cvwrap bg-${edge.bg}" id="ee-cvwrap"><canvas id="ee-cv" class="ee-cv"></canvas></div>
      <div class="ee-sliders">${EDGE_SLIDERS.map(([k, n, a, b, step, tip]) => `<label class="ee-sl" title="${esc(tip)}"><span>${n} <b id="ee-v-${k}">${edge.o[k]}</b></span><input type="range" min="${a}" max="${b}" step="${step}" value="${edge.o[k]}" data-edge="${k}"></label>`).join('')}</div>
      <div class="ee-hint" id="ee-edgemsg"></div>
      <div class="ee-row tight"><button class="ee-btn primary" data-act="edge-apply">적용 (스프라이트에 저장)</button><button class="ee-btn sm" data-act="edge-save-def">이 값을 기본값으로</button><button class="ee-btn sm" data-act="edge-reset">기본값으로 되돌리기</button></div></div>`;
    box.classList.remove('ee-off');
    $('#ee-edgesrc', root).textContent = edge.fromOrig ? '· 배경 제거 전 원본에서 다시 계산해요 (언제든 되돌릴 수 있어요)' : '· 원본이 없어서 지금 이미지를 기준으로 해요 (적용하면 덮어써요)';
    edgeRender();
  }
  function closeEdge() { edge.token++; clearTimeout(edge.timer); const b = root && $('#ee-edge', root); if (b) { b.classList.add('ee-off'); b.innerHTML = ''; } edge.base = null; }
  function edgeRender() {
    if (!edge.base) return;
    const { w, h, data } = edge.base;
    const cv = $('#ee-cv', root); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'), work = g.createImageData(w, h);
    work.data.set(data.data);   // 원본 픽셀은 그대로 두고 복사본에만 적용
    const info = processPixels(work.data, w, h, { removeBg: true, ...edge.o });
    g.putImageData(work, 0, 0);
    $('#ee-edgemsg', root).textContent = info.bgFailed ? `배경이 균일하지 않아 배경 제거를 건너뛰어요 (인식 ${(info.ratio * 100).toFixed(0)}%). 민감도를 조절해 보세요.` : info.wasTransparent ? '이미 투명한 이미지예요. 배경 민감도는 쓰이지 않아요.' : `배경 인식 ${(info.ratio * 100).toFixed(0)}%`;
  }
  const edgeSchedule = () => { clearTimeout(edge.timer); edge.timer = setTimeout(edgeRender, 70); };
  async function edgeApply() {
    const ch = curChar(); if (!ch || !edge.base || st.busy) return;
    if (!edge.fromOrig && !window.confirm('원본이 없어서 지금 이미지에 덮어써요. 되돌릴 수 없어요. 계속할까요?')) return;
    const btn = $('[data-act="edge-apply"]', root); btn.disabled = true; btn.textContent = '저장 중…';
    try {
      const { w, h, data } = await pixelsOf(edge.url, 1600);
      const info = processPixels(data.data, w, h, { removeBg: true, ...edge.o });
      if (info.bgFailed) { say('warning', '배경이 균일하지 않아 적용하지 않았어요. 민감도를 조절해 보세요.'); return; }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').putImageData(data, 0, 0);
      await uploadSprite(ch, edge.label, await canvasBlob(cv));
      await loadSprites(ch); renderGrid(); say('success', `${edge.label} 가장자리를 적용했어요.`); closeEdge();
    } catch (e) { say('error', '적용 실패: ' + (e.message || e)); }
    finally { const b = $('[data-act="edge-apply"]', root); if (b) { b.disabled = false; b.textContent = '적용 (스프라이트에 저장)'; } }
  }
  function edgeSetValues(o) {
    edge.o = { ...o };
    for (const [k] of EDGE_SLIDERS) { const el = $(`[data-edge="${k}"]`, root), v = $(`#ee-v-${k}`, root); if (el) el.value = edge.o[k]; if (v) v.textContent = edge.o[k]; }
    edgeRender();
  }

  /* ================= 이벤트 ================= */
  async function onClick(e) {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const act = t.dataset.act, ch = curChar();
    if (act === 'close') return closeModal();
    if (act === 'zoom') return zoom(t.getAttribute('src'));
    if (act === 'edge-close') return closeEdge();
    if (act === 'edge-bg') { edge.bg = t.dataset.k; $('#ee-cvwrap', root).className = 'ee-cvwrap bg-' + edge.bg; root.querySelectorAll('[data-act="edge-bg"]').forEach((b) => b.classList.toggle('primary', b === t)); return; }
    if (act === 'edge-apply') return edgeApply();
    if (act === 'edge-save-def') { const s = S(); s.cutTol = edge.o.tol; s.edgeFringe = edge.o.fringe; s.edgeShrink = edge.o.shrink; s.edgeSoft = edge.o.soft; save(); syncDrawer(); return say('success', '이 값을 기본값으로 저장했어요. 앞으로 만드는 표정에 적용돼요.'); }
    if (act === 'edge-reset') return edgeSetValues({ tol: defaults.cutTol, fringe: defaults.edgeFringe, shrink: defaults.edgeShrink, soft: defaults.edgeSoft });
    if (!ch) return;
    if (act === 'chip') {
      const sel = selected(ch), l = t.dataset.l, i = sel.indexOf(l);
      if (i >= 0) sel.splice(i, 1); else sel.push(l);
      save(); renderChips(); refreshGen();
    } else if (act === 'preset') {
      const p = t.dataset.p; cd(ch).emos = p === '6' ? [...SET6] : p === '10' ? [...CORE10] : p === 'all' ? [...ALL] : [];
      save(); renderChips(); refreshGen();
    } else if (act === 'look-ai') {
      const rec = S().appearance[ch.avatar];
      if (!descOf(ch).trim()) return say('warning', '카드 설명이 비어 있어요. 외형을 직접 적어 주세요.');
      if (rec?.manual && !window.confirm('직접 고친 외형이 지워지고 카드 설명에서 새로 추출해요. 계속할까요?')) return;
      t.disabled = true; const old = t.textContent; t.textContent = '추출하는 중…';
      try { delete S().appearance[ch.avatar]; const v = await appearanceOf(ch); renderLook(); say(v ? 'success' : 'warning', v ? '외형을 추출했어요.' : '외형을 만들지 못했어요.'); }
      catch (err) { say('error', '외형 추출 실패: ' + (err.message || err)); renderLook(); }
      t.disabled = false; t.textContent = old;
    } else if (act === 'style-save') {
      const s = S(), cur = s.stylePresets.find((q) => q.id === s.stylePreset);
      const name = String($('#ee-style-name', root).value || '').trim() || cur?.name || '';
      if (!name) return say('info', '저장할 이름을 입력해 주세요.');
      if (!s.styleText.trim()) return say('info', '프롬프트가 비어 있어요.');
      const same = s.stylePresets.find((q) => q.name === name);
      if (same) { same.text = s.styleText; s.stylePreset = same.id; say('success', `"${name}"에 덮어썼어요.`); }
      else { const id = uid(); s.stylePresets.push({ id, name, text: s.styleText }); s.stylePreset = id; say('success', `"${name}"으로 저장했어요.`); }
      save(); renderStyle();
    } else if (act === 'style-del') {
      const s = S(), x = s.stylePresets.find((q) => q.id === s.stylePreset);
      if (!x) return say('info', '"직접 입력"은 삭제할 수 없어요. 글을 지우면 비워져요.');
      if (!window.confirm(`"${x.name}" 프리셋을 삭제할까요?`)) return;
      s.stylePresets = s.stylePresets.filter((q) => q.id !== x.id);
      s.stylePreset = s.stylePresets[0]?.id || 'custom'; s.styleText = presetText(s.stylePreset) || '';
      save(); renderStyle();
    } else if (act === 'gen') runGen();
    else if (act === 'stop') { st.stop = true; setProg('현재 장을 마치고 멈춰요…'); }
    else if (act === 'regen') regen(t.dataset.l);
    else if (act === 'edge') openEdge(t.dataset.l);
    else if (act === 'del') delSprite(t.dataset.l);
  }
  async function onChange(e) {
    const t = e.target, ch = curChar();
    if (t.id === 'ee-char') { closeEdge(); st.avatar = t.value; return renderBody(); }
    if (t.id === 'ee-style-sel') { const s = S(); s.stylePreset = t.value; s.styleText = presetText(t.value) || ''; save(); return renderStyle(); }
    if (!ch) return;
    if (t.id === 'ee-look') {   // 직접 고치면 고정(manual). 비우면 다음에 다시 자동 추출
      const v = t.value.trim(), s = S();
      if (v) s.appearance[ch.avatar] = { ...(s.appearance[ch.avatar] || {}), t: v, manual: true }; else delete s.appearance[ch.avatar];
      save(); renderLook();
    } else if (t.id === 'ee-outfit') { cd(ch).outfit = t.value.trim(); save(); }
    else if (t.id === 'ee-over') { S().overwrite = t.checked; save(); refreshGen(); }
  }
  function onInput(e) {
    const t = e.target, s = S();
    if (t.id === 'ee-style-text') { s.styleText = t.value; if (s.stylePreset === 'custom') s.customText = t.value; save(); }
    else if (t.id === 'ee-neg') { s.negative = t.value; save(); }
    else if (t.dataset?.edge) { edge.o[t.dataset.edge] = +t.value; const v = $(`#ee-v-${t.dataset.edge}`, root); if (v) v.textContent = t.value; edgeSchedule(); }
  }

  /* ================= 확장 설정 패널 / 메뉴 버튼 ================= */
  const NUMS = { imgGapSec: [0, 60], cutTol: [10, 80], edgeFringe: [0, 100], edgeShrink: [0, 6], edgeSoft: [0, 3] };
  function settingsHtml() {
    return `<div class="inline-drawer" id="ee-settings">
      <div class="inline-drawer-toggle inline-drawer-header"><b>🎭 Expression Extractor · 표정 추출기</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
      <div class="inline-drawer-content">
        <div class="ee-set">
          <label class="checkbox_label"><input type="checkbox" data-k="enabled"><span>표정 추출기 사용 (끄면 마법봉 메뉴에서 사라져요)</span></label>
          <div class="ee-setrow"><div class="menu_button" id="ee-open">표정 추출기 열기</div></div>
          <label>이미지 제공자
            <select data-k="provider" class="text_pole"><option value="gemini">Gemini API (AI Studio 키)</option><option value="vertex">Agent Platform / Vertex</option></select></label>
          <label>API 키 <input type="password" data-k="geminiKey" class="text_pole" autocomplete="off"></label>
          <label>이미지 모델 <input type="text" data-k="geminiModel" class="text_pole" placeholder="${DEFAULT_MODEL}"></label>
          <div class="ee-setrow"><div class="menu_button" id="ee-model-reset">기본 모델로 (${DEFAULT_MODEL})</div></div>
          <label>Vertex 프로젝트 ID (Vertex일 때만, 비워도 돼요) <input type="text" data-k="vertexProject" class="text_pole"></label>
          <label>Vertex 위치 <input type="text" data-k="vertexLocation" class="text_pole"></label>
          <label>텍스트 모델 (외형 추출용 연결 프로필)
            <select id="ee-profile" class="text_pole"></select></label>
          <small id="ee-profile-hint"></small>
          <label>이미지 요청 간격(초, 429 방지) <input type="number" min="0" max="60" data-k="imgGapSec" class="text_pole"></label>
          <label class="checkbox_label"><input type="checkbox" data-k="cutout"><span>배경 제거(투명 PNG)</span></label>
          <label class="checkbox_label"><input type="checkbox" data-k="keepOrig"><span>배경 제거 전 원본도 보관 (가장자리를 나중에 다시 조절할 수 있어요)</span></label>
          <label>배경 민감도 (10~80, 클수록 많이 지워요) <input type="number" min="10" max="80" data-k="cutTol" class="text_pole"></label>
          <label>흰 테두리 제거 (0~100, 0=끔) <input type="number" min="0" max="100" data-k="edgeFringe" class="text_pole"></label>
          <label>가장자리 줄이기 (0~6 px) <input type="number" min="0" max="6" data-k="edgeShrink" class="text_pole"></label>
          <label>가장자리 부드럽게 (0~3 px) <input type="number" min="0" max="3" data-k="edgeSoft" class="text_pole"></label>
          <small>화풍 프롬프트와 제외 요소는 표정 추출기 창 안에서 설정해요. 가장자리 값은 창에서 ✂를 눌러 미리 보면서 맞출 수 있어요.</small>
          <div class="ee-setrow"><div class="menu_button" id="ee-test">연결 테스트</div><div class="menu_button" id="ee-import">VN Studio에서 설정 가져오기</div></div>
          <small>키는 SillyTavern settings.json에 평문으로 저장돼요.</small>
        </div></div></div>`;
  }
  /* ST 테마 CSS가 버튼 폭을 min-content로 줄여 글자가 세로로 쌓이는 문제 방지 (장면 생성기와 같은 처리) */
  function fixButtons() {
    document.querySelectorAll('#ee-settings .menu_button').forEach((b) => {
      for (const [k, v] of [['width', 'auto'], ['min-width', 'max-content'], ['white-space', 'nowrap'], ['flex', '0 0 auto'], ['flex-direction', 'row'], ['word-break', 'keep-all'], ['writing-mode', 'horizontal-tb'], ['align-self', 'flex-start']]) b.style.setProperty(k, v, 'important');
    });
  }
  function renderProfiles() {
    const sel = $('#ee-profile'), hint = $('#ee-profile-hint'); if (!sel) return;
    const list = profileList();
    sel.innerHTML = '<option value="">채팅에 연결된 모델 그대로 사용</option>' + list.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}${p.model ? ` — ${esc(p.model)}` : ''}</option>`).join('');
    sel.value = list.some((p) => p.id === S().llmProfile) ? S().llmProfile : '';
    hint.innerHTML = list.length
      ? '외형 추출(텍스트 호출 1회)에 쓸 모델이에요. Flash 같은 저렴한 프로필을 고르면 채팅 내용을 보내지 않고 카드 설명만 보내요. 비워 두면 지금 채팅에 연결된 모델을 써요.'
      : '연결 프로필 목록을 찾지 못했어요. SillyTavern의 <b>Connection Manager</b> 확장을 켜고 프로필을 만들면 여기서 고를 수 있어요. 지금은 채팅에 연결된 모델을 써요.';
  }
  function syncDrawer() {
    const el = document.getElementById('ee-settings'); if (!el) return;
    const s = S();
    el.querySelectorAll('[data-k]').forEach((i) => { const v = s[i.dataset.k]; if (i.type === 'checkbox') i.checked = !!v; else i.value = v ?? ''; });
  }
  function bindSettings() {
    const el = document.getElementById('ee-settings');
    syncDrawer(); renderProfiles(); fixButtons();
    el.querySelectorAll('[data-k]').forEach((i) => {
      const k = i.dataset.k;
      i.addEventListener('change', () => {
        let v = i.type === 'checkbox' ? i.checked : i.type === 'number' ? (parseFloat(i.value) || 0) : i.value;
        if (NUMS[k]) { v = clamp(v, NUMS[k][0], NUMS[k][1]); i.value = v; }
        S()[k] = v; save();
        if (k === 'enabled') applyEnabled();
      });
    });
    $('#ee-profile', el).addEventListener('change', (e) => { S().llmProfile = e.target.value; profWarned = false; save(); });
    $('#ee-profile', el).addEventListener('focus', renderProfiles);
    $('#ee-open', el).addEventListener('click', openModal);
    $('#ee-model-reset', el).addEventListener('click', () => { S().geminiModel = DEFAULT_MODEL; save(); syncDrawer(); say('success', `이미지 모델을 ${DEFAULT_MODEL}로 되돌렸어요.`); });
    $('#ee-test', el).addEventListener('click', testConnection);
    $('#ee-import', el).addEventListener('click', () => { if (importFromVN(true)) syncDrawer(); });
  }
  function addMenuButton() {
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;
    if (document.getElementById('ee-menu-btn')) return true;
    const b = document.createElement('div');
    b.id = 'ee-menu-btn'; b.className = 'list-group-item flex-container flexGap5';
    b.innerHTML = '<div class="fa-solid fa-masks-theater extensionsMenuExtensionButton"></div><span>표정 추출기</span>';
    b.addEventListener('click', openModal); menu.appendChild(b); return true;
  }
  /* "사용" 체크박스: 끄면 마법봉 메뉴 항목과 창이 사라지고, 켜면 다시 생겨요 */
  function applyEnabled() {
    const on = !!S().enabled;
    if (on) addMenuButton(); else { document.getElementById('ee-menu-btn')?.remove(); if (root) closeModal(); }
    document.getElementById('ee-open')?.classList.toggle('ee-disabled', !on);
  }

  function init() {
    importFromVN(false);
    const host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (host && !document.getElementById('ee-settings')) { host.insertAdjacentHTML('beforeend', settingsHtml()); bindSettings(); }
    applyEnabled();
    if (S().enabled) { let tries = 0; const t = setInterval(() => { if (addMenuButton() || ++tries > 20) clearInterval(t); }, 500); }
  }
  if (window.jQuery) window.jQuery(init);
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
