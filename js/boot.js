// Boot: load the converted library + code, start the root timeline, drive the 30fps player loop.
(async function () {
  const msg = document.getElementById('bootmsg'), fill = document.getElementById('barfill');
  const prog = (t, f) => { msg.textContent = t; fill.style.width = Math.round(f * 100) + '%'; };
  prog('Loading library...', 0.05);
  const libController = new AbortController();
  const libTimer = setTimeout(() => libController.abort(), 60000);
  const libSlowTimer = setTimeout(() => prog('Still loading library...', 0.1), 12000);
  let libResponse;
  try {
    libResponse = await fetch('assets/lib/lib.json', { signal: libController.signal });
  } finally {
    clearTimeout(libTimer);
    clearTimeout(libSlowTimer);
  }
  if (!libResponse.ok) throw new Error(`Library request failed (${libResponse.status})`);
  const lib = await libResponse.json();
  RT.lib = lib;
  prog('Loading converted scripts...', 0.3);
  await new Promise((res, rej) => {
    const script = document.createElement('script');
    script.src = 'assets/lib/code.js';
    const slowTimer = setTimeout(() => prog('Still loading scripts...', 0.5), 15000);
    const timer = setTimeout(() => {
      script.remove();
      clearTimeout(slowTimer);
      rej(new Error('Converted scripts took too long to load'));
    }, 120000);
    script.onload = () => { clearTimeout(slowTimer); clearTimeout(timer); res(); };
    script.onerror = () => {
      clearTimeout(slowTimer);
      clearTimeout(timer);
      rej(new Error('Could not load converted scripts'));
    };
    document.head.appendChild(script);
  });
  prog('Starting...', 0.9);

  // lazy bitmap loading
  RT.bitmapLoading = {};
  const ob = RT.bitmaps;
  RT.loadBmp = (id, attempt = 0) => {
    if (attempt === 0 && (ob[id] !== undefined || RT.bitmapLoading[id])) return;
    RT.bitmapLoading[id] = true;
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(im.src); ob[id] = im; };
    // a failed request is retried (many parallel requests can be dropped by a simple dev server)
    im.onerror = () => { if (attempt < 4) setTimeout(() => RT.loadBmp(id, attempt + 1), 150 * (attempt + 1)); else ob[id] = null; };
    Pack.get('b', id).then(ab => { im.src = URL.createObjectURL(new Blob([ab], { type: 'image/png' })); }, () => im.onerror());
  };
  RT.bitmaps = new Proxy(ob, { get(t, k) { const v = t[k]; if (v === undefined && typeof k === 'string' && /^\d+$/.test(k)) RT.loadBmp(+k); return v; } });

  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  RT.canvas = canvas;
  const FPS = lib.fps || 30;

  // root timeline
  const root = new MC(null, 0, lib.main);
  root.root = root; root.name = '_level0';
  RT.root = root;
  for (const [sid, hash] of (lib.main.init || [])) runCode(hash, root.scope);
  root.$init();
  RT.runQueue();

  document.getElementById('boot').style.display = 'none';
  canvas.focus();

  function fit() {
    const sc = Math.min(window.innerWidth / RT.W, window.innerHeight / RT.H);
    canvas.style.width = Math.floor(RT.W * sc) + 'px'; canvas.style.height = Math.floor(RT.H * sc) + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.floor(RT.W * sc * dpr), ph = Math.floor(RT.H * sc * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    return pw / RT.W;
  }
  const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * RT.W, (e.clientY - r.top) / r.height * RT.H]; };
  canvas.addEventListener('mousemove', e => { const [x, y] = pos(e); RT.mouseMove(x, y); });
  canvas.addEventListener('mousedown', e => { const [x, y] = pos(e); RT.mouseMove(x, y); RT.mouseDown(); Aud.init(); canvas.focus(); e.preventDefault(); });
  window.addEventListener('mouseup', e => { RT.mouseUp(); });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'F11') return;
    Aud.init();
    const ascii = e.key && e.key.length === 1 ? e.key.charCodeAt(0) : (e.key === 'Enter' ? 13 : e.key === 'Backspace' ? 8 : 0);
    RT.keyDown(e.keyCode, ascii, e.key);
    if ([8, 9, 13, 32, 37, 38, 39, 40].includes(e.keyCode) || (e.keyCode >= 96 && e.keyCode <= 111)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { RT.keyUp(e.keyCode); });
  window.addEventListener('blur', () => { RT.keysDown.clear(); });

  // the Kirby 1942 intro has no skip in the original; let Enter / Space / Escape / a click jump to the title screen
  function introSkip() {
    const f = RT.root.frame;
    if (f >= 8 && f < RT.root.def.l.intro2) { RT.root.gotoAndPlay('intro2'); RT.runQueue(); Aud.stopAll(); return true; }
    return false;
  }
  window.addEventListener('keydown', e => { if (['Enter', 'Space', 'Escape'].includes(e.code)) introSkip(); }, true);
  canvas.addEventListener('mousedown', () => { introSkip(); }, true);
  // cheat code (Konami): unlock every fighter, stage and mode
  const CHEAT = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; let cheatPos = 0;
  function unlockAll() {
    const so = A.gv(RT.root.scope, "savedata"), rec = so && so.data && so.data.records;
    if (!rec) return;
    for (const k of Object.keys(rec)) if (Array.isArray(rec[k]) && k !== 'controls' && k !== 'misc') rec[k][0] = true;
    if (rec.misc) for (let i = 12; i < 16; i++) rec.misc[i] = true;
    so.flush();
    const t = document.createElement('div');
    t.textContent = 'Everything unlocked!';
    t.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);padding:8px 16px;background:#000c;color:#fff;font:bold 16px sans-serif;border-radius:6px;z-index:9';
    document.body.appendChild(t); setTimeout(() => t.remove(), 2500);
  }
  window.addEventListener('keydown', e => {
    cheatPos = e.keyCode === CHEAT[cheatPos] ? cheatPos + 1 : (e.keyCode === CHEAT[0] ? 1 : 0);
    if (cheatPos === CHEAT.length) { cheatPos = 0; unlockAll(); }
  });
  const STEP = 1000 / FPS;
  let acc = 0, last = performance.now();
  function frame(now) {
    acc += Math.min(250, now - last); last = now;
    let steps = 0;
    while (acc >= STEP && steps < 4) { acc -= STEP; RT.tick(); steps++; }
    if (steps === 4) acc = 0;
    const fm = RT.root.names.get('focusManager'); if (fm) fm.visibleV = false; // Flash's focus-rectangle button, drawn as a black box top-left
    const sc = fit();
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    try { RT.render(ctx); } catch (e) { if (!RT.renderErr) { RT.renderErr = 1; console.error('[render]', e); } }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.RT = RT; window.A = A;
  window.addEventListener('beforeunload', () => { try { sessionStorage.setItem('ssf_unload', JSON.stringify({ log: RT.callLog || [], t: Date.now() })); } catch (e) { } });
})().catch(e => {
  console.error('[startup]', e);
  const boot = document.getElementById('boot');
  const message = document.getElementById('bootmsg');
  if (!boot || !message) return;
  boot.classList.add('failed');
  boot.style.display = 'block';
  message.textContent = "Couldn't start. Click to reload.";
  boot.title = String(e);
  boot.onclick = () => window.location.reload();
});
