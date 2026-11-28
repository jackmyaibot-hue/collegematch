import type { BioRecord } from './bio';

export const ROBOT_TAG = 'noindex, nofollow';

export function imageBody(bytes: Uint8Array, contentType: string): Response {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new Response(copy, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': ROBOT_TAG,
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    },
  });
}

export function imageMissing(status = 404): Response {
  return new Response('Not found', {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': ROBOT_TAG, 'Cache-Control': 'no-store' },
  });
}

export const PRIVATE_PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': ROBOT_TAG,
  'Referrer-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    if (character === '&') return '&amp;';
    if (character === '<') return '&lt;';
    if (character === '>') return '&gt;';
    if (character === '"') return '&quot;';
    return '&#39;';
  });
}

const CSS = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #d9d3c7; color: #17211c; font-family: "Avenir Next", "Segoe UI", sans-serif; }
  a { color: #0f7a45; }
  .sheet { max-width: 720px; margin: 0 auto; background: #f3f0e8; min-height: 100vh; }
  .top { background: #0c3b2c; color: #f4f1ea; padding: 28px 24px 72px; }
  .brand { margin: 0 0 18px; letter-spacing: 0.14em; text-transform: uppercase; font-size: 12px; color: #d8f26a; }
  .logo { display: inline-flex; margin-bottom: 22px; }
  .logo img { height: 44px; width: auto; display: block; }
  .cta { margin-top: 8px; background: #0c3b2c; color: #f4f1ea; border-radius: 24px; padding: 22px 20px; }
  .cta h2 { color: #f4f1ea; margin: 0 0 6px; }
  .cta p { margin: 0 0 16px; color: #d5e6dc; }
  .cta a { display: inline-block; background: #d8f26a; color: #0c3b2c; text-decoration: none; font-weight: 700; border-radius: 999px; padding: 14px 18px; }
  .made { margin-top: 18px; }
  .kicker { margin: 0; font-size: 14px; color: #d5e6dc; }
  h1 { font-family: Georgia, "Iowan Old Style", serif; font-size: 44px; line-height: 1.05; margin: 8px 0 10px; font-weight: 700; }
  .position { margin: 0; font-size: 20px; }
  .club { margin: 8px 0 0; color: #d5e6dc; }
  .hero { margin: -52px 20px 0; background: #fffcf7; border-radius: 28px; overflow: hidden; box-shadow: 0 16px 40px rgba(12, 59, 44, 0.12); }
  .photo, .monogram { width: 100%; aspect-ratio: 4 / 5; max-height: 460px; object-fit: cover; background: #146c43; display: block; }
  .monogram { display: grid; place-items: center; color: #d8f26a; font-family: Georgia, serif; font-size: 72px; }
  .body { padding: 22px 22px 48px; }
  .banner { margin: 0 0 18px; padding: 14px 16px; background: #d8f26a; border-radius: 16px; }
  .banner strong { display: block; margin-bottom: 4px; }
  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 0 0 22px; }
  .stat { background: #fffcf7; border-radius: 16px; padding: 12px 14px; }
  .stat span { display: block; color: #6e7c74; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
  .stat strong { display: block; margin-top: 4px; font-size: 18px; }
  h2 { font-family: Georgia, serif; font-size: 26px; margin: 8px 0 12px; }
  .about p { margin: 0 0 10px; line-height: 1.45; }
  .schools { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
  .schools li { background: #fffcf7; border-radius: 16px; padding: 12px 14px; }
  .schools strong { display: block; }
  .schools span { color: #3c4a43; font-size: 14px; }
  .approve { margin-top: 8px; }
  button { width: 100%; border: 0; border-radius: 999px; background: #0c3b2c; color: #f4f1ea; font: 600 18px/1 "Avenir Next", "Segoe UI", sans-serif; padding: 16px 18px; cursor: pointer; }
  .fine { color: #3c4a43; font-size: 14px; line-height: 1.45; }
  footer { margin-top: 28px; color: #6e7c74; font-size: 13px; line-height: 1.45; }
  .notice { padding: 48px 24px 64px; }
  .doc { padding: 28px 24px 64px; max-width: 720px; margin: 0 auto; }
  .doc h1 { font-size: 36px; color: #0c3b2c; }
  .doc h2 { font-size: 22px; }
  .doc p, .doc li { line-height: 1.5; }
`;

function shell(title: string, body: string, robots: boolean, extraHead = ''): string {
  const robotMeta = robots ? `<meta name="robots" content="${ROBOT_TAG}" />` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${robotMeta}
  <meta name="referrer" content="same-origin" />
  ${extraHead}
  <title>${escapeHtml(title)}</title>
  <style>${CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? 'C') + (parts[1]?.[0] ?? '');
}

function stat(label: string, value: string): string {
  if (!value) return '';
  return `<div class="stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function growthBlock(): string {
  return `<section class="cta">
    <h2>Get recruited.</h2>
    <p>Build your free CollegeMatch profile.</p>
    <a href="/?ref=bio">Start my profile</a>
  </section>`;
}

function brandHeader(): string {
  return `<a class="logo" href="/?ref=bio"><img src="/brand/logo.svg" alt="CollegeMatch" /></a>`;
}

function bioArticle(record: BioRecord, photoSrc: string | null, extra: string, showGrowth: boolean): string {
  const snap = record.snapshot;
  const portrait = photoSrc
    ? `<img class="photo" src="${escapeHtml(photoSrc)}" alt="${escapeHtml(snap.name)}" />`
    : `<div class="monogram" aria-hidden="true">${escapeHtml(initials(snap.name).toUpperCase())}</div>`;
  const about = [
    snap.majors ? `<p><strong>Majors.</strong> ${escapeHtml(snap.majors)}</p>` : '',
    snap.honors ? `<p><strong>Honors.</strong> ${escapeHtml(snap.honors)}</p>` : '',
    snap.proudOf ? `<p><strong>Proud of.</strong> ${escapeHtml(snap.proudOf)}</p>` : '',
    snap.funFact ? `<p><strong>Fun fact.</strong> ${escapeHtml(snap.funFact)}</p>` : '',
    snap.highlightUrl
      ? `<p><a href="${escapeHtml(snap.highlightUrl)}" rel="noopener noreferrer">Watch highlights</a></p>`
      : '',
  ].join('');
  const schools =
    snap.colleges.length > 0
      ? `<ul class="schools">${snap.colleges
          .map((college) => {
            const detail = [college.division, college.place].filter(Boolean).join(' · ');
            return `<li><strong>${escapeHtml(college.name)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ''}</li>`;
          })
          .join('')}</ul>`
      : '<p class="fine">No colleges saved yet.</p>';
  const club = [snap.club, snap.leagues].filter(Boolean).join(' · ');
  return `<div class="sheet">
  <header class="top">
    ${brandHeader()}
    <p class="kicker">Class of ${snap.gradYear} · ${escapeHtml(snap.sportLabel)}</p>
    <h1>${escapeHtml(snap.name)}</h1>
    <p class="position">${escapeHtml(snap.position)}</p>
    ${club ? `<p class="club">${escapeHtml(club)}</p>` : ''}
  </header>
  <div class="hero">${portrait}</div>
  <div class="body">
    ${extra}
    <section class="stats">
      ${stat('Jersey', snap.jersey)}
      ${stat('Foot', snap.foot)}
      ${stat('Years at level', snap.yearsAtLevel)}
      ${stat('Height', snap.height)}
      ${stat('GPA', snap.gpa)}
      ${stat('Home', snap.homeState)}
    </section>
    ${about ? `<section class="about"><h2>About</h2>${about}</section>` : ''}
    <section>
      <h2>Colleges they're watching</h2>
      ${schools}
    </section>
    ${showGrowth ? growthBlock() : ''}
    <footer>
      <p>This page is not listed for search engines. Anyone with the link can view it after a parent approves.</p>
      ${showGrowth ? '<p class="made"><a href="/?ref=bio">Made with CollegeMatch</a></p>' : ''}
      <p><a href="/privacy">Privacy policy</a></p>
    </footer>
  </div>
</div>`;
}

export function renderPublicBio(record: BioRecord, origin = 'https://collegematch.expo.app'): string {
  const photo = record.photo ? `/bio/${record.slug}/photo` : null;
  const snap = record.snapshot;
  const title = `${snap.name} · ${snap.position} · Class of ${snap.gradYear}`;
  const description = `${snap.name} plays ${snap.sportLabel.toLowerCase()}${snap.club ? ` for ${snap.club}` : ''}. A CollegeMatch recruiting bio.`;
  const pageUrl = `${origin.replace(/\/$/, '')}/bio/${record.slug}`;
  const image = `${origin.replace(/\/$/, '')}/brand/og.png`;
  const extraHead = [
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  ].join('\n  ');
  return shell(title, bioArticle(record, photo, '', true), true, extraHead);
}

export function renderPreview(record: BioRecord, token: string): string {
  const photo = record.photo ? `/approve/${token}/photo` : null;
  const banner = `<div class="banner"><strong>Not public yet.</strong> This is the page coaches would see. Nothing is viewable at the public link until you approve.</div>
    <form class="approve" method="POST" action="/approve/${escapeHtml(token)}">
      <button type="submit">Approve and publish</button>
      <p class="fine">Approving makes this page and photo available to anyone with the link. Only the player can take it down later. This link works once and expires in 72 hours.</p>
    </form>`;
  return shell(`Approve ${record.snapshot.name} · CollegeMatch`, bioArticle(record, photo, banner, false), true);
}

export function renderApproved(record: BioRecord, origin: string): string {
  const url = `${origin.replace(/\/$/, '')}/bio/${record.slug}`;
  return shell(
    'Bio approved · CollegeMatch',
    `<main class="sheet notice">
      <p class="brand">CollegeMatch</p>
      <h1>Approved.</h1>
      <p>${escapeHtml(record.snapshot.name)}'s bio is now public for anyone with the link.</p>
      <p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
      <p class="fine">Only the player can unpublish it, from the CollegeMatch app. That deletes the page and the photo.</p>
      <p><a href="/privacy">Privacy policy</a></p>
    </main>`,
    true,
  );
}

export function renderMissing(title: string, message: string): string {
  return shell(
    `${title} · CollegeMatch`,
    `<main class="sheet notice">
      <p class="brand">CollegeMatch</p>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <p><a href="/privacy">Privacy policy</a></p>
    </main>`,
    true,
  );
}

export function renderPrivacyPage(): string {
  return shell(
    'Privacy policy · CollegeMatch',
    `<main class="doc">
      <p class="brand">CollegeMatch</p>
      <h1>Privacy policy</h1>
      <p>Updated November 26, 2026.</p>
      <p>CollegeMatch is a free app for high school athletes looking at college programs. Many of them are minors. This page says what stays on the phone, what a published bio stores on the server, and how a parent approves it.</p>
      <h2>What stays on the phone</h2>
      <p>The profile is saved on the device. That includes the name, birthday, gender, sport, positions, club, leagues, stats, grades, test scores, home state, preferences, honors, highlight link, the colleges they save or pass, and the parent or guardian email. Coach email drafts open in the device's mail app. The parent email is copied on those drafts. It stays on the phone until the player publishes a bio.</p>
      <p>A player can also make a social image on the phone for Instagram or TikTok. That image is not uploaded. It leaves the phone only if the player saves or shares it, and it does not include contact details or a link to a private bio.</p>
      <p>There is no account and no password. A random secret stays on the device so only that device can publish or unpublish.</p>
      <h2>Parent email</h2>
      <p>Signup asks for a parent or guardian email, and it can be edited in the profile. Publishing sends that address to our server so we can email a one-time approval link. The address is not shown on the public page or on the athletic resume. A connected email provider receives the address and the approval message only when the player publishes. We do not use it for marketing.</p>
      <h2>What a published bio stores</h2>
      <p>When a player taps Publish, the server stores a bio record: name, sport, positions, graduation year, club, leagues, jersey number, dominant foot, years at that level, height, GPA, home state, majors, a short honors line, what they are proud of, a fun fact, the highlight link, and the colleges saved at that moment. It also stores the parent email, a hash of the device secret, and a hash of the approval token. The birthday and coach names and contacts are not stored on the server.</p>
      <h2>Photos</h2>
      <p>An optional photo is uploaded with the bio and stored on the server, capped at 500KB. It is not publicly viewable until a parent approves. Unpublish deletes the photo from the server. Records and photos are kept in our Redis database (Upstash) under keys separate from anonymous usage counts. If that store is not configured, a local development server keeps them in memory only.</p>
      <h2>Approval</h2>
      <p>Publish creates a pending bio and a single-use approval link that expires after 72 hours. The parent opens the link from the email, sees a preview, and taps Approve. Until that happens, the public link and the photo link do not show the bio. Using the link or letting it expire burns it. Sending another email replaces the old link. Emails are rate limited.</p>
      <p>The email is sent through a provider interface. Until an email account is connected, the app uses a development sender that logs the link and shows it to the player instead of delivering a message.</p>
      <h2>Who can see a bio</h2>
      <p>After approval, anyone with the link can view the page without logging in. Search engines are asked not to index it: the page sends a noindex, nofollow meta tag and an X-Robots-Tag header, and robots.txt disallows the bio and approval paths. That is a request to crawlers, not a lock.</p>
      <h2>Unpublish and deletion</h2>
      <p>Only the player can unpublish, from the profile tab on the device that published. Unpublish deletes the bio record and the photo from the server. A parent cannot take the page down. Start over tries to unpublish first, then erases the profile from the phone. If the server cannot be reached, the phone profile is kept so the player can try again.</p>
      <h2>Anonymous counts</h2>
      <p>The app also sends anonymous usage counts (opens, completed profiles, swipes, saves, and drafted coach emails) with a random install id. Those counts are not tied to a name, email, phone number, or bio. Daily install ids expire after 40 days. There is no ad SDK and no third-party tracker.</p>
      <h2>What we do not do</h2>
      <p>We do not sell personal information.</p>
      <p><a href="/">Back to CollegeMatch</a></p>
    </main>`,
    false,
  );
}

export const ROBOTS_TXT = `User-agent: *
Disallow: /bio/
Disallow: /approve/
`;
