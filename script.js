// อัปเดตปีใน footer อัตโนมัติจากเวลาของอุปกรณ์ผู้ชม
document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = new Date().getFullYear();
});

// ทำเครื่องหมายเมนูของ section ที่กำลังอยู่ในหน้าจอด้วย aria-current
// หากเพิ่มเมนูใหม่ ให้ใช้ href="#section-id" และตั้ง id เดียวกันให้ section เป้าหมาย
const sectionLinks = [...document.querySelectorAll('.nav__links a[href^="#"]')];
const observedSections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    const current = entries.find((entry) => entry.isIntersecting);
    if (!current) return;
    sectionLinks.forEach((link) => {
      const active = link.getAttribute('href') === `#${current.target.id}`;
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
  observedSections.forEach((section) => observer.observe(section));
}
