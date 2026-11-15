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

  for (const node of document.querySelectorAll('[data-profile]')) {
    const value = cleanText(profile[node.dataset.profile]);
    if (value) node.textContent = value;
  }
  document.title = cleanText(profile.headline) || cleanText(profile.name);

  const photo = document.querySelector('[data-profile-photo]');
  const photoUrl = uploadUrl(profile.photo);
  if (photoUrl) {
    const fallbackSource = photo.src;
    const fallbackAlt = photo.alt;
    photo.addEventListener('error', () => {
      photo.src = fallbackSource;
      photo.alt = fallbackAlt;
    }, { once: true });
    photo.src = photoUrl.href;
    photo.alt = cleanText(profile.photoAlt) || 'Profile image of ' + cleanText(profile.name);
  }

  const email = cleanText(profile.email);
  const links = {
    github: webUrl(profile.github),
    linkedin: webUrl(profile.linkedin),
    email: /^[^\s@?#&]+@[^\s@?#&]+\.[^\s@?#&]+$/.test(email) ? 'mailto:' + email : '',
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

  const rows = profileChannels.map(({ key, label, action }) => {
    const url = webUrl(profile[key]);
    const row = url
      ? externalLink('', url, 'profile-entry')
      : element('div', '', 'profile-entry profile-entry--unavailable');
    const details = element('span');
    const subtext = url ? url.hostname.replace(/^www\./, '') : 'URL not provided';
    details.append(element('strong', label), element('small', subtext));
    row.append(details, element('span', url ? action : 'Unavailable', url ? '' : 'profile-link__status'));
    return row;
  });
  document.querySelector('[data-profile-list]').replaceChildren(...rows);
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
    const photo = element('img', '', 'portfolio-item__cover');
    photo.src = imageUrl.href;
    photo.alt = cleanText(imageAlt);
    photo.width = 640;
    photo.height = 360;
    photo.loading = 'lazy';
    photo.addEventListener('error', () => photo.remove(), { once: true });
    row.append(photo);
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
  try {
    const response = await fetch(new URL('content/' + name + '.json', siteRoot));
    if (!response.ok) throw new Error('HTTP ' + response.status);
    render(await response.json());
  } catch (error) {
    console.warn('Portfolio content could not load: ' + name, error);
  }
}

for (const [name, render] of Object.entries(editors)) {
  void loadContent(name, render);
}
