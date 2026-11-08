// 반딧불 숲 테마의 캔버스 2D 장면. 보트로 숲 안쪽(깊이 z)으로 나아가요. 라이브러리 없음.
// 원본 데모: reference/forest-demo.html (ForestTheme + 공통 입력 코드)
// - 원근 투영: s = F / zr (F=420, 카메라 높이 HC=70, 수평선 hy = vh*0.4), 안개는 NEAR→HAZE 색 보간
// - 1뎁스(카테고리 선택): 깊이마다 이정표 하나 / 2뎁스(글): 글 하나가 반딧불 하나
// - 아래로 끌면 앞으로 나아가요(invertY). 길과 물을 따로 그리지 않고, 점선/스포트라이트 빛도 쓰지 않아요.
import type { BlogData, Post } from '../../data/types';
import type { ThemeUI } from '../types';
import { seasonHsl as hslOf } from '../season';

interface Host { el: HTMLElement; data: BlogData; ui: ThemeUI; reduce: boolean }
type Sprite = HTMLCanvasElement;
// 장면 안의 물체(나무/아치/반딧불/이정표/글)는 종류마다 필드가 달라서 느슨하게 둬요.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = any;

const F = 420, ZN = 60, HC = 70, RB = 55, FAR = 1000;
const NEAR = [3, 9, 14], HAZE = [22, 56, 62];
const TAU = 6.2832;
const thisYear = new Date().getFullYear();
const F_B = '11px "Gowun Dodum","Noto Sans KR",sans-serif';

const clamp = (v: number, a: number, b: number) => (b < a ? a : Math.max(a, Math.min(b, v)));
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function mix(f: number) {
  const c = NEAR.map((n, i) => Math.round(n + (HAZE[i] - n) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
const easeBack = (x: number) => { const c1 = 1.7, c3 = 2.7; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

export async function mountForest({ el, data, ui, reduce }: Host) {
  const CATS = data.cats, POSTS = data.posts, inCat = data.inCat;
  // 1뎁스 이정표 목록: 맨 앞은 모든 글을 최신순으로 보는 '전체', 그다음 카테고리들. 글은 모두 최신순이라 입구에 가장 최근 글이 와요.
  const VIEWS: { name: string; posts: Post[] }[] = [
    { name: '전체', posts: POSTS },
    ...CATS.map((c, k) => ({ name: c.name, posts: inCat(k) })),
  ];
  const cv = document.createElement('canvas');
  el.appendChild(cv);
  const ctx = cv.getContext('2d');
  if (!ctx) { cv.remove(); throw new Error('canvas 2d'); }
  const g2 = ctx;

  let dpr = Math.min(window.devicePixelRatio || 1, 2), quality = 0;
  let vw = 0, vh = 0, H = 0, hy = 0, travel = 0;
  let cy = 0, tcy: number | null = null, vy = 0, prevCy = 0, spd = 0, introLeft = 0, lastT = 0;
  let sel = -1, cat = -1, VIS: Post[] = [];
  let drag: { id: number; y: number; sx: number; sy: number; lt: number; moved: boolean } | null = null;
  let trans: { t0: number; fn: () => void; done: boolean } | null = null;
  let hintShown = true, dead = false, raf = 0, last = 0, perfStart = 0, acc = 0, cnt = 0;
  let bg: Sprite, lantern: Sprite, ambG: Sprite;
  let trees: Obj[] = [], arches: Obj[] = [], amb: Obj[] = [], items: Obj[] = [];
  const list: Obj[] = [];

  /* ---------- 도우미 ---------- */
  function mk(w: number, h: number) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr));
    const g = c.getContext('2d')!; g.scale(dpr, dpr);
    return { c, g };
  }
  function glowSprite(h: number | string, s: number | string, l: number | string): Sprite {
    const sp = mk(64, 64), g = sp.g;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `hsla(${h},${s}%,92%,1)`);
    gr.addColorStop(0.2, `hsla(${h},${s}%,${l}%,0.7)`);
    gr.addColorStop(0.55, `hsla(${h},${s}%,${l}%,0.16)`);
    gr.addColorStop(1, `hsla(${h},${s}%,${l}%,0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return sp.c;
  }
  function postGlow(p: Post) {
    const c = hslOf(p.m + (p.d - 1) / 30);
    return glowSprite(c[0].toFixed(0), c[1].toFixed(0), Math.max(c[2], 62).toFixed(0));
  }
  const warm = (p: Post) => Math.min(1, (p.likes * 4 + p.views * 0.1) / 60);
  function label(txt: string, x: number, y: number, font: string, color: string, alpha = 1) {
    g2.font = font; g2.textAlign = 'center'; g2.textBaseline = 'top';
    g2.globalAlpha = alpha; g2.fillStyle = color; g2.fillText(txt, x, y); g2.globalAlpha = 1;
  }
  // 글자가 maxW보다 길면 뒤를 줄임표로 잘라요.
  function fitText(txt: string, font: string, maxW: number) {
    g2.font = font;
    if (g2.measureText(txt).width <= maxW) return txt;
    let t = txt; while (t.length > 1 && g2.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }
  function ringAt(x: number, y: number, r: number, t: number) {
    const ph = reduce ? 0 : (t * 12) % 14;
    g2.globalAlpha = reduce ? 0.5 : 0.55 * (1 - ph / 14);
    g2.strokeStyle = '#ffd98a'; g2.lineWidth = 1.2;
    g2.beginPath(); g2.arc(x, y, r + ph, 0, TAU); g2.stroke(); g2.globalAlpha = 1;
  }
  function blobs(R: () => number, Ht: number, lush: number) {
    const nb = Math.round(10 + lush * 10), bl = [];
    for (let j = 0; j < nb; j++) {
      const a = R() * 6.28, rr = R();
      bl.push({ ox: Math.cos(a) * rr * Ht * 0.3, oy: Math.sin(a) * rr * Ht * 0.2, r: Ht * (0.1 + R() * 0.12) * lush });
    }
    return bl;
  }

  /* ---------- 장면 만들기 ---------- */
  function setup() {
    const over = cat < 0, R = rng(301);
    hy = vh * 0.4;
    const n = VIS.length;
    travel = 480 + ((over ? VIEWS.length : Math.max(n, 1)) - 1) * 620 + 500;
    H = vh + travel;
    // 하늘, 별, 달, 수평선 안개를 한 번만 그려 둬요.
    const s = mk(vw, vh), g = s.g;
    const gr = g.createLinearGradient(0, 0, 0, hy + 10);
    gr.addColorStop(0, '#02060f'); gr.addColorStop(0.7, '#09192b'); gr.addColorStop(1, '#17383f');
    g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
    for (let i = 0; i < 90; i++) { g.globalAlpha = 0.2 + R() * 0.5; g.fillStyle = '#e8f2ff'; g.beginPath(); g.arc(R() * vw, R() * hy * 0.9, 0.4 + R() * 0.9, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    const mx = vw * 0.5, my = vh * 0.16, mg = g.createRadialGradient(mx, my, 4, mx, my, 110);
    mg.addColorStop(0, 'rgba(235,240,215,0.2)'); mg.addColorStop(1, 'rgba(235,240,215,0)');
    g.fillStyle = mg; g.fillRect(mx - 120, my - 120, 240, 240);
    g.fillStyle = '#e9efd6'; g.beginPath(); g.arc(mx, my, 11, 0, TAU); g.fill();
    const haze = g.createLinearGradient(0, hy - vh * 0.1, 0, hy + vh * 0.04);
    haze.addColorStop(0, 'rgba(70,130,135,0)'); haze.addColorStop(1, 'rgba(70,130,135,0.3)');
    g.fillStyle = haze; g.fillRect(0, hy - vh * 0.1, vw, vh * 0.14);
    bg = s.c;

    const span = travel + FAR + 200;
    trees = [];
    for (let z = 90; z < span; z += 52 + R() * 38) {
      [-1, 1].forEach((side) => {
        const lush = 0.7 + 0.5 * Math.min(1, z / span), Ht = 240 + R() * 170;
        trees.push({ t: 'tree', z: z + (R() - 0.5) * 24, X: side * (RB + 14 + R() * 120), Ht, bl: blobs(R, Ht, lush), side, ph: R() * 6, zr: 0, sx: 0, sy: 0 });
      });
    }
    arches = [];
    for (let z = 300; z < span; z += 130 + R() * 80) {
      const ah = 330 + R() * 70, ar = 60 + R() * 50;
      arches.push({ t: 'arch', z, X: (R() - 0.5) * 70, hh: ah, r: ar, bl: blobs(R, ar * 3, 0.9), ph: R() * 6, zr: 0 });
    }
    lantern = glowSprite(40, 90, 62); ambG = glowSprite(75, 80, 62);
    if (over) {
      items = VIEWS.map((_v, k) => ({ t: 'sign', k, z: 480 + k * 620, X: (k % 2 ? 1 : -1) * 46, zr: 0, sx: -999, sy: -999, hw: 50, hh: 40 }));
    } else {
      const PR = rng(351);
      items = VIS.map((p, idx) => ({ t: 'post', z: 480 + idx * 620, X: (idx % 2 ? 1 : -1) * (35 + PR() * 70), h: 125 + PR() * 50, ph: idx * 1.7, glow: postGlow(p), zr: 0, sx: -999, sy: -999, hr: 40, p, idx }));
    }
    const AR = rng(331), na = quality ? 60 : 110;
    amb = [];
    for (let i = 0; i < na; i++) amb.push({ t: 'amb', z: Math.pow(AR(), 0.85) * span, X: (AR() - 0.5) * 2 * (RB + 90), h: 30 + AR() * 240, ph: AR() * 6.28, fs: 0.8 + AR() * 2, sz: 8 + AR() * 8, al: 0.4 + AR() * 0.5, zr: 0 });
  }

  /* ---------- 그리기 ---------- */
  function drawTreeShape(o: Obj, t: number) {
    const s = F / o.zr, fog = clamp((o.zr - 120) / (FAR - 120), 0, 1);
    const al = clamp((FAR - o.zr) / 260, 0, 1) * clamp((o.zr - 70) / 90, 0, 1);
    if (al <= 0.01) return;
    const gr = 0.55 + 0.45 * easeBack(clamp((FAR - o.zr) / 300, 0, 1)); // 다가오면서 자라나요
    const x = vw / 2 + o.X * s, yb = hy + HC * s, Hh = o.Ht * gr;
    if (Math.abs(x - vw / 2) > vw * 0.5 + o.Ht * 0.5 * s) return;
    const am = reduce ? 0 : 1, sway = Math.sin(t * 0.6 + o.ph) * 2 * s * am;
    g2.globalAlpha = al; g2.fillStyle = mix(fog);
    const w = Hh * 0.045 * s, yt = hy + (HC - Hh * 0.62) * s;
    g2.beginPath(); g2.moveTo(x - w, yb); g2.lineTo(x - w * 0.45, yt); g2.lineTo(x + w * 0.45, yt); g2.lineTo(x + w, yb); g2.closePath(); g2.fill();
    const ccx = x - o.side * 38 * s, ccy = hy + (HC - 0.78 * Hh) * s;
    g2.beginPath();
    for (const b of o.bl) {
      const bx = ccx + b.ox * s * gr + sway, by = ccy + b.oy * s * gr, br = b.r * s * gr;
      g2.moveTo(bx + br, by); g2.arc(bx, by, br, 0, TAU);
    }
    g2.fill();
    g2.globalAlpha = 1;
  }
  function drawArch(o: Obj) {
    const s = F / o.zr, fog = clamp((o.zr - 120) / (FAR - 120), 0, 1);
    const al = clamp((FAR - o.zr) / 260, 0, 1) * clamp((o.zr - 70) / 90, 0, 1);
    if (al <= 0.01) return;
    const gr = 0.55 + 0.45 * easeBack(clamp((FAR - o.zr) / 300, 0, 1));
    const x = vw / 2 + o.X * s, y = hy + (HC - o.hh * gr) * s;
    g2.globalAlpha = al; g2.fillStyle = mix(fog);
    g2.beginPath();
    for (const b of o.bl) {
      const bx = x + b.ox * s * gr * 2.2, by = y + b.oy * s * gr, br = b.r * s * gr * 1.6;
      g2.moveTo(bx + br, by); g2.arc(bx, by, br, 0, TAU);
    }
    g2.fill(); g2.globalAlpha = 1;
  }

  // 이정표: 나무판(나뭇결, 옹이, 못, 이끼) + 위에 등불 + 줄에 매단 글 수 이름표. 판은 안쪽 위로 기울어 나무 사이를 가리켜요.
  function drawSign(o: Obj, t: number, s: number, alIn: number) {
    const c = VIEWS[o.k], am = reduce ? 0 : 1, sc = clamp(s, 0.6, 1.35) * 0.95, k = o.k;
    const al = alIn * clamp((o.zr - 110) / 130, 0, 1);
    const x = vw / 2 + o.X * s, base = hy + HC * s;
    if (x < -140 || x > vw + 140 || base > vh + 160) { o.sx = -999; o.sy = -999; return; }
    const ph = 56 * sc, td = o.X < 0 ? 1 : -1, lean = 0.05 * td + Math.sin(t * 0.8 + k) * 0.01 * am;
    const fs = Math.max(17, 23 * sc), SF = `400 ${fs}px "East Sea Dokdo","Gowun Batang","Noto Serif KR",serif`;
    g2.font = SF;
    const tw = g2.measureText(c.name).width, bh = Math.max(24, 27 * sc), bw = tw + 34 * sc, tip = 12 * sc;
    const hw0 = bw / 2, shear = -0.24 * td, j = (n: number) => Math.sin(k * 7.3 + n * 3.1) * 1.3 * sc;
    g2.globalAlpha = al;
    g2.fillStyle = 'rgba(0,0,0,0.38)'; g2.beginPath(); g2.ellipse(x, base + 1, 11 * sc, 3.2 * sc, 0, 0, TAU); g2.fill();
    g2.strokeStyle = 'rgba(170,215,230,0.16)'; g2.lineWidth = 1; g2.beginPath(); g2.ellipse(x, base + 2, (17 + (reduce ? 0 : 3 * Math.sin(t * 1.4 + k))) * sc, 4 * sc, 0, 0, TAU); g2.stroke();
    g2.save(); g2.translate(x, base); g2.rotate(lean);
    const top = -ph - 10 * sc;
    // 기둥
    const pg = g2.createLinearGradient(-3.4 * sc, 0, 3.4 * sc, 0);
    pg.addColorStop(0, '#4a3322'); pg.addColorStop(0.45, '#7d5d3a'); pg.addColorStop(1, '#22150c');
    g2.fillStyle = pg; g2.beginPath();
    g2.moveTo(-3.6 * sc, 0); g2.lineTo(-3 * sc, top + 2 * sc); g2.lineTo(3 * sc, top - 1 * sc); g2.lineTo(3.8 * sc, 0); g2.closePath(); g2.fill();
    g2.strokeStyle = 'rgba(20,10,4,0.35)'; g2.lineWidth = 1;
    for (let i = 0; i < 3; i++) { g2.beginPath(); g2.moveTo((-1.6 + i * 1.5) * sc, 0); g2.lineTo((-1.4 + i * 1.3) * sc, top + 3 * sc); g2.stroke(); }
    // 위에 앉은 등불
    const ly = top - 1 * sc, lw = 4.6 * sc, lh = 11 * sc;
    const pulse = reduce ? 0.8 : 0.72 + 0.14 * Math.sin(t * 2.2 + k);
    g2.globalCompositeOperation = 'lighter'; g2.globalAlpha = al * pulse * 0.7;
    g2.drawImage(lantern, -24 * sc, ly - lh / 2 - 24 * sc, 48 * sc, 48 * sc);
    g2.globalCompositeOperation = 'source-over'; g2.globalAlpha = al;
    g2.fillStyle = '#1d140c'; g2.fillRect(-lw - 1.4 * sc, ly - 1 * sc, (lw + 1.4 * sc) * 2, 2.4 * sc);
    const lg = g2.createLinearGradient(0, ly - lh, 0, ly);
    lg.addColorStop(0, '#fff0c0'); lg.addColorStop(1, '#f2b45a');
    g2.fillStyle = lg; g2.fillRect(-lw, ly - lh, lw * 2, lh - 1 * sc);
    g2.strokeStyle = '#1d140c'; g2.lineWidth = Math.max(1, 1.2 * sc);
    g2.beginPath(); g2.moveTo(0, ly - lh); g2.lineTo(0, ly - 1 * sc); g2.stroke();
    g2.fillStyle = '#1d140c'; g2.beginPath(); g2.moveTo(-lw - 1.6 * sc, ly - lh); g2.lineTo(0, ly - lh - 4.5 * sc); g2.lineTo(lw + 1.6 * sc, ly - lh); g2.closePath(); g2.fill();
    // 나무판
    const by0 = top + 15 * sc + bh / 2;
    g2.save(); g2.translate(0, by0); g2.transform(1, shear, 0, 1, 0, 0);
    g2.beginPath();
    g2.moveTo(-td * hw0 + j(1), -bh / 2 + j(2));
    g2.lineTo(td * (hw0 - tip) * 0.5, -bh / 2 + j(3));
    g2.lineTo(td * (hw0 - tip), -bh * 0.43 + j(4));
    g2.lineTo(td * hw0, j(5) * 0.4);
    g2.lineTo(td * (hw0 - tip), bh * 0.43 + j(6));
    g2.lineTo(td * (hw0 - tip) * 0.5, bh / 2 + j(7));
    g2.lineTo(-td * hw0 + j(8), bh / 2 + j(9));
    g2.closePath();
    const wg2 = g2.createLinearGradient(0, -bh / 2, 0, bh / 2);
    wg2.addColorStop(0, '#6a4b2d'); wg2.addColorStop(0.55, '#4b3321'); wg2.addColorStop(1, '#2e1f14');
    g2.fillStyle = wg2; g2.fill();
    g2.save(); g2.clip();
    g2.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const gy = -bh / 2 + (i + 0.6) * bh / 6;
      g2.strokeStyle = `rgba(18,9,4,${0.16 + 0.1 * ((i * 37 + k * 11) % 3)})`;
      g2.beginPath(); g2.moveTo(-hw0, gy); g2.bezierCurveTo(-hw0 * 0.3, gy + 1.6 * sc * (i % 2 ? 1 : -1), hw0 * 0.3, gy - 1.4 * sc, hw0, gy + 0.6 * sc); g2.stroke();
    }
    g2.fillStyle = 'rgba(15,7,3,0.4)'; g2.beginPath(); g2.ellipse(-td * hw0 * 0.34, bh * 0.14, 2.6 * sc, 1.7 * sc, 0, 0, TAU); g2.fill();
    g2.strokeStyle = 'rgba(255,225,175,0.2)'; g2.beginPath(); g2.moveTo(-hw0, -bh / 2 + 1.2); g2.lineTo(hw0, -bh / 2 + 1.2); g2.stroke();
    g2.fillStyle = 'rgba(0,0,0,0.25)'; g2.fillRect(-hw0, bh / 2 - 3 * sc, bw, 3 * sc);
    g2.fillStyle = 'rgba(78,108,66,0.55)'; g2.beginPath();
    g2.ellipse(-td * hw0 * 0.62, -bh / 2 + 1, 6 * sc, 2.6 * sc, 0, 0, TAU); g2.ellipse(-td * hw0 * 0.42, -bh / 2 + 1.5, 3.4 * sc, 1.8 * sc, 0, 0, TAU); g2.fill();
    g2.restore();
    g2.strokeStyle = 'rgba(12,6,2,0.7)'; g2.lineWidth = 1; g2.stroke();
    g2.fillStyle = '#12090a';
    const nx = -td * (hw0 - 6 * sc);
    g2.beginPath(); g2.arc(nx, 0, 1.5 * sc, 0, TAU); g2.fill();
    g2.fillStyle = 'rgba(255,230,190,0.5)'; g2.beginPath(); g2.arc(nx - 0.4, -0.5, 0.6 * sc, 0, TAU); g2.fill();
    g2.font = SF; g2.textAlign = 'center'; g2.textBaseline = 'middle';
    const tx = -td * tip / 2 + td * 3 * sc;
    g2.fillStyle = 'rgba(8,4,2,0.75)'; g2.fillText(c.name, tx + 0.8, 1.8);
    g2.fillStyle = '#ecdcb4'; g2.fillText(c.name, tx, 0.6);
    g2.restore();
    // 줄에 매단 이름표(글 수)
    const xt = -td * bw * 0.2, yb = by0 + bh / 2 + shear * xt, tgw = 36 * sc, tgh = Math.max(14, 15 * sc), tgy = yb + 6 * sc;
    g2.strokeStyle = 'rgba(200,170,120,0.7)'; g2.lineWidth = Math.max(1, 0.9 * sc);
    g2.beginPath(); g2.moveTo(xt - tgw * 0.3, yb - 1); g2.lineTo(xt - tgw * 0.3, tgy); g2.moveTo(xt + tgw * 0.3, yb - 1); g2.lineTo(xt + tgw * 0.3, tgy); g2.stroke();
    g2.fillStyle = '#3d2a1b'; g2.fillRect(xt - tgw / 2, tgy, tgw, tgh);
    g2.strokeStyle = 'rgba(12,6,2,0.7)'; g2.strokeRect(xt - tgw / 2, tgy, tgw, tgh);
    g2.font = `${Math.max(10, 10 * sc)}px "Gowun Dodum","Noto Sans KR",sans-serif`; g2.fillStyle = '#d9c9a6'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
    g2.fillText(`${c.posts.length}편`, xt, tgy + tgh / 2 + 0.5);
    g2.restore();
    g2.globalCompositeOperation = 'source-over'; g2.globalAlpha = 1;
    o.sx = x; o.sy = base - ph / 2; o.hw = bw / 2 + 14; o.hh = ph / 2 + 30 * sc;
  }

  function boat(t: number, sp: number) {
    const bx = vw / 2, by = vh * 0.74, am = reduce ? 0 : 1;
    for (let i = 0; i < 3; i++) {
      const ph = reduce ? i / 3 : ((t * 0.5 + i / 3) % 1);
      g2.strokeStyle = `rgba(170,215,230,${0.22 * (1 - ph)})`; g2.lineWidth = 1;
      g2.beginPath(); g2.ellipse(bx, by + 16, 44 + ph * 60, 7 + ph * 10, 0, 0, TAU); g2.stroke();
    }
    if (Math.abs(sp) > 0.4) {
      const ln = 24 + Math.min(80, Math.abs(sp) * 10);
      g2.strokeStyle = 'rgba(170,215,230,0.32)'; g2.lineWidth = 1.2;
      g2.beginPath(); g2.moveTo(bx - 30, by + 14); g2.lineTo(bx - 30 - ln * 0.7, by + 14 + ln * 0.45); g2.moveTo(bx + 30, by + 14); g2.lineTo(bx + 30 + ln * 0.7, by + 14 + ln * 0.45); g2.stroke();
    }
    g2.save(); g2.translate(bx, by + Math.sin(t * 1.3) * 2 * am); g2.rotate(Math.sin(t * 1.1) * 0.03 * am);
    g2.fillStyle = '#04080f';
    g2.beginPath(); g2.moveTo(-44, -4); g2.quadraticCurveTo(0, -14, 44, -4); g2.quadraticCurveTo(34, 16, 0, 18); g2.quadraticCurveTo(-34, 16, -44, -4); g2.closePath(); g2.fill();
    g2.strokeStyle = 'rgba(150,185,210,0.3)'; g2.lineWidth = 1;
    g2.beginPath(); g2.moveTo(-44, -4); g2.quadraticCurveTo(0, -14, 44, -4); g2.stroke();
    g2.fillStyle = '#04080f';
    g2.beginPath(); g2.arc(0, -36, 5, 0, TAU); g2.fill();
    g2.beginPath(); g2.moveTo(-12, -6); g2.quadraticCurveTo(0, -36, 12, -6); g2.closePath(); g2.fill();
    const sw = Math.sin(t * 3) * (0.12 + 0.35 * Math.min(1, Math.abs(sp) * 0.3));
    g2.strokeStyle = '#04080f'; g2.lineWidth = 2.6;
    g2.beginPath(); g2.moveTo(-10, -16); g2.lineTo(-50 - sw * 12, 6 + sw * 8); g2.moveTo(10, -16); g2.lineTo(50 + sw * 12, 6 - sw * 8); g2.stroke();
    g2.lineWidth = 2; g2.beginPath(); g2.moveTo(32, -6); g2.lineTo(32, -46); g2.stroke();
    g2.restore();
    g2.globalCompositeOperation = 'lighter'; g2.globalAlpha = 0.9;
    g2.drawImage(lantern, bx + 32 - 28, by - 50 - 28, 56, 56);
    g2.globalCompositeOperation = 'source-over'; g2.globalAlpha = 1;
  }

  function draw(t: number) {
    const amp = reduce ? 0 : 1;
    const dtt = lastT ? Math.min(0.1, t - lastT) : 0; lastT = t;
    if (introLeft > 0) { introLeft -= dtt; if (!drag && tcy === null) cy = clamp(cy + 160 * dtt * Math.max(0, introLeft) / 1.2, 0, H - vh); }
    spd = spd * 0.88 + (cy - prevCy) * 0.12; prevCy = cy;
    g2.globalCompositeOperation = 'source-over'; g2.globalAlpha = 1;
    g2.drawImage(bg, 0, 0, bg.width, bg.height, 0, 0, vw, vh);
    // 호수 같은 물: 길과 물을 따로 그리지 않고 한 장의 수면으로
    const wg = g2.createLinearGradient(0, hy, 0, vh);
    wg.addColorStop(0, '#16404a'); wg.addColorStop(0.15, '#0a2430'); wg.addColorStop(1, '#02060e');
    g2.fillStyle = wg; g2.fillRect(0, hy, vw, vh - hy);
    g2.lineWidth = 1;
    const step = 46, base = cy % step;
    for (let i = 0; i < 24; i++) {
      const zr = i * step - base + ZN + 40;
      if (zr < 50 || zr > FAR) continue;
      const s = F / zr;
      const ry = hy + HC * s, rw = 120 * s * (0.5 + ((i * 53) % 7) / 7);
      if (ry > vh) continue;
      const rx = vw / 2 + (((i * 97) % 11) - 5) * 26 * s;
      g2.strokeStyle = `rgba(170,215,230,${0.07 * clamp((FAR - zr) / 300, 0, 1)})`;
      g2.beginPath(); g2.moveTo(rx - rw / 2, ry); g2.lineTo(rx + rw / 2, ry); g2.stroke();
    }
    list.length = 0;
    for (const o of trees) { o.zr = o.z - cy + ZN; if (o.zr > 40 && o.zr < FAR) list.push(o); }
    for (const o of arches) { o.zr = o.z - cy + ZN; if (o.zr > 40 && o.zr < FAR) list.push(o); }
    for (const o of amb) { o.zr = o.z - cy + ZN; if (o.zr > 40 && o.zr < FAR) list.push(o); }
    for (const o of items) {
      o.zr = o.z - cy + ZN;
      if (o.zr > 40 && o.zr < FAR) list.push(o); else { o.sx = -999; o.sy = -999; }
    }
    list.sort((a, b) => b.zr - a.zr);
    // 반딧불이 수면에 비치는 빛
    g2.globalCompositeOperation = 'lighter';
    for (const o of items) {
      if (o.zr <= 40 || o.zr >= FAR || o.t !== 'post') continue;
      const s = F / o.zr;
      const al0 = clamp((FAR - o.zr) / 260, 0, 1) * clamp((o.zr - 50) / 80, 0, 1);
      const rsz = clamp((34 + o.p.minutes * 6 + 24 * warm(o.p)) * s, 12, 90);
      const rxx = vw / 2 + o.X * s + Math.sin(t * 2 + o.ph) * 3 * amp, ryy = hy + (HC + o.h) * s;
      g2.globalAlpha = 0.32 * al0; g2.drawImage(o.glow, rxx - rsz / 2, ryy - rsz * 0.2, rsz, rsz * 0.5);
    }
    g2.globalCompositeOperation = 'source-over'; g2.globalAlpha = 1;
    for (const o of list) {
      const s = F / o.zr;
      const al = clamp((FAR - o.zr) / 260, 0, 1) * clamp((o.zr - 50) / 80, 0, 1);
      if (o.t === 'tree') drawTreeShape(o, t);
      else if (o.t === 'arch') drawArch(o);
      else if (o.t === 'sign') drawSign(o, t, s, al);
      else if (o.t === 'amb') {
        const ax = vw / 2 + o.X * s + Math.sin(t * 0.7 + o.ph) * 8 * s * amp, ay = hy + (HC - o.h) * s;
        const asz = clamp(o.sz * s, 5, 26);
        g2.globalCompositeOperation = 'lighter';
        g2.globalAlpha = al * o.al * (reduce ? 0.8 : 0.5 + 0.5 * Math.sin(t * o.fs + o.ph));
        g2.drawImage(ambG, ax - asz / 2, ay - asz / 2, asz, asz);
        g2.globalCompositeOperation = 'source-over'; g2.globalAlpha = 1;
      } else if (o.t === 'post') {
        const px = vw / 2 + o.X * s + Math.sin(t * 0.5 + o.ph) * 7 * s * amp, py = hy + (HC - o.h) * s + Math.cos(t * 0.4 + o.ph * 1.3) * 5 * s * amp;
        o.sx = px; o.sy = py; o.hr = clamp(42 * s, 32, 64);
        const pulse = 1 + (reduce ? 0 : 0.12 * Math.sin(t * 1.7 + o.ph));
        const size = clamp((34 + o.p.minutes * 6 + 24 * warm(o.p)) * s, 14, 120) * pulse * (o.idx === sel ? 1.35 : 1);
        g2.globalCompositeOperation = 'lighter'; g2.globalAlpha = 0.95 * al;
        g2.drawImage(o.glow, px - size / 2, py - size / 2, size, size);
        g2.globalAlpha = al; g2.fillStyle = '#fffbe8'; g2.beginPath(); g2.arc(px, py, Math.max(1.6, 2.2 * s), 0, TAU); g2.fill();
        g2.globalCompositeOperation = 'source-over'; g2.globalAlpha = 1;
      }
    }
    // 반딧불 아래 제목(길면 줄임표) + 그 밑에 작게 날짜
    for (const o of items) {
      if (o.t !== 'post' || o.zr <= 40 || o.zr >= FAR) continue;
      const s = F / o.zr, near = clamp((s - 0.45) / 0.85, 0, 1);
      const la = clamp((FAR - o.zr) / 260, 0, 1) * clamp((o.zr - 50) / 80, 0, 1), on = o.idx === sel;
      const fs = 11.5 + 3.5 * near, y0 = o.sy + clamp(22 * s, 16, 38), a0 = (on ? 1 : 0.88) * la;
      const title = fitText(o.p.title, `700 ${fs}px "Gowun Batang","Noto Serif KR",serif`, Math.min(vw * 0.62, 230));
      g2.font = `700 ${fs}px "Gowun Batang","Noto Serif KR",serif`; g2.textAlign = 'center'; g2.textBaseline = 'top';
      const tw = g2.measureText(title).width, lx = clamp(o.sx, tw / 2 + 10, vw - tw / 2 - 10); // 화면 가장자리에서도 글자가 잘리지 않게
      g2.globalAlpha = a0 * 0.7; g2.fillStyle = '#02080d'; g2.fillText(title, lx + 0.8, y0 + 1.2); // 어두운 나무 위에서도 읽히게 살짝 그림자
      g2.globalAlpha = a0; g2.fillStyle = on ? '#ffd98a' : '#e4efe2'; g2.fillText(title, lx, y0); g2.globalAlpha = 1;
      const yy = o.p.y !== thisYear ? `${o.p.y}.` : '';
      label(`${yy}${o.p.m}.${o.p.d}${o.p.photo ? ' ◆' : ''}`, lx, y0 + fs + 4, F_B, on ? '#ffd98a' : '#9fb8b0', a0 * 0.85);
    }
    boat(t, spd * 6);
    // 오른쪽 깊이 표시
    if (travel > 0) {
      const gx = vw - 16 - 4, g0 = vh * 0.2, g1 = vh * 0.46;
      g2.strokeStyle = 'rgba(200,225,235,0.28)'; g2.lineWidth = 1;
      g2.beginPath(); g2.moveTo(gx, g0); g2.lineTo(gx, g1); g2.stroke();
      items.forEach((it, i) => {
        const fp = clamp((it.z - 300) / travel, 0, 1), dy = g1 - fp * (g1 - g0);
        g2.fillStyle = i === sel ? '#ffd98a' : 'rgba(255,236,170,0.75)';
        g2.beginPath(); g2.arc(gx, dy, i === sel ? 4 : 2.6, 0, TAU); g2.fill();
      });
      const fc = clamp(cy / travel, 0, 1), cyy = g1 - fc * (g1 - g0);
      g2.strokeStyle = '#ffd98a'; g2.lineWidth = 1.4;
      g2.beginPath(); g2.moveTo(gx - 9, cyy); g2.lineTo(gx - 3, cyy); g2.stroke();
      label('깊이', gx - 4, g0 - 18, '10px "Gowun Dodum","Noto Sans KR",sans-serif', '#a9aec6', 0.8);
    }
    if (sel >= 0 && items[sel] && items[sel].sx > -900) ringAt(items[sel].sx, items[sel].sy, 26, t);
  }

  /* ---------- 상태 전환 ---------- */
  function chrome() {
    ui.setSub(cat < 0 ? `전체 + 카테고리 ${CATS.length}개 · 글 ${POSTS.length}편` : `${VIEWS[cat].name} · 글 ${VIS.length}편`);
    ui.setBack(cat < 0 ? null : () => goCat(-1));
    const empty = cat >= 0 && VIS.length === 0;
    ui.setNotice(empty ? (cat === 0 ? '아직 이 숲에는 반딧불이 찾아오지 않았어요' : `아직 ${VIEWS[cat].name} 숲에는 반딧불이 찾아오지 않았어요`) : '');
    ui.setHint(empty ? '' : cat < 0 ? '아래로 끌어 안쪽으로 들어가며 이정표를 눌러 보세요' : '아래로 끌어 숲 안쪽으로 노를 저어 반딧불을 찾아보세요');
    hintShown = true;
  }
  function hideHint() { if (hintShown) { hintShown = false; ui.setHint(''); } }
  function measure() {
    vw = el.clientWidth || window.innerWidth; vh = el.clientHeight || window.innerHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  }
  function build(reset: boolean) {
    const ry = H > vh ? cy / Math.max(1, H - vh) : 0;
    measure(); setup();
    if (reset) { cy = 0; prevCy = 0; spd = 0; introLeft = (cat >= 0 && !reduce) ? 1.2 : 0; tcy = null; vy = 0; }
    else cy = clamp(ry * (H - vh), 0, H - vh);
    if (sel >= 0 && cat >= 0) tcy = clamp(items[sel].z - 300, 0, H - vh);
  }
  function closeCard() { sel = -1; ui.hidePost(); }
  function goCat(c: number) {
    if (trans) return;
    const fn = () => {
      cat = c; VIS = c < 0 ? [] : VIEWS[c].posts;
      closeCard(); H = 0;
      build(true); chrome();
    };
    if (reduce) { fn(); return; }
    trans = { t0: performance.now(), fn, done: false };
  }
  function select(i: number) {
    if (cat < 0 || !VIS.length) return;
    i = clamp(i, 0, VIS.length - 1);
    sel = i;
    tcy = clamp(items[i].z - 300, 0, H - vh); vy = 0;
    ui.showPost(VIS[i], { onClose: () => { sel = -1; } });
    hideHint();
  }

  /* ---------- 루프 ---------- */
  function update(dt: number) {
    if (drag) return;
    if (tcy !== null) {
      const k = 1 - Math.exp(-dt / (reduce ? 60 : 170));
      cy += (tcy - cy) * k;
      if (Math.abs(tcy - cy) < 0.4) { cy = tcy; tcy = null; }
    } else if (Math.abs(vy) > 0.004) {
      const ny = cy + vy * dt;
      cy = clamp(ny, 0, H - vh);
      if (cy !== ny) vy = 0;
      vy *= Math.exp(-dt / 320);
    }
  }
  function frame(now: number) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(50, now - last) : 16; last = now;
    if (!perfStart) perfStart = now;
    if (now - perfStart > 2500) {
      acc += dt; cnt++;
      if (cnt >= 90) { // 프레임이 늦으면 해상도를 낮춰요
        const avg = acc / cnt; acc = 0; cnt = 0;
        if (avg > 21 && quality < 2) { quality++; dpr = quality === 1 ? Math.min(dpr, 1.5) : 1; build(false); }
      }
    }
    update(dt);
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(now / 1000);
    if (trans) {
      const e = performance.now() - trans.t0;
      let a: number;
      if (e < 220) a = e / 220;
      else {
        if (!trans.done) { trans.done = true; trans.fn(); }
        a = Math.max(0, 1 - (e - 220) / 300);
      }
      if (e >= 520) trans = null;
      else { g2.globalCompositeOperation = 'source-over'; g2.globalAlpha = a; g2.fillStyle = '#03050f'; g2.fillRect(0, 0, vw, vh); g2.globalAlpha = 1; }
    }
  }

  /* ---------- 입력 ---------- */
  function hitTest(px: number, py: number) {
    let best = -1, bd = 1e9;
    items.forEach((it, i) => {
      if (it.hw) {
        if (Math.abs(it.sx - px) < it.hw && Math.abs(it.sy - py) < it.hh) { const d = Math.abs(it.sx - px); if (d < bd) { bd = d; best = i; } }
      } else {
        const d = Math.hypot(it.sx - px, it.sy - py);
        if (d < (it.hr || 38) && d < bd) { bd = d; best = i; }
      }
    });
    return best;
  }
  function tap(px: number, py: number) {
    if (trans) return;
    const best = hitTest(px, py);
    if (cat < 0) { if (best >= 0) goCat(best); return; }
    if (best >= 0) select(best); else if (sel >= 0) closeCard();
  }
  const cleanups: (() => void)[] = [];
  const on = <K extends keyof HTMLElementEventMap>(t: EventTarget, ev: string, fn: (e: never) => void, opt?: AddEventListenerOptions) => {
    t.addEventListener(ev, fn as EventListener, opt); cleanups.push(() => t.removeEventListener(ev, fn as EventListener, opt));
  };
  const rectOf = () => cv.getBoundingClientRect();
  on(cv, 'pointerdown', (e: PointerEvent) => {
    try { cv.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
    drag = { id: e.pointerId, y: e.clientY, sx: e.clientX, sy: e.clientY, lt: e.timeStamp, moved: false };
    vy = 0; tcy = null;
  });
  on(cv, 'pointermove', (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y, dtm = Math.max(1, e.timeStamp - drag.lt);
    drag.y = e.clientY; drag.lt = e.timeStamp;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) { drag.moved = true; hideHint(); }
    if (drag.moved) { // 아래로 끌면 앞으로
      cy = clamp(cy + dy, 0, H - vh);
      vy = 0.8 * vy + 0.2 * (dy / dtm);
    }
  });
  on(cv, 'pointerup', (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.moved) { const r = rectOf(); tap(e.clientX - r.left, e.clientY - r.top); }
    else if (e.timeStamp - d.lt > 80) vy = 0;
  });
  on(cv, 'pointercancel', () => { drag = null; vy = 0; });
  on(cv, 'wheel', (e: WheelEvent) => {
    e.preventDefault(); tcy = null; hideHint();
    cy = clamp(cy - (e.deltaY || e.deltaX), 0, H - vh);
  }, { passive: false });
  on(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') { if (sel >= 0) closeCard(); else if (cat >= 0) goCat(-1); }
  });
  let rz = 0;
  on(window, 'resize', () => { clearTimeout(rz); rz = window.setTimeout(() => build(false), 150); });
  on(document, 'visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf && !dead) { last = 0; raf = requestAnimationFrame(frame); }
  });

  build(true); chrome();
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); clearTimeout(rz);
      cleanups.forEach((f) => f());
      ui.setNotice(''); ui.hidePost(); cv.remove();
    },
  };
}
