// อ่านข้อมูลที่บันทึกผ่าน Pages CMS แล้วอัปเดตหน้าเว็บ หากโหลดไม่ได้จะคงเนื้อหาสำรองใน HTML
const siteRoot = new URL('.', import.meta.url);
const uploadRoot = new URL('assets/uploads/', siteRoot);
const profileChannels = [
  { key: 'github', label: 'GitHub', action: 'Open profile' },
  { key: 'linkedin', label: 'LinkedIn', action: 'Open profile' },
  { key: 'cv', label: 'CV', action: 'View CV' },
  { key: 'tryHackMe', label: 'TryHackMe', action: 'Open profile' },
];

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function webUrl(value) {
  const input = cleanText(value);
  if (!/^https?:\/\/\S+$/i.test(input)) return null;

  try {
    const url = new URL(input);
    return url.username || url.password ? null : url;
  } catch {
    return null;
  }
}

// Pages CMS เก็บ path พร้อมชื่อ repo แปลงเป็น path ของเว็บที่เปิดอยู่เพื่อรองรับทั้ง Pages และ local preview
function uploadUrl(value) {
  const match = cleanText(value).match(/^\/?(?:sayklang\/)?assets\/uploads\/(.+\.(?:jpe?g|png|webp))$/i);
  if (!match) return null;

  try {
    const url = new URL(match[1], uploadRoot);
    return url.href.startsWith(uploadRoot.href) ? url : null;
  } catch {
    return null;
  }
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function externalLink(label, url, className) {
  const link = element('a', label, className);
  link.href = url.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function hydrateProfile(profile) {
  if (!profile || !cleanText(profile.name)) return;

  const name = cleanText(profile.name);
  for (const node of document.querySelectorAll('[data-profile]')) {
    const field = node.dataset.profile;
    const value = cleanText(profile[field]);
    if (field === 'headline' && value.startsWith(name + ',')) {
      node.textContent = value.slice(name.length + 1).trim();
      continue;
    }
    if (value) node.textContent = value;
  }
  document.title = cleanText(profile.headline) || name;

  const photo = document.querySelector('[data-profile-photo]');
  const photoUrl = uploadUrl(profile.photo);
  if (photoUrl) {
    const fallbackSource = photo.src;
    const fallbackAlt = photo.alt;
    photo.addEventListener('error', () => {
      photo.src = fallbackSource;
      photo.alt = fallbackAlt;
      photo.removeAttribute('data-uploaded-photo');
    }, { once: true });
    photo.src = photoUrl.href;
    photo.alt = cleanText(profile.photoAlt) || 'Profile image of ' + cleanText(profile.name);
    photo.setAttribute('data-uploaded-photo', '');
  }

  const email = cleanText(profile.email);
  const validEmail = /^[^\s@?#&]+@[^\s@?#&]+\.[^\s@?#&]+$/.test(email);
  const emailContact = document.getElementById('email-contact');
  emailContact.hidden = !validEmail;
  emailContact.querySelector('[data-email-address]').textContent = validEmail ? email : '';
  const compose = emailContact.querySelector('[data-email-compose]');
  if (validEmail) {
    const gmail = new URL('https://mail.google.com/mail/?view=cm&fs=1');
    gmail.searchParams.set('to', email);
    compose.href = gmail.href;
  } else {
    compose.removeAttribute('href');
  }

  const links = {
    github: webUrl(profile.github),
    linkedin: webUrl(profile.linkedin),
    email: validEmail ? '#email-contact' : '',
  };

  for (const node of document.querySelectorAll('[data-profile-link]')) {
    const channel = node.dataset.profileLink;
    const target = links[channel];
    (node.closest('li') ?? node).hidden = !target;

    if (!target) {
      node.removeAttribute('href');
      continue;
    }

    node.href = target;
    if (channel === 'email') node.textContent = 'Email ' + (cleanText(profile.shortName) || cleanText(profile.name));
  }

  const rows = profileChannels.flatMap(({ key, label, action }) => {
    const url = webUrl(profile[key]);
    if (!url) return [];

    const row = externalLink('', url, 'profile-entry');
    const details = element('span');
    const subtext = url.hostname.replace(/^www\./, '');
    details.append(element('strong', label), element('small', subtext));
    row.append(details, element('span', action));
    return [row];
  });
  if (!rows.length) rows.push(element('p', 'No public profiles listed.', 'empty-object'));
  document.querySelector('[data-profile-list]').replaceChildren(...rows);

  // ใช้รูปแบบเดียวกับรายการผลงานเพื่อแสดงข้อความและเปิดดูรูปโปรไฟล์เพิ่มเติมได้
  const highlights = Array.isArray(profile.highlights)
    ? profile.highlights.filter(Boolean).map((item) => portfolioRow(item)).filter(Boolean)
    : [];
  const about = document.getElementById('about');
  about.querySelector('[data-profile-highlights]').replaceChildren(...highlights);
  about.hidden = highlights.length === 0;
  document.querySelector('.folio-links a[href="#about"]').closest('li').hidden = about.hidden;
}

function textList(values) {
  return Array.isArray(values) ? values.map(cleanText).filter(Boolean) : [];
}

function renderEntries(rows, key, makeRow) {
  if (!Array.isArray(rows)) return;

  const container = document.querySelector('[data-items="' + key + '"]');
  const emptyState = document.querySelector('[data-empty="' + key + '"]');
  const children = rows.filter(Boolean).map(makeRow).filter(Boolean);
  container.replaceChildren(...children);
  container.hidden = children.length === 0;
  emptyState.hidden = children.length > 0;
}

function skillRow(skill) {
  const category = cleanText(skill.category);
  const items = textList(skill.items);
  if (!category || !items.length) return null;

  const row = element('div');
  row.append(element('dt', category), element('dd', items.join(', ')));
  return row;
}

function portfolioRow(item, { meta = [], links = [], image = item.image, imageAlt = item.imageAlt } = {}) {
  const title = cleanText(item.title);
  if (!title) return null;

  const row = element('li', '', 'portfolio-item');
  const imageUrl = uploadUrl(image);
  if (imageUrl) {
    const media = element('div', '', 'portfolio-item__media');
    const photo = element('img', '', 'portfolio-item__cover');
    photo.src = imageUrl.href;
    photo.alt = cleanText(imageAlt);
    photo.width = 640;
    photo.height = 360;
    photo.loading = 'lazy';
    photo.addEventListener('error', () => media.remove(), { once: true });
    media.append(photo);

    if (typeof document.querySelector('.image-viewer')?.showModal === 'function') {
      const zoom = element('button', 'View image', 'btn btn--secondary portfolio-item__zoom');
      zoom.type = 'button';
      zoom.setAttribute('aria-label', 'View image for ' + title);
      zoom.dataset.viewImage = title;
      media.append(zoom);
    }
    row.append(media);
  }

  row.append(element('h3', title));
  const details = textList(meta);
  if (details.length) row.append(element('p', details.join(' / '), 'portfolio-item__meta'));
  const summary = cleanText(item.summary);
  if (summary) row.append(element('p', summary, 'portfolio-item__summary'));

  const actions = element('div', '', 'portfolio-item__links');
  for (const [label, value] of links) {
    const url = webUrl(value);
    if (url) actions.append(externalLink(label, url));
  }
  if (actions.childElementCount) row.append(actions);
  return row;
}

function displayDate(value) {
  const isoDate = cleanText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
  const date = new Date(isoDate + 'T00:00:00Z');
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return '';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}

function applyAppearance(settings) {
  if (!settings || typeof settings !== 'object') return;

  const root = document.documentElement;
  root.dataset.palette = ['navy', 'forest'].includes(settings.palette) ? settings.palette : 'oxblood';
  root.dataset.projectLayout = settings.projectLayout === 'list' ? 'list' : 'cards';
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(root).getPropertyValue('--p-bg').trim();

  const sections = [
    ['#focus', settings.showProjects],
    ['#tools', settings.showSkills],
    ['#direction', settings.showExperience],
    ['#contact', settings.showCertificates],
  ];

  for (const [anchor, show] of sections) {
    const isCertificates = anchor === '#contact';
    const section = document.querySelector(isCertificates ? '[data-certificates]' : anchor);
    section.hidden = show === false;
    for (const link of document.querySelectorAll('a[href="' + anchor + '"]')) {
      (link.closest('.nav__item, li') ?? link).hidden = section.hidden;
    }
    if (isCertificates && section.hidden) {
      const footer = document.querySelector(anchor);
      footer.classList.remove('closing');
      footer.removeAttribute('aria-labelledby');
    }
  }
}

const editors = {
  profile: hydrateProfile,
  appearance: applyAppearance,
  skills: (rows) => renderEntries(rows, 'skills', skillRow),
  projects: (rows) => renderEntries(rows, 'projects', (item) => portfolioRow(item, {
    meta: [item.role, ...textList(item.technologies)],
    links: [['View repository', item.repository], ['View demo', item.demo]],
    image: item.cover,
    imageAlt: item.coverAlt,
  })),
  experience: (rows) => renderEntries(rows, 'experience', (item) => portfolioRow(item, {
    meta: [item.role, item.organization, item.period],
    links: [['View activity', item.link]],
  })),
  certificates: (rows) => renderEntries(rows, 'certificates', (item) => portfolioRow(item, {
    meta: [item.issuer, displayDate(item.issued)],
    links: [['Verify credential', item.credential]],
  })),
};

async function loadContent(name, render) {
  const emptyState = ['projects', 'experience', 'certificates'].includes(name)
    ? document.querySelector('[data-empty="' + name + '"]')
    : null;
  const emptyText = emptyState?.textContent;
  if (emptyState) emptyState.textContent = 'Loading…';

  try {
    const response = await fetch(new URL('content/' + name + '.json', siteRoot));
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (emptyState) emptyState.textContent = emptyText;
    render(data);
  } catch (error) {
    if (emptyState) emptyState.textContent = 'This section could not be loaded.';
    console.warn('Portfolio content could not load: ' + name, error);
  }
}

for (const [name, render] of Object.entries(editors)) {
  void loadContent(name, render);
}
