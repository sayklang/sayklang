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
  navigation.toggleAttribute('data-scrolled', window.scrollY > 16);
  const scrollDistance = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollDistance > 0 ? Math.max(0, Math.min(1, window.scrollY / scrollDistance)) : 0;
  navigation.style.setProperty('--reading-progress', progress);
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
