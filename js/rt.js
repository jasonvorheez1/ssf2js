// Runtime support for the transpiled ActionScript 2 code (assets/lib/code.js).
// Generated code calls the helpers on `A` (get/set variable, member access, calls, coercions ...).
const A = {};
const GLOBAL = {};            // _global
A.G = GLOBAL;
A.warned = {};
A.warn = (k, ...r) => { if (!A.warned[k]) { A.warned[k] = 1; console.warn('[as]', k, ...r); } };

// ---- coercions -------------------------------------------------------------
A.n = x => {
  if (typeof x === 'number') return x;
  if (x === undefined) return NaN;
  if (x === null) return 0;
  if (typeof x === 'boolean') return x ? 1 : 0;
  if (typeof x === 'string') { if (x === '') return 0; const v = Number(x); return v; }
  if (x instanceof DO) return NaN;
  const p = A.prim(x); return typeof p === 'number' ? p : A.n(p);
};
A.prim = x => {
  if (x && typeof x === 'object') {
    if (typeof x.valueOf === 'function') { const v = x.valueOf(); if (v !== x) return v; }
    return A.s(x);
  }
  return x;
};
A.s = x => {
  if (typeof x === 'string') return x;
  if (x === undefined) return 'undefined';
  if (x === null) return 'null';
  if (typeof x === 'number') return String(x);
  if (typeof x === 'boolean') return x ? 'true' : 'false';
  if (x instanceof DO) return x.path();
  if (typeof x === 'function') return '[type Function]';
  if (Array.isArray(x)) return x.map(v => (v === undefined || v === null) ? '' : A.s(v)).join(',');
  if (x && typeof x.toString === 'function' && x.toString !== Object.prototype.toString) return String(x.toString());
  return '[object Object]';
};
A.tf = x => {
  if (typeof x === 'boolean') return x;
  if (typeof x === 'number') return x !== 0 && x === x;
  if (x === undefined || x === null) return false;
  if (typeof x === 'string') return x.length > 0;
  return true;
};
A.toint = x => { const v = A.n(x); return v < 0 ? Math.ceil(v) : Math.floor(v); };
A.add = (a, b) => {
  if (typeof a === 'string' || typeof b === 'string') return A.s(a) + A.s(b);
  const pa = A.prim(a), pb = A.prim(b);
  if (typeof pa === 'string' || typeof pb === 'string') return A.s(pa) + A.s(pb);
  return A.n(pa) + A.n(pb);
};
A.lt = (a, b) => {
  if (typeof a === 'string' && typeof b === 'string') return a < b;
  return A.n(a) < A.n(b);
};
A.eq = (a, b) => {
  if (a === b) return true;
  if ((a === undefined || a === null) && (b === undefined || b === null)) return true;
  if (a === undefined || a === null || b === undefined || b === null) return false;
  const ta = typeof a, tb = typeof b;
  if (ta === tb && ta !== 'object') return a === b;
  if (ta === 'object' && tb === 'object') return a === b;
  if (ta === 'object') return A.eq(A.prim(a), b);
  if (tb === 'object') return A.eq(a, A.prim(b));
  return A.n(a) === A.n(b);
};
A.sub1 = (str, i, c) => { str = A.s(str); i = A.n(i); c = A.n(c); if (i < 1) i = 1; return str.substr(i - 1, c); };
A.random = n => Math.floor(Math.random() * A.n(n));
A.t0 = performance.now();
A.getTimer = () => Math.floor(performance.now() - A.t0);
A.typeOf = x => {
  if (x === null) return 'null';
  if (x instanceof MC) return 'movieclip';
  if (x instanceof DO) return 'object';
  return typeof x;
};
A.trace = x => { if (A.traceOn) console.log('[trace]', A.s(x)); };
A.traceOn = true;

// ---- scopes ------------------------------------------------------------------
// frame = { obj, loc, thisv, next }
A.globalScope = { obj: undefined, loc: null, thisv: undefined, next: null, isGlobal: true };
A.mcScope = mc => ({ obj: mc, loc: null, thisv: mc, next: A.globalScope });
A.withScope = (sc, o) => ({ obj: o, loc: null, thisv: sc.thisv, next: sc, isWith: true });
A.enter1 = (parent, thisv, args, names) => {
  const loc = Object.create(null);
  names.forEach((n, i) => { loc[n] = args[i]; });
  loc.arguments = Array.prototype.slice.call(args);
  return { sc: { obj: undefined, loc, thisv, next: parent, fn: true } };
};
A.enter2 = (parent, thisv, args, meta) => {
  const flags = meta[meta.length - 1], argd = meta.slice(0, -1);
  const loc = Object.create(null), r = [];
  let reg = 1;
  const root = A.rootOf(parent);
  if (flags & 1) r[reg++] = thisv;               // preload this
  if (flags & 4) { const a = Array.prototype.slice.call(args); a.callee = null; r[reg++] = a; } // arguments
  if (flags & 0x10) reg++;                         // super (unsupported)
  if (flags & 0x40) r[reg++] = root;               // _root
  if (flags & 0x80) { const t = A.curMC(parent); r[reg++] = t ? t.parent : undefined; } // _parent
  if (flags & 0x100) r[reg++] = GLOBAL;            // _global
  argd.forEach(([rg, name], i) => { if (rg) r[rg] = args[i]; else loc[name] = args[i]; });
  if (!(flags & 4) || true) loc.arguments = Array.prototype.slice.call(args);
  return { sc: { obj: undefined, loc, thisv, next: parent, fn: true }, r };
};
A.rootOf = sc => { for (let f = sc; f; f = f.next) if (f.obj instanceof MC) return f.obj.root; return undefined; };
A.curMC = sc => { for (let f = sc; f; f = f.next) { if (f.tgt) return f.tgt; if (f.obj instanceof MC) return f.obj; } return undefined; };
A.setTarget = (sc, t) => {
  if (t === '' || t === undefined || t === null) { for (let f = sc; f; f = f.next) if (f.tgtprev) return f.tgtprev; return sc; }
  const mc = typeof t === 'string' ? A.resolvePath(sc, t) : t;
  if (!(mc instanceof MC)) return sc;
  return { obj: mc, loc: null, thisv: mc, next: sc, tgt: mc, tgtprev: sc };
};
A.mkfn = fn => fn;

// ---- members -------------------------------------------------------------------
A.has = (o, name) => {
  if (o === undefined || o === null) return false;
  if (o instanceof DO) return o.hasMember(name);
  if (typeof o === 'object' || typeof o === 'function') return name in o;
  return false;
};
A.gm = (o, name) => {
  if (o === undefined || o === null) return undefined;
  if (o instanceof DO) return o.getMember(name);
  if (typeof name !== 'string') name = A.s(name);
  const t = typeof o;
  if (t === 'string') { if (name === 'length') return o.length; const f = String.prototype[name]; return f; }
  if (t === 'number' || t === 'boolean') return Object(o)[name];
  return o[name];
};
// Balance: fan-made fighters get a floor on smash/air damage and a cap on attack cooldown (hitboxes are rebalanced in assets).
A.BAL_ORIG = new Set(['blade', 'samus', 'mario', 'link', 'captainfalcon', 'fox', 'kirby', 'knuckles', 'megaman', 'pikachu', 'zelda', 'sonic', 'tails', 'blue', 'cloud', 'crono', 'gameandwatch', 'inuyasha', 'jigglypuff', 'lloyd', 'luigi', 'mewtwo', 'incredible', 'naruto', 'shadowa', 'supersonic', 'younglink', 'zero']);
A.lastChar = null;
A.balStat = (name, v) => {
  const c = A.lastChar;
  if (!c || A.BAL_ORIG.has(c) || typeof v !== 'number') return v;
  if (name === 'smash' || name === 'air') return Math.max(v, 5);
  if (name === 'attackspace') return Math.min(v, 15);
  return v;
};
A.sm = (o, name, v) => {
  if (o === undefined || o === null) return;
  if (typeof name === 'string') {
    if (name.length > 9 && name.endsWith('character') && typeof v === 'string') A.lastChar = v;
    else if ((name === 'smash' || name === 'air' || name === 'attackspace') && !(o instanceof DO)) v = A.balStat(name, v);
  }
  if (o instanceof DO) { o.setMember(name, v); return; }
  if (typeof name !== 'string') name = A.s(name);
  if (typeof o === 'object' || typeof o === 'function') o[name] = v;
};
A.del = (o, name) => { if (o instanceof DO) return o.delMember(name); if (o && typeof o === 'object') return delete o[name]; return false; };
A.del2 = (sc, name) => { for (let f = sc; f; f = f.next) { if (f.loc && name in f.loc) return delete f.loc[name]; if (f.obj !== undefined && A.has(f.obj, name)) return A.del(f.obj, name); } return false; };
A.gv = (sc, name) => {
  if (typeof name !== 'string') name = A.s(name);
  if (name === 'this') { for (let f = sc; f; f = f.next) if (f.thisv !== undefined || f.fn) return f.thisv; return undefined; }
  if (name.indexOf('.') >= 0 || name.indexOf('/') >= 0 || name.indexOf(':') >= 0) return A.path(sc, name);
  for (let f = sc; f; f = f.next) {
    if (f.loc && name in f.loc) return f.loc[name];
    if (f.obj !== undefined && f.obj !== null && A.has(f.obj, name)) return A.gm(f.obj, name);
  }
  if (name === '_global') return GLOBAL;
  if (name in GLOBAL) return GLOBAL[name];
  if (name === '_root' || name === '_level0') return A.rootOf(sc);
  return undefined;
};
A.sv = (sc, name, v) => {
  if (typeof name !== 'string') name = A.s(name);
  if (name.length > 9 && name.endsWith('character') && typeof v === 'string') A.lastChar = v;
  if (name.indexOf('.') >= 0 || name.indexOf('/') >= 0 || name.indexOf(':') >= 0) { A.setPath(sc, name, v); return; }
  let tl;
  for (let f = sc; f; f = f.next) {
    if (f.loc && name in f.loc) { f.loc[name] = v; return; }
    if (f.obj !== undefined && f.obj !== null) {
      if (A.has(f.obj, name)) { A.sm(f.obj, name, v); return; }
      if (!tl && f.obj instanceof MC && !f.isWith) tl = f.obj;
    }
  }
  if (tl) { tl.setMember(name, v); return; }
  GLOBAL[name] = v;
};
A.dl = (sc, name, v) => {
  for (let f = sc; f; f = f.next) { if (f.loc) { f.loc[name] = v; return; } if (f.obj instanceof MC && !f.isWith) { f.obj.setMember(name, v); return; } }
};
A.enumKeys = (sc, x) => {
  const o = typeof x === 'string' ? A.gv(sc, x) : x;
  return A.enumKeys2(o);
};
A.enumKeys2 = o => {
  const out = [];
  if (o instanceof DO) { return o.enumKeys().reverse(); }
  if (o && (typeof o === 'object' || typeof o === 'function')) for (const k in o) { if (k[0] !== '_' || true) out.push(k); }
  return out.reverse();
};
A.initObj = pairs => { const o = {}; for (const [k, v] of pairs) o[A.s(k)] = v; return o; };
A.targetPath = x => x instanceof DO ? x.path() : A.s(x);

// path resolution: "a.b.c", "/a/b", "../x", "a:var"
A.resolvePath = (sc, p) => {
  if (p === '' ) return A.curMC(sc);
  let cur;
  if (p[0] === '/') { cur = A.rootOf(sc); p = p.slice(1); } else cur = null;
  const parts = p.split(/[\/.]/).filter(x => x !== '');
  if (!cur) {
    // relative first segment: resolve through scope chain, may be '..' or '_parent' etc.
    cur = A.curMC(sc);
    if (parts.length && parts[0] !== '..' && parts[0] !== '_parent' && parts[0] !== '_root' && parts[0] !== '_level0' && parts[0] !== 'this') {
      const v = A.gv(sc, parts[0]);
      if (v !== undefined) { cur = v; parts.shift(); }
      else return undefined;
    }
  }
  for (const part of parts) {
    if (part === '..') cur = cur && cur.parent;
    else if (part === 'this') { }
    else cur = A.gm(cur, part);
    if (cur === undefined || cur === null) return undefined;
  }
  return cur;
};
A.path = (sc, name) => {
  // variable path: could be "a.b.c" (member chain) or "path:var"
  const ci = name.lastIndexOf(':');
  if (ci >= 0) {
    const tgt = ci === 0 ? A.curMC(sc) : A.resolvePath(sc, name.slice(0, ci));
    return A.gm(tgt, name.slice(ci + 1));
  }
  const parts = name.split('.');
  let cur;
  if (name[0] === '/') { return A.resolvePath(sc, name); }
  cur = A.gv(sc, parts[0]);
  for (let i = 1; i < parts.length; i++) { if (cur === undefined || cur === null) return undefined; cur = A.gm(cur, parts[i]); }
  return cur;
};
A.setPath = (sc, name, v) => {
  const ci = name.lastIndexOf(':');
  if (ci >= 0) { const tgt = ci === 0 ? A.curMC(sc) : A.resolvePath(sc, name.slice(0, ci)); A.sm(tgt, name.slice(ci + 1), v); return; }
  const di = name.lastIndexOf('.');
  const base = A.path(sc, name.slice(0, di));
  A.sm(base, name.slice(di + 1), v);
};

// ---- calls ---------------------------------------------------------------------
A.cm = (o, name, args) => {
  if (o === undefined || o === null) return undefined;
  if (name === '' || name === undefined) { return typeof o === 'function' ? o.apply(undefined, args) : undefined; }
  if (typeof name !== 'string') name = A.s(name);
  const f = A.gm(o, name);
  if (typeof f === 'function') return f.apply(o, args);
  if (f === undefined) A.warn('nomethod:' + (o instanceof DO ? 'MC' : typeof o) + '.' + name, 'undefined method', name);
  return undefined;
};
A.cf = (sc, name, args) => {
  if (typeof name !== 'string') { const f = name; return typeof f === 'function' ? f.apply(A.curMC(sc), args) : undefined; }
  const f = A.gv(sc, name);
  if (typeof f === 'function') {
    let th = A.curMC(sc);
    if (name.indexOf('.') >= 0) { const di = name.lastIndexOf('.'); th = A.path(sc, name.slice(0, di)); }
    return f.apply(th, args);
  }
  A.warn('nofunc:' + name, 'undefined function', name);
  return undefined;
};
A.newObj = (sc, name, args) => {
  const ctor = typeof name === 'function' ? name : A.gv(sc, name);
  return A.construct(ctor, args, name);
};
A.nm = (o, name, args) => A.construct(A.gm(o, name), args, name);
A.construct = (ctor, args, nm) => {
  if (typeof ctor !== 'function') { A.warn('noctor:' + nm, 'undefined constructor', nm); return {}; }
  if (ctor.__native) return ctor.__native(args);
  if (ctor === Date || ctor === Array || ctor === Object || ctor === String || ctor === Number || ctor === Boolean || ctor === RegExp || ctor === Error) return new ctor(...args);
  if (ctor === MC) return new MC(null, 0, EMPTY_DEF);
  if (ctor === ButtonDO || ctor === EditDO) return Object.create(ctor.prototype);
  const obj = Object.create(ctor.prototype || Object.prototype);
  const r = ctor.apply(obj, args);
  return (r && typeof r === 'object') ? r : obj;
};
A.extends_ = (sub, sup) => {
  if (typeof sub !== 'function' || typeof sup !== 'function') return;
  sub.prototype = Object.create(sup.prototype);
  sub.prototype.constructor = sub; sub.prototype.__constructor__ = sup;
};
A.instanceOf = (x, c) => { if (typeof c !== 'function') return false; try { return x instanceof c; } catch (e) { return false; } };
A.cast = (x, c) => A.instanceOf(x, c) ? x : null;
A.implementsOp = () => {};
A.getURL = (u, t) => { (RT.callLog = RT.callLog || []).push(['getURL', u, t]); A.warn('geturl:' + u, 'getURL', u, t); if (/^FSCommand:/i.test(u)) return; };
A.getURL2 = (u, t) => A.getURL(A.s(u), A.s(t));
A.stopSounds = () => { if (A.onStopSounds) A.onStopSounds(); };
A.callFrame = () => {};
A.dragRect = (con, s) => { if (!A.tf(con)) return null; const y2 = s.pop(), x2 = s.pop(), y1 = s.pop(), x1 = s.pop(); return [A.n(x1), A.n(y1), A.n(x2), A.n(y2)]; };
A.startDrag = (sc, tg, lock, rect) => { const mc = typeof tg === 'string' ? A.resolvePath(sc, tg) : tg; if (mc instanceof MC) mc.$startDrag(A.tf(lock), rect); };
A.endDrag = () => { RT.drag = null; };

// ---- timeline ops -----------------------------------------------------------------
A.fop = (sc, op) => {
  const mc = A.curMC(sc); if (!mc) return;
  if (op === 'play') mc.play(); else if (op === 'stop') mc.stop();
  else if (op === 'next') mc.gotoFrame(mc.frame + 1, false, true);
  else if (op === 'prev') mc.gotoFrame(mc.frame - 1, false, true);
};
A.gotoFrame = (sc, f, mode) => {
  const mc = A.curMC(sc); if (!mc) return;
  if (mode === null) { mc.gotoFrame(f, false, true); return; }
  // GotoFrame2: f is a number or a label/path string; mode: 1 play, 0 stop
  mc.gotoSpec(f, !!mode);
};
A.gotoLabel = (sc, l) => { const mc = A.curMC(sc); if (mc) mc.gotoSpec(l, undefined); };

// ---- property ops ---------------------------------------------------------------------
const PROPS = ['_x', '_y', '_xscale', '_yscale', '_currentframe', '_totalframes', '_alpha', '_visible', '_width', '_height', '_rotation', '_target', '_framesloaded', '_name', '_droptarget', '_url', '_highquality', '_focusrect', '_soundbuftime', '_quality', '_xmouse', '_ymouse'];
A.getProp = (sc, tg, i) => {
  const mc = typeof tg === 'string' ? A.resolvePath(sc, tg) : tg;
  if (!mc) return undefined;
  return A.gm(mc, PROPS[A.n(i)]);
};
A.setProp = (sc, tg, i, v) => {
  const mc = typeof tg === 'string' ? A.resolvePath(sc, tg) : tg;
  if (!mc) return;
  A.sm(mc, PROPS[A.n(i)], v);
};
A.cloneSprite = (sc, src, name, depth) => {
  const mc = typeof src === 'string' ? A.resolvePath(sc, src) : src;
  if (mc instanceof MC) mc.duplicateMovieClip(A.s(name), A.n(depth));
};
A.removeSprite = (sc, t) => { const mc = typeof t === 'string' ? A.resolvePath(sc, t) : t; if (mc instanceof DO) mc.removeMovieClip(); };
