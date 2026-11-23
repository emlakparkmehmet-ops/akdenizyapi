const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');
const { sendContactNotification } = require('../utils/mailer');

// ── Yapılandırma (.env üzerinden kontrol edilir) ────────────────────────────
const FREE_QUOTA_PER_IP = Math.max(1, parseInt(process.env.SIMULATOR_FREE_QUOTA || '3', 10) || 3);
const DAILY_GLOBAL_LIMIT = Math.max(10, parseInt(process.env.SIMULATOR_DAILY_LIMIT || '120', 10) || 120);
const GEMINI_IMAGE_MODEL = (process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image').trim();
const GEMINI_VISION_MODEL = (process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash').trim();
const REPLICATE_SAM_MODEL = (process.env.REPLICATE_SAM_MODEL || 'tmappdev/lang-segment-anything').trim();
const REPLICATE_SAM_VERSION = (process.env.REPLICATE_SAM_VERSION || '').trim();

// Yüklenen orijinal bina fotoğraflarının kalıcı saklama klasörü (Git'e girmez)
const STORAGE_DIR = path.resolve(__dirname, '../storage/simulator');
fs.mkdirSync(STORAGE_DIR, { recursive: true });

// ── Veritabanı tablosu (simulator_uploads) otomatik oluştur ─────────────────
(async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS simulator_uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_filename TEXT,
        original_file TEXT NOT NULL,
        model_file TEXT,
        wall_mask_file TEXT,
        trim_mask_file TEXT,
        style TEXT DEFAULT 'boya',
        pipeline TEXT DEFAULT 'pending',
        ip TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('[Simulate] Tablo oluşturma uyarısı:', err.message);
  }
})();

function getGeminiKey() {
  return (process.env.GEMINI_API_KEY || '').trim();
}

function getReplicateToken() {
  return (process.env.REPLICATE_API_TOKEN || '').trim();
}

// ── Bellek içi günlük kota ve IP hak takibi ─────────────────────────────────
const ipQuotaMap = new Map();
let dailyCounter = { day: new Date().toISOString().slice(0, 10), count: 0 };

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getClientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.ip || 'unknown';
}

function getIpState(ip) {
  const today = getTodayKey();
  if (dailyCounter.day !== today) {
    dailyCounter = { day: today, count: 0 };
    ipQuotaMap.clear();
  }
  const key = `${today}|${ip}`;
  if (!ipQuotaMap.has(key)) {
    ipQuotaMap.set(key, { used: 0, bonus: 0 });
  }
  return ipQuotaMap.get(key);
}

function getRemaining(ip) {
  const st = getIpState(ip);
  return Math.max(0, FREE_QUOTA_PER_IP + st.bonus - st.used);
}

// ── Rate-limit & Multer bellek yükleyici (orijinal kalite için 10 MB limit) ─
const simulateRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Saatlik simülasyon limitine ulaştınız. Lütfen biraz sonra tekrar deneyin.' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB orijinal telefon fotoğrafı
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(String(file.mimetype || '').toLowerCase())) {
      return cb(null, true);
    }
    cb(new Error('Sadece JPG, PNG veya WebP bina fotoğrafları yükleyebilirsiniz.'));
  },
});

function detectImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { mime: 'image/png', ext: 'png' };
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}

function sanitizeText(val, fallback, maxLen = 60) {
  const clean = String(val || '').replace(/[^\p{L}\p{N}\s\-().&#]/gu, '').trim();
  return (clean || fallback).slice(0, maxLen);
}

function makeFileStamp() {
  const d = new Date();
  const stamp = d.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const rand = crypto.randomBytes(4).toString('hex');
  return `${stamp}_${rand}`;
}

function saveBufferToStorage(prefix, ext, buf) {
  const fname = `${prefix}_${makeFileStamp()}.${ext}`;
  const fullPath = path.join(STORAGE_DIR, fname);
  fs.writeFileSync(fullPath, buf);
  return fname;
}

// ── Yardımcı 1: Gemini 2.5 Flash Image ile Tek Seferlik Temiz Mimari Maket ──
async function generateCleanArchitecturalModel(apiKey, base64Img, mimeType, style) {
  let trimInstruction =
    'Paint ALL existing window trim moldings (söve), window sills, and horizontal floor belt moldings (kat silmesi) in uniform crisp dark charcoal grey (#383D45) so they contrast sharply with the light neutral walls.';
  if (style === 'mantolama_sove') {
    trimInstruction =
      'Upgrade the facade with smooth fresh thermal-insulation plaster (mantolama) AND add clean, realistic beveled architectural EPS window frame trims (söve) around every window and clean horizontal floor belt moldings (kat silmesi), painted in uniform crisp dark charcoal grey (#383D45).';
  } else if (style === 'modern_antrasit') {
    trimInstruction =
      'Upgrade the facade into a clean modern architectural elevation with crisp geometric horizontal bands, balcony fascia lines, and window trim moldings painted in uniform crisp dark charcoal grey (#383D45).';
  }

  const prompt = [
    'You are an architectural facade standardization engine preparing a clean recolorable base model for an exterior paint simulator.',
    'Transform the uploaded building photo into a crisp, clean, evenly lit daylight architectural photograph of THE EXACT SAME BUILDING:',
    '1. EXTERIOR WALLS: Clean all stains, cracks, peeling paint, hanging wires, and harsh uneven shadow blotches. Paint ALL main exterior plaster/stucco walls in a completely uniform, clean matte neutral off-white / very light warm grey (#EAE7E0).',
    `2. SÖVE & TRIMS: ${trimInstruction}`,
    '3. STRICT GEOMETRY PRESERVATION: Keep the EXACT building silhouette, perspective, camera angle, number of floors, every window and glass reflection, shutters, doors, balcony railings, AC units, roof tiles, trees/plants, sky, ground, and neighboring context unchanged.',
    '4. LIGHTING: Keep soft, natural, realistic Mediterranean daylight shading and subtle architectural depth so the building looks 100% photorealistic — NOT flat cartoon.',
    '5. Do NOT add any text, labels, logos, or watermarks.',
  ].join('\n');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_IMAGE_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const apiRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Img } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    }),
  });

  const payload = await apiRes.json().catch(() => ({}));
  if (!apiRes.ok) {
    const msg = payload?.error?.message || `HTTP ${apiRes.status}`;
    return { ok: false, status: apiRes.status, error: msg };
  }

  for (const c of payload?.candidates || []) {
    for (const p of c?.content?.parts || []) {
      const inline = p.inlineData || p.inline_data;
      if (inline && inline.data) {
        const outMime = inline.mimeType || inline.mime_type || 'image/png';
        return {
          ok: true,
          mime: outMime,
          ext: outMime.includes('jpeg') ? 'jpg' : (outMime.includes('webp') ? 'webp' : 'png'),
          base64: inline.data,
          buffer: Buffer.from(inline.data, 'base64'),
          dataUrl: `data:${outMime};base64,${inline.data}`,
        };
      }
    }
  }
  return { ok: false, status: 422, error: 'Gemini görsel çıktısı üretmedi.' };
}

// ── Yardımcı 2: Replicate SAM2 / Grounded-SAM Piksel Maskeleme ──────────────
async function runReplicateMask(token, imageDataUri, textPrompt) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'wait=30',
  };

  let url;
  let body;
  if (REPLICATE_SAM_VERSION) {
    url = 'https://api.replicate.com/v1/predictions';
    body = {
      version: REPLICATE_SAM_VERSION,
      input: { image: imageDataUri, text_prompt: textPrompt },
    };
  } else {
    url = `https://api.replicate.com/v1/models/${REPLICATE_SAM_MODEL}/predictions`;
    body = {
      input: { image: imageDataUri, text_prompt: textPrompt },
    };
  }

  const createRes = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  let pred = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    return { ok: false, status: createRes.status, error: pred?.detail || `Replicate HTTP ${createRes.status}` };
  }

  // Eğer 30 sn içinde bitmediyse 15 saniyeye kadar poll et
  const pollUrl = pred?.urls?.get;
  let attempts = 0;
  while (pollUrl && (pred.status === 'starting' || pred.status === 'processing') && attempts < 12) {
    await new Promise((r) => setTimeout(r, 1500));
    const pRes = await fetch(pollUrl, { headers: { Authorization: `Bearer ${token}` } });
    pred = await pRes.json().catch(() => ({}));
    attempts++;
  }

  if (pred.status !== 'succeeded' || !pred.output) {
    return { ok: false, status: 502, error: pred?.error || `SAM2 durumu: ${pred.status || 'bilinmiyor'}` };
  }

  const outUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  if (typeof outUrl !== 'string' || !outUrl.startsWith('http')) {
    return { ok: false, status: 502, error: 'SAM2 geçerli maske URL döndürmedi.' };
  }

  const imgRes = await fetch(outUrl);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const mime = imgRes.headers.get('content-type') || 'image/png';
  return {
    ok: true,
    mime,
    buffer: buf,
    dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
  };
}

// ── Yardımcı 3: Gemini 2.5 Flash Vision Duvar/Pencere Analizi (Yedek) ───────
async function fetchGeminiWallHints(apiKey, base64Img, mimeType) {
  const prompt = [
    'Analyze this building exterior photograph and return ONLY valid JSON with normalized coordinates from 0 to 1000 (0=left/top, 1000=right/bottom):',
    '{',
    '  "isBuilding": true,',
    '  "buildingBox": [ymin, xmin, ymax, xmax],',
    '  "wallSeeds": [[x, y], ...],',
    '  "excludeBoxes": [[ymin, xmin, ymax, xmax], ...]',
    '}',
    'Rules:',
    '- isBuilding: false only if there is clearly no building exterior in the image.',
    '- wallSeeds: 6 to 10 points strictly on the main exterior painted plaster/stucco walls (avoid windows, sky, roof, trees, signs).',
    '- excludeBoxes: bounding boxes of windows, doors, roof, sky regions, shop signs, and large trees/bushes overlapping the building.',
    '- Output raw JSON only, no markdown fences.',
  ].join('\n');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_VISION_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const apiRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Img } },
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!apiRes.ok) return null;
  const payload = await apiRes.json().catch(() => ({}));
  const rawText = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed) return null;
  return {
    isBuilding: parsed.isBuilding !== false,
    buildingBox: Array.isArray(parsed.buildingBox) ? parsed.buildingBox : [80, 80, 920, 920],
    wallSeeds: Array.isArray(parsed.wallSeeds) ? parsed.wallSeeds.slice(0, 12) : [],
    excludeBoxes: Array.isArray(parsed.excludeBoxes) ? parsed.excludeBoxes.slice(0, 40) : [],
  };
}

// ── GET /api/simulate/status ────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  const ip = getClientIp(req);
  const geminiReady = Boolean(getGeminiKey());
  const sam2Ready = Boolean(getReplicateToken());
  let savedCount = 0;
  try {
    const row = await db.getAsync('SELECT COUNT(*) as cnt FROM simulator_uploads');
    savedCount = Number(row?.cnt || 0);
  } catch (_) {}

  res.json({
    ok: true,
    architecture: 'one-shot-model-sam2',
    engines: {
      geminiModel: { connected: geminiReady, model: GEMINI_IMAGE_MODEL },
      sam2Mask: { connected: sam2Ready, model: REPLICATE_SAM_MODEL },
      originalStorage: { enabled: true, savedCount },
    },
    remainingFree: getRemaining(ip),
    freeQuota: FREE_QUOTA_PER_IP,
    dailyLimitReached: dailyCounter.count >= DAILY_GLOBAL_LIMIT,
  });
});

// ── POST /api/simulate/build-model (Tek Seferlik Maket + SAM2 Maske + Kayıt) ─
router.post('/build-model', simulateRateLimiter, (req, res) => {
  upload.single('photo')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message || 'Fotoğraf yüklenemedi.' });
    }
    const imgInfo = req.file ? detectImageType(req.file.buffer) : null;
    if (!req.file || !imgInfo) {
      return res.status(400).json({ error: 'Geçerli bir bina fotoğrafı (JPG, PNG veya WebP) yükleyin.' });
    }

    const ip = getClientIp(req);
    const ipState = getIpState(ip);
    const remaining = getRemaining(ip);

    if (dailyCounter.count >= DAILY_GLOBAL_LIMIT) {
      return res.status(429).json({
        error: 'Günlük maket üretim kapasitesi doldu. Fotoğrafınızı WhatsApp hattımıza gönderin, ekibimiz 15 dakikada ücretsiz hazırlasın.',
        dailyLimitReached: true,
      });
    }

    if (remaining <= 0) {
      return res.status(402).json({
        error: 'Ücretsiz bina modelleme hakkınız doldu. Telefon ve ilçe bilginizi bırakarak +5 ücretsiz hak açabilirsiniz.',
        needsLeadUnlock: true,
        remainingFree: 0,
      });
    }

    const style = ['boya', 'mantolama_sove', 'modern_antrasit'].includes(req.body.style)
      ? req.body.style
      : 'boya';

    // 0) Orijinal fotoğrafı her durumda sunucu hafızasına (disk + SQLite) kaydet
    let uploadId = null;
    let savedOrigFile = null;
    try {
      savedOrigFile = saveBufferToStorage('orig', imgInfo.ext, req.file.buffer);
      const ins = await db.runAsync(
        'INSERT INTO simulator_uploads (original_filename, original_file, style, pipeline, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
        [
          sanitizeText(req.file.originalname, 'bina.' + imgInfo.ext, 120),
          savedOrigFile,
          style,
          'processing',
          ip.slice(0, 64),
          String(req.headers['user-agent'] || '').slice(0, 220),
        ]
      );
      uploadId = ins.lastID || null;
    } catch (saveErr) {
      console.error('[Simulate] Orijinal fotoğraf kayıt hatası:', saveErr.message);
    }

    const origBase64 = req.file.buffer.toString('base64');
    const origDataUrl = `data:${imgInfo.mime};base64,${origBase64}`;
    const geminiKey = getGeminiKey();
    const replicateToken = getReplicateToken();

    let modelResult = null;
    let geminiQuotaBlocked = false;
    let savedModelFile = null;

    // 1) AŞAMA 1: Gemini ile Tek Seferlik Temiz Mimari Maket (base)
    if (geminiKey) {
      modelResult = await generateCleanArchitecturalModel(geminiKey, origBase64, imgInfo.mime, style);
      if (modelResult.ok) {
        try {
          savedModelFile = saveBufferToStorage('model', modelResult.ext, modelResult.buffer);
        } catch (_) {}
      } else {
        console.error('[Simulate/Model] Gemini maket hatası:', modelResult.status, String(modelResult.error || '').slice(0, 220));
        if (modelResult.status === 429) geminiQuotaBlocked = true;
      }
    }

    // Maskelenecek hedef görsel: Gemini maketi üretildiyse o, yoksa orijinal fotoğraf
    const targetDataUrl = modelResult?.ok ? modelResult.dataUrl : origDataUrl;
    const targetBase64 = modelResult?.ok ? modelResult.base64 : origBase64;
    const targetMime = modelResult?.ok ? modelResult.mime : imgInfo.mime;

    // 2) AŞAMA 2: Replicate SAM2 ile Sıfır Kaymalı Duvar + Söve Piksel Maskesi
    let wallMaskDataUrl = null;
    let trimMaskDataUrl = null;
    let savedWallFile = null;
    let savedTrimFile = null;
    let sam2Error = null;

    if (replicateToken) {
      const [wallRes, trimRes] = await Promise.all([
        runReplicateMask(replicateToken, targetDataUrl, 'exterior painted building wall facade stucco'),
        runReplicateMask(replicateToken, targetDataUrl, 'window frame molding trim and horizontal facade belt cornice'),
      ]);
      if (wallRes.ok) {
        wallMaskDataUrl = wallRes.dataUrl;
        try { savedWallFile = saveBufferToStorage('wall', 'png', wallRes.buffer); } catch (_) {}
      } else {
        sam2Error = wallRes.error;
        console.error('[Simulate/SAM2] Duvar maske hatası:', wallRes.error);
      }
      if (trimRes.ok) {
        trimMaskDataUrl = trimRes.dataUrl;
        try { savedTrimFile = saveBufferToStorage('trim', 'png', trimRes.buffer); } catch (_) {}
      }
    }

    // 3) Yedek: SAM2 henüz bağlı değilse Gemini 2.5 Flash Vision ile duvar/pencere kutuları çıkar
    let visionHints = null;
    if (!wallMaskDataUrl && geminiKey) {
      try {
        visionHints = await fetchGeminiWallHints(geminiKey, targetBase64, targetMime);
        if (visionHints && visionHints.isBuilding === false) {
          await db.runAsync('UPDATE simulator_uploads SET pipeline = ? WHERE id = ?', ['rejected-non-building', uploadId]);
          return res.status(422).json({
            error: 'Yüklenen fotoğrafta bina dış cephesi tespit edilemedi. Lütfen binanın ön cephesini net gösteren bir fotoğraf yükleyin.',
            uploadId,
          });
        }
      } catch (vErr) {
        console.error('[Simulate/Vision] Yedek analiz hatası:', vErr.message);
      }
    }

    // Pipeline durumunu belirle
    let pipeline = 'local-preview';
    let notice = '';
    let isFullQuality = false;

    if (modelResult?.ok && wallMaskDataUrl) {
      pipeline = 'gemini+sam2';
      isFullQuality = true;
      ipState.used += 1;
      dailyCounter.count += 1;
      notice = 'Tek seferlik temiz mimari maketiniz ve SAM2 piksel maskeleriniz hazır! Şimdi 30 AKD rengini ve 3 söve tonunu 0 saniyede canlı deneyebilirsiniz.';
    } else if (modelResult?.ok && !wallMaskDataUrl) {
      pipeline = 'gemini+chroma';
      isFullQuality = true;
      ipState.used += 1;
      dailyCounter.count += 1;
      notice = 'Temiz mimari maketiniz üretildi! Replicate SAM2 anahtarı henüz bağlı olmadığı için akıllı ton ayrıştırma maskesi uygulandı (SAM2 bağlandığında piksel hassasiyeti %98\'e çıkar).';
    } else if (!modelResult?.ok && wallMaskDataUrl) {
      pipeline = 'sam2-only';
      isFullQuality = true;
      ipState.used += 1;
      dailyCounter.count += 1;
      notice = 'SAM2 piksel maskeniz hazır! Gemini görsel faturalandırması açıldığında önce temiz mimari maket de otomatik üretilecektir.';
    } else {
      pipeline = visionHints ? 'vision-preview' : 'local-preview';
      const missingParts = [];
      if (geminiQuotaBlocked) missingParts.push('Gemini görsel modeli (Google AI Studio faturalandırma bekliyor)');
      else if (!geminiKey) missingParts.push('GEMINI_API_KEY');
      if (!replicateToken) missingParts.push('REPLICATE_API_TOKEN (SAM2)');
      notice = `Orijinal fotoğrafınız güvenle kaydedildi (#${uploadId || '-'}). Şu an önizleme maskesi çalışıyor — tam jilet kalitesindeki "Tek Seferlik Maket + SAM2" için eksik: ${missingParts.join(' ve ')}.`;
    }

    if (uploadId) {
      try {
        await db.runAsync(
          'UPDATE simulator_uploads SET model_file = ?, wall_mask_file = ?, trim_mask_file = ?, pipeline = ? WHERE id = ?',
          [savedModelFile, savedWallFile, savedTrimFile, pipeline, uploadId]
        );
      } catch (_) {}
    }

    return res.json({
      ok: true,
      uploadId,
      savedOriginal: Boolean(savedOrigFile),
      pipeline,
      isFullQuality,
      hasCleanModel: Boolean(modelResult?.ok),
      hasSam2WallMask: Boolean(wallMaskDataUrl),
      hasSam2TrimMask: Boolean(trimMaskDataUrl),
      baseDataUrl: modelResult?.ok ? modelResult.dataUrl : null,
      wallMaskDataUrl,
      trimMaskDataUrl,
      hints: visionHints,
      style,
      notice,
      sam2Error,
      remainingFree: getRemaining(ip),
    });
  });
});

// ── POST /api/simulate/lead (Ek Hak Açma + Keşif Talebi Kaydı) ──────────────
router.post('/lead', simulateRateLimiter, async (req, res) => {
  try {
    const { name, phone, district, colorCode, colorName, trimName, style, uploadId, kvkk_consent } = req.body || {};

    if (kvkk_consent === false) {
      return res.status(400).json({ error: 'Lütfen KVKK Aydınlatma Metni onay kutusunu işaretleyin.' });
    }
    const cleanName = sanitizeText(name, '', 100);
    const cleanPhone = String(phone || '').replace(/[^\d+\s()-]/g, '').trim().slice(0, 30);
    const cleanDistrict = sanitizeText(district, 'Antalya', 60);

    if (!cleanName || cleanPhone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: 'Lütfen adınız ve geçerli bir telefon numarası girin.' });
    }

    const subject = `Cephe Simülasyonu Talebi (${cleanDistrict})`;
    const msgLines = [
      'Bina Cephe Simülatörü (Tek Seferlik Maket + SAM2) keşif talebi:',
      `- İlçe: ${cleanDistrict}`,
      `- Seçilen Renk: ${sanitizeText(colorCode, 'AKD', 20)} ${sanitizeText(colorName, '', 50)}`,
      `- Söve Rengi: ${sanitizeText(trimName, 'Belirtilmedi', 40)}`,
      `- Maket Paketi: ${sanitizeText(style, 'boya', 30)}`,
      `- Kayıtlı Bina Fotoğrafı ID: ${uploadId ? '#' + String(uploadId).replace(/\D/g, '') : 'Örnek Bina / Yüklenmedi'}`,
    ].join('\n');

    await db.runAsync(
      'INSERT INTO messages (name, phone, email, subject, message) VALUES (?, ?, ?, ?, ?)',
      [cleanName, cleanPhone, null, subject, msgLines]
    );

    try {
      await sendContactNotification({
        name: cleanName,
        phone: cleanPhone,
        email: null,
        subject,
        message: msgLines,
      });
    } catch (mailErr) {
      console.error('[Simulate/Lead] E-posta gönderim hatası:', mailErr.message);
    }

    const ip = getClientIp(req);
    const ipState = getIpState(ip);
    ipState.bonus += 5;

    return res.status(201).json({
      ok: true,
      bonusCredits: 5,
      remainingFree: getRemaining(ip),
      message: 'Talebiniz alındı! +5 ücretsiz bina maketi hakkınız tanımlandı.',
    });
  } catch (err) {
    console.error('[Simulate/Lead] Kayıt hatası:', err);
    return res.status(500).json({ error: 'Talebiniz kaydedilirken hata oluştu.' });
  }
});

// ── ADMIN: Kaydedilen Orijinal Bina Fotoğraflarını Listele ve İndir ─────────
router.get('/uploads', auth, async (req, res) => {
  try {
    const rows = await db.allRowsAsync(
      'SELECT id, original_filename, original_file, model_file, wall_mask_file, trim_mask_file, style, pipeline, ip, created_at FROM simulator_uploads ORDER BY id DESC LIMIT 100'
    );
    res.json({ ok: true, count: rows.length, storageDir: STORAGE_DIR, uploads: rows });
  } catch (err) {
    res.status(500).json({ error: 'Yükleme kayıtları alınamadı: ' + err.message });
  }
});

router.get('/uploads/:id/file/:kind', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const kindMap = {
      original: 'original_file',
      model: 'model_file',
      wall: 'wall_mask_file',
      trim: 'trim_mask_file',
    };
    const col = kindMap[req.params.kind];
    if (!id || !col) return res.status(400).json({ error: 'Geçersiz istek.' });

    const row = await db.getAsync(`SELECT ${col} as fname FROM simulator_uploads WHERE id = ?`, [id]);
    if (!row || !row.fname) return res.status(404).json({ error: 'Dosya bulunamadı.' });

    const safeName = path.basename(row.fname);
    const filePath = path.join(STORAGE_DIR, safeName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Dosya diskte bulunamadı.' });

    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Dosya okunamadı.' });
  }
});

module.exports = router;
