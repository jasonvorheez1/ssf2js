// Web Audio wrapper: lazy-loads converted sounds from assets/snd.
// Assets are packed into a few chunk files (assets/pk) to keep the file count low; chunks are fetched lazily.
const Pack = (() => {
  let idx = null; const chunks = {};
  const load = async () => idx || (idx = fetch('assets/pk/idx.json').then(r => r.json()));
  return {
    async get(kind, name) {
      const m = (await load())[kind][name]; if (!m) throw 0;
      const k = kind + m[0];
      const buf = await (chunks[k] || (chunks[k] = fetch('assets/pk/' + k + '.bin').then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })));
      return buf.slice(m[1], m[1] + m[2]);
    }
  };
})();
const Aud = (() => {
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  const buffers = {}, pending = {};
  let musicSrc = null, musicName = null;
  const vol = { music: 0.55, sfx: 0.8 };
  try { Object.assign(vol, JSON.parse(localStorage.getItem('ssf_vol') || '{}')); } catch (e) {}

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = vol.music; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = vol.sfx; sfxGain.connect(master);
  }
  function setVolume(kind, v) {
    vol[kind] = Math.max(0, Math.min(1, v));
    if (kind === 'music' && musicGain) musicGain.gain.value = vol.music;
    if (kind === 'sfx' && sfxGain) sfxGain.gain.value = vol.sfx;
    try { localStorage.setItem('ssf_vol', JSON.stringify(vol)); } catch (e) {}
  }
  function load(name) {
    if (buffers[name] !== undefined) return Promise.resolve(buffers[name]);
    if (pending[name]) return pending[name];
    return pending[name] = (async () => {
      try {
        const ab = await Pack.get('s', name);
        init();
        buffers[name] = await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej));
      } catch (e) { buffers[name] = null; }
      return buffers[name];
    })();
  }
  function play(name, opt = {}) {
    if (!name) return;
    if (!ctx) init();
    if (!ctx) return;
    const b = buffers[name];
    if (b === undefined) { load(name).then(() => { if (opt.late !== false) play(name, Object.assign({ late: false }, opt)); }); return; }
    if (!b) return;
    const s = ctx.createBufferSource(); s.buffer = b;
    const g = ctx.createGain(); g.gain.value = opt.vol === undefined ? 1 : opt.vol;
    if (opt.rate) s.playbackRate.value = opt.rate;
    s.connect(g); g.connect(sfxGain); s.start();
    return s;
  }
  async function playMusic(name, loop = true) {
    if (musicName === name && musicSrc) return;
    stopMusic();
    musicName = name;
    if (!name) return;
    const b = await load(name);
    if (musicName !== name || !b) return;
    init();
    const s = ctx.createBufferSource(); s.buffer = b; s.loop = loop;
    s.connect(musicGain); s.start();
    musicSrc = s;
  }
  function stopMusic() {
    if (musicSrc) { try { musicSrc.stop(); } catch (e) {} musicSrc = null; }
    musicName = null;
  }
  const live = new Set();
  function start(name, opt = {}) {
    // returns a handle { stop(), setVolume() }; plays as soon as the buffer is available
    if (!ctx) init();
    const h = { src: null, gain: null, stopped: false, vol: opt.vol === undefined ? 1 : opt.vol,
      stop() { this.stopped = true; if (this.src) { try { this.src.stop(); } catch (e) {} this.src = null; } live.delete(this); },
      setVolume(v) { this.vol = v; if (this.gain) this.gain.gain.value = v; } };
    if (!ctx) return h;
    live.add(h);
    const go = b => {
      if (h.stopped || !b) { live.delete(h); return; }
      const loops = opt.loops || 1;
      const s = ctx.createBufferSource(); s.buffer = b; s.loop = loops > 1;
      const g = ctx.createGain(); g.gain.value = h.vol; s.connect(g); g.connect(loops > 1 ? musicGain : sfxGain);
      s.onended = () => { if (!h.stopped && !s.loop) { live.delete(h); if (opt.onended) opt.onended(); } };
      h.src = s; h.gain = g; s.start(0, Math.min(opt.offset || 0, Math.max(0, b.duration - 0.01)));
    };
    const b = buffers[name];
    if (b !== undefined) go(b); else load(name).then(go);
    return h;
  }
  function stopAll() { for (const h of [...live]) h.stop(); }
  function preload(names) { return Promise.all(names.map(load)); }
  const debug = () => ({ ctx: ctx && ctx.state, loaded: Object.entries(buffers).filter(([, v]) => v).length, failed: Object.entries(buffers).filter(([, v]) => v === null).map(e => e[0]), live: live.size });
  return { init, play, playMusic, stopMusic, load, preload, setVolume, vol, start, stopAll, debug };
})();
