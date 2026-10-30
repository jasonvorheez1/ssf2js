// Test helpers (the browser pane throttles timers when hidden, so tests step the player manually).
window.errs = () => (RT.errors || []).filter(e => !/__get__|__set__|createChildren|getMinWidth|getTopLevel|createClassChildAtDepth|changeTextStyle/.test(e[1])).map(e => [e[0], e[1]]);
window.lab = () => Object.keys(RT.root.def.l).filter(k => RT.root.def.l[k] <= RT.root.frame).pop();
window.wait = ms => new Promise(r => setTimeout(r, ms));
window.adv = n => { for (let i = 0; i < n; i++) RT.tick(); const c = document.getElementById('game'); const x = c.getContext('2d'); const sc = c.width / RT.W; x.setTransform(sc, 0, 0, sc, 0, 0); RT.render(x); };
window.click = (x, y, n = 30) => { RT.mouseMove(x, y); RT.mouseDown(); adv(1); RT.mouseUp(); adv(n); return { f: RT.root.frame, l: lab(), errs: errs() }; };
window.drag = (chip, name) => { const c = RT.root.names.get(chip), t = RT.root.names.get(name); const sx = c.getMember('_x'), sy = c.getMember('_y'); const tx = t.getMember('_x') + 10, ty = t.getMember('_y') + 10; RT.mouseMove(sx, sy); RT.mouseDown(); adv(2); for (let i = 1; i <= 10; i++) { RT.mouseMove(sx + (tx - sx) * i / 10, sy + (ty - sy) * i / 10); adv(1); } RT.mouseUp(); adv(20); };
window.fightTo = async (a, b, stageXY = [279, 150]) => {
  RT.root.gotoAndStop('main'); RT.runQueue(); adv(40); click(223, 159, 60); click(209, 193, 120);
  drag('p1chip', a); drag('p2chip', b); adv(20); click(608, 306, 80); await wait(2500); adv(3);
  click(stageXY[0], stageXY[1], 10); await wait(2500); adv(5); await wait(2500); adv(5);
  return lab();
};
window.pinfo = () => { const s = RT.root.names.get('stage'); const g = s.names.get('ground'); const p = s.names.get('player1'); return { g: [g.vars.onground, g.vars.jump, g.vars.speed, g.vars.lives, g.vars.health, g.vars.facing], gy: Math.round(g.getMember('_y')), p: [Math.round(p.getMember('_x')), Math.round(p.getMember('_y'))] }; };
