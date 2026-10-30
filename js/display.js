// Display list + timelines + events: the parts of the Flash player the converted scripts rely on.
const RT = {
  lib: null, bitmaps: {}, root: null, queue: [], tickN: 0, gen: 0,
  mouse: { x: 0, y: 0, down: false }, keysDown: new Set(), keyCode: 0, keyAscii: 0, keyListeners: [], mouseListeners: [],
  hover: null, pressed: null, drag: null, focus: null, activeEdit: null,
  W: 700, H: 400,
};
const MAT_I = [1, 0, 0, 1, 0, 0];
function mmul(p, c) {
  return [p[0] * c[0] + p[2] * c[1], p[1] * c[0] + p[3] * c[1], p[0] * c[2] + p[2] * c[3], p[1] * c[2] + p[3] * c[3],
    p[0] * c[4] + p[2] * c[5] + p[4], p[1] * c[4] + p[3] * c[5] + p[5]];
}
function minv(m) {
  const det = m[0] * m[3] - m[1] * m[2];
  if (!det) return [1, 0, 0, 1, -m[4], -m[5]];
  const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}
function mapply(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
function bboxT(b, m) {
  const xs = [], ys = [];
  for (const [x, y] of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]]) { const p = mapply(m, x, y); xs.push(p[0]); ys.push(p[1]); }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
function bunion(a, b) { if (!a) return b; if (!b) return a; return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]; }
function cxCompose(o, i) {
  if (!o) return i; if (!i) return o;
  return [o[0] * i[0], o[1] * i[1], o[2] * i[2], o[3] * i[3], o[0] * i[4] + o[4], o[1] * i[5] + o[5], o[2] * i[6] + o[6], o[3] * i[7] + o[7]];
}
function decompose(m) {
  const det = m[0] * m[3] - m[1] * m[2];
  let sx = Math.hypot(m[0], m[1]);
  if (det < 0) sx = -sx;
  let rot = 0, sy = Math.hypot(m[2], m[3]);
  if (sx !== 0) rot = Math.atan2(m[1] / sx, m[0] / sx);
  else rot = Math.atan2(-m[2], m[3]);
  return { x: m[4], y: m[5], sx, sy, rot };
}

// ---------------------------------------------------------------- base display object
class DO {
  constructor(parent) {
    this.parent = parent || null; this.name = null; this.depth = 0; this.visibleV = true; this.alphaV = 100;
    this.pm = MAT_I; this.scripted = false; this.x = 0; this.y = 0; this.sx = 1; this.sy = 1; this.rot = 0;
    this.cx = null; this.ct = null; this.alive = true; this.timeline = false; this.charId = 0;
    this.root = parent ? parent.root : null;
  }
  get mat() {
    if (!this.scripted) return this.pm;
    const c = Math.cos(this.rot), s = Math.sin(this.rot);
    return [this.sx * c, this.sx * s, -this.sy * s, this.sy * c, this.x, this.y];
  }
  touch() {
    if (this.scripted) return;
    const d = decompose(this.pm); this.x = d.x; this.y = d.y; this.sx = d.sx; this.sy = d.sy; this.rot = d.rot; this.scripted = true;
  }
  setPlacement(m, cx) { if (!this.scripted) this.pm = m; this.cx = cx; }
  globalMat() { return this.parent ? mmul(this.parent.globalMat(), this.mat) : this.mat; }
  path() {
    if (!this.parent) return '_level0';
    return this.parent.path() + '.' + (this.name || ('instance' + this.depth));
  }
  localBounds() { return null; }
  // bounds in parent's coordinate space
  parentBounds() { const b = this.localBounds(); return b ? bboxT(b, this.mat) : null; }
  globalBounds() { const b = this.localBounds(); return b ? bboxT(b, this.globalMat()) : null; }
  hasMember(n) {
    switch (n) {
      case '_x': case '_y': case '_xscale': case '_yscale': case '_alpha': case '_visible': case '_rotation': case '_width': case '_height':
      case '_name': case '_parent': case '_root': case '_target': case '_xmouse': case '_ymouse': case '_url': case '_level0': return true;
    }
    return false;
  }
  getMember(n) {
    switch (n) {
      case '_x': return this.scripted ? this.x : this.pm[4];
      case '_y': return this.scripted ? this.y : this.pm[5];
      case '_xscale': return (this.scripted ? this.sx : decompose(this.pm).sx) * 100;
      case '_yscale': return (this.scripted ? this.sy : decompose(this.pm).sy) * 100;
      case '_rotation': return (this.scripted ? this.rot : decompose(this.pm).rot) * 180 / Math.PI;
      case '_alpha': return this.alphaV;
      case '_visible': return this.visibleV;
      case '_name': return this.name === null ? '' : this.name;
      case '_parent': return this.parent || undefined;
      case '_root': case '_level0': return this.root;
      case '_target': return '/' + this.path().replace(/^_level0\.?/, '').replace(/\./g, '/');
      case '_url': return RT.url;
      case '_width': { const b = this.parentBounds(); return b ? b[2] - b[0] : 0; }
      case '_height': { const b = this.parentBounds(); return b ? b[3] - b[1] : 0; }
      case '_xmouse': { const g = minv(this.globalMat()); return mapply(g, RT.mouse.x, RT.mouse.y)[0]; }
      case '_ymouse': { const g = minv(this.globalMat()); return mapply(g, RT.mouse.x, RT.mouse.y)[1]; }
    }
    return undefined;
  }
  setMember(n, v) {
    switch (n) {
      case '_x': this.touch(); this.x = A.n(v); RT.gen++; return true;
      case '_y': this.touch(); this.y = A.n(v); RT.gen++; return true;
      case '_xscale': this.touch(); this.sx = A.n(v) / 100; RT.gen++; return true;
      case '_yscale': this.touch(); this.sy = A.n(v) / 100; RT.gen++; return true;
      case '_rotation': this.touch(); this.rot = A.n(v) * Math.PI / 180; RT.gen++; return true;
      case '_alpha': this.alphaV = A.n(v); return true;
      case '_visible': this.visibleV = A.tf(v) && v !== 0; return true;
      case '_name': this.setName(A.s(v)); return true;
      case '_width': { const b = this.parentBounds(); const w = b ? b[2] - b[0] : 0; this.touch(); if (w) this.sx *= A.n(v) / w; RT.gen++; return true; }
      case '_height': { const b = this.parentBounds(); const h = b ? b[3] - b[1] : 0; this.touch(); if (h) this.sy *= A.n(v) / h; RT.gen++; return true; }
    }
    return false;
  }
  setName(nm) {
    if (this.parent && this.name !== null && this.parent.names.get(this.name) === this) this.parent.names.delete(this.name);
    this.name = nm;
    if (this.parent && nm) this.parent.names.set(nm, this);
  }
  delMember() { return false; }
  enumKeys() { return []; }
  removeMovieClip() { if (this.parent) this.parent.$removeChild(this); }
  $unload() { this.alive = false; if (RT.hover === this) RT.hover = null; if (RT.pressed === this) RT.pressed = null; }
  $draw() {}
}

// ---------------------------------------------------------------- static things
class ShapeDO extends DO {
  constructor(parent, id) { super(parent); this.charId = id; this.shape = RT.lib.shapes[id]; }
  localBounds() { const s = this.shape; return s && (s.f.length || s.l.length) ? s.b : null; }
  $draw(ctx, cx) { drawShape(ctx, this.shape, cx); }
  $hit(ctx, x, y) {
    const s = this.shape; if (!s) return false;
    for (const [, d] of s.f) if (ctx.isPointInPath(getPath(d), x, y)) return true;
    return false;
  }
}
const pathCache = new Map();
function getPath(d) { let p = pathCache.get(d); if (!p) { p = new Path2D(d); pathCache.set(d, p); } return p; }
function colorStr(hex, a, cx) {
  let r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  if (cx) {
    r = Math.max(0, Math.min(255, r * cx[0] + cx[4])); g = Math.max(0, Math.min(255, g * cx[1] + cx[5]));
    b = Math.max(0, Math.min(255, b * cx[2] + cx[6])); a = Math.max(0, Math.min(1, a * cx[3] + cx[7] / 255));
  }
  return 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + a + ')';
}
function drawShape(ctx, sh, cx) {
  if (!sh) return;
  if (cx && cx[3] <= 0 && cx[7] <= 0) return;
  for (const [fill, d] of sh.f) {
    const p = getPath(d);
    if (fill[0] === 's') { ctx.fillStyle = colorStr(fill[1], fill[2], cx); ctx.fill(p); }
    else if (fill[0] === 'g') {
      const m = fill[2];
      ctx.save(); ctx.clip(p);
      ctx.transform(m[0] / 20, m[1] / 20, m[2] / 20, m[3] / 20, m[4], m[5]);
      let g;
      if (fill[1] === 'l') g = ctx.createLinearGradient(-16384, 0, 16384, 0);
      else g = ctx.createRadialGradient(fill[4] * 16384, 0, 0, 0, 0, 16384);
      for (const st of fill[3]) g.addColorStop(Math.min(1, st[0] / 255), colorStr(st[1], st[2], cx));
      ctx.fillStyle = g; ctx.fillRect(-1e5, -1e5, 2e5, 2e5); ctx.restore();
    } else if (fill[0] === 'b') {
      const im = RT.bitmaps[fill[1]]; if (!im) continue;
      const m = fill[2], al = cx ? Math.max(0, Math.min(1, cx[3] + cx[7] / 255)) : 1;
      ctx.save(); ctx.clip(p);
      if (al < 1) ctx.globalAlpha *= al;
      ctx.imageSmoothingEnabled = !!fill[3];
      ctx.transform(m[0] / 20, m[1] / 20, m[2] / 20, m[3] / 20, m[4], m[5]);
      if (fill[4]) { ctx.fillStyle = ctx.createPattern(im, 'repeat'); ctx.fillRect(-1e5, -1e5, 2e5, 2e5); }
      else ctx.drawImage(im, 0, 0);
      ctx.restore();
    }
  }
  for (const [w, c, a, d] of sh.l) {
    ctx.lineWidth = w; ctx.strokeStyle = colorStr(c, a, cx); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(getPath(d));
  }
}

// ---- text -------------------------------------------------------------------------------------
// glyph origins are snapped to whole device pixels so the pixel fonts stay crisp
function snapXY(ctx, x, y) {
  const m = ctx.getTransform();
  if (m.b || m.c || !m.a || !m.d) return [x, y];
  const dx = m.a * x + m.e, dy = m.d * y + m.f;
  return [x + (Math.round(dx) - dx) / m.a, y + (Math.round(dy) - dy) / m.d];
}
class TextDO extends DO {
  constructor(parent, id) { super(parent); this.charId = id; this.t = RT.lib.texts[id]; }
  localBounds() { return this.t ? bboxT(this.t.b, this.t.m) : null; }
  $draw(ctx, cx) {
    const t = this.t; if (!t) return;
    ctx.save(); ctx.transform(...t.m);
    for (const r of t.r) {
      const f = RT.lib.fonts[r.font]; if (!f) continue;
      const scale = (r.h / 20) / 20480; let x = r.x / 20; const y = r.y / 20;
      ctx.fillStyle = colorStr(r.color, 1, cx);
      for (const [gi, adv] of r.g) {
        const gp = f.g[gi];
        if (gp) { const sp = snapXY(ctx, x, y); ctx.save(); ctx.translate(sp[0], sp[1]); ctx.scale(scale, scale); ctx.fill(getPath(gp)); ctx.restore(); }
        x += adv / 20;
      }
    }
    ctx.restore();
  }
}
function fontByRef(fid) { return RT.lib.fonts[fid]; }
class EditDO extends DO {
  constructor(parent, id) {
    super(parent); this.charId = id; this.e = RT.lib.edits[id];
    this.textV = this.e.text !== undefined ? this.e.text : null; this.autoSize = this.e.auto ? 'left' : 'none';
    this.varName = this.e.var || '';
    this.colorV = this.e.color || '000000'; this.htmlV = this.e.html; this.fmtScroll = 0;
    this.bw = this.e.b; this.border = this.e.border; this.maxChars = this.e.max; this.selectable = this.e.sel; this.ro = this.e.ro; this.multiline = this.e.multi; this.wrap = this.e.wrap;
    this.ownAlpha = 1; this.cursor = 0;
  }
  getText() {
    if (this.varName) {
      const v = A.gv(this.parent.scope, this.varName);
      if (v !== undefined) return A.s(v);
      if (this.textV !== null) return this.textV;
      return '';
    }
    return this.textV === null ? '' : this.textV;
  }
  setText(t) {
    this.textV = t;
    if (this.varName) A.sv(this.parent.scope, this.varName, t);
  }
  localBounds() { return this.e.b; }
  hasMember(n) { return ['text', 'htmlText', 'html', 'autoSize', 'variable', 'textColor', 'selectable', 'multiline', 'wordWrap', 'maxChars', 'border', 'length', 'password', 'type', 'embedFonts', 'background', 'backgroundColor', 'borderColor', 'scroll', 'maxscroll', 'restrict', 'setTextFormat', 'setNewTextFormat', 'getTextFormat', 'replaceSel', 'removeTextField'].includes(n) || super.hasMember(n); }
  getMember(n) {
    switch (n) {
      case 'text': case 'htmlText': { const t = this.getText(); return n === 'htmlText' ? t : t; }
      case 'html': return !!this.htmlV; case 'autoSize': return this.autoSize; case 'variable': return this.varName;
      case 'textColor': return parseInt(this.colorV, 16); case 'selectable': return this.selectable; case 'multiline': return this.multiline;
      case 'wordWrap': return this.wrap; case 'maxChars': return this.maxChars; case 'border': return this.border; case 'length': return this.getText().length;
      case 'type': return this.ro ? 'dynamic' : 'input'; case 'scroll': return this.fmtScroll; case 'maxscroll': return 1;
      case 'setTextFormat': case 'setNewTextFormat': return function () { }; case 'getTextFormat': return function () { return {}; };
      case 'removeTextField': return function () { this.removeMovieClip(); };
    }
    return super.getMember(n);
  }
  setMember(n, v) {
    switch (n) {
      case 'text': case 'htmlText': this.setText(A.s(v)); RT.gen++; return true;
      case 'html': this.htmlV = A.tf(v); return true; case 'autoSize': this.autoSize = v === true ? 'left' : (v === false ? 'none' : A.s(v)); return true;
      case 'variable': this.varName = A.s(v); return true;
      case 'textColor': this.colorV = ('000000' + (A.n(v) | 0).toString(16)).slice(-6); return true;
      case 'selectable': this.selectable = A.tf(v); return true; case 'multiline': this.multiline = A.tf(v); return true;
      case 'wordWrap': this.wrap = A.tf(v); return true; case 'maxChars': this.maxChars = v; return true;
      case 'border': this.border = A.tf(v); return true; case 'type': this.ro = A.s(v) === 'dynamic'; return true;
      case 'embedFonts': case 'background': case 'backgroundColor': case 'borderColor': case 'password': case 'restrict': case 'scroll': return true;
    }
    return super.setMember(n, v);
  }
  stripHtml(t) {
    if (!this.htmlV) return t;
    return t.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
  }
  $draw(ctx, cx) {
    const e = this.e; let text = this.stripHtml(this.getText());
    const b = e.b;
    if (this.border) { ctx.strokeStyle = colorStr('000000', 1, cx); ctx.lineWidth = 1; ctx.strokeRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); }
    if (!text && RT.activeEdit !== this) return;
    const f = fontByRef(e.font), hpx = (e.h || 240) / 20;
    ctx.save();
    ctx.beginPath(); ctx.rect(b[0], b[1], b[2] - b[0], b[3] - b[1]); ctx.clip();
    ctx.fillStyle = colorStr(this.colorV, e.alpha === undefined ? 1 : e.alpha, cx);
    const scale = hpx / 20480, lm = (e.lm || 0) / 20, rm = (e.rm || 0) / 20;
    const width = (b[2] - b[0]) - lm - rm - 4;
    const asc = f ? (f.asc || 18000) * scale : hpx * 0.9, desc = f ? (f.desc || 4000) * scale : hpx * 0.25, lead = (e.lead || 0) / 20;
    const lineH = asc + desc + lead;
    const adv = ch => {
      if (f) { const gi = f.c.indexOf(ch.charCodeAt(0)); if (gi >= 0 && f.adv[gi] !== undefined) return f.adv[gi] * scale; }
      return hpx * 0.55;
    };
    // layout lines
    const lines = [];
    const paras = text.split(/\r\n|\r|\n/);
    for (const para of paras) {
      if (!(this.wrap || e.wrap) && !this.multiline) { lines.push(para); continue; }
      if (!(this.wrap || e.wrap)) { lines.push(para); continue; }
      let cur = '', w = 0;
      for (const word of para.split(/(?<= )/)) {
        let ww = 0; for (const ch of word) ww += adv(ch);
        if (w + ww > width && cur) { lines.push(cur); cur = word; w = ww; } else { cur += word; w += ww; }
      }
      lines.push(cur);
    }
    let y = b[1] + 2 + asc;
    const measure = s => { let w = 0; for (const ch of s) w += adv(ch); return w; };
    for (const ln of lines) {
      const w = measure(ln); let x = b[0] + 2 + lm + (e.ind || 0) / 20;
      if (e.align === 1) x = b[2] - 2 - rm - w; else if (e.align === 2) x = b[0] + 2 + lm + (width - w) / 2;
      if (this.autoSize === 'left' && false) x = b[0] + 2;
      for (const ch of ln) {
        const gi = f ? f.c.indexOf(ch.charCodeAt(0)) : -1;
        if (gi >= 0 && f.g[gi]) { const sp = snapXY(ctx, x, y); ctx.save(); ctx.translate(sp[0], sp[1]); ctx.scale(scale, scale); ctx.fill(getPath(f.g[gi])); ctx.restore(); x += f.adv[gi] * scale; }
        else if (ch !== ' ') { ctx.font = hpx + 'px Arial'; ctx.fillText(ch, x, y); x += adv(ch); }
        else x += adv(ch);
      }
      y += lineH;
    }
    if (RT.activeEdit === this && Math.floor(RT.tickN / 8) % 2 === 0) {
      const w = measure(lines[lines.length - 1] || ''); ctx.fillRect(b[0] + 2 + lm + w, y - lineH - 0 , 1, lineH);
    }
    ctx.restore();
  }
}

// ---- buttons ------------------------------------------------------------------------------------
class ButtonDO extends DO {
  constructor(parent, id) {
    super(parent); this.charId = id; this.b = RT.lib.buttons[id]; this.state = 'up'; this.kidsBy = {};
    for (const st of ['up', 'over', 'down', 'hit']) {
      this.kidsBy[st] = this.b.s[st].map(o => { const k = makeChar(this, o[1]); if (k) { k.setPlacement(o[2], o[3]); k.depth = o[0]; if (k instanceof MC) k.$init(); } return k; }).filter(Boolean);
    }
    if (!this.kidsBy.hit.length) this.kidsBy.hit = this.kidsBy.up;
    this.enabled = true; this.vars = Object.create(null);
    this.tabEnabled = true;
  }
  curKids() { const s = this.kidsBy[this.state]; return s.length ? s : this.kidsBy.up; }
  localBounds() { let b = null; for (const k of this.kidsBy.hit) { const kb = k.localBounds(); if (kb) b = bunion(b, bboxT(kb, k.mat)); } return b; }
  hasMember(n) { return n in this.vars || n === 'enabled' || super.hasMember(n); }
  getMember(n) { if (n in this.vars) return this.vars[n]; if (n === 'enabled') return this.enabled; return super.getMember(n); }
  setMember(n, v) { if (super.setMember(n, v)) return true; if (n === 'enabled') { this.enabled = A.tf(v); return true; } this.vars[n] = v; return true; }
  $draw(ctx, cx) {
    for (const k of this.curKids()) { ctx.save(); ctx.transform(...k.mat); k.$draw(ctx, cxCompose(cx, k.cx)); ctx.restore(); }
  }
  $hit(ctx, x, y) {
    for (const k of this.kidsBy.hit) {
      const m = minv(k.mat); const p = mapply(m, x, y);
      if (k.$hit && k.$hit(ctx, p[0], p[1])) return true;
      if (k instanceof MC && k.$hitDeep(ctx, p[0], p[1])) return true;
    }
    return false;
  }
  $tick() { for (const k of this.curKids()) if (k instanceof MC) k.$tickTree(); }
  fire(condBit) {
    for (const [cond, hash] of this.b.a) {
      if ((cond & condBit)) RT.queue.push(() => runCode(hash, this.parent.scope));
    }
  }
}

function makeChar(parent, id) {
  const L = RT.lib;
  if (L.sprites[id]) return new MC(parent, id);
  if (L.shapes[id]) return new ShapeDO(parent, id);
  if (L.buttons[id]) return new ButtonDO(parent, id);
  if (L.texts[id]) return new TextDO(parent, id);
  if (L.edits[id]) return new EditDO(parent, id);
  return null;
}
function runCode(hash, scope) {
  const f = CODE[hash];
  if (!f) { A.warn('nocode:' + hash, 'missing code', hash); return; }
  try { f(scope); } catch (e) { console.error('[as error]', hash, e); (RT.errors = RT.errors || []).push([hash, String(e), e.stack]); }
}

// ---------------------------------------------------------------- movie clip
const EV = { load: 1, enterFrame: 2, unload: 4, mouseMove: 8, mouseDown: 16, mouseUp: 32, keyDown: 64, keyUp: 128, data: 256, initialize: 512, press: 1024, release: 2048, releaseOutside: 4096, rollOver: 8192, rollOut: 16384, dragOver: 32768, dragOut: 65536, keyPress: 131072, construct: 262144 };
const EMPTY_DEF = { n: 1, l: {}, f: [[]], a: [[]] };
class MC extends DO {
  constructor(parent, id, def) {
    super(parent);
    this.charId = id; this.def = def || RT.lib.sprites[id] || EMPTY_DEF;
    this.kids = new Map(); this.names = new Map(); this.vars = Object.create(null);
    this.frame = 0; this.playing = true; this.ca = null; this.sortedCache = null; this.isNew = true;
    this.scope = { obj: this, loc: null, thisv: this, next: A.globalScope };
    this.inited = false; this.enabled = true; this.useHand = true;
    this.dragLock = false;
  }
  get total() { return this.def.n; }
  $init() {
    if (this.inited) return; this.inited = true;
    this.$queueScript(0);
    this.$build(0, true);
    // clip events: initialize/construct/load queued after the frame script
    if (this.ca) { this.$queueEvent(EV.initialize); this.$queueEvent(EV.construct); }
    RT.queue.push(() => { if (this.alive) { this.$fire(EV.load); } });
  }
  // --- timeline ---------------------------------------------------------------
  $sorted() {
    if (!this.sortedCache) this.sortedCache = [...this.kids.values()].sort((a, b) => a.sdepth - b.sdepth);
    return this.sortedCache;
  }
  $add(k, sdepth) {
    const old = this.kids.get(sdepth);
    if (old) this.$removeChild(old);
    k.sdepth = sdepth; k.depth = sdepth + 16384; k.parent = this; k.root = this.root;
    this.kids.set(sdepth, k); this.sortedCache = null; RT.gen++;
  }
  $removeChild(k) {
    if (this.kids.get(k.sdepth) === k) this.kids.delete(k.sdepth);
    if (k.name !== null && this.names.get(k.name) === k) this.names.delete(k.name);
    this.sortedCache = null; RT.gen++;
    k.$unload();
  }
  $unload() {
    if (!this.alive) return;
    if (this.ca) this.$queueEvent(EV.unload);
    this.$call('onUnload');
    for (const c of [...this.kids.values()]) c.$unload();
    this.alive = false;
    if (RT.hover === this) RT.hover = null;
    if (RT.pressed === this) RT.pressed = null;
  }
  $build(f, fresh) {
    // place/refresh timeline children for frame f
    const def = this.def, list = def.f[f] || [];
    const backward = !fresh && f < this.frame;
    if (backward) { for (const [d, k] of [...this.kids]) if (k.timeline) this.$removeChild(k); }
    const seen = new Set();
    for (const o of list) {
      const [dep, id, m, cx, name, cd, ca, , gen] = o; const sd = dep - 16384; seen.add(sd);
      let k = this.kids.get(sd);
      if (!k || !k.timeline || k.charId !== id || k.gen !== gen) {
        k = makeChar(this, id);
        if (!k) continue;
        k.timeline = true; k.gen = gen; k.pm = m; k.cx = cx;
        if (ca !== null && ca !== undefined) k.ca = RT.lib.ca[ca];
        this.$add(k, sd);
        if (name) k.setName(name);
        k.cd = cd;
        if (k instanceof MC) k.$init();
      } else {
        k.setPlacement(m, cx); k.cd = cd;
        if (name && k.name !== name) k.setName(name);
      }
    }
    for (const [sd, k] of [...this.kids]) if (k.timeline && !seen.has(sd)) this.$removeChild(k);
    this.sortedCache = null;
  }
  $enter(f, runScript) {
    if (runScript !== false) this.$queueScript(f);
    this.$build(f, false);
    this.frame = f; RT.gen++;
  }
  $queueScript(f) {
    const acts = this.def.a[f];
    if (acts && acts.length) for (const h of acts) RT.queue.push(() => { if (this.alive) runCode(h, this.scope); });
  }
  gotoFrame(f, play) {
    f = Math.max(0, Math.min(this.total - 1, Math.floor(A.n(f))));
    if (play !== undefined) this.playing = !!play;
    if (f === this.frame && this.inited) { return; }
    this.$enter(f);
  }
  gotoSpec(spec, play) {
    let f;
    if (typeof spec === 'number') f = spec - 1;
    else {
      const s = A.s(spec);
      if (this.def.l[s] !== undefined) f = this.def.l[s];
      else if (/^\d+$/.test(s)) f = parseInt(s, 10) - 1;
      else { const lbl = Object.keys(this.def.l).find(k => k.toLowerCase() === s.toLowerCase()); f = lbl !== undefined ? this.def.l[lbl] : undefined; if (f === undefined) { A.warn('nolabel:' + s, 'goto unknown label', s, this.path()); return; } }
    }
    this.gotoFrame(f, play);
  }
  play() { this.playing = true; }
  stop() { this.playing = false; }
  $advance() {
    if (this.total <= 1) return;
    const nf = this.frame + 1 >= this.total ? 0 : this.frame + 1;
    this.$enter(nf);
  }
  // --- clip events -------------------------------------------------------------------
  $queueEvent(bit, key) {
    if (this.ca) for (const [ev, k, hash] of this.ca) if ((ev & bit) && (bit !== EV.keyPress || k === key)) RT.queue.push(() => { if (this.alive) runCode(hash, this.scope); });
  }
  $fire(bit) { this.$queueEvent(bit); }
  $handler(name) { const h = this.vars[name]; return typeof h === 'function' ? h : null; }
  $call(name, args) { const h = this.$handler(name); if (h) RT.queue.push(() => { if (this.alive) { try { h.apply(this, args || []); } catch (e) { console.error('[as handler error]', name, e); } } }); }
  // --- display tree helpers ----------------------------------------------------------
  $tickTree() { this.$tickKids(); }
  $tickKids() { for (const k of this.$sorted()) if (k instanceof MC) k.$tickTree(); else if (k instanceof ButtonDO) k.$tick(); }
  $all(out) { out.push(this); for (const k of this.$sorted()) { if (k instanceof MC) k.$all(out); else if (k instanceof ButtonDO) { for (const kk of k.curKids()) if (kk instanceof MC) kk.$all(out); } } return out; }
  localBounds() {
    if (this.bgen === RT.gen && this.bcache !== undefined) return this.bcache;
    let b = null;
    for (const k of this.kids.values()) {
      if (k.cd) continue;
      const kb = k.localBounds(); if (kb) b = bunion(b, bboxT(kb, k.mat));
    }
    this.bgen = RT.gen; this.bcache = b;
    return b;
  }
  $hitDeep(ctx, x, y) {
    for (const k of this.kids.values()) {
      if (!k.visibleV || k.cd) continue;
      const p = mapply(minv(k.mat), x, y);
      if (k instanceof MC) { if (k.$hitDeep(ctx, p[0], p[1])) return true; }
      else if (k.$hit && k.$hit(ctx, p[0], p[1])) return true;
    }
    return false;
  }
  // --- AS member access -------------------------------------------------------------------
  hasMember(n) {
    if (n in this.vars) return true;
    if (this.names.has(n)) return true;
    if (super.hasMember(n)) return true;
    if (n === '_currentframe' || n === '_totalframes' || n === '_framesloaded') return true;
    return mcProto(n) !== undefined;
  }
  getMember(n) {
    if (n in this.vars) return this.vars[n];
    const c = this.names.get(n); if (c) return c;
    switch (n) {
      case '_currentframe': return this.frame + 1;
      case '_totalframes': case '_framesloaded': return this.total;
      case '_droptarget': return '';
      case 'enabled': return this.enabled;
      case 'useHandCursor': return this.useHand;
      case 'focusEnabled': return false; case 'tabEnabled': return false;
      case '_lockroot': return false;
    }
    const sv = super.getMember(n);
    if (sv !== undefined) return sv;
    return mcProto(n);
  }
  setMember(n, v) {
    if (super.setMember(n, v)) return true;
    if (n === 'enabled') { this.enabled = A.tf(v); return true; }
    if (n === 'useHandCursor') { this.useHand = A.tf(v); return true; }
    this.vars[n] = v; return true;
  }
  delMember(n) { if (n in this.vars) { delete this.vars[n]; return true; } return false; }
  enumKeys() { return [...Object.keys(this.vars), ...this.names.keys()]; }
  // --- AS methods (names are the public Flash API) ------------------------------------------
  gotoAndPlay(f) { this.gotoSpec(f, true); }
  gotoAndStop(f) { this.gotoSpec(f, false); }
  nextFrame() { this.gotoFrame(this.frame + 1, false); }
  prevFrame() { this.gotoFrame(this.frame - 1, false); }
  attachMovie(link, name, depth, init) {
    const id = RT.lib.exports[A.s(link)];
    if (id === undefined || !RT.lib.sprites[id]) { A.warn('noattach:' + link, 'attachMovie: unknown linkage', link); return undefined; }
    const mc = new MC(this, id);
    this.$add(mc, A.n(depth)); mc.setName(A.s(name));
    if (init && typeof init === 'object') for (const k in init) mc.setMember(k, init[k]);
    mc.$init(); RT.gen++;
    return mc;
  }
  createEmptyMovieClip(name, depth) {
    const mc = new MC(this, 0, EMPTY_DEF);
    this.$add(mc, A.n(depth)); mc.setName(A.s(name)); mc.$init(); return mc;
  }
  duplicateMovieClip(name, depth, init) {
    const p = this.parent; if (!p) return undefined;
    const mc = new MC(p, this.charId, this.def);
    mc.ca = this.ca; p.$add(mc, A.n(depth)); mc.setName(A.s(name));
    mc.pm = this.mat; mc.cx = this.cx; mc.alphaV = this.alphaV;
    if (init && typeof init === 'object') for (const k in init) mc.setMember(k, init[k]);
    mc.$init(); return mc;
  }
  removeMovieClip() { if (this.parent) { if (this.timeline) this.timeline = false; this.parent.$removeChild(this); } }
  swapDepths(t) {
    const p = this.parent; if (!p) return;
    if (typeof t === 'number') {
      const old = p.kids.get(t); p.kids.delete(this.sdepth);
      if (old) { old.sdepth = this.sdepth; old.depth = this.depth; p.kids.set(old.sdepth, old); }
      this.sdepth = t; this.depth = t + 16384; p.kids.set(t, this);
    } else if (t instanceof DO) {
      const a = this.sdepth, b = t.sdepth; p.kids.set(a, t); p.kids.set(b, this); t.sdepth = a; t.depth = a + 16384; this.sdepth = b; this.depth = b + 16384;
    }
    p.sortedCache = null;
  }
  getDepth() { return this.sdepth; }
  getNextHighestDepth() { let m = -1; for (const d of this.kids.keys()) if (d > m) m = d; return m + 1; }
  getInstanceAtDepth(d) { return this.kids.get(A.n(d)); }
  hitTest(a, b, shape) {
    if (a instanceof DO) {
      const g1 = this.globalBounds(), g2 = a.globalBounds();
      if (!g1 || !g2) return false;
      return g1[0] < g2[2] && g1[2] > g2[0] && g1[1] < g2[3] && g1[3] > g2[1];
    }
    if (typeof a === 'number' || typeof a === 'string') {
      const x = A.n(a), y = A.n(b);
      if (A.tf(shape)) {
        const p = mapply(minv(this.globalMat()), x, y);
        return this.$hitDeep(RT.hitCtx, p[0], p[1]);
      }
      const g = this.globalBounds(); return !!g && x >= g[0] && x <= g[2] && y >= g[1] && y <= g[3];
    }
    return false;
  }
  getBounds(target) {
    const b = this.localBounds() || [0, 0, 0, 0];
    let tm = this.globalMat(), res;
    if (target instanceof DO && target !== this) tm = mmul(minv(target.globalMat()), tm);
    else if (target === this) tm = MAT_I;
    else tm = this.globalMat();
    const bb = bboxT(b, tm);
    return { xMin: bb[0], yMin: bb[1], xMax: bb[2], yMax: bb[3] };
  }
  localToGlobal(pt) { const g = mapply(this.globalMat(), A.n(pt.x), A.n(pt.y)); pt.x = g[0]; pt.y = g[1]; }
  globalToLocal(pt) { const g = mapply(minv(this.globalMat()), A.n(pt.x), A.n(pt.y)); pt.x = g[0]; pt.y = g[1]; }
  startDrag(lock, l, t, r, b) { this.$startDrag(A.tf(lock), l === undefined ? null : [A.n(l), A.n(t), A.n(r), A.n(b)]); }
  $startDrag(lock, rect) {
    // offset keeps the grab point under the cursor unless the clip centre is locked to the mouse
    const g = minv(this.parent.globalMat()), lp = mapply(g, RT.mouse.x, RT.mouse.y);
    RT.drag = { mc: this, lock, rect, dx: lock ? 0 : this.getMember('_x') - lp[0], dy: lock ? 0 : this.getMember('_y') - lp[1] };
  }
  stopDrag() { RT.drag = null; }
  getBytesLoaded() { return 1e6; } getBytesTotal() { return 1e6; }
  loadMovie() {} unloadMovie() { this.removeMovieClip(); } getURL(u, t) { A.getURL(A.s(u), A.s(t)); }
  setMask() {} createTextField(name, depth, x, y, w, h) {
    // dynamic text field built from scratch
    const id = -1; const tf = new EditDO(this, Object.keys(RT.lib.edits)[0]);
    tf.e = { b: [0, 0, A.n(w), A.n(h)], text: '', ro: true, sel: false, h: 240, font: undefined, align: 0, lm: 0, rm: 0, ind: 0, lead: 0, wrap: false, multi: false };
    tf.textV = ''; tf.bw = tf.e.b; this.$add(tf, A.n(depth)); tf.setName(A.s(name));
    tf.pm = [1, 0, 0, 1, A.n(x), A.n(y)]; return tf;
  }
  // --- rendering -------------------------------------------------------------------------------
  $draw(ctx, cxIn) {
    const kids = this.$sorted();
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i];
      if (k.cd) {
        // mask: clip following layers up to depth cd
        const sh = k instanceof ShapeDO ? k.shape : null;
        let j = i + 1;
        if (sh) {
          const reg = new Path2D(); for (const [, d] of sh.f) reg.addPath(getPath(d));
          ctx.save(); ctx.transform(...k.mat); ctx.clip(reg); const inv = minv(k.mat); ctx.transform(...inv);
          for (; j < kids.length && kids[j].depth <= k.cd; j++) this.$drawKid(ctx, kids[j], cxIn);
          ctx.restore(); i = j - 1;
        }
        continue;
      }
      this.$drawKid(ctx, k, cxIn);
    }
  }
  $drawKid(ctx, k, cxIn) {
    if (!k.visibleV || k.alphaV <= 0 || k.hidden) return;
    let cx = cxCompose(cxIn, k.ct || k.cx);
    if (k.alphaV !== 100) cx = cxCompose(cx, [1, 1, 1, k.alphaV / 100, 0, 0, 0, 0]);
    const m = k.mat;
    ctx.save(); ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    k.$draw(ctx, cx);
    ctx.restore();
  }
  toString() { return this.path(); }
}
// Only the real Flash MovieClip API (plus functions the scripts add to MovieClip.prototype) is visible to scripts;
// engine internals must not shadow script variables such as `total` or `path`.
const MC_API = ['play', 'stop', 'gotoAndPlay', 'gotoAndStop', 'nextFrame', 'prevFrame', 'attachMovie', 'createEmptyMovieClip', 'duplicateMovieClip', 'removeMovieClip', 'swapDepths', 'getDepth', 'getNextHighestDepth', 'getInstanceAtDepth', 'hitTest', 'getBounds', 'localToGlobal', 'globalToLocal', 'startDrag', 'stopDrag', 'getBytesLoaded', 'getBytesTotal', 'loadMovie', 'unloadMovie', 'getURL', 'setMask', 'createTextField', 'toString'];
const MC_INTERNAL = new Set([...Object.getOwnPropertyNames(MC.prototype), ...Object.getOwnPropertyNames(DO.prototype)].filter(n => !MC_API.includes(n)));
function mcProto(n) {
  if (MC_INTERNAL.has(n)) return undefined;
  const d = Object.getOwnPropertyDescriptor(MC.prototype, n);
  return d && typeof d.value === 'function' ? d.value : undefined;
}
// hook: ca (clip actions) typed events on timeline-placed clips
MC.prototype.$isInteractive = function () {
  if (this.ca && this.ca.some(([ev]) => ev & (EV.press | EV.release | EV.releaseOutside | EV.rollOver | EV.rollOut | EV.dragOver | EV.dragOut))) return true;
  const v = this.vars;
  return !!(typeof v.onPress === 'function' || typeof v.onRelease === 'function' || typeof v.onRollOver === 'function' || typeof v.onRollOut === 'function' || typeof v.onReleaseOutside === 'function' || typeof v.onDragOver === 'function' || typeof v.onDragOut === 'function');
};
