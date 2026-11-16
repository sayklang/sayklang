// พื้นหลังเคลื่อนไหวเฉพาะขอบ หยุดเมื่อพ้นจอ เปลี่ยนแท็บ หรือเปิด Reduce motion
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('.hero');
const signalCanvas = hero.querySelector('canvas');
const signalContext = signalCanvas.getContext('2d');
const motionToggle = hero.querySelector('.motion-toggle');
let backgroundPaused = false;
let heroVisible = true;
let signalFrame = 0;
let signalTime = 0;
let lastSignalTime = 0;
let signalWidth = 0;
let signalHeight = 0;
let signalExclusions = [];

function drawSignals() {
  const ctx = signalContext;
  if (!ctx) return;
  ctx.clearRect(0, 0, signalWidth, signalHeight);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, signalWidth, signalHeight);
  for (const box of signalExclusions) ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip('evenodd');
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--p-accent').trim();
  ctx.fillStyle = ctx.strokeStyle;
  const narrow = signalWidth < 865;
  const routes = narrow
    ? [[[.015, .03], [.015, .28], [.035, .31], [.035, .55]]]
    : [
      [[0, .17], [.13, .17], [.18, .09], [.39, .09]],
      [[.02, .37], [.07, .37], [.1, .43], [.1, .67], [.04, .73], [0, .73]],
      [[1, .23], [.91, .23], [.87, .16], [.66, .16]],
      [[1, .63], [.95, .63], [.91, .7], [.91, .84], [.72, .84]],
      [[.16, 1], [.16, .92], [.23, .85], [.39, .85]],
    ];
  routes.forEach((route, index) => {
    const points = route.map(([x, y]) => [x * signalWidth, y * signalHeight]);
    ctx.globalAlpha = narrow ? .12 : .16;
    ctx.lineWidth = 1;
    ctx.beginPath();
    points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.stroke();
    for (const [x, y] of [points[0], points[points.length - 1]]) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    const lengths = points.slice(1).map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]));
    const total = lengths.reduce((sum, length) => sum + length, 0);
    let distance = ((signalTime / 18000 + index * .21) % 1) * total;
    for (let i = 0; i < lengths.length; i++) {
      if (distance > lengths[i]) { distance -= lengths[i]; continue; }
      const fraction = distance / lengths[i];
      const x = points[i][0] + (points[i + 1][0] - points[i][0]) * fraction;
      const y = points[i][1] + (points[i + 1][1] - points[i][1]) * fraction;
      ctx.globalAlpha = .55;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

function animateSignals(time) {
  if (lastSignalTime) signalTime += Math.min(time - lastSignalTime, 50);
  lastSignalTime = time;
  drawSignals();
  signalFrame = requestAnimationFrame(animateSignals);
}

function updateBackgroundMotion() {
  cancelAnimationFrame(signalFrame);
  lastSignalTime = 0;
  motionToggle.hidden = motionPreference.matches || !signalContext;
  motionToggle.setAttribute('aria-pressed', String(backgroundPaused));
  motionToggle.textContent = backgroundPaused ? 'Resume background' : 'Pause background';
  drawSignals();
  if (signalContext && !backgroundPaused && !motionPreference.matches && heroVisible && !document.hidden) {
    signalFrame = requestAnimationFrame(animateSignals);
  }
}

function resizeSignals() {
  signalWidth = hero.clientWidth;
  signalHeight = hero.clientHeight;
  const origin = hero.getBoundingClientRect();
  signalExclusions = [...hero.querySelectorAll('.hero__text, .hero__folio')].map((node) => {
    const box = node.getBoundingClientRect();
    return { x: box.left - origin.left - 16, y: box.top - origin.top - 16, width: box.width + 32, height: box.height + 32 };
  });
  const density = Math.min(window.devicePixelRatio || 1, 2);
  signalCanvas.width = Math.round(signalWidth * density);
  signalCanvas.height = Math.round(signalHeight * density);
  signalContext?.setTransform(density, 0, 0, density, 0, 0);
  drawSignals();
}

motionToggle.addEventListener('click', () => {
  backgroundPaused = !backgroundPaused;
  updateBackgroundMotion();
});
motionPreference.addEventListener('change', updateBackgroundMotion);
document.addEventListener('visibilitychange', updateBackgroundMotion);
if ('ResizeObserver' in window) new ResizeObserver(resizeSignals).observe(hero);
else window.addEventListener('resize', resizeSignals);
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    updateBackgroundMotion();
  }).observe(hero);

  // รายการจาก Pages CMS เล่นแอนิเมชันครั้งเดียวเมื่อเลื่อนมาถึง
  const observed = new WeakSet();
  const reveals = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      if (!motionPreference.matches) entry.target.classList.add('motion-reveal');
      reveals.unobserve(entry.target);
    }
  }, { threshold: .08 });
  const observeContent = () => {
    document.querySelectorAll('.section-head, .portfolio-item, .tool-ledger dl > div, .profile-entry, .footer__content > div').forEach((node) => {
      if (observed.has(node)) return;
      observed.add(node);
      reveals.observe(node);
    });
  };
  observeContent();
  const contentObserver = new MutationObserver(observeContent);
  contentObserver.observe(document.querySelector('main'), { childList: true, subtree: true });
  contentObserver.observe(document.querySelector('footer'), { childList: true, subtree: true });
}
resizeSignals();
updateBackgroundMotion();

// การควบคุมเมนูและตัวเปิดรูป ใช้แยกจากการโหลดข้อมูลใน Pages CMS
document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const navigation = document.querySelector('.nav');
const navigationLinks = document.getElementById('site-nav');
const menuToggle = navigation.querySelector('.nav__toggle');
const mobileViewport = window.matchMedia('(max-width: 54rem)');

function setMenu(open) {
  navigationLinks.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.textContent = open ? 'Close menu' : 'Menu';
}

navigation.dataset.enhanced = '';
menuToggle.hidden = false;
menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
mobileViewport.addEventListener('change', () => setMenu(false));
navigation.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link) return;
  const wasOpen = navigationLinks.classList.contains('is-open');
  setMenu(false);

  if (wasOpen && mobileViewport.matches && link.hash) {
    const section = document.getElementById(link.hash.slice(1));
    if (!section) return;
    section.setAttribute('tabindex', '-1');
    window.requestAnimationFrame(() => section.focus({ preventScroll: true }));
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || menuToggle.getAttribute('aria-expanded') !== 'true') return;
  setMenu(false);
  menuToggle.focus();
});

// อ่านตำแหน่งของส่วนที่มองเห็น เพื่อขีดเส้นใต้ลิงก์ที่ตรงกับเนื้อหาขณะเลื่อน
const sectionLinks = [...document.querySelectorAll('.nav__link, .folio-links a, .nav__actions a')];
const destinations = [...new Set(sectionLinks.map((link) => link.hash))]
  .map((hash) => document.getElementById(hash.slice(1)))
  .filter(Boolean);
let scrollFrame = 0;

function updateLocation() {
  scrollFrame = 0;
  const line = Math.min(200, window.innerHeight * .28);
  let current = '';
  let nearest = -Infinity;
  for (const section of destinations) {
    if (section.hidden || (section.id === 'contact' && section.querySelector('[data-certificates]').hidden)) continue;
    const { top } = section.getBoundingClientRect();
    if (top > line || top <= nearest) continue;
    nearest = top;
    current = '#' + section.id;
  }

  for (const link of sectionLinks) {
    if (link.hash === current && !link.closest('[hidden]')) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

function requestLocationUpdate() {
  if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateLocation);
}

window.addEventListener('scroll', requestLocationUpdate, { passive: true });
window.addEventListener('resize', requestLocationUpdate);
window.addEventListener('hashchange', requestLocationUpdate);
if ('ResizeObserver' in window) new ResizeObserver(requestLocationUpdate).observe(document.body);
requestLocationUpdate();

// ปุ่มอีเมลเปิดข้อมูลติดต่อบนเว็บ พร้อมตัวเลือกคัดลอกหรือเขียนอีเมลใน Gmail
const emailContact = document.getElementById('email-contact');
const emailStatus = emailContact.querySelector('[role="status"]');
const copyEmail = emailContact.querySelector('[data-copy-email]');
let emailTrigger = null;

if (typeof emailContact.showModal === 'function') {
  document.querySelectorAll('[data-profile-link="email"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || emailContact.hidden) return;
      event.preventDefault();
      emailTrigger = link;
      emailStatus.textContent = '';
      emailContact.removeAttribute('open');
      emailContact.showModal();
    });
  });

  emailContact.addEventListener('close', () => {
    emailStatus.textContent = '';
    emailContact.setAttribute('open', '');
    emailTrigger?.focus({ preventScroll: true });
    emailTrigger = null;
  });
}

if (navigator.clipboard?.writeText) {
  copyEmail.hidden = false;
  copyEmail.addEventListener('click', async () => {
    const address = emailContact.querySelector('[data-email-address]').textContent;
    try {
      await navigator.clipboard.writeText(address);
      emailStatus.textContent = 'Email address copied.';
    } catch {
      emailStatus.textContent = 'Select the email address above to copy it.';
    }
  });
}

// ไฟล์ภาพที่แนบผ่าน CMS เปิดขนาดเต็มด้วย dialog และคืนโฟกัสเมื่อปิด
const imageViewer = document.querySelector('.image-viewer');
const viewerTitle = imageViewer.querySelector('h2');
const viewerMedia = imageViewer.querySelector('.image-viewer__media');
const viewerStatus = imageViewer.querySelector('[role="status"]');
let viewerTrigger = null;

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('button[data-view-image]');
  if (!trigger || imageViewer.open || typeof imageViewer.showModal !== 'function') return;
  const image = trigger.parentElement.querySelector('img');
  if (!image) return;

  viewerTrigger = trigger;
  viewerTitle.textContent = trigger.dataset.viewImage;
  const viewerImage = document.createElement('img');
  viewerImage.alt = image.alt || trigger.dataset.viewImage;
  viewerImage.width = image.naturalWidth || image.width;
  viewerImage.height = image.naturalHeight || image.height;
  viewerImage.addEventListener('error', () => {
    if (!viewerImage.isConnected) return;
    viewerImage.remove();
    viewerStatus.hidden = false;
  }, { once: true });
  viewerMedia.replaceChildren(viewerImage);
  viewerStatus.hidden = true;
  viewerImage.src = image.currentSrc || image.src;
  imageViewer.showModal();
});

imageViewer.addEventListener('close', () => {
  viewerMedia.replaceChildren();
  viewerTrigger?.focus();
  viewerTrigger = null;
});
