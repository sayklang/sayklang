// ปรับจังหวะและพื้นหลังที่นี่ ข้อมูลโปรไฟล์ยังแก้ใน Pages CMS ได้ตามเดิม
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('.hero');
  const canvas = hero.querySelector('canvas');
  const context = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let accent = '';
  let frame = 0;
  let endTime = 0;
  let previousTime = 0;
  let phase = 0;
  let visible = true;
  let pointerX = 0;
  let pointerY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let exclusions = [];

  function draw() {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    context.save();
    context.beginPath();
    context.rect(0, 0, width, height);
    for (const rect of exclusions) context.rect(rect.x, rect.y, rect.width, rect.height);
    context.clip('evenodd');
    context.strokeStyle = accent;
    const count = width < 865 ? 7 : 18;
    // เส้นโค้งสองกลุ่มคล้ายลายเส้นบนกระดาษ เว้นพื้นที่ตัวหนังสือและสารบัญ
    for (let side = 0; side < 2; side++) {
      context.save();
      if (side) { context.translate(width, height); context.rotate(Math.PI); }
      for (let line = 0; line < count; line++) {
        const spacing = line * (width < 865 ? 12 : 18);
        const sway = Math.sin(phase + line * .09) * 22;
        context.globalAlpha = .09 + line / count * .13;
        context.lineWidth = line % 6 === 0 ? 1.5 : .8;
        context.beginPath();
        context.moveTo(-80, height * .58 + spacing);
        context.bezierCurveTo(
          width * .24 + offsetX, height * .55 + spacing + sway,
          -width * .08 + offsetX, -height * .04 + spacing + offsetY,
          width * .52, -70 + spacing * .36
        );
        context.stroke();
      }
      context.restore();
    }
    context.restore();
  }

  function tick(time) {
    const delta = previousTime ? Math.min(time - previousTime, 40) : 16;
    previousTime = time;
    phase += delta * .00028;
    const smoothing = 1 - Math.exp(-delta / 140);
    offsetX += (pointerX - offsetX) * smoothing;
    offsetY += (pointerY - offsetY) * smoothing;
    draw();
    frame = time < endTime ? requestAnimationFrame(tick) : 0;
  }

  // เล่นตอนเข้าหน้าครั้งแรกและตามการชี้เมาส์ จากนั้นค่อย ๆ หยุดเอง
  function move(duration = 650) {
    if (!context || preference.matches || !visible || document.hidden) return;
    endTime = performance.now() + duration;
    if (!frame) { previousTime = 0; frame = requestAnimationFrame(tick); }
  }

  function resize() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    accent = getComputedStyle(document.documentElement).getPropertyValue('--p-accent').trim();
    const density = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    context?.setTransform(density, 0, 0, density, 0, 0);
    const origin = hero.getBoundingClientRect();
    exclusions = [...hero.querySelectorAll('.hero__text, .hero__folio')].map((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.left - origin.left - 20, y: rect.top - origin.top - 20, width: rect.width + 40, height: rect.height + 40 };
    });
    draw();
  }

  hero.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || preference.matches) return;
    const rect = hero.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / width - .5) * 70;
    pointerY = ((event.clientY - rect.top) / height - .5) * 45;
    move();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; move(); });
  function stop() { cancelAnimationFrame(frame); frame = 0; }
  preference.addEventListener('change', () => {
    stop();
    pointerX = pointerY = offsetX = offsetY = 0;
    draw();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
  else addEventListener('resize', resize);
  new MutationObserver(resize).observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette'] });
  document.fonts?.ready.then(resize);
  resize();
  move(3600);

  if (!('IntersectionObserver' in window)) return;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) stop();
  }).observe(hero);

  const seen = new WeakSet();
  const reveals = new IntersectionObserver((entries) => {
    let index = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      if (!preference.matches) {
        entry.target.style.setProperty('--reveal-delay', Math.min(index++, 4) * 75 + 'ms');
        entry.target.classList.add('motion-reveal');
      }
      reveals.unobserve(entry.target);
    }
  }, { threshold: .08 });
  function observeContent() {
    document.querySelectorAll('.section-head, .portfolio-item, .tool-ledger dl > div, .profile-entry, .footer__content > div').forEach((node) => {
      if (seen.has(node)) return;
      seen.add(node);
      reveals.observe(node);
    });
  }
  observeContent();
  const contentObserver = new MutationObserver(observeContent);
  contentObserver.observe(document.querySelector('main'), { childList: true, subtree: true });
  contentObserver.observe(document.querySelector('footer'), { childList: true, subtree: true });
})();
