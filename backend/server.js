require('dotenv').config({ path: __dirname + '/.env' });
const express     = require('express');
const compression = require('compression');
const cors        = require('cors');
const path        = require('path');
const fs          = require('fs');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');

// ── Başlangıç ortam değişkeni kontrolü ──────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('❌ HATA: JWT_SECRET ortam değişkeni tanımlı değil.');
  console.error('   backend/.env dosyasını oluşturun ve JWT_SECRET=<güvenli_dizi> ekleyin.');
  process.exit(1);
}

const app  = express();

// Railway/reverse proxy arkasında X-Forwarded-For başlığına güven
// (express-rate-limit v7 aksi halde ValidationError üretir; login ve iletişim formu 500'e düşer)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;

const SITE           = 'https://antalyadiscephe.com';
const ORG_ID         = 'https://antalyadiscephe.com/#organization';
const STATIC_LASTMOD = '2026-08-07'; // Statik sayfalar için sabit lastmod — her istekte new Date() ÜRETME
const FRONTEND_DIR   = path.resolve(__dirname, '../frontend');
const NOT_FOUND_PAGE = path.resolve(FRONTEND_DIR, '404.html');

// ── Canonical host middleware (EN BAŞTA) ─────────────────────────────────────
// http → https ve www → apex 301 yönlendirmesi (localhost hariç)
app.use((req, res, next) => {
  const host = String(req.headers.host || '').toLowerCase();
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]')) {
    return next();
  }
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  if (proto !== 'https' || host.startsWith('www.')) {
    return res.redirect(301, `${SITE}${req.originalUrl}`);
  }
  next();
});

app.use(compression());

// ── Güvenlik başlıkları (helmet) ─────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc    : ["'self'"],
      scriptSrc     : ["'self'", "'unsafe-inline'"],   // inline <script> blokları için
      scriptSrcAttr : ["'unsafe-inline'"],             // onclick, onsubmit vb. inline event handler'lar için
      styleSrc      : ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
      fontSrc       : ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc        : ["'self'", 'data:', 'blob:', 'https://www.instagram.com', '*.cdninstagram.com', '*.fbcdn.net', 'https://images.unsplash.com', 'https://placehold.co'],
      connectSrc    : ["'self'"],
      frameSrc      : ["https://www.google.com", "https://maps.google.com", "https://www.google.com/maps/"],
      objectSrc     : ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Instagram CDN görselleri için
}));

// ── CORS — sadece kendi origin'e izin ver ─────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || `http://localhost:${PORT}`)
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // origin yoksa (curl, Postman, same-origin) → izin ver
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS: İzin verilmeyen kaynak.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body boyut sınırı + Parser ────────────────────────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ── /admin altındaki TÜM yanıtlara noindex başlığı ──────────────────────────
app.use('/admin', (req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

// ── Login brute-force koruması ───────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 10,                   // pencere başına maks 10 deneme
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
  skipSuccessfulRequests: true,
});

// ── İletişim formu spam koruması ─────────────────────────────────────────────
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 5,                    // saatte maks 5 mesaj
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla mesaj gönderdiniz. Lütfen daha sonra tekrar deneyin.' },
});

const db = require('./database');

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// JSON-LD'yi <script> içine güvenle gömmek için
function jsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

// 404 sayfası gönderici (noindex meta'lı frontend/404.html)
function send404(req, res) {
  res.status(404);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (fs.existsSync(NOT_FOUND_PAGE)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(NOT_FOUND_PAGE);
  }
  return res.type('text/plain').send('404 - Sayfa bulunamadı');
}

// Paragraf listesi üret (SSR gövde enjeksiyonu için)
function toParagraphs(text, style) {
  return String(text || '')
    .split(/\r?\n+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(p => `<p${style ? ` style="${style}"` : ''}>${escapeHtml(p)}</p>`)
    .join('\n');
}

// Şablon head'inden statik canonical + og:* + twitter:* etiketlerini söker,
// sayfaya özel title/description/canonical/OG setini enjekte eder.
function injectHeadMeta(html, { pageTitle, description, canonicalUrl, imageUrl, ogType, extraHead }) {
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

  if (/<meta name="description"/i.test(html)) {
    html = html.replace(/<meta name="description"[^>]*\/?>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
  } else {
    html = html.replace('</head>', `  <meta name="description" content="${escapeHtml(description)}" />\n</head>`);
  }

  // Statik canonical + MEVCUT og:image/twitter:image dahil tüm og:*/twitter:* etiketlerini kaldır (tek OG seti kalsın)
  html = html.replace(/[ \t]*<link rel="canonical"[^>]*\/?>\r?\n?/gi, '');
  html = html.replace(/[ \t]*<meta property="og:[^"]*"[^>]*\/?>\r?\n?/gi, '');
  html = html.replace(/[ \t]*<meta name="twitter:[^"]*"[^>]*\/?>\r?\n?/gi, '');

  const seoBlock = `
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:title" content="${escapeHtml(pageTitle)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:type" content="${ogType || 'article'}" />
  <meta property="og:site_name" content="Akdeniz Yapı Dekorasyon" />
  <meta property="og:locale" content="tr_TR" />
  <meta property="og:image" content="${imageUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${imageUrl}" />
${extraHead || ''}`;

  return html.replace('</head>', `${seoBlock}\n</head>`);
}

// <!-- SSR:CONTENT --> ... <!-- /SSR:CONTENT --> arasını sunucu içeriğiyle değiştirir
function injectSsrContent(html, content) {
  return html.replace(
    /<!-- SSR:CONTENT -->[\s\S]*?<!-- \/SSR:CONTENT -->/,
    () => `<!-- SSR:CONTENT -->\n${content}\n        <!-- /SSR:CONTENT -->`
  );
}

// ── LLMS.txt & LLMS-FULL.txt (Yapay Zeka & Agent Erişilebilirliği) ─────────
app.get('/llms.txt', (req, res) => {
  const filePath = path.resolve(FRONTEND_DIR, 'llms.txt');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.sendFile(filePath);
  }
  res.status(404).send('Not Found');
});

app.get('/llms-full.txt', (req, res) => {
  const filePath = path.resolve(FRONTEND_DIR, 'llms-full.txt');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.sendFile(filePath);
  }
  res.status(404).send('Not Found');
});

// ── Dinamik Sitemap (XML) ───────────────────────────────────────────────────
app.get('/sitemap.xml', async (req, res) => {
  try {
    let services = [];
    try {
      services = await db.allAsync('SELECT slug, created_at FROM services ORDER BY id DESC');
    } catch (_) { services = []; }

    let projects = [];
    try {
      projects = db.allRowsAsync
        ? await db.allRowsAsync('SELECT slug, created_at FROM projects WHERE slug IS NOT NULL ORDER BY id DESC')
        : [];
    } catch (_) { projects = []; }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Statik sayfalar — sabit lastmod (her istekte değişmez)
    const staticPages = [
      { loc: `${SITE}/`,                            priority: '1.0', changefreq: 'weekly'  },
      { loc: `${SITE}/antalya-mantolama-fiyatlari.html`, priority: '0.9', changefreq: 'weekly' },
      { loc: `${SITE}/antalya-boya-badana.html`,    priority: '0.9', changefreq: 'weekly'  },
      { loc: `${SITE}/antalya-sove-kaplama.html`,   priority: '0.9', changefreq: 'weekly'  },
      { loc: `${SITE}/hizmetler.html`,              priority: '0.9', changefreq: 'monthly' },
      { loc: `${SITE}/referanslar.html`,            priority: '0.8', changefreq: 'monthly' },
      { loc: `${SITE}/kampanyalar.html`,            priority: '0.8', changefreq: 'weekly'  },
      { loc: `${SITE}/isi-yalitimi-antalya.html`,   priority: '0.8', changefreq: 'monthly' },
      { loc: `${SITE}/kepez-mantolama.html`,        priority: '0.8', changefreq: 'monthly' },
      { loc: `${SITE}/muratpasa-mantolama.html`,    priority: '0.8', changefreq: 'monthly' },
      { loc: `${SITE}/konyaalti-mantolama.html`,    priority: '0.8', changefreq: 'monthly' },
      { loc: `${SITE}/dosemealti-mantolama.html`,   priority: '0.8', changefreq: 'monthly' },
      { loc: `${SITE}/aksu-mantolama.html`,         priority: '0.8', changefreq: 'monthly' },
      { loc: `${SITE}/lara-mantolama.html`,         priority: '0.8', changefreq: 'monthly' },
      { loc: `${SITE}/serik-isi-yalitimi.html`,     priority: '0.8', changefreq: 'monthly' },
      { loc: `${SITE}/iletisim.html`,               priority: '0.7', changefreq: 'monthly' },
    ];

    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${page.loc}</loc>\n`;
      xml += `    <lastmod>${STATIC_LASTMOD}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Hizmet detayları (DB)
    if (Array.isArray(services)) {
      for (const s of services) {
        if (!s || !s.slug) continue;
        const date = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : STATIC_LASTMOD;
        xml += `  <url>\n`;
        xml += `    <loc>${SITE}/hizmetler/${escapeHtml(s.slug)}</loc>\n`;
        xml += `    <lastmod>${date}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    // Referans projeleri (DB)
    if (Array.isArray(projects)) {
      for (const p of projects) {
        if (!p || !p.slug) continue;
        const date = p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : STATIC_LASTMOD;
        xml += `  <url>\n`;
        xml += `    <loc>${SITE}/referanslar/${escapeHtml(p.slug)}</loc>\n`;
        xml += `    <lastmod>${date}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('Sitemap üretilirken hata oluştu.');
  }
});

// ── /index.html → / (301) ────────────────────────────────────────────────────
app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

// ── 301 Permanent Redirect (Eski query parametreli linkler için) ──────────────
app.get('/hizmet-detay.html', (req, res) => {
  const slug = req.query.slug || req.query.id;
  if (slug) {
    return res.redirect(301, `/hizmetler/${encodeURIComponent(slug)}`);
  }
  return res.redirect(301, '/hizmetler.html');
});

app.get('/referans-detay.html', (req, res) => {
  const slug = req.query.slug || req.query.id;
  if (slug) {
    return res.redirect(301, `/referanslar/${encodeURIComponent(slug)}`);
  }
  return res.redirect(301, '/referanslar.html');
});

// ── Clean URL Route (/hizmetler/:slug) — SSR meta + gövde + JSON-LD ──────────
app.get('/hizmetler/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const isNum = /^\d+$/.test(slug);
    let service = null;
    try {
      service = isNum
        ? await db.getAsync(`
            SELECT s.*, c.name as category_name, c.icon as category_icon
            FROM services s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.id = ?
          `, [slug])
        : await db.getAsync(`
            SELECT s.*, c.name as category_name, c.icon as category_icon
            FROM services s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.slug = ?
          `, [slug]);
    } catch (_) { service = null; }

    // Bilinmeyen slug/id → 404 (noindex sayfa)
    if (!service) return send404(req, res);

    // Sayısal legacy id ile gelindiyse ve slug varsa → canonical URL'ye 301
    if (isNum && service.slug) {
      return res.redirect(301, `/hizmetler/${encodeURIComponent(service.slug)}`);
    }

    const filePath = path.resolve(FRONTEND_DIR, 'hizmet-detay.html');
    if (!fs.existsSync(filePath)) return next();

    let html = fs.readFileSync(filePath, 'utf8');

    const isDisCephe = service.slug === 'dis-cephe-isi-yalitimi';
    const pageTitle = isDisCephe
      ? 'Dış Cephe Isı Yalıtımı ve EPS Mantolama Teknik Şartnamesi | Akdeniz Yapı'
      : `Antalya ${service.title} | Akdeniz Yapı Dekorasyon`;
    const cleanDesc = isDisCephe
      ? 'EPS ve taşyünü dış cephe ısı yalıtımı teknik uygulama şartnamesi, malzeme standartları, yapıştırma, dübel ve fileli sıva uygulama kuralları.'
      : (service.short_desc
        ? service.short_desc.replace(/\s+/g, ' ').trim()
        : `Antalya ${service.title} hizmeti. Akdeniz Yapı Dekorasyon güvencesiyle profesyonel uygulamalar ve kaliteli çözümler.`);
    const canonicalUrl = isDisCephe ? `${SITE}/` : `${SITE}/hizmetler/${service.slug}`;
    const imageUrl = service.image
      ? (service.image.startsWith('http') ? service.image : `${SITE}${service.image}`)
      : `${SITE}/images/og-banner.png`;

    // Service + BreadcrumbList JSON-LD (sunucu tarafı)
    const serviceLd = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': isDisCephe ? 'Dış Cephe Isı Yalıtımı Teknik Şartnamesi' : `Antalya ${service.title}`,
      'serviceType': service.title,
      'description': cleanDesc,
      'url': canonicalUrl,
      'image': imageUrl,
      'areaServed': { '@type': 'City', 'name': 'Antalya' },
      'provider': { '@id': ORG_ID },
    };
    const breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Ana Sayfa',  'item': `${SITE}/` },
        { '@type': 'ListItem', 'position': 2, 'name': 'Hizmetler',  'item': `${SITE}/hizmetler.html` },
        { '@type': 'ListItem', 'position': 3, 'name': isDisCephe ? 'Teknik Şartname' : `Antalya ${service.title}`, 'item': `${SITE}/hizmetler/${service.slug}` },
      ],
    };
    const extraHead =
      `  <script type="application/ld+json">${jsonLd(serviceLd)}</script>\n` +
      `  <script type="application/ld+json">${jsonLd(breadcrumbLd)}</script>`;

    html = injectHeadMeta(html, {
      pageTitle,
      description: cleanDesc,
      canonicalUrl,
      imageUrl,
      ogType: 'article',
      extraHead,
    });

    // Gövde SSR: breadcrumb + h1 + içerik konteyneri (JS yüklenince üstüne yazar)
    const safeTitle = isDisCephe ? 'Dış Cephe Isı Yalıtımı ve EPS Mantolama Teknik Şartnamesi' : escapeHtml(service.title);
    html = html.replace(/(<span id="breadcrumbTitle">)[\s\S]*?(<\/span>)/, (m, a, b) => `${a}${safeTitle}${b}`);
    html = html.replace(/(<h1 id="pageHeroTitle">)[\s\S]*?(<\/h1>)/, (m, a, b) => `${a}${isDisCephe ? safeTitle : 'Antalya ' + safeTitle}${b}`);

    const shortHtml = service.short_desc
      ? `<p style="font-size:1.05rem;color:var(--text2);margin-bottom:20px;line-height:1.7;">${escapeHtml(service.short_desc)}</p>`
      : '';
    const descHtml = toParagraphs(service.description, 'margin-bottom:12px;');
    const pillarLinkHtml = isDisCephe
      ? `<div style="background:#fdf8ee;border:1px solid rgba(201,162,39,.35);border-radius:12px;padding:16px 20px;margin-bottom:20px;font-size:.92rem;color:var(--text2);line-height:1.6;">
          <strong>💡 Bilgilendirme:</strong> Bu sayfa dış cephe ısı yalıtımında uygulanan resmi teknik şartname ve uygulama adımlarını içermektedir. Antalya genelinde bina keşfi, anahtar teslim teklif ve garantili çözümlerimiz için lütfen <a href="/" style="color:var(--gold);font-weight:700;">Antalya mantolama</a> ve dış cephe yalıtımı ana sayfamızı ziyaret ediniz.
        </div>`
      : '';
    const ssrContent = `        <div class="detay-image">
          <img src="${imageUrl}" alt="Antalya ${safeTitle} uygulaması - Akdeniz Yapı Dekorasyon" width="800" height="420" style="width:100%;height:100%;object-fit:cover;border-radius:16px;" />
        </div>
        <div class="detay-body">
          <h2 class="detay-title" style="font-size:1.8rem;font-weight:700;margin-bottom:16px;color:var(--gold);">${safeTitle}</h2>
          ${service.category_name ? `<span class="badge-gold" style="display:inline-block;margin-bottom:16px;">${escapeHtml(service.category_name)}</span>` : ''}
          ${pillarLinkHtml}
          ${shortHtml}
          <div class="detay-desc">${descHtml}</div>
          <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:32px;">
            <a href="tel:05309361017" class="btn btn-gold"><i class="fas fa-phone"></i> Bilgi Al</a>
            <a href="https://wa.me/905309361017" target="_blank" rel="noopener" class="btn btn-whatsapp"><i class="fab fa-whatsapp"></i> WhatsApp</a>
          </div>
        </div>`;
    html = injectSsrContent(html, ssrContent);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  } catch (err) {
    console.error('Hizmet detay SSR hatası:', err);
    next(err);
  }
});

// ── Clean URL Route (/referanslar/:slug) — SSR meta + gövde ──────────────────
app.get('/referanslar/:slug', async (req, res, next) => {
  try {
    const val = req.params.slug;
    const isNum = /^\d+$/.test(val);
    let project = null;
    try {
      project = isNum
        ? await db.getAsync('SELECT * FROM projects WHERE id = ?', [val])
        : await db.getAsync('SELECT * FROM projects WHERE slug = ?', [val]);
    } catch (_) { project = null; }

    // Bilinmeyen slug → 404 (noindex sayfa)
    if (!project) return send404(req, res);

    // Sayısal id ile gelindiyse ve slug varsa → canonical URL'ye 301
    if (isNum && project.slug) {
      return res.redirect(301, `/referanslar/${encodeURIComponent(project.slug)}`);
    }

    const filePath = path.resolve(FRONTEND_DIR, 'referans-detay.html');
    if (!fs.existsSync(filePath)) return next();

    let html = fs.readFileSync(filePath, 'utf8');

    const pageTitle = `${project.title} | Akdeniz Yapı Dekorasyon Referans Projesi`;
    const cleanDesc = (project.description
      ? project.description.replace(/\s+/g, ' ').trim()
      : `${project.title} - Akdeniz Yapı Dekorasyon tarafından tamamlanan referans proje.`)
      + (project.location ? ` (${project.location})` : '');
    const canonicalUrl = `${SITE}/referanslar/${encodeURIComponent(project.slug || project.id)}`;
    const imageUrl = project.image
      ? (project.image.startsWith('http') ? project.image : `${SITE}${project.image}`)
      : `${SITE}/images/og-banner.png`;

    const breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Ana Sayfa',   'item': `${SITE}/` },
        { '@type': 'ListItem', 'position': 2, 'name': 'Referanslar', 'item': `${SITE}/referanslar.html` },
        { '@type': 'ListItem', 'position': 3, 'name': project.title, 'item': canonicalUrl },
      ],
    };
    const extraHead = `  <script type="application/ld+json">${jsonLd(breadcrumbLd)}</script>`;

    html = injectHeadMeta(html, {
      pageTitle,
      description: cleanDesc,
      canonicalUrl,
      imageUrl,
      ogType: 'article',
      extraHead,
    });

    // Gövde SSR: breadcrumb + h1 + alt başlık + içerik (JS yüklenince üstüne yazar)
    const safeTitle = escapeHtml(project.title);
    html = html.replace(/(<span id="breadTitle">)[\s\S]*?(<\/span>)/, (m, a, b) => `${a}${safeTitle}${b}`);
    html = html.replace(/(<h1 id="heroTitle"[^>]*>)[\s\S]*?(<\/h1>)/, (m, a, b) => `${a}${safeTitle}${b}`);
    if (project.location) {
      const subHtml = `<i class="fas fa-map-marker-alt"></i> ${escapeHtml(project.location)}` +
        (project.year ? ` &nbsp;·&nbsp; <i class="fas fa-calendar"></i> ${escapeHtml(String(project.year))}` : '');
      html = html.replace(/(<p id="heroSub"[^>]*>)[\s\S]*?(<\/p>)/, (m, a, b) => `${a}${subHtml}${b}`);
    }

    const detailHtml = toParagraphs(project.detail_text);
    const ssrContent = `            <img src="${imageUrl}" alt="${safeTitle} - Akdeniz Yapı Dekorasyon referans projesi" class="detay-hero-img" width="1200" height="675" />
            <div style="margin-top:28px;">
              <h2 style="font-family:'Montserrat',sans-serif;font-size:1.25rem;font-weight:800;margin-bottom:12px;">Proje Hakkında</h2>
              ${project.description ? `<p style="color:var(--text2);line-height:1.8;font-size:.95rem;">${escapeHtml(project.description)}</p>` : ''}
              ${detailHtml ? `<div style="color:var(--text2);line-height:1.8;font-size:.92rem;margin-top:12px;">${detailHtml}</div>` : ''}
            </div>`;
    html = injectSsrContent(html, ssrContent);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  } catch (err) {
    console.error('Referans detay SSR hatası:', err);
    next(err);
  }
});

// ── Statik dosyalar (cache politikası: görsel/css/js/font 30 gün, HTML no-cache) ─
const LONG_CACHE_RE = /\.(?:png|jpe?g|webp|gif|svg|ico|jfif|css|js|mjs|woff2?|ttf|otf|eot)$/i;
function staticCacheHeaders(res, filePath) {
  if (/\.html?$/i.test(filePath)) {
    res.setHeader('Cache-Control', 'no-cache');
  } else if (!LONG_CACHE_RE.test(filePath)) {
    // txt, xml vb. — güncel kalsın
    res.setHeader('Cache-Control', 'no-cache');
  }
  // LONG_CACHE_RE eşleşenler maxAge: '30d' ile gelir
}

// ── 301 Kalıcı Yönlendirmeler (SEO Canonical URL Konsolidasyonu) ─────────────
app.get('/kepez-isi-yalitimi.html', (req, res) => {
  return res.redirect(301, '/kepez-mantolama.html');
});
app.get('/konyaalti-dis-cephe.html', (req, res) => {
  return res.redirect(301, '/konyaalti-mantolama.html');
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '30d' }));
app.use(express.static(FRONTEND_DIR, { maxAge: '30d', setHeaders: staticCacheHeaders }));
app.use('/admin', express.static(path.join(__dirname, '../admin'), { setHeaders: staticCacheHeaders }));

// ── API Route'ları ───────────────────────────────────────────────────────────
app.use('/api/auth/login',       loginLimiter);
app.use('/api/messages',         contactLimiter);  // Önce rate-limit, sonra router
app.use('/api/auth',             require('./routes/auth'));
app.use('/api/categories',       require('./routes/categories'));
app.use('/api/services',         require('./routes/services'));
app.use('/api/projects',         require('./routes/projects'));
app.use('/api/messages',         require('./routes/messages'));
app.use('/api/settings',         require('./routes/settings'));
app.use('/api/campaigns',        require('./routes/campaigns'));
app.use('/api/instagram-feed',   require('./routes/instagram'));

// ── Admin panel fallback — Path Traversal korumalı ──────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../admin/login.html'));
});

app.get('/admin/*', (req, res) => {
  // path.resolve ile normalize et, admin klasörü dışına çıkmayı engelle
  const adminRoot = path.resolve(__dirname, '../admin');
  const requested = req.path.replace(/^\/admin\//, '');

  // Boş veya tehlikeli karakter içeriyorsa reddet
  if (!requested || /[^a-zA-Z0-9._-]/.test(requested)) {
    return res.sendFile(path.resolve(adminRoot, 'login.html'));
  }

  const filePath = path.resolve(adminRoot, requested);

  // Çözümlenmiş yol adminRoot içinde mi kontrol et (path traversal önlemi)
  if (!filePath.startsWith(adminRoot + path.sep) && filePath !== adminRoot) {
    return res.status(403).send('Forbidden');
  }

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.resolve(adminRoot, 'login.html'));
  }
});

// ── 404 — buraya düşen her istek statik dosyalarca karşılanamamıştır ─────────
app.get('*', (req, res) => {
  // Uzantılı istekler (görsel/css/js vb.): dosya yoksa sade 404 döndür
  if (/\.(png|jpe?g|webp|gif|svg|css|js|ico|txt|xml|jfif|woff2?)$/i.test(req.path)) {
    return res.status(404).type('text/plain').send('404 Not Found');
  }
  // Bilinen HTML sayfaları express.static tarafından servis edilir;
  // buraya düşen tüm diğer yollar → 404 sayfası
  return send404(req, res);
});

// ── Genel hata yönetimi ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Dosya boyutu 5MB\'ı aşamaz.' });
  }
  if (err.message === 'CORS: İzin verilmeyen kaynak.') {
    return res.status(403).json({ error: err.message });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Sunucu hatası.' });
});

// ── Başlat ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Akdeniz Yapı Dekorasyon sunucusu çalışıyor`);
  console.log(`   → http://localhost:${PORT}`);
  console.log(`   → http://localhost:${PORT}/admin\n`);
});
