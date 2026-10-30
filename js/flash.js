// Flash-API globals (Key, Mouse, Sound, SharedObject, Color ...), event dispatch, tick loop and rendering.
(function () {
  const G = GLOBAL;
  // ---- plain language globals -------------------------------------------------------------
  G.Object = Object; G.Array = Array; G.String = String; G.Number = Number; G.Boolean = Boolean; G.Date = Date; G.Math = Math;
  G.Function = Function; G.Error = Error; G.RegExp = RegExp;
  G.NaN = NaN; G.Infinity = Infinity; G.undefined = undefined;
  G.isNaN = x => isNaN(A.n(x)); G.isFinite = x => isFinite(A.n(x));
  G.parseInt = (s, r) => { s = A.s(s); const v = r ? parseInt(s, A.n(r)) : parseInt(s, /^\s*[-+]?0x/i.test(s) ? 16 : 10); return v; };
  G.parseFloat = s => parseFloat(A.s(s));
  G.escape = s => escape(A.s(s)); G.unescape = s => unescape(A.s(s));
  G.random = n => Math.floor(Math.random() * A.n(n));
  G.int = x => A.toint(x); G.getTimer = A.getTimer;
  G.getVersion = () => 'WIN 8,0,22,0';
  G.trace = A.trace;
  G.fscommand = () => {};
  G.eval = s => A.gv(A.globalScope, A.s(s));
  G.ASSetPropFlags = () => {};
  G.chr = n => String.fromCharCode(A.n(n)); G.ord = s => A.s(s).charCodeAt(0);
  G.length = s => A.s(s).length;
  G.substring = (s, i, c) => A.sub1(s, i, c);
  G.setInterval = function (a, b, c, ...rest) {
    let fn, ms, args;
    if (typeof a === 'function') { ms = b; args = c === undefined ? [] : [c, ...rest]; fn = () => a.apply(undefined, args); }
    else { ms = c; args = rest; fn = () => { const f = A.gm(a, b); if (typeof f === 'function') f.apply(a, args); }; }
    return setInterval(() => { try { fn(); } catch (e) { console.error('[interval]', e); } }, Math.max(1, A.n(ms)));
  };
  G.clearInterval = id => clearInterval(id);
  G.setTimeout = (a, ms, ...r) => setTimeout(() => { try { a.apply(undefined, r); } catch (e) { console.error(e); } }, A.n(ms));
  G.clearTimeout = id => clearTimeout(id);
  Object.registerClass = () => true;
  const defProp = (proto, name, fn) => Object.defineProperty(proto, name, { value: fn, writable: true, configurable: true, enumerable: false });
  defProp(Object.prototype, 'addProperty', function (name, g, s) { Object.defineProperty(this, name, { get: g ? () => g.call(this) : undefined, set: s ? v => s.call(this, v) : undefined, configurable: true, enumerable: true }); return true; });
  defProp(Object.prototype, 'watch', function () { return true; });
  defProp(Object.prototype, 'unwatch', function () { return true; });
  defProp(Object.prototype, 'hasOwnProperty', Object.prototype.hasOwnProperty);
  defProp(Array.prototype, 'sortOn', function (key, opt) {
    const keys = Array.isArray(key) ? key : [key]; const desc = (opt & 2) !== 0, num = (opt & 16) !== 0;
    this.sort((a, b) => { for (const k of keys) { let x = a[k], y = b[k]; if (num) { x = A.n(x); y = A.n(y); } else if (!(opt & 1)) { x = A.s(x); y = A.s(y); } if (x < y) return desc ? 1 : -1; if (x > y) return desc ? -1 : 1; } return 0; });
    return this;
  });
  // ---- Key ---------------------------------------------------------------------------------------
  G.Key = {
    BACKSPACE: 8, CAPSLOCK: 20, CONTROL: 17, DELETEKEY: 46, DOWN: 40, END: 35, ENTER: 13, ESCAPE: 27, HOME: 36, INSERT: 45, LEFT: 37, PGDN: 34, PGUP: 33, RIGHT: 39, SHIFT: 16, SPACE: 32, TAB: 9, UP: 38,
    isDown: c => RT.keysDown.has(A.n(c)), getCode: () => RT.keyCode, getAscii: () => RT.keyAscii, isToggled: () => false,
    addListener: o => { if (!RT.keyListeners.includes(o)) RT.keyListeners.push(o); }, removeListener: o => { const i = RT.keyListeners.indexOf(o); if (i >= 0) RT.keyListeners.splice(i, 1); return true; },
  };
  G.Mouse = { addListener: o => { if (!RT.mouseListeners.includes(o)) RT.mouseListeners.push(o); }, removeListener: o => { const i = RT.mouseListeners.indexOf(o); if (i >= 0) RT.mouseListeners.splice(i, 1); return true; }, hide: () => { RT.cursorHidden = true; }, show: () => { RT.cursorHidden = false; } };
  G.Stage = { width: 700, height: 400, scaleMode: 'noScale', align: 'TL', showMenu: true, displayState: 'normal', addListener() { }, removeListener() { } };
  G.System = { capabilities: { os: 'Windows XP', language: 'en', version: 'WIN 8,0,22,0', playerType: 'PlugIn', screenResolutionX: 1920, screenResolutionY: 1080, hasAudio: true }, security: { allowDomain() { }, allowInsecureDomain() { } }, setClipboard() { }, useCodepage: false };
  G.Selection = { setFocus: t => { if (t instanceof EditDO && !t.ro) RT.activeEdit = t; else if (t === null) RT.activeEdit = null; return true; }, getFocus: () => RT.activeEdit ? RT.activeEdit.path() : null, addListener() { }, removeListener() { }, setSelection() { }, getBeginIndex: () => 0, getEndIndex: () => 0, getCaretIndex: () => 0 };
  G.MovieClip = MC; G.Button = ButtonDO; G.TextField = EditDO;
  G.ContextMenu = function () { this.customItems = []; this.builtInItems = {}; this.hideBuiltInItems = function () { }; this.onSelect = null; };
  G.ContextMenuItem = function (caption, handler) { this.caption = caption; this.onSelect = handler; this.enabled = true; this.visible = true; };
  G.LoadVars = function () { this.load = function () { return false; }; this.sendAndLoad = function () { return false; }; this.send = function () { return false; }; this.onLoad = null; this.toString = () => ''; };
  G.XML = function () { this.load = function () { return false; }; this.sendAndLoad = function () { return false; }; this.onLoad = null; this.ignoreWhite = false; };
  G.TextFormat = function () { };
  G.Point = function (x, y) { this.x = x || 0; this.y = y || 0; };
  G.Color = function (mc) { this.mc = mc; };
  G.Color.prototype.setRGB = function (rgb) { const v = A.n(rgb) | 0; if (this.mc instanceof DO) this.mc.ct = [0, 0, 0, 1, (v >> 16) & 255, (v >> 8) & 255, v & 255, 0]; };
  G.Color.prototype.getRGB = function () { const c = this.mc && this.mc.ct; return c ? (c[4] << 16) | (c[5] << 8) | c[6] : 0; };
  G.Color.prototype.setTransform = function (t) { if (this.mc instanceof DO) this.mc.ct = [A.n(t.ra) / 100, A.n(t.ga) / 100, A.n(t.ba) / 100, A.n(t.aa) / 100, A.n(t.rb), A.n(t.gb), A.n(t.bb), A.n(t.ab) * 2.55]; };
  G.Color.prototype.getTransform = function () { const c = (this.mc && this.mc.ct) || [1, 1, 1, 1, 0, 0, 0, 0]; return { ra: c[0] * 100, ga: c[1] * 100, ba: c[2] * 100, aa: c[3] * 100, rb: c[4], gb: c[5], bb: c[6], ab: c[7] / 2.55 }; };
  // ---- SharedObject ------------------------------------------------------------------------------
  G.SharedObject = {
    getLocal(name) {
      const key = 'ssf_so_' + name; let data = {};
      try { const s = localStorage.getItem(key); if (s) data = JSON.parse(s); } catch (e) { }
      const so = { data, onStatus: null, flush() { try { localStorage.setItem(key, JSON.stringify(so.data)); } catch (e) { } return true; }, clear() { so.data = {}; try { localStorage.removeItem(key); } catch (e) { } }, getSize() { return 1; } };
      return so;
    },
  };
  // ---- Sound ---------------------------------------------------------------------------------------
  G.Sound = function (target) { this.vol = 100; this.pan = 0; this.name = null; this.handle = null; this.position = 0; this.duration = 0; this.onSoundComplete = null; this.target = target; };
  G.Sound.prototype.attachSound = function (n) { this.name = A.s(n); Aud.load(this.name); return true; };
  G.Sound.prototype.start = function (off, loops) {
    if (this.name === null) return;
    if (this.handle) this.handle.stop();
    const self = this;
    this.handle = Aud.start(this.name, { loops: loops === undefined ? 1 : A.n(loops), vol: this.vol / 100, offset: A.n(off) || 0, onended: () => { if (typeof self.onSoundComplete === 'function') self.onSoundComplete(); } });
  };
  G.Sound.prototype.stop = function (n) { if (this.handle) { this.handle.stop(); this.handle = null; } else if (n === undefined && this.name === null) { A.stopSounds(); } };
  G.Sound.prototype.setVolume = function (v) { this.vol = A.n(v); if (this.handle) this.handle.setVolume(this.vol / 100); };
  G.Sound.prototype.getVolume = function () { return this.vol; };
  G.Sound.prototype.setPan = function (p) { this.pan = A.n(p); }; G.Sound.prototype.getPan = function () { return this.pan; };
  G.Sound.prototype.loadSound = function () { }; G.Sound.prototype.getBytesLoaded = function () { return 1; }; G.Sound.prototype.getBytesTotal = function () { return 1; };
  G.Sound.prototype.setTransform = function () { }; G.Sound.prototype.getTransform = function () { return {}; };
  A.onStopSounds = () => { Aud.stopAll(); };
})();

// ---------------------------------------------------------------- events & tick
RT.hitCtx = (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas')).getContext('2d');
RT.url = 'http://localhost/ssf.swf';

RT.findTarget = function (mc, x, y) {
  const kids = mc.$sorted();
  for (let i = kids.length - 1; i >= 0; i--) {
    const k = kids[i];
    if (!k.visibleV || k.cd || k.alphaV <= 0 && false) continue;
    const p = mapply(minv(k.mat), x, y);
    if (k instanceof ButtonDO) { if (k.enabled && k.$hit(RT.hitCtx, p[0], p[1])) return k; }
    else if (k instanceof MC) {
      if (k.enabled && k.$isInteractive() && k.$hitDeep(RT.hitCtx, p[0], p[1])) return k;
      const r = RT.findTarget(k, p[0], p[1]); if (r) return r;
    }
  }
  return null;
};
RT.allMCs = () => RT.root.$all([]);
RT.setButtonState = (t, s) => { if (t instanceof ButtonDO) t.state = s; };
RT.mouseMove = function (x, y) {
  RT.mouse.x = x; RT.mouse.y = y; RT.mouse.seen = true;
  if (RT.drag) {
    const d = RT.drag, p = d.mc.parent; const g = minv(p.globalMat()); const lp = mapply(g, x, y);
    let nx = lp[0] + d.dx, ny = lp[1] + d.dy;
    if (d.rect) { nx = Math.max(d.rect[0], Math.min(d.rect[2], nx)); ny = Math.max(d.rect[1], Math.min(d.rect[3], ny)); }
    d.mc.setMember('_x', nx); d.mc.setMember('_y', ny);
  }
  const t = RT.updateHover();
  for (const mc of RT.allMCs()) { if (mc.ca) mc.$queueEvent(EV.mouseMove); mc.$call('onMouseMove'); }
  for (const l of RT.mouseListeners) { const f = l.onMouseMove; if (typeof f === 'function') RT.queue.push(() => f.call(l)); }
  RT.canvas && (RT.canvas.style.cursor = (t && !RT.cursorHidden && (t.useHand !== false)) ? 'pointer' : 'default');
};
// recompute what is under the cursor (also needed when the screen changes under a stationary mouse)
RT.updateHover = function () {
  const t = RT.findTarget(RT.root, RT.mouse.x, RT.mouse.y);
  if (RT.hover && !RT.hover.alive) RT.hover = null;
  if (t !== RT.hover) {
    const old = RT.hover;
    if (old && old.alive) {
      if (old instanceof ButtonDO) { if (RT.pressed === old) old.fire(16); else old.fire(1); old.state = 'up'; }
      else { old.$queueEvent(RT.pressed === old ? EV.dragOut : EV.rollOut); old.$call(RT.pressed === old ? 'onDragOut' : 'onRollOut'); }
    }
    RT.hover = t;
    if (t) {
      if (t instanceof ButtonDO) { if (RT.pressed === t) { t.fire(32); t.state = 'down'; } else { t.fire(2); t.state = 'over'; } }
      else { t.$queueEvent(RT.pressed === t ? EV.dragOver : EV.rollOver); t.$call(RT.pressed === t ? 'onDragOver' : 'onRollOver'); }
    }
  }
  return t;
};
RT.mouseDown = function () {
  RT.mouse.down = true;
  RT.updateHover();
  const t = RT.hover;
  // focus handling for input text fields
  RT.activeEdit = null;
  const editHit = RT.findEdit(RT.root, RT.mouse.x, RT.mouse.y);
  if (editHit) RT.activeEdit = editHit;
  if (t && t.alive) {
    RT.pressed = t;
    if (t instanceof ButtonDO) { t.state = 'down'; t.fire(4 | 128); }
    else { t.$queueEvent(EV.press); t.$call('onPress'); }
  }
  for (const mc of RT.allMCs()) { if (mc.ca) mc.$queueEvent(EV.mouseDown); mc.$call('onMouseDown'); }
  for (const l of RT.mouseListeners) { const f = l.onMouseDown; if (typeof f === 'function') RT.queue.push(() => f.call(l)); }
};
RT.mouseUp = function () {
  RT.mouse.down = false;
  const p = RT.pressed; RT.pressed = null;
  if (p && p.alive) {
    if (p instanceof ButtonDO) {
      if (RT.hover === p) { p.state = 'over'; p.fire(8 | 256); } else { p.state = 'up'; p.fire(64); }
    } else { if (RT.hover === p) { p.$queueEvent(EV.release); p.$call('onRelease'); } else { p.$queueEvent(EV.releaseOutside); p.$call('onReleaseOutside'); } }
  }
  for (const mc of RT.allMCs()) { if (mc.ca) mc.$queueEvent(EV.mouseUp); mc.$call('onMouseUp'); }
  for (const l of RT.mouseListeners) { const f = l.onMouseUp; if (typeof f === 'function') RT.queue.push(() => f.call(l)); }
};
RT.findEdit = function (mc, x, y) {
  const kids = mc.$sorted();
  for (let i = kids.length - 1; i >= 0; i--) {
    const k = kids[i]; if (!k.visibleV) continue;
    const p = mapply(minv(k.mat), x, y);
    if (k instanceof EditDO) { if (!k.ro && k.selectable !== false && p[0] >= k.bw[0] && p[0] <= k.bw[2] && p[1] >= k.bw[1] && p[1] <= k.bw[3]) return k; }
    else if (k instanceof MC) { const r = RT.findEdit(k, p[0], p[1]); if (r) return r; }
  }
  return null;
};
RT.keyDown = function (code, ascii, key) {
  RT.keysDown.add(code); RT.keyCode = code; RT.keyAscii = ascii;
  for (const mc of RT.allMCs()) { if (mc.ca) { mc.$queueEvent(EV.keyDown); mc.$queueEvent(EV.keyPress, code); } mc.$call('onKeyDown'); }
  for (const l of [...RT.keyListeners]) { const f = l.onKeyDown; if (typeof f === 'function') RT.queue.push(() => f.call(l)); }
  RT.fireButtonKeys(RT.root, code);
  const ed = RT.activeEdit;
  if (ed) {
    let t = ed.getText();
    if (key === 'Backspace') t = t.slice(0, -1);
    else if (key && key.length === 1 && (!ed.maxChars || t.length < ed.maxChars)) t += key;
    else return;
    ed.setText(t);
    if (typeof ed.vars === 'object' && ed.vars && typeof ed.vars.onChanged === 'function') RT.queue.push(() => ed.vars.onChanged.call(ed));
  }
};
RT.fireButtonKeys = function (mc, code) {
  for (const k of mc.$sorted()) {
    if (k instanceof ButtonDO) { for (const [cond, hash] of k.b.a) if ((cond >> 9) === code) RT.queue.push(() => runCode(hash, k.parent.scope)); }
    else if (k instanceof MC) RT.fireButtonKeys(k, code);
  }
};
RT.keyUp = function (code) {
  RT.keysDown.delete(code);
  for (const mc of RT.allMCs()) { if (mc.ca) mc.$queueEvent(EV.keyUp); mc.$call('onKeyUp'); }
  for (const l of [...RT.keyListeners]) { const f = l.onKeyUp; if (typeof f === 'function') RT.queue.push(() => f.call(l)); }
};
RT.runQueue = function () {
  let guard = 0;
  while (RT.queue.length && guard++ < 200000) { const f = RT.queue.shift(); try { f(); } catch (e) { console.error('[queue]', e); } }
  if (RT.queue.length) { console.warn('action queue overflow'); RT.queue.length = 0; }
};
// Flash runs event handlers as soon as the event arrives (not on the next frame)
for (const n of ['mouseMove', 'mouseDown', 'mouseUp', 'keyDown', 'keyUp']) {
  const f = RT[n];
  RT[n] = function () { const r = f.apply(this, arguments); RT.runQueue(); return r; };
}
RT.tick = function () {
  RT.tickN++;
  const all = RT.allMCs();
  for (const mc of all) { if (!mc.alive) continue; if (mc.ca) mc.$queueEvent(EV.enterFrame); mc.$call('onEnterFrame'); }
  for (const mc of all) { if (mc.alive && mc.playing && mc.born < RT.tickN) mc.$advance(); }
  RT.runQueue();
  if (RT.mouse.seen && !RT.drag) RT.updateHover();
};
// creation stamp so freshly created clips are not advanced in the tick that created them
const _MCinit = MC.prototype.$init;
MC.prototype.$init = function () { if (this.born === undefined) this.born = RT.tickN; return _MCinit.call(this); };

RT.render = function (ctx) {
  ctx.fillStyle = RT.bgColor || '#000'; ctx.fillRect(0, 0, RT.W, RT.H);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, RT.W, RT.H); ctx.clip();
  RT.root.$draw(ctx, null);
  ctx.restore();
};
