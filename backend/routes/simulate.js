const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const db = require('../database');
const { sendContactNotification } = require('../utils/mailer');

// ── Yapılandırma (.env üzerinden kontrol edilir) ────────────────────────────
const ENABLE_MODE_A = String(process.env.SIMULATOR_ENABLE_MODE_A || 'true').toLowerCase() !== 'false';
const ENABLE_MODE_B = String(process.env.SIMULATOR_ENABLE_MODE_B || 'true').toLowerCase() !== 'false';
const FREE_QUOTA_PER_IP = Math.max(1, parseInt(process.env.SIMULATOR_FREE_QUOTA || '3', 10) || 3);
const DAILY_GLOBAL_LIMIT = Math.max(10, parseInt(process.env.SIMULATOR_DAILY_LIMIT || '120', 10) || 120);
const GEMINI_IMAGE_MODEL = (process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image').trim();
const GEMINI_VISION_MODEL = (process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash').trim();
const REPLICATE_SAM_VERSION = (process.env.REPLICATE_SAM_VERSION || '').trim();

function getGeminiKey() {
  return (process.env.GEMINI_API_KEY || '').trim();
}

function getReplicateToken() {
  return (process.env.REPLICATE_API_TOKEN || '').trim();
}

// ── Bellek içi günlük kota ve IP hak takibi (restart'ta sıfırlanır) ─────────
const ipQuotaMap = new Map(); // key: "YYYY-MM-DD|ip" -> { used: number, bonus: number }
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

// ── Rate-limit & Multer bellek yükleyici ────────────────────────────────────
const simulateRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Saatlik simülasyon limitine ulaştınız. Lütfen biraz sonra tekrar deneyin.' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }, // 6 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(String(file.mimetype || '').toLowerCase())) {
      return cb(null, true);
    }
    cb(new Error('Sadece JPG, PNG veya WebP görselleri yükleyebilirsiniz.'));
  },
});

function hasValidImageMagic(buf) {
  if (!buf || buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // WEBP: RIFF....WEBP
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return true;
  return false;
}

function sanitizeHex(val, fallback) {
  const m = String(val || '').trim().match(/^#?[0-9a-fA-F]{6}$/);
  if (!m) return fallback;
  return m[0].startsWith('#') ? m[0].toUpperCase() : `#${m[0].toUpperCase()}`;
}

function sanitizeText(val, fallback, maxLen = 60) {
  const clean = String(val || '').replace(/[^\p{L}\p{N}\s\-().&]/gu, '').trim();
  return (clean || fallback).slice(0, maxLen);
}

// Gemini 2.5 Flash ile bina duvar tohumları ve pencere/gökyüzü hariç kutularını çıkarır (Ücretsiz katmanda çalışır)
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
      generationConfig: {
        responseMimeType: 'application/json',
      },
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
    buildingBox: Array.isArray(parsed.buildingBox) ? parsed.buildingBox : [100, 100, 900, 900],
    wallSeeds: Array.isArray(parsed.wallSeeds) ? parsed.wallSeeds.slice(0, 12) : [],
    excludeBoxes: Array.isArray(parsed.excludeBoxes) ? parsed.excludeBoxes.slice(0, 40) : [],
  };
}

// ── GET /api/simulate/status ────────────────────────────────────────────────
router.get('/status', (req, res) => {
  const ip = getClientIp(req);
  const geminiReady = Boolean(getGeminiKey());
  const replicateReady = Boolean(getReplicateToken());

  res.json({
    ok: true,
    modes: {
      a: {
        enabled: ENABLE_MODE_A,
        provider: 'gemini',
        apiConnected: geminiReady,
        model: GEMINI_IMAGE_MODEL,
      },
      b: {
        enabled: ENABLE_MODE_B,
        provider: replicateReady ? 'replicate-sam' : (geminiReady ? 'gemini-vision' : 'client-smart'),
        apiConnected: replicateReady || geminiReady,
        autoMaskReady: replicateReady || geminiReady,
        manualMaskReady: true,
      },
    },
    remainingFree: getRemaining(ip),
    freeQuota: FREE_QUOTA_PER_IP,
    dailyLimitReached: dailyCounter.count >= DAILY_GLOBAL_LIMIT,
  });
});

// ── POST /api/simulate/ai-edit (Mod A: AI Fotogerçekçi Cephe Yenileme) ──────
router.post('/ai-edit', simulateRateLimiter, (req, res) => {
  if (!ENABLE_MODE_A) {
    return res.status(403).json({ error: 'Mod A şu anda devre dışı.' });
  }

  upload.single('photo')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message || 'Fotoğraf yüklenemedi.' });
    }
    if (!req.file || !hasValidImageMagic(req.file.buffer)) {
      return res.status(400).json({ error: 'Geçerli bir bina fotoğrafı (JPG, PNG veya WebP) yükleyin.' });
    }

    const ip = getClientIp(req);
    const ipState = getIpState(ip);
    const remaining = getRemaining(ip);

    if (dailyCounter.count >= DAILY_GLOBAL_LIMIT) {
      return res.status(429).json({
        error: 'Günlük yapay zeka üretim kapasitesi doldu. Fotoğrafınızı WhatsApp hattımıza gönderin, ekibimiz 15 dakikada ücretsiz hazırlasın.',
        dailyLimitReached: true,
      });
    }

    if (remaining <= 0) {
      return res.status(402).json({
        error: 'Ücretsiz önizleme hakkınız doldu. Telefon ve ilçe bilginizi bırakarak +5 ücretsiz hak daha açabilirsiniz.',
        needsLeadUnlock: true,
        remainingFree: 0,
      });
    }

    const wallHex = sanitizeHex(req.body.wallHex, '#8A452B');
    const wallCode = sanitizeText(req.body.wallCode, 'AKD-301', 20);
    const wallName = sanitizeText(req.body.wallName, 'KIZILKULE KİREMİT', 50);
    const trimHex = sanitizeHex(req.body.trimHex, '#F5F3EE');
    const trimName = sanitizeText(req.body.trimName, 'Kırık Beyaz Söve', 40);
    const style = ['boya', 'mantolama_sove', 'modern_antrasit'].includes(req.body.style)
      ? req.body.style
      : 'boya';

    const apiKey = getGeminiKey();

    // API anahtarı henüz bağlanmadıysa frontend'e güvenli Demo Önizleme yanıtı dön
    if (!apiKey) {
      return res.json({
        ok: true,
        mode: 'a',
        demoMode: true,
        notice: 'Gemini API anahtarı henüz bağlı değil. Şu an arayüzü test etmeniz için Demo Önizleme gösteriliyor; API anahtarı eklendiğinde gerçek fotogerçekçi AI dönüşümü otomatik aktif olur.',
        applied: { wallHex, wallCode, wallName, trimHex, trimName, style },
        remainingFree: remaining,
      });
    }

    try {
      const base64Img = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype === 'image/jpg' ? 'image/jpeg' : req.file.mimetype;

      let styleInstruction = 'Keep the existing facade architectural moldings and geometry intact; cleanly repair cracks/stains and repaint all exterior plaster/stucco walls smoothly with fresh matte silicone exterior paint.';
      if (style === 'mantolama_sove') {
        styleInstruction = 'Upgrade the exterior facade with fresh thermal insulation (mantolama) smooth plaster finish AND add clean, realistic beveled architectural EPS window trim frames (söve) and subtle horizontal floor belt moldings (kat silmesi) painted in the trim color.';
      } else if (style === 'modern_antrasit') {
        styleInstruction = 'Upgrade the exterior facade with a crisp modern architectural repaint, adding sleek charcoal/anthracite accents on recessed balconies or vertical pilasters and clean crisp trim moldings in the requested trim color.';
      }

      const prompt = [
        'You are an expert architectural exterior facade visualization editor for Antalya, Turkey.',
        'Edit ONLY the exterior building facade in the provided photo:',
        `- Repaint the main exterior stucco/plaster walls to the exact color ${wallHex} (${wallName}).`,
        `- Paint all window trim moldings (söve), horizontal floor belt courses (kat silmesi), and decorative facade borders in ${trimHex} (${trimName}).`,
        `- Renovation style: ${styleInstruction}`,
        'STRICT PRESERVATION RULES:',
        '- Preserve the exact camera angle, building proportions, number of floors, windows, glass reflections, curtains, shutters, balcony railings, AC units, roof tiles, trees, plants, sky, vehicles, ground, and surrounding buildings unchanged.',
        '- Maintain completely natural daylight, realistic sun direction, cast shadows, wall texture, and photographic realism so it looks like a real after-renovation photograph.',
        '- Do NOT add any text, watermarks, logos, or extra floors.',
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
        const msg = payload?.error?.message || `Gemini API hatası (${apiRes.status})`;
        console.error('[Simulate/ModA] Gemini error:', apiRes.status, msg.slice(0, 260));
        if (apiRes.status === 429) {
          // Free Tier limit:0 veya geçici kota durumunda ziyaretçiye hata yerine AI Vision destekli hızlı önizleme sun
          let visionHints = null;
          try {
            visionHints = await fetchGeminiWallHints(apiKey, base64Img, mimeType);
          } catch (_) {}
          return res.json({
            ok: true,
            mode: 'a',
            demoMode: true,
            quotaFallback: true,
            hints: visionHints,
            notice: 'Gemini API bağlı; ancak görsel üretim modeli (gemini-2.5-flash-image) için Google AI Studio faturalandırması henüz aktif değil (Free Tier limit: 0). Şu an Gemini Vision destekli hızlı önizleme gösteriliyor; faturalandırma açıldığı anda tam fotogerçekçi AI otomatik devreye girer.',
            applied: { wallHex, wallCode, wallName, trimHex, trimName, style },
            remainingFree: remaining,
          });
        }
        return res.status(502).json({ error: 'Yapay zeka servisi şu an yanıt veremedi. Lütfen biraz sonra tekrar deneyin.' });
      }

      const candidates = payload?.candidates || [];
      let outImage = null;
      let outMime = 'image/png';
      for (const c of candidates) {
        const parts = c?.content?.parts || [];
        for (const p of parts) {
          const inline = p.inlineData || p.inline_data;
          if (inline && inline.data) {
            outImage = inline.data;
            outMime = inline.mimeType || inline.mime_type || 'image/png';
            break;
          }
        }
        if (outImage) break;
      }

      if (!outImage) {
        console.error('[Simulate/ModA] Görsel dönmedi:', JSON.stringify(payload).slice(0, 400));
        return res.status(422).json({
          error: 'Bu fotoğraftan cephe görseli üretilemedi. Lütfen binanın ön cephesini net gösteren bir fotoğraf yükleyin.',
        });
      }

      ipState.used += 1;
      dailyCounter.count += 1;

      return res.json({
        ok: true,
        mode: 'a',
        demoMode: false,
        imageDataUrl: `data:${outMime};base64,${outImage}`,
        applied: { wallHex, wallCode, wallName, trimHex, trimName, style },
        remainingFree: getRemaining(ip),
      });
    } catch (err) {
      console.error('[Simulate/ModA] Beklenmeyen hata:', err);
      return res.status(500).json({ error: 'Simülasyon işlenirken sunucu hatası oluştu.' });
    }
  });
});

// ── POST /api/simulate/auto-mask (Mod B: Otomatik Duvar Maskeleme API'si) ───
router.post('/auto-mask', simulateRateLimiter, (req, res) => {
  if (!ENABLE_MODE_B) {
    return res.status(403).json({ error: 'Mod B şu anda devre dışı.' });
  }

  upload.single('photo')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message || 'Fotoğraf yüklenemedi.' });
    }
    if (!req.file || !hasValidImageMagic(req.file.buffer)) {
      return res.status(400).json({ error: 'Geçerli bir bina fotoğrafı (JPG, PNG veya WebP) yükleyin.' });
    }

    const replicateToken = getReplicateToken();
    const geminiKey = getGeminiKey();

    // 1) Replicate SAM bağlıysa gerçek piksel maskesi üret
    if (replicateToken && REPLICATE_SAM_VERSION) {
      try {
        const mimeType = req.file.mimetype === 'image/jpg' ? 'image/jpeg' : req.file.mimetype;
        const dataUri = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;
        const createRes = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            Authorization: `Token ${replicateToken}`,
            'Content-Type': 'application/json',
            Prefer: 'wait=25',
          },
          body: JSON.stringify({
            version: REPLICATE_SAM_VERSION,
            input: {
              image: dataUri,
              text_prompt: 'exterior building wall facade plaster',
            },
          }),
        });
        const pred = await createRes.json().catch(() => ({}));
        if (createRes.ok && pred?.output) {
          const maskUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;
          if (typeof maskUrl === 'string' && maskUrl.startsWith('http')) {
            const mRes = await fetch(maskUrl);
            const mBuf = Buffer.from(await mRes.arrayBuffer());
            const mMime = mRes.headers.get('content-type') || 'image/png';
            return res.json({
              ok: true,
              mode: 'b',
              provider: 'replicate-sam',
              apiConnected: true,
              wallMaskDataUrl: `data:${mMime};base64,${mBuf.toString('base64')}`,
            });
          }
        }
      } catch (err) {
        console.error('[Simulate/ModB] Replicate SAM hatası, fallback uygulanıyor:', err.message);
      }
    }

    // 2) Gemini API bağlıysa duvar/pencere koordinatları + akıllı tohum noktaları döndür
    if (geminiKey) {
      try {
        const base64Img = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype === 'image/jpg' ? 'image/jpeg' : req.file.mimetype;
        const parsed = await fetchGeminiWallHints(geminiKey, base64Img, mimeType);
        if (parsed && parsed.isBuilding === false) {
          return res.status(422).json({ error: 'Yüklenen görselde dış cephe binası tespit edilemedi. Lütfen bina cephe fotoğrafı yükleyin.' });
        }
        if (parsed && parsed.wallSeeds.length > 0) {
          return res.json({
            ok: true,
            mode: 'b',
            provider: 'gemini-vision',
            apiConnected: true,
            hints: {
              buildingBox: parsed.buildingBox,
              wallSeeds: parsed.wallSeeds,
              excludeBoxes: parsed.excludeBoxes,
            },
          });
        }
      } catch (err) {
        console.error('[Simulate/ModB] Gemini Vision maske hatası, yerel akıllı seçiciye dönülüyor:', err.message);
      }
    }

    // 3) API bağlı değilse tarayıcı içi Akıllı Duvar Seçici ile 0 saniyede çalış
    return res.json({
      ok: true,
      mode: 'b',
      provider: 'client-smart',
      apiConnected: false,
      notice: 'Otomatik maske API anahtarı henüz bağlı değil. Tarayıcı içi Akıllı Duvar Seçici devrede: duvarın üzerine tıklayarak veya fırça ile alanı anında seçip 30 rengi deneyebilirsiniz.',
    });
  });
});

// ── POST /api/simulate/lead (Ek Hak Açma + Keşif Talebi Kaydı) ──────────────
router.post('/lead', simulateRateLimiter, async (req, res) => {
  try {
    const { name, phone, district, colorCode, colorName, trimName, style, mode, kvkk_consent } = req.body || {};

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
      `Bina Cephe Simülatörü üzerinden keşif / ek hak talebi:`,
      `- İlçe: ${cleanDistrict}`,
      `- Seçilen Renk: ${sanitizeText(colorCode, 'AKD', 20)} ${sanitizeText(colorName, '', 50)}`,
      `- Söve Rengi: ${sanitizeText(trimName, 'Belirtilmedi', 40)}`,
      `- Uygulama Tipi: ${sanitizeText(style, 'boya', 30)}`,
      `- Kullanılan Mod: ${mode === 'b' ? 'Mod B (Canlı Maskeleme)' : 'Mod A (AI Fotogerçekçi)'}`,
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
      message: 'Talebiniz alındı! +5 ücretsiz simülasyon hakkınız tanımlandı.',
    });
  } catch (err) {
    console.error('[Simulate/Lead] Kayıt hatası:', err);
    return res.status(500).json({ error: 'Talebiniz kaydedilirken hata oluştu.' });
  }
});

module.exports = router;
