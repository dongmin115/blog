// @ts-nocheck — Three.js 장면은 명령형 코드라 타입 검사를 끄고 있어요.
// 우주 테마의 3D 장면
//  - 1뎁스: 은하. 나선팔 속에 카테고리가 행성계로 하나씩 있고, 가운데 핵이 '전체'예요.
//  - 2뎁스: 행성계 안. 올해 쓴 글은 행성(궤도를 돌아요), 지난해들의 글은 해마다 바깥에 별자리로 묶여요.
//  - 별/행성을 누르면 다가가는 연출 없이 바로 글 카드가 떠요. 좌우는 360도로 돌려 볼 수 있어요.
import * as THREE from 'three';
import { seasonHsl } from '../season';
import { FIRST_YEAR } from '../../config';

export async function mountScene(host) {
  const { el, data, ui, reduce } = host;
  const CATS = data.cats, POSTS = data.posts, inCat = data.inCat, RK = reduce ? 0 : 1;
  const THIS_YEAR = new Date().getFullYear();
  const ALL = CATS.length; // 가상 카테고리 '전체'
  const postsOf = (k) => (k === ALL ? POSTS : inCat(k));
  const nameOf = (k) => (k === ALL ? '전체' : CATS[k].name);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  /* ---------- 렌더러 ---------- */
  const cv = document.createElement('canvas'); el.appendChild(cv);
  const layer = document.createElement('div'); layer.className = 'labs'; el.appendChild(layer);
  const fade = document.createElement('div'); fade.className = 'space-fade'; el.appendChild(fade);
  // r128 때의 색감을 유지: 최신 three의 자동 색 관리를 끄고 선형 출력으로 그려요.
  THREE.ColorManagement.enabled = false;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { cv.remove(); layer.remove(); fade.remove(); throw e; }
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
  function orbitLine(radius, color, opacity) {
    const pts = []; for (let i = 0; i <= 72; i++) { const a = i / 72 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius)); }
    return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false }));
  }
  const seasonOf = (p) => seasonHsl(p.m + (p.d - 1) / 30);

  /* ---------- 장면: 배경과 조명 ---------- */
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
    [215, 280, 190, 330, 240].forEach((h, k) => {
      const a = k * 1.9 + 0.5, sp = glowSprite(col(h, 70, 45), 0.15, 140); sp.scale.set(140, 90, 1);
      sp.position.set(Math.cos(a) * 120, (k - 2) * 22, Math.sin(a) * 120); grp.add(sp);
    });
    scene.add(grp); return grp;
  })();
  scene.add(new THREE.AmbientLight(0x7080b0, 0.6 * Math.PI));
  const sun = new THREE.PointLight(0xfff0d8, 0, 0, 0); scene.add(sun); // 행성계 한가운데 빛(거리에 따라 약해지지 않아요)

  /* ---------- 이름표(HTML) ---------- */
  const labs = []; // { el, obj, dy, show() }
  function mkLab(html, cls) { const d = document.createElement('div'); d.className = 'lab' + (cls ? ' ' + cls : ''); d.innerHTML = html; layer.appendChild(d); return d; }

  /* ---------- 1뎁스: 은하 ---------- */
  // 은하 사진 느낌: 점을 흩뿌리는 대신 한 장의 이미지로 그려요(따뜻한 중심부, 푸르스름한 나선팔, 팔 안쪽 가장자리의 어두운 먼지길).
  function galaxyTexture(size) {
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), h = size / 2, R = mulberry(7);
    const gauss = () => R() + R() + R() + R() - 2;
    g.fillStyle = '#000'; g.fillRect(0, 0, size, size);
    const blob = (x, y, rad, r, gg, b, a) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${r},${gg},${b},${a})`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    };
    const armTh = (arm, rn) => arm * Math.PI / 2 + 7.0 * rn; // 두 갈래 큰 팔 + 두 갈래 작은 팔
    const at = (arm, rn, off) => { const th = armTh(arm, rn) + off; return [h + Math.cos(th) * rn * h * 0.94, h + Math.sin(th) * rn * h * 0.94]; };
    g.globalCompositeOperation = 'lighter';
    blob(h, h, h * 0.98, 110, 130, 190, 0.10); // 바깥 헤일로
    for (let arm = 0; arm < 4; arm++) {
      const major = arm % 2 === 0, N = major ? 3800 : 1700;
      for (let i = 0; i < N; i++) {
        const rn = 0.07 + 0.9 * Math.pow(R(), 0.85), [x, y] = at(arm, rn, gauss() * (0.17 + 0.3 * rn) * (major ? 1 : 1.25));
        const warm = Math.max(0, 1 - rn * 1.7); // 안쪽일수록 따뜻한 색, 바깥은 푸르스름한 흰색
        blob(x, y, 5 + R() * 14 * (0.45 + rn), Math.round(168 + 85 * warm), Math.round(186 + 40 * warm), Math.round(232 - 55 * warm), (major ? 0.045 : 0.028) * (1 - rn * 0.4));
      }
      if (major) for (let i = 0; i < 70; i++) { const [x, y] = at(arm, 0.3 + R() * 0.6, gauss() * 0.12); blob(x, y, 3 + R() * 4, 255, 178, 196, 0.06); } // 아주 옅은 분홍 성운
    }
    blob(h, h, h * 0.36, 255, 222, 168, 0.5); blob(h, h, h * 0.16, 255, 236, 200, 0.8); blob(h, h, h * 0.06, 255, 248, 232, 1); // 중심부
    g.globalCompositeOperation = 'source-over';
    for (let arm = 0; arm < 4; arm += 2) for (let i = 0; i < 1900; i++) { const rn = 0.16 + 0.8 * R(), [x, y] = at(arm, rn, -0.17 + gauss() * 0.05); blob(x, y, 4 + R() * 10 * rn, 4, 4, 9, 0.075); } // 먼지길
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2800; i++) { const rn = Math.pow(R(), 1.5) * 0.97, th = R() * 6.2832, x = h + Math.cos(th) * rn * h, y = h + Math.sin(th) * rn * h; g.fillStyle = `rgba(255,252,245,${0.25 + R() * 0.6})`; g.fillRect(x, y, 1.3, 1.3); } // 별가루
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  const CROSS = (() => { // 밝은 별에 번지는 가는 십자 빛
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    for (let i = 0; i < 2; i++) {
      const gr = i ? g.createLinearGradient(64, 0, 64, 128) : g.createLinearGradient(0, 64, 128, 64);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; if (i) g.fillRect(63, 0, 2, 128); else g.fillRect(0, 63, 128, 2);
    }
    return new THREE.CanvasTexture(c);
  })();
  const galaxy = new THREE.Group(); scene.add(galaxy);
  const overItems = []; // 눌러 볼 수 있는 것들
  const overLabs = [];
  (function buildGalaxy() {
    const disk = new THREE.Mesh(new THREE.PlaneGeometry(29, 29), new THREE.MeshBasicMaterial({ map: galaxyTexture(1024), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    disk.rotation.x = -Math.PI / 2; galaxy.add(disk);
    // 원반 위아래로 옅게 번진 별들: 두께와 깊이감
    const n = 900, pos = new Float32Array(n * 3), cl = new Float32Array(n * 3), R = mulberry(131), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const r = 0.5 + 12.5 * Math.pow(R(), 0.7), th = R() * 6.2832;
      pos[i * 3] = Math.cos(th) * r; pos[i * 3 + 1] = (R() + R() - 1) * 0.9 * (1 - r / 16); pos[i * 3 + 2] = Math.sin(th) * r;
      c.setHSL(0.1 + R() * 0.5, 0.2 + R() * 0.2, 0.8); const b = 0.3 + R() * 0.6;
      cl[i * 3] = c.r * b; cl[i * 3 + 1] = c.g * b; cl[i * 3 + 2] = c.b * b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    galaxy.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.22, map: DOT, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
    // 핵 = 전체
    galaxy.add(glowSprite(col(40, 70, 66), 0.5, 6.5));
    const coreProxy = invisible(new THREE.SphereGeometry(1.7, 8, 6)); coreProxy.userData = { type: 'cat', idx: ALL }; galaxy.add(coreProxy); overItems.push(coreProxy);
    overLabs.push({ el: mkLab(`전체<small>별 ${POSTS.length}개</small>`), obj: coreProxy, dy: -1.7 });
    // 카테고리 = 은은하게 반짝이는 별무리(고리 없이)
    CATS.forEach((c, k) => {
      const posts = inCat(k), a = k / Math.max(CATS.length, 1) * Math.PI * 2 + 0.6, g = new THREE.Group();
      g.position.set(Math.cos(a) * 6.6, 0, Math.sin(a) * 8.8); galaxy.add(g); // 앞뒤로 긴 타원: 뒤쪽이 핵의 이름표와 겹치지 않게
      g.add(glowSprite(col(c.h, c.s * 0.55, 66), 0.5, 3.8)); g.add(glowSprite(0xfff3dc, 0.95, 1.05));
      const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: CROSS, color: col(c.h, c.s * 0.4, 86), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); flare.scale.set(3.4, 3.4, 1); g.add(flare);
      const m = 14 + Math.min(posts.length, 12) * 3, p2 = new Float32Array(m * 3), Rg = mulberry(k * 41 + 3);
      for (let i = 0; i < m; i++) { const rr = 0.4 + Math.abs(Rg() + Rg() - 1) * 1.7, th = Rg() * 6.2832; p2[i * 3] = Math.cos(th) * rr; p2[i * 3 + 1] = (Rg() - 0.5) * 0.7; p2[i * 3 + 2] = Math.sin(th) * rr; }
      const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(p2, 3));
      g.add(new THREE.Points(cg, new THREE.PointsMaterial({ size: 0.2, map: DOT, color: col(c.h, c.s * 0.45, 88), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
      const proxy = invisible(new THREE.SphereGeometry(2.1, 8, 6)); proxy.userData = { type: 'cat', idx: k }; g.add(proxy); overItems.push(proxy);
      overLabs.push({ el: mkLab(`${esc(c.name)}<small>별 ${posts.length}개</small>`), obj: g, dy: -1.9 });
    });
  })();

  /* ---------- 2뎁스: 행성계 안 ---------- */
  const view = new THREE.Group(); scene.add(view);
  let viewItems = [], viewLabs = [], planets = [], stars = [];
  function clearView() {
    view.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const m = o.material; if (m.map && m.map !== GLOW && m.map !== DOT) m.map.dispose(); m.dispose(); } });
    while (view.children.length) view.remove(view.children[0]);
    viewLabs.forEach((l) => l.el.remove());
    viewItems = []; viewLabs = []; planets = []; stars = [];
  }
  function buildView(k) {
    clearView();
    const posts = postsOf(k), c = k === ALL ? { h: 42, s: 70 } : CATS[k];
    const cur = posts.filter((p) => p.y === THIS_YEAR), old = posts.filter((p) => p.y !== THIS_YEAR);
    view.add(glowSprite(col(c.h, c.s, 60), 0.95, 4.4)); view.add(glowSprite(0xffffff, 1, 1.3));
    // 가운데 행성계의 해를 알려요(바깥 별자리는 지난해들).
    const hub = new THREE.Object3D(); hub.position.set(0, 3.0, 0); view.add(hub);
    viewLabs.push({ el: mkLab(cur.length ? `${THIS_YEAR}<small>행성 ${cur.length}개</small>` : `${THIS_YEAR}<small>아직 행성이 없어요</small>`, 'year hub'), obj: hub, dy: 0 });
    // 올해 = 행성. 가장 최근 글이 안쪽 궤도예요.
    const step = cur.length > 1 ? Math.min(1.0, 4.2 / (cur.length - 1)) : 0;
    cur.forEach((p, i) => {
      const [h, s] = seasonOf(p), rad = 2.5 + i * step, prad = 0.5 + Math.min(p.minutes, 8) * 0.045 + (p.photo ? 0.12 : 0);
      view.add(orbitLine(rad, col(h, s, 70), 0.14));
      const pv = new THREE.Group(); pv.rotation.y = i * 2.4 + 0.5; view.add(pv);
      const tex = p.photo ? loader.load(p.photo) : new THREE.CanvasTexture(planetCanvas(h, s, i + k * 7 + 1));
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0, emissive: col(h, s, 22), emissiveIntensity: 0.3 }));
      mesh.position.set(rad, 0, 0); mesh.scale.setScalar(prad); pv.add(mesh);
      const glow = glowSprite(col(h, s, 62), 0.55, 3.4); mesh.add(glow);
      if (p.photo || i % 3 === 1) {
        const rg = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.85, 64), new THREE.MeshBasicMaterial({ color: col(h, s * 0.7, 78), transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
        rg.rotation.x = 1.25; mesh.add(rg);
      }
      const proxy = invisible(new THREE.SphereGeometry(Math.max(1.5, 0.95 / prad), 8, 6)); proxy.userData = { type: 'post', id: p.id }; mesh.add(proxy); viewItems.push(proxy);
      const nd = { p, pv, mesh, prad, glow, speed: RK * clamp(0.16 - i * 0.012, 0.05, 0.16), spin: RK * 0.3, sc: prad };
      planets.push(nd);
      viewLabs.push({ el: mkLab(`${p.m}.${p.d}${p.photo ? ' ◆' : ''}`), obj: mesh, dy: -(prad * 1.25 + 0.15), pid: p.id });
    });
    // 지난해들 = 해마다 별자리. 바깥 껍질에 둘러 있어요.
    // 글이 있는 해 + FIRST_YEAR부터 작년까지의 모든 해. 글이 없는 해는 아직 빛나지 않는 별로 자리만 잡아 둬요.
    const yearSet = new Set(old.map((p) => p.y)); for (let y = FIRST_YEAR; y < THIS_YEAR; y++) yearSet.add(y);
    const years = [...yearSet].sort((a, b) => b - a);
    years.forEach((y, j) => {
      const ps = old.filter((p) => p.y === y).sort((a, b) => (a.date < b.date ? -1 : 1)), lit = ps.length > 0, n = lit ? ps.length : 5, R = mulberry(y * 13 + k);
      const th = 0.6 + j * (Math.PI * 2 / Math.max(years.length, 3)), Rc = 9.6 + (j % 2) * 1.4;
      const g = new THREE.Group(); g.position.set(Math.cos(th) * Rc, (j % 2 ? 1.4 : -1.4), Math.sin(th) * Rc); g.rotation.y = -(th + Math.PI / 2); view.add(g);
      const pts = [];
      (lit ? ps : Array.from({ length: n }, () => null)).forEach((p, ix) => {
        const [h, s] = p ? seasonOf(p) : [215, 14], lp = new THREE.Vector3((ix - (n - 1) / 2) * 1.7 + (R() - 0.5) * 0.5, Math.sin(ix * 1.7 + j) * 0.9, Math.cos(ix * 1.3 + j) * 1.0);
        if (!p) { // 아직 빛나지 않는 별: 아주 옅고 눌러도 반응하지 않아요
          const dim = glowSprite(col(h, s, 60), 0.2, 1.0); dim.position.copy(lp); g.add(dim);
          const dot = glowSprite(0xd8e0f0, 0.32, 0.34); dot.position.copy(lp); g.add(dot);
          pts.push(lp); return;
        }
        const glow = glowSprite(col(h, s, 64), 0.95, 1.6); glow.position.copy(lp); g.add(glow);
        const core = glowSprite(0xffffff, 1, 0.55); core.position.copy(lp); g.add(core);
        const proxy = invisible(new THREE.SphereGeometry(0.85, 8, 6)); proxy.position.copy(lp); proxy.userData = { type: 'post', id: p.id }; g.add(proxy); viewItems.push(proxy);
        stars.push({ p, glow, core, proxy, ph: R() * 6, size: 1.6, base: 0.95 });
        viewLabs.push({ el: mkLab(`${p.m}.${p.d}${p.photo ? ' ◆' : ''}`), obj: proxy, dy: -0.75, pid: p.id });
        pts.push(lp);
      });
      const nd2 = 4 + (j % 3), dpos = new Float32Array(nd2 * 3), dv = [];
      for (let i = 0; i < nd2; i++) { const v = new THREE.Vector3((R() - 0.5) * (n * 1.7 + 3), (R() - 0.5) * 3.4, (R() - 0.5) * 2.6); dpos.set([v.x, v.y, v.z], i * 3); dv.push(v); }
      const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
      g.add(new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.4, map: DOT, color: col(c.h, c.s * 0.5, 82), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
      const all = pts.concat(dv).sort((a, b) => a.x - b.x), seg = [];
      for (let i = 0; i < all.length - 1; i++) seg.push(all[i], all[i + 1]);
      g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({ color: col(c.h, c.s * 0.7, 74), transparent: true, opacity: lit ? 0.38 : 0.13, depthWrite: false, fog: false })));
      const top = new THREE.Object3D(); top.position.set(0, 2.5, 0); g.add(top);
      viewLabs.push({ el: mkLab(lit ? `${y}<small>별 ${n}개</small>` : `${y}<small>아직 별이 빛을 내지 못하고 있어요</small>`, lit ? 'year' : 'year quiet'), obj: top, dy: 0 });
    });
  }

  /* ---------- 상태와 카메라 ---------- */
  let mode = 'over', cat = -1, sel = null, selObj = null, busy = false;
  let yaw = 0.22, pitch = 0.55, vyaw = 0, vpitch = 0, zoom = 1, flyT = 0, R = 40, tgtR = 40, tgtPitch = 0.55, spin = 0;
  const target = new THREE.Vector3(), tgtT = new THREE.Vector3(), wp = new THREE.Vector3(), v3b = new THREE.Vector3();
  const LIM_PITCH = [-0.9, 1.2]; // 좌우(yaw)는 제한 없이 360도, 위아래만 뒤집히지 않게 제한

  const fitR = (rad, minR) => Math.max(minR, rad / (0.4663 * Math.min(aspect, 1.15)));
  function focus(out) {
    if (mode === 'over') { out.set(0, 0, 0); return { r: fitR(10.5, 28), pitch: 0.55 }; }
    if (mode === 'cat') { out.set(0, 0, 0); return { r: fitR(7, 19), pitch: 0.5 }; }
    if (selObj) { selObj.getWorldPosition(out); out.multiplyScalar(0.5); }
    return { r: fitR(7, 19) * 0.78, pitch: 0.38 };
  }
  function chrome() {
    const n = cat >= 0 ? postsOf(cat).length : 0, empty = cat >= 0 && n === 0;
    ui.setSub(cat >= 0 ? `${nameOf(cat)} · 별 ${n}개` : '우주 · 은하와 행성');
    ui.setBack(cat >= 0 ? goBack : null);
    ui.setNotice(empty ? (cat === ALL ? '아직 이 은하에는 별이 뜨지 않았어요' : `아직 ${nameOf(cat)} 은하에는 별이 뜨지 않았어요`) : '');
    ui.setHint(empty ? '' : mode === 'over' ? '카테고리나 가운데 핵(전체)을 눌러 들어가 보세요 · 끌어서 돌려 보기' : mode === 'cat' ? '행성이나 별을 눌러 글을 읽어 보세요 · 끌어서 돌려 보기' : '');
  }
  function applyFocus(snap) {
    const f = focus(tgtT); tgtR = f.r; tgtPitch = f.pitch; flyT = 1.4; zoom = 1;
    if (snap) { target.copy(tgtT); R = tgtR; pitch = tgtPitch; flyT = 0; }
  }
  function setMode(m, k) {
    mode = m; cat = k; sel = null; selObj = null; ui.hidePost();
    galaxy.visible = m === 'over'; view.visible = m !== 'over';
    overLabs.forEach((l) => { l.el.style.display = m === 'over' ? '' : 'none'; });
    if (m !== 'over') buildView(k);
    applyFocus(false); chrome();
  }
  // 카테고리를 바꿀 때는 잠깐 어두워졌다가 밝아져요.
  function swap(m, k) {
    if (busy) return;
    if (reduce) { setMode(m, k); return; }
    busy = true; fade.style.opacity = '1';
    setTimeout(() => { setMode(m, k); if (m === 'over') yaw = 0.22; fade.style.opacity = '0'; busy = false; }, 240);
  }
  function goOver() { swap('over', -1); }
  function goCat(k) { swap('cat', k); }
  function openPost(id) {
    const p = POSTS.find((x) => x.id === id); if (!p) return;
    const nd = planets.find((x) => x.p.id === id) || stars.find((x) => x.p.id === id);
    mode = 'post'; sel = id; selObj = nd ? (nd.mesh || nd.proxy) : null; applyFocus(false); flyT = 1; chrome();
    ui.showPost(p, { onClose: closePost });
  }
  function closePost() { if (mode !== 'post') return; mode = 'cat'; sel = null; selObj = null; ui.hidePost(); applyFocus(false); chrome(); }
  function goBack() { if (mode === 'post') closePost(); else goOver(); }

  /* ---------- 입력 ---------- */
  const ptrs = {}; let nptr = 0, downX = 0, downY = 0, moved = false, lastX = 0, lastY = 0, pinch0 = 0, zoom0 = 1, lastMoveT = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const cleanups = [];
  const on = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); cleanups.push(() => t.removeEventListener(ev, fn, opt)); };
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
    if (busy) return;
    const r = cv.getBoundingClientRect();
    ndc.set((x - r.left) / W * 2 - 1, -((y - r.top) / H) * 2 + 1); ray.setFromCamera(ndc, camera);
    const list = mode === 'over' ? overItems : viewItems;
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
  function place(lab, w, vis, dim, above) {
    v3b.copy(w).project(camera);
    if (!(vis && v3b.z < 1 && v3b.z > -1 && Math.abs(v3b.x) < 1.2)) { lab.classList.remove('on'); lab.classList.remove('dim'); return; }
    // 화면 가장자리에서 글자가 잘리지 않게 안쪽으로 밀어 넣어요(너비는 처음 한 번만 재요).
    const lw = lab._w || (lab._w = lab.offsetWidth), px = clamp((v3b.x * 0.5 + 0.5) * W, lw / 2 + 8, W - lw / 2 - 8);
    lab.style.transform = `translate(${px.toFixed(1)}px,${((-v3b.y * 0.5 + 0.5) * H + (above ? -6 : 6)).toFixed(1)}px) translate(-50%,${above ? '-100%' : '0'})`;
    lab.classList.add('on'); lab.classList.toggle('dim', !!dim);
  }
  let last = performance.now(), tAcc = 0, ftSum = 0, ftN = 0, raf = 0, dead = false;
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; tAcc += dt; ftSum += dt; ftN++;
    if (ftN === 90) { if (ftSum / ftN > 0.024 && DPR > 1) { DPR = Math.max(1, DPR - 0.5); renderer.setPixelRatio(DPR); renderer.setSize(W, H, false); } ftSum = 0; ftN = 0; }
    // 움직임: 은하는 천천히 돌고, 행성은 궤도를 돌아요.
    spin += dt * 0.03 * RK; galaxy.rotation.y = spin;
    planets.forEach((nd) => {
      nd.pv.rotation.y += dt * nd.speed; nd.mesh.rotation.y += dt * nd.spin;
      const want = nd.prad * (nd.p.id === sel ? 1.25 : 1); nd.sc += (want - nd.sc) * (1 - Math.exp(-dt * 6)); nd.mesh.scale.setScalar(nd.sc);
    });
    stars.forEach((st) => {
      const tw = reduce ? 1 : 1 + 0.12 * Math.sin(tAcc * 1.8 + st.ph), selF = st.p.id === sel ? 1.5 : 1;
      st.glow.scale.set(st.size * tw * selF, st.size * tw * selF, 1);
    });
    const wantSun = mode === 'over' ? 0 : 2.4 * Math.PI;
    sun.intensity += (wantSun - sun.intensity) * (1 - Math.exp(-dt * 3));
    sky.rotation.y += dt * 0.003 * RK; scene.updateMatrixWorld(true);
    // 카메라
    const f = focus(tgtT), k = 1 - Math.exp(-dt * (mode === 'post' ? 4.2 : 3));
    tgtR = f.r; target.lerp(tgtT, k); R += (tgtR * (mode === 'post' ? 1 : zoom) - R) * k;
    if (flyT > 0) { flyT -= dt; if (nptr === 0) pitch += (f.pitch - pitch) * (1 - Math.exp(-dt * 2.5)); }
    if (nptr === 0) { yaw += vyaw; pitch = clamp(pitch + vpitch, LIM_PITCH[0], LIM_PITCH[1]); vyaw *= 0.94; vpitch *= 0.94; }
    const yv = yaw + (nptr === 0 && !reduce ? Math.sin(tAcc * 0.25) * 0.05 : 0), cp = Math.cos(pitch);
    camera.position.set(target.x + R * cp * Math.sin(yv), target.y + R * Math.sin(pitch), target.z + R * cp * Math.cos(yv));
    camera.lookAt(target);
    // 이름표 위치를 계산하기 전에 카메라 행렬을 이번 프레임 값으로 갱신해요. 안 하면 렌더 때까지 지난 프레임 행렬이 남아 이름표가 한 프레임 늦게 따라와서 돌릴 때 떨려 보여요.
    camera.updateMatrixWorld();
    // 핵(전체)의 이름표와 겹치지 않게, 화면에서 핵보다 위쪽에 있는 행성계는 이름표를 별 위에 둬요.
    v3b.set(0, 0, 0).project(camera); const coreY = v3b.y;
    overLabs.forEach((l) => {
      l.obj.getWorldPosition(wp); v3b.copy(wp).project(camera); const above = l.dy < -1.8 && v3b.y > coreY + 0.04;
      wp.y += above ? 1.9 : l.dy; place(l.el, wp, mode === 'over', false, above);
    });
    viewLabs.forEach((l) => {
      l.obj.getWorldPosition(wp); wp.y += l.dy;
      place(l.el, wp, mode !== 'over' && l.pid !== sel, false);
    });
    renderer.render(scene, camera);
  }

  resize(); setMode('over', -1); applyFocus(true); raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); cleanups.forEach((f) => f());
      ui.setNotice('');
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const m = o.material; if (m.map) m.map.dispose(); m.dispose(); } });
      renderer.dispose(); cv.remove(); layer.remove(); fade.remove();
    },
  };
}
