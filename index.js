/* Expression Extractor 1.0.0 · 표정 추출기 (SillyTavern)
 * VN Studio의 "카드 이미지 → 표정 이미지" 기능만 따로 뗀 확장이에요.
 * - 캐릭터 카드 PNG(+설명)에서 영어 외형 태그를 뽑고
 * - Gemini로 표정 이미지를 한 장씩 만들고 (선택) 배경을 투명하게 지운 뒤
 * - SillyTavern 기본 표정 스프라이트 폴더(/api/sprites/upload)에 저장해요.
 *   → 기본 "Character Expressions" 확장이 그대로 사용해요.
 */
(() => {
  'use strict';
  const MODULE = 'expr_extractor';
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
    provider: 'gemini', geminiKey: '', geminiModel: 'gemini-3.1-flash-image', vertexProject: '', vertexLocation: 'global',
    lookModel: 'gemini-2.5-flash', lookVision: true, imgGapSec: 6, cutout: true, cutTol: 34,
    style: 'visual novel character sprite, clean lines, high detail', negative: '', overwrite: false,
    emosDefault: [...SET6], chars: {}, imported: false,
  };

  /* ================= 저장소/유틸 ================= */
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (sel, root = document) => root.querySelector(sel);

  function S() {
    const { extensionSettings } = ctx();
    if (!extensionSettings[MODULE]) extensionSettings[MODULE] = structuredClone(defaults);
    const s = extensionSettings[MODULE];
    for (const k of Object.keys(defaults)) if (s[k] === undefined) s[k] = structuredClone(defaults[k]);
    return s;
  }
  const save = () => ctx().saveSettingsDebounced();
  const cd = (ch) => { const s = S(); return (s.chars[ch.avatar] ||= { look: '', outfit: '', emos: null }); };

  /* VN Studio 설정(API 키 등)을 처음 한 번 가져온다 */
  function importFromVN(force = false) {
    const s = S(), v = ctx().extensionSettings?.vnstudio;
    if (!v) { if (force) say('info', 'VN Studio 설정을 찾지 못했어요.'); return false; }
    if (!force && (s.imported || s.geminiKey)) return false;
    s.provider = v.imgProvider || s.provider; s.geminiKey = v.geminiKey || s.geminiKey; s.geminiModel = v.geminiModel || s.geminiModel;
    s.vertexProject = v.vertexProject ?? s.vertexProject; s.vertexLocation = v.vertexLocation || s.vertexLocation;
    s.lookModel = v.lookModel || s.lookModel; s.imgGapSec = v.imgGapSec ?? s.imgGapSec; s.cutout = v.cutout ?? s.cutout; s.cutTol = v.cutTol ?? s.cutTol;
    s.negative = v.negative ?? s.negative;
    for (const [av, c] of Object.entries(v.chars || {})) if (c?.look && !s.chars[av]?.look) (s.chars[av] ||= { look: '', outfit: '', emos: null }).look = c.look;
    s.imported = true; save();
    if (force) say('success', 'VN Studio에서 설정을 가져왔어요.');
    return true;
  }

  /* ================= 캐릭터/스프라이트 폴더 ================= */
  const chars = () => ctx().characters || [];
  /* ST 표정 확장은 기본적으로 캐릭터 이름 폴더를 쓰고, 폴더 덮어쓰기(expressionOverrides)가 있으면 그 경로를 써요 */
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

  async function loadSprites(ch) {
    try {
      const r = await fetch('/api/sprites/get?name=' + encodeURIComponent(folderOf(ch)), { headers: jsonHeaders() });
      const j = r.ok ? await r.json() : [];
      st.sprites = (Array.isArray(j) ? j : []).filter((x) => x?.label && x?.path).sort((a, b) => a.label.localeCompare(b.label));
    } catch { st.sprites = []; }
  }
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

  /* ================= 이미지 유틸 ================= */
  const b64ToBlob = (b64, mime) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); };
  const loadImg = (obj) => new Promise((ok, no) => { const i = new Image(); const t = setTimeout(() => no(new Error('timeout')), 8000); i.onload = () => { clearTimeout(t); ok(i); }; i.onerror = (e) => { clearTimeout(t); no(e); }; i.src = obj; });
  const canvasBlob = (cv) => new Promise((ok, no) => cv.toBlob((b) => (b ? ok(b) : no(new Error('PNG 변환 실패'))), 'image/png'));

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
      const x = p % w, y = (p / w) | 0; let near = 0;      // 배경과 맞닿은 1~2픽셀은 부드럽게 (테두리 흰 띠 제거)
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && mark[yy * w + xx]) { near = Math.max(Math.abs(dx), Math.abs(dy)); break; } }
      if (near) { const k = clamp((dist(i) - tol * 0.5) / (tol * 1.2), 0, 1); d[i + 3] = Math.round(255 * (near === 1 ? Math.min(k, 0.75) : k)); }
    }
    return { ok: true, ratio };
  }
  /* Blob → 배경 제거된 PNG Blob (실패하면 blob: null) */
  async function cutoutBlob(blob, tol = S().cutTol || 34) {
    const obj = URL.createObjectURL(blob);
    try {
      const img = await loadImg(obj);
      const k = Math.min(1, 1600 / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
      const data = g.getImageData(0, 0, w, h), res = cutoutPixels(data.data, w, h, tol);
      if (!res.ok) return { blob: null, ratio: res.ratio };
      g.putImageData(data, 0, 0);
      return { blob: await canvasBlob(cv), ratio: res.ratio };
    } finally { URL.revokeObjectURL(obj); }
  }
  async function toPngBlob(blob) {   // 원본이 jpg/webp여도 PNG로 통일
    if (blob.type === 'image/png') return blob;
    const obj = URL.createObjectURL(blob);
    try { const img = await loadImg(obj), cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; cv.getContext('2d').drawImage(img, 0, 0); return await canvasBlob(cv); }
    finally { URL.revokeObjectURL(obj); }
  }

  /* ================= Gemini 호출 ================= */
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
  /* 이미지 한 장 생성 → { b64, mime } */
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
  async function geminiText(prompt, parts = []) {
    const s = S(); if (!s.geminiKey.trim()) throw new Error('이미지 API 키가 없어요');
    const body = { contents: [{ role: 'user', parts: [...parts, { text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 900 } };
    const r = await fetch(apiUrl('generateContent', s.lookModel || 'gemini-2.5-flash'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.geminiKey.trim() }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${r.status}: ${j?.error?.message || '요청 실패'}`);
    return (j.candidates?.[0]?.content?.parts || []).map((x) => x.text || '').join('');
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

  /* ================= 외형 태그 추출 ================= */
  function parseJSON(text) {
    const t = String(text || '').replace(/```json|```/gi, '').trim();
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
  }
  /* 모델 답변에서 외형 태그 한 줄만 깨끗하게 뽑는다 */
  function cleanLook(raw) {
    let s = String(raw || '').replace(/<(think|thinking)>[\s\S]*?<\/\1>/gi, '');
    const j = parseJSON(s); if (j) { const v = j.tags || j.appearance || j.look || Object.values(j)[0]; if (v) s = Array.isArray(v) ? v.join(', ') : String(v); }
    const lines = s.split('\n').map((l) => l.replace(/[*_`#>]/g, '').replace(/^\s*[-•\d.)]+\s+/, '').trim()).filter(Boolean)
      .map((l) => l.replace(/^[^,:]{0,48}\b(tags?|appearance|description|visual)\b[^:]{0,40}:\s*/i, '').trim())
      .filter((l) => !/^(here|sure|okay|output|note|below)\b/i.test(l));
    let best = '', bestScore = 0;
    for (const l of lines) { const sc = (l.match(/,/g) || []).length * 10 + l.length / 10; if (sc > bestScore) { best = l; bestScore = sc; } }
    best = best.replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').trim();
    return (best.length >= 25 && (best.match(/,/g) || []).length >= 3) ? best.slice(0, 700) : '';
  }
  async function extractLook(ch) {
    const text = [ch.description, ch.personality].filter(Boolean).join('\n');
    const rules = `Write ONE comma-separated line of ENGLISH visual tags (22 to 40 tags) for this character, describing ONLY physical appearance and typical clothing, in this order: age impression and gender, build and height, face shape and notable features, skin tone and any marks (freckles, scars, vitiligo, tattoos), hair color / length / style, eye color, typical outfit with colors, accessories. Be specific and concrete (e.g. "messy damp dark brown hair", "amber gold eyes", "oversized dark hoodie"), not generic. No names, no personality, no scene or pose. Reply with ONLY this JSON: {"tags":"tag1, tag2, ..."}`;
    if (S().lookVision && ch.avatar) {      // ① 카드 PNG 우선
      try {
        const img = await refInline('/characters/' + encodeURIComponent(ch.avatar), 1024);
        if (img) {
          const out = cleanLook(await geminiText(`The attached image is the character card portrait of "${ch.name}". Trust the image first; use the description only to fill what the image cannot show.\n${rules}\n\n[Description]\n${text.slice(0, 2500)}`, [img]));
          if (out) return out;
        }
      } catch (e) { console.warn('[EE] 이미지 기반 외형 추출 실패, 텍스트로 대체', e); }
    }
    if (!text.trim()) return '';
    for (let i = 0; i < 2; i++) {      // ② 설명만
      const base = `Do NOT roleplay and do not think out loud. ${rules}\n\n[Description]\n${text.slice(0, 3000)}`;
      const out = cleanLook(await geminiText(i ? base + '\nThe previous answer was unusable. Output the JSON object only, with at least 22 tags.' : base));
      if (out) return out;
    }
    return '';
  }
  async function ensureLook(ch) {
    const d = cd(ch);
    if (d.look?.trim()) return d.look.trim();
    try { const v = await extractLook(ch); if (v) { d.look = v; save(); const el = $('#ee-look'); if (el && st.avatar === ch.avatar) el.value = v; return v; } } catch (e) { console.warn('[EE] 외형 추출 실패', e); }
    return [ch.description, ch.personality].filter(Boolean).join(' ').replace(/\s+/g, ' ').slice(0, 300);   // 저장하지 않는 임시 대체
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
    const neg = String(s.negative || '').trim(), style = String(s.style || '').trim() + (neg ? `. Avoid: ${neg}` : '');
    const prompt = `${notes.join(' ')}\nGenerate one image: a visual novel character sprite, waist-up portrait of "${ch.name}" (${look || 'as in the reference'}). Outfit: ${outfit}. Expression and pose: ${EMO_DESC[emo] || emo}. Natural, expressive, candid body language and a slight three-quarter angle, NOT a stiff straight-on attention stance. Rendering style: ${style}. Match EXACTLY the rendering style, level of realism, lighting and color grading of the reference image (if the reference is photorealistic, make this photorealistic too, NOT anime or illustration). Background: plain flat solid pure white, no floor, no shadow, no gradient, no props behind. Single character, no text, no UI, no watermark.`;
    const { b64, mime } = await geminiImage(prompt, refs, '3:4', `${ch.name}·${emo}`);
    let blob = b64ToBlob(b64, mime);
    if (s.cutout) {
      try {
        const c = await cutoutBlob(blob);
        if (c.blob) blob = c.blob; else say('info', `배경 제거를 건너뛰었어요 (배경이 균일하지 않아요, 인식 ${(c.ratio * 100).toFixed(0)}%). 원본으로 저장했어요.`);
      } catch (e) { console.warn('[EE] 배경 제거 실패', e); }
    }
    blob = await toPngBlob(blob);
    if (hasSprite(emo)) await deleteSprite(ch, emo);   // 확장자가 다른 옛 파일이 남지 않게
    await uploadSprite(ch, emo, blob);
  }

  /* ================= UI ================= */
  let root = null;
  const selected = (ch) => { const d = cd(ch); if (!Array.isArray(d.emos)) d.emos = [...(S().emosDefault || SET6)]; return d.emos; };
  const todoList = (ch) => {
    const sel = selected(ch), over = S().overwrite;
    const list = ALL.filter((e) => sel.includes(e) && (over || !hasSprite(e)));
    if (list.length && !hasSprite('neutral') && !list.includes('neutral')) list.unshift('neutral');   // neutral을 먼저 만들어 기준으로 삼는다
    return list;
  };
  function setProg(t) { const el = $('#ee-prog'); if (el) el.textContent = t || ''; }

  function buildModal() {
    if (root) return;
    root = document.createElement('div'); root.id = 'ee-modal'; root.className = 'ee-off';
    root.innerHTML = `<div class="ee-box"><header><b>🎭 표정 추출기</b><span class="ee-grow"></span><button class="ee-btn" data-act="close" aria-label="닫기">✕</button></header><div id="ee-body"></div></div>`;
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
  }
  async function openModal() {
    buildModal();
    if (!st.avatar || !curChar()) st.avatar = defaultAvatar();
    root.classList.remove('ee-off');
    await renderBody();
  }
  const closeModal = () => root?.classList.add('ee-off');

  async function renderBody() {
    const body = $('#ee-body', root), ch = curChar();
    if (!ch) { body.innerHTML = '<p class="ee-hint">캐릭터가 없어요. SillyTavern에서 캐릭터를 먼저 만들어 주세요.</p>'; return; }
    await loadSprites(ch);
    const d = cd(ch), s = S();
    body.innerHTML = `
      <div class="ee-row"><label>캐릭터</label>
        <select id="ee-char">${chars().map((c) => `<option value="${esc(c.avatar)}" ${c.avatar === st.avatar ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <span class="ee-hint">저장 폴더: <code>${esc(folderOf(ch))}</code></span></div>
      <div class="ee-top">
        <img class="ee-card" data-act="zoom" src="/characters/${encodeURIComponent(ch.avatar)}" alt="카드 이미지" title="카드 이미지 (표정 생성의 기준)">
        <div class="ee-col">
          <label class="ee-lbl">외형 태그 (모든 표정에 똑같이 쓰여요)</label>
          <textarea id="ee-look" rows="4" placeholder="비워 두면 처음 생성할 때 카드 PNG와 설명에서 영어 외형 태그를 한 번 만들어 저장해요. 직접 고치면 외형이 더 일관돼요.">${esc(d.look || '')}</textarea>
          <div class="ee-row"><button class="ee-btn sm" data-act="look-ai">카드 PNG·설명에서 외형 태그 뽑기</button></div>
          <label class="ee-lbl">의상 (선택, 영어 권장)</label>
          <input type="text" id="ee-outfit" placeholder="비우면 카드의 기본 의상 그대로. 예: white sailor school uniform with red ribbon" value="${esc(d.outfit || '')}">
        </div>
      </div>
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
      <p class="ee-hint">이미지 1장마다 이미지 API가 1번 호출돼서 요금이 발생해요. 429를 피하려고 설정의 \"요청 간격\"만큼 한 장씩 천천히 보내요. 만든 표정은 SillyTavern 표정 확장이 바로 쓸 수 있어요(안 보이면 채팅을 다시 열어 보세요).</p>`;
    renderChips(); renderGrid(); refreshGen();
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
      <button class="ee-x" data-act="del" data-l="${esc(sp.label)}" aria-label="삭제">✕</button><button class="ee-rg" data-act="regen" data-l="${esc(sp.label)}" title="이 표정 다시 생성" aria-label="다시 생성">↻</button><button class="ee-cutb" data-act="cut" data-l="${esc(sp.label)}" title="배경 제거(투명하게)" aria-label="배경 제거">✂</button></figure>`).join('') || '<span class="ee-hint">아직 스프라이트가 없어요. 위에서 표정을 골라 만들어 보세요.</span>';
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
      catch (err) { say('error', `${e} 생성 실패: ${err.message || err}`); if (e === 'neutral' && !hasSprite('neutral')) break; }
    }
    st.busy = false; setProg(st.stop ? `중지했어요 (${made}장 완료)` : `끝! ${made}장을 만들었어요.`);
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
  async function cutExisting(label) {
    const ch = curChar(), sp = st.sprites.find((x) => x.label === label); if (!ch || !sp || st.busy) return;
    try {
      const r = await fetch(spriteUrl(sp)); if (!r.ok) throw new Error('이미지를 불러오지 못했어요');
      const c = await cutoutBlob(await r.blob());
      if (!c.blob) { say('info', `배경이 균일하지 않아 건너뛰었어요 (인식 ${(c.ratio * 100).toFixed(0)}%). 설정에서 민감도를 조절해 보세요.`); return; }
      await deleteSprite(ch, label); await uploadSprite(ch, label, c.blob);
      await loadSprites(ch); renderGrid(); say('success', `${label} 배경을 지웠어요.`);
    } catch (e) { say('error', '배경 제거 실패: ' + (e.message || e)); }
  }
  async function delSprite(label) {
    const ch = curChar(); if (!ch || st.busy) return;
    if (!window.confirm(`"${label}" 스프라이트를 삭제할까요?`)) return;
    const ok = await deleteSprite(ch, label);
    if (!ok) say('error', '삭제하지 못했어요.');
    await loadSprites(ch); renderGrid(); renderChips(); refreshGen();
  }
  function zoom(src) {
    const o = document.createElement('div'); o.className = 'ee-zoom'; o.innerHTML = `<img src="${esc(src)}" alt="">`;
    o.addEventListener('click', () => o.remove()); document.body.appendChild(o);
  }

  async function onClick(e) {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const act = t.dataset.act, ch = curChar();
    if (act === 'close') return closeModal();
    if (act === 'zoom') return zoom(t.getAttribute('src'));
    if (!ch) return;
    if (act === 'chip') {
      const sel = selected(ch), l = t.dataset.l, i = sel.indexOf(l);
      if (i >= 0) sel.splice(i, 1); else sel.push(l);
      save(); renderChips(); refreshGen();
    } else if (act === 'preset') {
      const p = t.dataset.p; cd(ch).emos = p === '6' ? [...SET6] : p === '10' ? [...CORE10] : p === 'all' ? [...ALL] : [];
      save(); renderChips(); refreshGen();
    } else if (act === 'look-ai') {
      if (!S().geminiKey.trim()) return say('warning', 'API 키를 먼저 입력해 주세요.');
      t.disabled = true; t.textContent = '뽑는 중…';
      try { const v = await extractLook(ch); if (v) { cd(ch).look = v; save(); $('#ee-look', root).value = v; say('success', '외형 태그를 저장했어요.'); } else say('warning', '태그를 만들지 못했어요. 직접 적어 주세요.'); }
      catch (err) { say('error', '추출 실패: ' + (err.message || err)); }
      t.disabled = false; t.textContent = '카드 PNG·설명에서 외형 태그 뽑기';
    } else if (act === 'gen') runGen();
    else if (act === 'stop') { st.stop = true; setProg('현재 장을 마치고 멈춰요…'); }
    else if (act === 'regen') regen(t.dataset.l);
    else if (act === 'cut') cutExisting(t.dataset.l);
    else if (act === 'del') delSprite(t.dataset.l);
  }
  async function onChange(e) {
    const t = e.target, ch = curChar();
    if (t.id === 'ee-char') { st.avatar = t.value; return renderBody(); }
    if (!ch) return;
    if (t.id === 'ee-look') { cd(ch).look = t.value.trim(); save(); }
    else if (t.id === 'ee-outfit') { cd(ch).outfit = t.value.trim(); save(); }
    else if (t.id === 'ee-over') { S().overwrite = t.checked; save(); refreshGen(); }
  }

  /* ================= 확장 설정 패널 / 메뉴 버튼 ================= */
  function settingsHtml() {
    return `<div class="inline-drawer" id="ee-settings">
      <div class="inline-drawer-toggle inline-drawer-header"><b>🎭 Expression Extractor · 표정 추출기</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
      <div class="inline-drawer-content">
        <div class="ee-set">
          <button class="menu_button" id="ee-open">표정 추출기 열기</button>
          <label>이미지 제공자
            <select data-k="provider" class="text_pole"><option value="gemini">Gemini API (AI Studio 키)</option><option value="vertex">Agent Platform / Vertex</option></select></label>
          <label>API 키 <input type="password" data-k="geminiKey" class="text_pole" autocomplete="off"></label>
          <label>이미지 모델 <input type="text" data-k="geminiModel" class="text_pole"></label>
          <label>Vertex 프로젝트 ID (Vertex일 때만, 비워도 돼요) <input type="text" data-k="vertexProject" class="text_pole"></label>
          <label>Vertex 위치 <input type="text" data-k="vertexLocation" class="text_pole"></label>
          <label>외형 태그 추출 모델 <input type="text" data-k="lookModel" class="text_pole"></label>
          <label class="checkbox_label"><input type="checkbox" data-k="lookVision"><span>카드 이미지도 같이 보고 외형 태그 만들기</span></label>
          <label>이미지 요청 간격(초, 429 방지) <input type="number" min="0" max="60" data-k="imgGapSec" class="text_pole"></label>
          <label class="checkbox_label"><input type="checkbox" data-k="cutout"><span>배경 제거(투명 PNG)</span></label>
          <label>배경 제거 민감도 (10~80, 클수록 많이 지워요) <input type="number" min="10" max="80" data-k="cutTol" class="text_pole"></label>
          <label>화풍 / 스타일 <textarea data-k="style" rows="2" class="text_pole"></textarea></label>
          <label>제외 요소 (선택) <input type="text" data-k="negative" class="text_pole"></label>
          <div class="ee-setrow"><button class="menu_button" id="ee-test">연결 테스트</button><button class="menu_button" id="ee-import">VN Studio에서 설정 가져오기</button></div>
          <small>키는 SillyTavern settings.json에 평문으로 저장돼요.</small>
        </div></div></div>`;
  }
  function bindSettings() {
    const el = document.getElementById('ee-settings'), s = S();
    el.querySelectorAll('[data-k]').forEach((i) => {
      const k = i.dataset.k;
      if (i.type === 'checkbox') i.checked = !!s[k]; else i.value = s[k] ?? '';
      i.addEventListener('change', () => {
        S()[k] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? (parseFloat(i.value) || 0) : i.value;
        save();
      });
    });
    $('#ee-open', el).addEventListener('click', openModal);
    $('#ee-test', el).addEventListener('click', testConnection);
    $('#ee-import', el).addEventListener('click', () => { if (importFromVN(true)) { el.querySelectorAll('[data-k]').forEach((i) => { const v = S()[i.dataset.k]; if (i.type === 'checkbox') i.checked = !!v; else i.value = v ?? ''; }); } });
  }
  function addMenuButton() {
    const menu = document.getElementById('extensionsMenu');
    if (!menu || document.getElementById('ee-menu-btn')) return !!menu;
    const b = document.createElement('div');
    b.id = 'ee-menu-btn'; b.className = 'list-group-item flex-container flexGap5';
    b.innerHTML = '<div class="fa-solid fa-masks-theater extensionsMenuExtensionButton"></div><span>표정 추출기</span>';
    b.addEventListener('click', openModal); menu.appendChild(b); return true;
  }

  function init() {
    importFromVN(false);
    const host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (host && !document.getElementById('ee-settings')) { host.insertAdjacentHTML('beforeend', settingsHtml()); bindSettings(); }
    let tries = 0; const t = setInterval(() => { if (addMenuButton() || ++tries > 20) clearInterval(t); }, 500);
  }
  if (window.jQuery) window.jQuery(init); else document.addEventListener('DOMContentLoaded', init);
})();
