// 门户的交互动效：光标圆环、鼠标光晕、首页首屏星空。
// 只是装饰：脚本不运行时页面照常可用；触屏设备没有圆环和光晕；开启「减少动态效果」时
// 圆环和光晕不出现，星空只画一帧静止的。没有常驻循环：圆环追上鼠标就停，星空离开视口就停。
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const interactive = fine && !reduce;
  const pointer = { x: 0, y: 0, active: false }; // 鼠标在视口里的位置

  // 光标圆环 + 光晕：系统光标照常显示，圆环只是跟在后面的装饰
  if (interactive) {
    const glow = document.createElement('div');
    const ring = document.createElement('div');
    glow.className = 'glow';
    ring.className = 'cursor';
    glow.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.append(glow, ring);

    let rx = 0, ry = 0, raf = 0;
    const tick = () => {
      rx += (pointer.x - rx) * 0.22;
      ry += (pointer.y - ry) * 0.22;
      const t = `translate3d(${rx}px, ${ry}px, 0)`;
      ring.style.transform = t;
      glow.style.transform = t;
      raf = Math.abs(pointer.x - rx) + Math.abs(pointer.y - ry) > 0.3 ? requestAnimationFrame(tick) : 0;
    };
    const hide = () => { pointer.active = false; ring.classList.remove('on'); glow.classList.remove('on'); };
    const HOT = 'a, button, summary, label, [role="button"], .spot';

    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') { hide(); return; }
      if (!pointer.active) { rx = e.clientX; ry = e.clientY; ring.classList.add('on'); glow.classList.add('on'); }
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    addEventListener('pointerover', (e) => {
      ring.classList.toggle('is-hot', !!(e.target.closest && e.target.closest(HOT)));
    }, { passive: true });
    addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') ring.classList.add('is-down'); else hide(); }, { passive: true });
    addEventListener('pointerup', () => ring.classList.remove('is-down'), { passive: true });
    document.documentElement.addEventListener('mouseleave', hide);
    addEventListener('blur', hide);
  }

  // 首页首屏星空：手写 Canvas，几十个点，不做点与点两两连线
  const hero = document.querySelector('.hero[data-stars]');
  if (!hero || !('IntersectionObserver' in window) || !('ResizeObserver' in window)) return;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.className = 'stars';
  canvas.setAttribute('aria-hidden', 'true');
  hero.prepend(canvas);

  const REPEL = 110, LINK = 140, MAX_LINKS = 8;
  let w = 0, h = 0, left = 0, top = 0, stars = [], color = '#888', raf = 0, last = 0, visible = false;
  const readColor = () => { color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || color; };
  const seed = () => {
    const n = Math.round(Math.min(70, Math.max(24, (w * h) / 14000)) * (fine ? 1 : 0.5));
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14, // 每秒几像素
      dx: 0, dy: 0, // 被鼠标推开的偏移，之后慢慢回落
      r: 0.6 + Math.random() * 1.2,
      a: 0.15 + Math.random() * 0.35, // 最亮 0.5，压在文字下面也不影响阅读
      p: Math.random() * Math.PI * 2, s: 0.6 + Math.random() * 1.4,
    }));
  };

  const draw = (t, dt) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    const k = dt / 16.7;
    const mx = pointer.x - left, my = pointer.y + scrollY - top;
    const near = interactive && pointer.active && mx > -LINK && mx < w + LINK && my > -LINK && my < h + LINK;
    let links = 0;
    for (const s of stars) {
      s.x += (s.vx * dt) / 1000;
      s.y += (s.vy * dt) / 1000;
      if (s.x < -4) s.x += w + 8; else if (s.x > w + 4) s.x -= w + 8;
      if (s.y < -4) s.y += h + 8; else if (s.y > h + 4) s.y -= h + 8;
      s.dx *= Math.pow(0.94, k);
      s.dy *= Math.pow(0.94, k);
      let x = s.x + s.dx, y = s.y + s.dy;
      if (near) {
        const ex = x - mx, ey = y - my, d = Math.hypot(ex, ey) || 1;
        if (d < REPEL) {
          const f = (1 - d / REPEL) * 1.6 * k;
          s.dx += (ex / d) * f;
          s.dy += (ey / d) * f;
          x = s.x + s.dx; y = s.y + s.dy;
        }
        if (d < LINK && links < MAX_LINKS) {
          links++;
          ctx.globalAlpha = (1 - d / LINK) * 0.35;
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(x, y); ctx.stroke();
        }
      }
      ctx.globalAlpha = s.a * (0.6 + 0.4 * Math.sin((t / 1000) * s.s + s.p));
      ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const frame = (t) => {
    const dt = last ? Math.min(50, t - last) : 16.7;
    last = t;
    draw(t, dt);
    raf = requestAnimationFrame(frame);
  };
  const sync = () => {
    const play = visible && !document.hidden && !reduce;
    if (play && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    if (!play && raf) { cancelAnimationFrame(raf); raf = 0; }
  };

  new ResizeObserver(() => {
    const r = hero.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = r.width; h = r.height; left = r.left; top = r.top + scrollY;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    readColor();
    seed();
    if (reduce) draw(0, 0);
  }).observe(hero);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(hero);
  document.addEventListener('visibilitychange', sync);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColor(); if (reduce) draw(0, 0); });
})();
