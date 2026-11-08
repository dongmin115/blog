// 대체 화면: WebGL이 없거나 모션을 줄이고 싶을 때, 그리고 검색엔진용으로도 쓰이는 단순 목록.
export function mount({ el, data, ui }) {
  const root = document.createElement('div');
  root.className = 'listview';
  const wrap = document.createElement('div');
  root.appendChild(wrap);
  data.cats.forEach((c, i) => {
    const posts = data.inCat(i).slice().reverse();
    if (!posts.length) return;
    const h = document.createElement('h3');
    h.style.color = `hsl(${c.h},${c.s}%,72%)`;
    h.textContent = c.name;
    const small = document.createElement('small');
    small.textContent = `${c.sub} · 글 ${posts.length}편`;
    h.appendChild(small);
    wrap.appendChild(h);
    posts.forEach((p) => {
      const a = document.createElement('a');
      a.className = 'item'; a.href = p.url;
      const b = document.createElement('b'); b.textContent = p.title;
      const s = document.createElement('span'); s.textContent = `${p.m}월 ${p.d}일 · ${p.minutes}분`;
      a.append(b, s); wrap.appendChild(a);
    });
  });
  el.appendChild(root);
  ui.setSub('목록');
  return { destroy() { root.remove(); } };
}
