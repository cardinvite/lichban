// Tiện ích DOM nhỏ, không dùng innerHTML với dữ liệu người dùng.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Thay toàn bộ con của el, bỏ qua null/false. */
export function fill(el, ...children) {
  el.replaceChildren(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) if (c) el.append(c);
  return el;
}

// Số ngẫu nhiên ổn định theo chuỗi (để nét bút không đổi mỗi lần vẽ lại)
function rng(seed) {
  let x = 2166136261;
  for (let i = 0; i < seed.length; i++) { x ^= seed.charCodeAt(i); x = Math.imul(x, 16777619); }
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) % 100000) / 100000;
  };
}

function smoothPath(pts) {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// Icon SVG thay cho ký tự/emoji (emoji trên iPhone bị lệch tâm và to hơn nút)
const ICONS = {
  prev: ['M15 18l-6-6 6-6'],
  next: ['M9 18l6-6-6-6'],
  close: ['M18 6L6 18', 'M6 6l12 12'],
  lock: ['M7 11V7a5 5 0 0 1 10 0v4', 'M5 11h14v10H5z'],
  settings: [
    'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
    'M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z',
  ],
};

export function icon(name) {
  return svg('svg', { class: 'icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    ...ICONS[name].map((d) => svg('path', { d })));
}

/** Vòng tròn vẽ tay: hơi méo, nét đè lên đầu, như khoanh bằng bút bi. */
export function penMark(kind, color, seed, animate) {
  const r = rng(seed || 'x');
  const el = svg('svg', { class: 'pen pen-' + kind + (animate ? ' pen-draw' : ''), viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  let d;
  if (kind === 'circle') {
    const start = -2.2 + r() * 0.8;
    const turns = 1.1 + r() * 0.1;
    const n = 20;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = start + t * turns * Math.PI * 2;
      const wobble = 1 + (r() - 0.5) * 0.07 + (t > 0.85 ? 0.07 * (t - 0.85) / 0.15 : 0);
      pts.push([50 + 45 * wobble * Math.cos(a), 52 + 41 * wobble * Math.sin(a)]);
    }
    d = smoothPath(pts);
  } else if (kind === 'underline') {
    const pts = [];
    for (let i = 0; i <= 8; i++) pts.push([8 + i * 10.5, 90 + Math.sin(i * 1.7 + r() * 3) * 4]);
    d = smoothPath(pts);
  } else if (kind === 'dot') {
    el.append(svg('circle', { cx: 50, cy: 50, r: 40, fill: color }));
    return el;
  } else {
    return null;
  }
  el.append(svg('path', { d, fill: 'none', stroke: color, 'stroke-width': '2.2', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke', pathLength: '100' }));
  return el;
}

let toastTimer;
export function toast(message, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.dataset.type = type;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, type === 'error' ? 6000 : 2600);
}

export const pad2 = (n) => String(n).padStart(2, '0');
export const dmy = (s) => `${pad2(s.d)}/${pad2(s.m)}/${s.y}`;
export const dayKey = (s) => `${s.y}-${pad2(s.m)}-${pad2(s.d)}`;
export const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return { y, m, d }; };

export function todayParts() {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate(), hour: n.getHours(), minute: n.getMinutes() };
}

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
