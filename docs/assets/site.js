// 门户的轻量动效：顶栏阴影、滚动渐显、卡片聚光、AI 改卷卡片截图轮播。
// 都是渐进增强：脚本不运行时页面完整可用；开启「减少动态效果」时只保留顶栏阴影。
// 没有常驻的 requestAnimationFrame 循环，轮播在看不见时暂停。
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('js');

  // 顶栏：离开页顶后加阴影
  const top = document.querySelector('.top');
  if (top) {
    let ticking = false;
    const update = () => { top.classList.toggle('scrolled', scrollY > 8); ticking = false; };
    addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // 滚动渐显：只处理首屏以下的元素，首屏内容不会先出现再消失
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    const targets = '.section-head, .grid > .card, .shots figure, .split > .shot, .app, .steps li, .faq details, .download > *';
    document.querySelectorAll(targets).forEach((el) => {
      if (el.closest('.hero') || el.getBoundingClientRect().top < innerHeight) return;
      const i = Array.prototype.indexOf.call(el.parentElement.children, el);
      el.style.setProperty('--i', Math.min(i, 5));
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  // 卡片聚光：把鼠标在卡片里的位置写进 --mx / --my，每帧最多写一次
  if (finePointer && !reduce) {
    document.querySelectorAll('.spot').forEach((card) => {
      let raf = 0, x = 0, y = 0;
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        x = e.clientX - r.left; y = e.clientY - r.top;
        if (!raf) raf = requestAnimationFrame(() => {
          card.style.setProperty('--mx', x + 'px');
          card.style.setProperty('--my', y + 'px');
          raf = 0;
        });
      });
    });
  }

  // 截图轮播：每 3.5 秒换一张；悬停、离开视口、切到别的标签页时暂停
  if (!reduce && 'IntersectionObserver' in window) {
    document.querySelectorAll('.stage').forEach((stage) => {
      const imgs = stage.querySelectorAll('img');
      if (imgs.length < 2) return;
      const card = stage.closest('.card') || stage;
      let i = 0, timer = 0, visible = false, hover = false;
      const next = () => {
        imgs[i].classList.remove('on');
        i = (i + 1) % imgs.length;
        imgs[i].classList.add('on');
      };
      const sync = () => {
        const play = visible && !hover && !document.hidden;
        if (play && !timer) timer = setInterval(next, 3500);
        if (!play && timer) { clearInterval(timer); timer = 0; }
        stage.dataset.playing = play ? '1' : '0';
      };
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(stage);
      card.addEventListener('pointerenter', () => { hover = true; sync(); });
      card.addEventListener('pointerleave', () => { hover = false; sync(); });
      document.addEventListener('visibilitychange', sync);
    });
  }

  // 下载区：认出 Mac / Windows，标出对应卡片并让首屏「下载」直达
  const mac = document.getElementById('download-mac');
  const win = document.getElementById('download-win');
  if (mac && win) {
    const ua = navigator.userAgent;
    const mobile = /iPhone|iPad|Android/i.test(ua) || navigator.maxTouchPoints > 1 && /Macintosh/.test(ua);
    const mine = mobile ? null : /Windows/.test(ua) ? win : /Macintosh|Mac OS X/.test(ua) ? mac : null;
    if (mine) {
      mine.classList.add('is-mine');
      mine.querySelector('.dl-mine').hidden = false;
      const hero = document.querySelector('[data-dl-hero]');
      if (hero) {
        hero.href = '#' + mine.id;
        hero.textContent = mine === mac ? '下载 Mac 版' : '下载 Windows 版';
      }
    }
  }
})();
