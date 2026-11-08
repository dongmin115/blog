// @ts-nocheck — Three.js 장면은 명령형 코드를 그대로 옮겨 온 것이라 타입 검사를 끄고 있어요.
// 우주 테마의 3D 장면: 카테고리 = 별자리, 글 = 별. 별을 누르면 행성으로 다가가요.
import * as THREE from 'three';

export async function mountScene(host) {
  const { el, data, ui, reduce } = host;
  const CATS = data.cats, POSTS = data.posts, inCat = data.inCat, RK = reduce ? 0 : 1;

  /* ---------- 렌더러 ---------- */
  const cv = document.createElement('canvas'); el.appendChild(cv);
  const layer = document.createElement('div'); layer.className = 'labs'; el.appendChild(layer);
  // r128 때의 색감을 유지: 최신 three의 자동 색 관리를 끄고 선형 출력으로 그려요.
  THREE.ColorManagement.enabled = false;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { cv.remove(); layer.remove(); throw e; }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  let DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  let W = 1, H = 1, aspect = 1;

  /* ---------- 도우미 ---------- */
  const col = (h, s, l) => new THREE.Color().setHSL(h / 360, s / 100, l / 100);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function radialTex(size, stops) {
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), h = size / 2;
    const gr = g.createRadialGradient(h, h, 0, h, h, h); stops.forEach((s) => gr.addColorStop(s[0], s[1]));
    g.fillStyle = gr; g.fillRect(0, 0, size, size); return new THREE.CanvasTexture(c);
  }
  const GLOW = radialTex(128, [[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,255,255,0.55)'], [0.5, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]);
  const DOT = radialTex(32, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]);
  const CROSS = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    for (let i = 0; i < 2; i++) {
      const gr = i ? g.createLinearGradient(64, 0, 64, 128) : g.createLinearGradient(0, 64, 128, 64);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; if (i) g.fillRect(62, 0, 4, 128); else g.fillRect(0, 62, 128, 4);
    }
    return new THREE.CanvasTexture(c);
  })();
  function planetCanvas(h, s, seed) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'), R = mulberry(seed * 77 + 1);
    for (let y = 0; y < 128; y += 3) {
      const l = 36 + 13 * Math.sin(y * 0.09 + seed) + R() * 7;
      g.fillStyle = `hsl(${h + Math.sin(y * 0.05 + seed) * 16},${s * 0.8}%,${l}%)`; g.fillRect(0, y, 256, 3);
    }
    for (let i = 0; i < 22; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.14)'; g.beginPath(); g.ellipse(R() * 256, R() * 128, 8 + R() * 26, 3 + R() * 9, 0, 0, 6.28); g.fill(); }
    return c;
  }
  const loader = new THREE.TextureLoader();
  const glowSprite = (color, op, size) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sp.scale.set(size, size, 1); return sp;
  };
  const invisible = (geo) => new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  const warmOf = (p) => Math.min(1, (p.likes + 4) / 18);

  /* ---------- 장면 ---------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);
  const sky = (() => {
    const n = 2600, pos = new Float32Array(n * 3), cl = new Float32Array(n * 3), R = mulberry(23), c = new THREE.Color(), grp = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const u = R() * 2 - 1, th = R() * 6.2832, rr = 90 + R() * 150, sq = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(th) * sq * rr; pos[i * 3 + 1] = u * rr; pos[i * 3 + 2] = Math.sin(th) * sq * rr;
      c.setHSL(0.58 + R() * 0.2, 0.3 + R() * 0.4, 0.55 + R() * 0.4); const b = 0.35 + R() * 0.65;
      cl[i * 3] = c.r * b; cl[i * 3 + 1] = c.g * b; cl[i * 3 + 2] = c.b * b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    grp.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.5, map: DOT, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
    const hues = [215, 280, 190, 330, 240];
    hues.forEach((h, k) => {
      const a = k * 1.9 + 0.5, sp = glowSprite(col(h, 70, 45), 0.15, 140); sp.scale.set(140, 90, 1);
      sp.position.set(Math.cos(a) * 120, (k - 2) * 22, Math.sin(a) * 120); grp.add(sp);
    });
    scene.add(grp); return grp;
  })();
  scene.add(new THREE.AmbientLight(0x6070a0, 0.5 * Math.PI));
  const key = new THREE.PointLight(0xfff0d8, 0, 30, 1.2); scene.add(key);

  // 카테고리가 4개보다 많거나 적어도 자리를 잡아 줘요.
  function slot(k, n) {
    const a = (k / Math.max(n, 1)) * Math.PI * 2 + 0.7, rx = 5.6, ry = 5.4;
    return [Math.cos(a) * rx, Math.sin(a) * ry, ((k * 53) % 7) / 7 * 5 - 2.5];
  }
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const cons = [], nodes = {};
  CATS.forEach((c, k) => {
    const g = new THREE.Group(); const sp = slot(k, CATS.length); g.position.set(sp[0], sp[1], sp[2]); scene.add(g);
    const posts = inCat(k), n = posts.length, R = mulberry(k * 31 + 7), pts = [];
    const co = { g, k, nd: [], lineMat: null, decor: null, op: 0.4 };
    co.cg = glowSprite(col(c.h, c.s, 58), 0.5, 6.5); g.add(co.cg);
    posts.forEach((p, ix) => {
      const lp = new THREE.Vector3((ix - (n - 1) / 2) * 2.2 + (R() - 0.5) * 0.6, Math.sin(ix * 1.7 + k) * 1.1, Math.cos(ix * 1.3 + k) * 1.3);
      const warm = warmOf(p), size = 1.7 + warm * 1.2;
      const glow = glowSprite(col(c.h, c.s, 62), 0.9, size); glow.position.copy(lp); g.add(glow);
      const core = glowSprite(0xffffff, 1, size * 0.34); core.position.copy(lp); g.add(core);
      const cr = new THREE.Sprite(new THREE.SpriteMaterial({ map: CROSS, color: col(c.h, c.s * 0.6, 82), transparent: true, opacity: p.photo ? 0.9 : 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      cr.scale.set(size * 1.9, size * 1.9, 1); cr.position.copy(lp); g.add(cr);
      let photoSpr = null, photoTex = null;
      if (p.photo) {
        photoTex = loader.load(p.photo);
        photoSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: photoTex, transparent: true, opacity: 0, fog: false }));
        photoSpr.scale.set(1.5, 1.12, 1); photoSpr.position.set(lp.x + 1.15, lp.y - 0.95, lp.z + 0.1); g.add(photoSpr);
      }
      const pr = invisible(new THREE.SphereGeometry(1.15, 8, 6)); pr.position.copy(lp); pr.userData = { type: 'post', id: p.id }; g.add(pr);
      const prad = 0.75 + warm * 0.35;
      const pmesh = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), new THREE.MeshStandardMaterial({
        map: photoTex || new THREE.CanvasTexture(planetCanvas(c.h, c.s, ix + k * 7 + 1)), roughness: 0.92, metalness: 0, emissive: col(c.h, c.s, 22), emissiveIntensity: 0.3,
      }));
      pmesh.position.copy(lp); pmesh.scale.setScalar(0.001); pmesh.visible = false; g.add(pmesh);
      if (p.photo) {
        const rg = new THREE.Mesh(new THREE.RingGeometry(1.45, 2.0, 48), new THREE.MeshBasicMaterial({ color: col(c.h, c.s * 0.7, 78), transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
        rg.rotation.x = 1.25; pmesh.add(rg);
      }
      const nd = { p, lp, glow, core, cr, photo: photoSpr, proxy: pr, size, ph: R() * 6, cat: k, pmesh, prad, ps: 0 };
      co.nd.push(nd); nodes[p.id] = nd; pts.push({ v: lp });
    });
    const nd2 = 6 + (k % 3), dpos = new Float32Array(nd2 * 3);
    for (let i = 0; i < nd2; i++) {
      const dv = new THREE.Vector3((R() - 0.5) * 8.4, (R() - 0.5) * 5, (R() - 0.5) * 4);
      dpos[i * 3] = dv.x; dpos[i * 3 + 1] = dv.y; dpos[i * 3 + 2] = dv.z; pts.push({ v: dv });
    }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    co.decor = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.55, map: DOT, color: col(c.h, c.s * 0.5, 80), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); g.add(co.decor);
    pts.sort((a, b) => a.v.x - b.v.x);
    const seg = []; for (let j = 0; j < pts.length - 1; j++) seg.push(pts[j].v, pts[j + 1].v);
    for (let j = 0; j < 2 && pts.length > 4; j++) { const a = pts[Math.floor(R() * pts.length)], b = pts[Math.floor(R() * pts.length)]; if (a !== b) seg.push(a.v, b.v); }
    co.lineMat = new THREE.LineBasicMaterial({ color: col(c.h, c.s * 0.8, 70), transparent: true, opacity: 0.4, depthWrite: false, fog: false });
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), co.lineMat));
    const proxy = invisible(new THREE.SphereGeometry(4.4, 8, 6)); proxy.userData = { type: 'cat', idx: k }; g.add(proxy); co.proxy = proxy;
    co.lab = mkLab(`${esc(c.name)}<small>${esc(c.sub)}${c.sub ? ' · ' : ''}글 ${n}편</small>`);
    cons.push(co);
  });
  function mkLab(html) { const d = document.createElement('div'); d.className = 'lab'; d.innerHTML = html; layer.appendChild(d); return d; }
  POSTS.forEach((p) => { nodes[p.id].lab = mkLab(`${esc(p.title)}<small>${p.m}.${p.d}${p.photo ? ' ◆' : ''}</small>`); });

  /* ---------- 상태와 카메라 ---------- */
  let mode = 'over', cat = -1, sel = null;
  let yaw = 0.22, pitch = 0.12, vyaw = 0, vpitch = 0, zoom = 1, flyT = 0, R = 40, tgtR = 40, tgtPitch = 0.12;
  const target = new THREE.Vector3(), tgtT = new THREE.Vector3(), wp = new THREE.Vector3(), kp = new THREE.Vector3(), v3b = new THREE.Vector3();
  const LIM_YAW = [-1.4, 1.4], LIM_PITCH = [-0.45, 0.9];

  function focus(out) {
    if (mode === 'over') { out.set(0, 0, 0); return { r: Math.max(26, 10.2 / (0.4663 * Math.min(aspect, 1.1))), pitch: 0.12 }; }
    if (mode === 'cat') { cons[cat].g.getWorldPosition(out); return { r: Math.max(10, 5.2 / (0.4663 * Math.min(aspect, 1.3))), pitch: 0.1 }; }
    nodes[sel].glow.getWorldPosition(out); return { r: 4.4, pitch: 0.1 };
  }
  function chrome() {
    ui.setSub(cat >= 0 ? `${CATS[cat].name} · 글 ${inCat(cat).length}편` : '우주 · 별자리와 행성');
    ui.setBack(cat >= 0 ? goBack : null);
    ui.setHint(mode === 'over' ? '별자리를 눌러 들어가 보세요 · 끌어서 돌려 보기' : mode === 'cat' ? '별을 눌러 다가가 글을 읽어 보세요 · 끌어서 돌려 보기' : '');
  }
  function applyFocus(snap) {
    const f = focus(tgtT); tgtR = f.r; tgtPitch = f.pitch; flyT = 1.4; zoom = 1;
    if (snap) { target.copy(tgtT); R = tgtR; pitch = tgtPitch; flyT = 0; }
  }
  function goOver(snap) { mode = 'over'; cat = -1; sel = null; ui.hidePost(); applyFocus(snap); chrome(); }
  function goCat(k) { mode = 'cat'; cat = k; sel = null; ui.hidePost(); applyFocus(false); chrome(); }
  function openPost(id) {
    const p = POSTS.find((x) => x.id === id); if (!p) return;
    mode = 'post'; sel = id; cat = p.cat; applyFocus(false); flyT = 1; chrome();
    ui.showPost(p, { onClose: closePost });
  }
  function closePost() { if (mode !== 'post') return; mode = 'cat'; sel = null; ui.hidePost(); applyFocus(false); chrome(); }
  function goBack() { if (mode === 'post') closePost(); else goOver(false); }

  /* ---------- 입력 ---------- */
  const ptrs = {}; let nptr = 0, downX = 0, downY = 0, moved = false, lastX = 0, lastY = 0, pinch0 = 0, zoom0 = 1, lastMoveT = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const on = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); cleanups.push(() => t.removeEventListener(ev, fn, opt)); };
  const cleanups = [];
  on(cv, 'pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId); ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; nptr = Object.keys(ptrs).length;
    if (nptr === 1) { downX = lastX = e.clientX; downY = lastY = e.clientY; moved = false; vyaw = vpitch = 0; }
    else if (nptr === 2) { const k = Object.keys(ptrs), a = ptrs[k[0]], b = ptrs[k[1]]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = zoom; moved = true; }
  });
  on(cv, 'pointermove', (e) => {
    if (!ptrs[e.pointerId]) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (nptr === 2) {
      const k = Object.keys(ptrs), a = ptrs[k[0]], b = ptrs[k[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0 > 10) zoom = clamp(zoom0 * pinch0 / d, 0.55, 1.6); return;
    }
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (!moved && Math.hypot(e.clientX - downX, e.clientY - downY) > 6) moved = true;
    if (moved) { yaw -= dx * 0.006; pitch = clamp(pitch + dy * 0.005, LIM_PITCH[0], LIM_PITCH[1]); vyaw = -dx * 0.006; vpitch = dy * 0.005; lastMoveT = performance.now(); }
    lastX = e.clientX; lastY = e.clientY;
  });
  const endPtr = (e) => {
    if (!ptrs[e.pointerId]) return;
    const wasOne = nptr === 1; delete ptrs[e.pointerId]; nptr = Object.keys(ptrs).length;
    if (wasOne && !moved) tap(e.clientX, e.clientY);
    if (performance.now() - lastMoveT > 90) { vyaw = vpitch = 0; }
  };
  on(cv, 'pointerup', endPtr); on(cv, 'pointercancel', endPtr);
  on(cv, 'wheel', (e) => { e.preventDefault(); zoom = clamp(zoom * (1 + e.deltaY * 0.001), 0.55, 1.6); }, { passive: false });
  on(window, 'keydown', (e) => { if (e.key === 'Escape') goBack(); });
  function tap(x, y) {
    ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera);
    const list = mode === 'over' ? cons.map((c) => c.proxy) : cons[cat].nd.map((n) => n.proxy);
    const hit = ray.intersectObjects(list, false)[0];
    if (!hit) { if (mode === 'post') closePost(); return; }
    const ud = hit.object.userData;
    if (ud.type === 'cat') goCat(ud.idx); else if (ud.type === 'post') openPost(ud.id);
  }

  /* ---------- 루프 ---------- */
  function resize() {
    W = el.clientWidth || window.innerWidth; H = el.clientHeight || window.innerHeight; aspect = W / H;
    renderer.setSize(W, H, false); camera.aspect = aspect; camera.setViewOffset(W, H, 0, -34, W, H); camera.updateProjectionMatrix();
  }
  on(window, 'resize', resize);
  function place(lab, w, vis, dim) {
    v3b.copy(w).project(camera);
    if (!(vis && v3b.z < 1 && v3b.z > -1)) { lab.classList.remove('on'); lab.classList.remove('dim'); return; }
    lab.style.transform = `translate(${((v3b.x * 0.5 + 0.5) * W).toFixed(1)}px,${((-v3b.y * 0.5 + 0.5) * H + 6).toFixed(1)}px) translateX(-50%)`;
    lab.classList.add('on'); lab.classList.toggle('dim', !!dim);
  }
  let last = performance.now(), tAcc = 0, ftSum = 0, ftN = 0, raf = 0, dead = false;
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; tAcc += dt; ftSum += dt; ftN++;
    if (ftN === 90) { if (ftSum / ftN > 0.024 && DPR > 1) { DPR = Math.max(1, DPR - 0.5); renderer.setPixelRatio(DPR); renderer.setSize(W, H, false); } ftSum = 0; ftN = 0; }
    // 별과 선, 행성
    cons.forEach((co, k) => {
      const want = mode === 'over' ? 0.4 : (k === cat ? 0.7 : 0.1);
      co.op += (want - co.op) * (1 - Math.exp(-dt * 3)); co.lineMat.opacity = co.op * (reduce ? 1 : 0.88 + 0.12 * Math.sin(tAcc * 1.3 + k));
      co.decor.material.opacity = mode === 'over' ? 0.8 : (k === cat ? 0.9 : 0.25);
      co.cg.material.opacity = mode === 'over' ? 0.5 : (k === cat ? 0.22 : 0.1);
      co.nd.forEach((nd) => {
        const tw = reduce ? 1 : 1 + 0.12 * Math.sin(tAcc * 1.8 + nd.ph), dimF = (mode === 'over' || k === cat) ? 1 : 0.3, selF = nd.p.id === sel ? 1.5 : 1;
        const wantP = (mode === 'post' && nd.p.id === sel) ? nd.prad : 0.001;
        nd.ps += (wantP - nd.ps) * (1 - Math.exp(-dt * 3)); const pf = clamp(nd.ps / nd.prad, 0, 1);
        nd.pmesh.visible = nd.ps > 0.03; nd.pmesh.scale.setScalar(Math.max(0.001, nd.ps)); nd.pmesh.rotation.y += dt * 0.3 * RK;
        nd.glow.scale.set(nd.size * tw * selF, nd.size * tw * selF, 1);
        nd.glow.material.opacity = 0.9 * dimF * (1 - 0.8 * pf); nd.core.material.opacity = dimF * (1 - pf); nd.cr.material.opacity = (nd.p.photo ? 0.9 : 0) * (1 - pf);
        if (nd.photo) { const pw = (mode === 'cat' && k === cat) ? 1 : 0; nd.photo.material.opacity += (pw - nd.photo.material.opacity) * (1 - Math.exp(-dt * 4)); }
      });
    });
    const wk = (mode === 'post' && nodes[sel]) ? 2.6 * Math.PI : 0;
    if (wk) { nodes[sel].glow.getWorldPosition(kp); key.position.set(kp.x + 1.6, kp.y + 1.4, kp.z + 2.4); }
    key.intensity += (wk - key.intensity) * (1 - Math.exp(-dt * 3));
    sky.rotation.y += dt * 0.003 * RK; scene.updateMatrixWorld(true);
    // 카메라
    const f = focus(tgtT), k = 1 - Math.exp(-dt * (mode === 'post' ? 4.2 : 3));
    tgtR = f.r; target.lerp(tgtT, k); R += (tgtR * (mode === 'post' ? 1 : zoom) - R) * k;
    if (flyT > 0) { flyT -= dt; if (nptr === 0) pitch += (f.pitch - pitch) * (1 - Math.exp(-dt * 2.5)); }
    if (nptr === 0) { yaw += vyaw; pitch = clamp(pitch + vpitch, LIM_PITCH[0], LIM_PITCH[1]); vyaw *= 0.94; vpitch *= 0.94; }
    yaw = clamp(yaw, LIM_YAW[0], LIM_YAW[1]);
    const yv = yaw + (nptr === 0 && !reduce ? Math.sin(tAcc * 0.25) * 0.05 : 0), cp = Math.cos(pitch);
    camera.position.set(target.x + R * cp * Math.sin(yv), target.y + R * Math.sin(pitch), target.z + R * cp * Math.cos(yv));
    camera.lookAt(target);
    // 이름표
    cons.forEach((co) => { co.g.getWorldPosition(wp); wp.y -= 3.6; place(co.lab, wp, mode === 'over'); });
    POSTS.forEach((p) => {
      const nd = nodes[p.id], vis = mode !== 'over' && nd.cat === cat && !(mode === 'post' && p.id === sel);
      nd.glow.getWorldPosition(wp); wp.y -= nd.size * 0.7; place(nd.lab, wp, vis, false);
    });
    renderer.render(scene, camera);
  }

  resize(); goOver(true); raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); cleanups.forEach((f) => f());
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const m = o.material; if (m.map) m.map.dispose(); m.dispose(); } });
      renderer.dispose(); cv.remove(); layer.remove();
    },
  };
}
