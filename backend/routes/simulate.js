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

// ── Yapılandırma ────────────────────────────────────────────────────────────
const GEMINI_VISION_MODEL = (process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash').trim();
const STORAGE_DIR = path.resolve(__dirname, '../storage/simulator');
fs.mkdirSync(STORAGE_DIR, { recursive: true });

// 30 Özgün Akdeniz Yapı (AKD) Kartela Kataloğu
const AKD_COLORS = [
  { code: 'AKD-101', name: 'PATARA KUMU', hex: '#EFECE4', cat: 'krem' },
  { code: 'AKD-102', name: 'ASPENDOS FİLDİŞİ', hex: '#EFEAD8', cat: 'krem' },
  { code: 'AKD-103', name: 'TOROS KARI', hex: '#F4F4EA', cat: 'krem' },
  { code: 'AKD-104', name: 'KALEİÇİ KREMİ', hex: '#F5EED7', cat: 'krem' },
  { code: 'AKD-105', name: 'LARA GÜNEŞİ', hex: '#EBD8A5', cat: 'krem' },
  { code: 'AKD-106', name: 'PERGE TRAVERTENİ', hex: '#DBCDA0', cat: 'krem' },
  { code: 'AKD-107', name: 'ÇIRALI ŞAFAĞI', hex: '#FAD6BA', cat: 'krem' },
  { code: 'AKD-108', name: 'SİDE KUMTAŞI', hex: '#BCA179', cat: 'krem' },
  { code: 'AKD-201', name: 'DÜDEN SİSİ', hex: '#DFE1DB', cat: 'gri' },
  { code: 'AKD-202', name: 'BEYDAĞI BULUTU', hex: '#E3E8EE', cat: 'gri' },
  { code: 'AKD-203', name: 'KONYAALTI ÇAKILI', hex: '#C6C2BA', cat: 'gri' },
  { code: 'AKD-204', name: 'FALEZ GRİSİ', hex: '#9E9B95', cat: 'gri' },
  { code: 'AKD-205', name: 'TAHTALI KAYASI', hex: '#838689', cat: 'gri' },
  { code: 'AKD-206', name: 'KURŞUNLU ANTRASİT', hex: '#484C52', cat: 'gri' },
  { code: 'AKD-301', name: 'KIZILKULE KİREMİT', hex: '#8A452B', cat: 'toprak' },
  { code: 'AKD-302', name: 'LİKYA BORDO', hex: '#6B1D1D', cat: 'toprak' },
  { code: 'AKD-303', name: 'TERMESSOS TOPRAĞI', hex: '#A46257', cat: 'toprak' },
  { code: 'AKD-304', name: 'BEGONYA GÜLÜ', hex: '#E29E90', cat: 'toprak' },
  { code: 'AKD-305', name: 'PORTAKAL ÇİÇEĞİ', hex: '#F8DFD8', cat: 'toprak' },
  { code: 'AKD-306', name: 'ANTİK KİL', hex: '#AF8B79', cat: 'toprak' },
  { code: 'AKD-307', name: 'DÖŞEMEALTI VİZON', hex: '#988F82', cat: 'toprak' },
  { code: 'AKD-308', name: 'KÖPRÜLÜ KANYON', hex: '#7B5E40', cat: 'toprak' },
  { code: 'AKD-309', name: 'SEDİR KAHVE', hex: '#5D3A28', cat: 'toprak' },
  { code: 'AKD-310', name: 'KEÇİBOYNUZU KOYU', hex: '#463A32', cat: 'toprak' },
  { code: 'AKD-401', name: 'KAŞ ESİNTİSİ', hex: '#CBE0E8', cat: 'akdeniz' },
  { code: 'AKD-402', name: 'KEKOVA MAVİSİ', hex: '#B5C6D4', cat: 'akdeniz' },
  { code: 'AKD-403', name: 'ADRASAN KOYU', hex: '#7D8B9B', cat: 'akdeniz' },
  { code: 'AKD-404', name: 'PHASELİS LİLA', hex: '#A59290', cat: 'akdeniz' },
  { code: 'AKD-405', name: 'OLYMPOS ZEYTİNİ', hex: '#AAB9A0', cat: 'akdeniz' },
  { code: 'AKD-406', name: 'ÇAMDAĞI YEŞİLİ', hex: '#8FA287', cat: 'akdeniz' },
];

const COLOR_BY_CODE = Object.fromEntries(AKD_COLORS.map((c) => [c.code, c]));

const TRIMS = {
  'Kırık Beyaz Söve': '#F5F3EE',
  'Krem Söve': '#E4DAC6',
  'Antrasit Söve': '#374151',
};

// ── Veritabanı tablosu (simulator_uploads) otomatik oluştur + kolon genişlet ─
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
        style TEXT DEFAULT 'analiz',
        pipeline TEXT DEFAULT 'gemini-analysis',
        analysis_json TEXT,
        ip TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await db.execAsync('ALTER TABLE simulator_uploads ADD COLUMN analysis_json TEXT;');
    } catch (_) {
      // Kolon zaten varsa sessizce geç
    }
  } catch (err) {
    console.error('[Simulate] Tablo init uyarısı:', err.message);
  }
})();

function getGeminiKey() {
  return (process.env.GEMINI_API_KEY || '').trim();
}

function getClientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.ip || 'unknown';
}

const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Saatlik analiz limitine ulaştınız. Lütfen biraz sonra tekrar deneyin veya 0530 936 10 17 numarasından ulaşın.' },
});

const leadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla talep gönderdiniz. Lütfen daha sonra tekrar deneyin.' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB orijinal telefon fotoğrafı
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(String(file.mimetype || '').toLowerCase())) return cb(null, true);
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

function sanitizeText(val, fallback = '', maxLen = 120) {
  const clean = String(val || '').replace(/[^\p{L}\p{N}\s\-().&,+/:]/gu, '').trim();
  return (clean || fallback).slice(0, maxLen);
}

function saveOriginalPhoto(ext, buf) {
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const rand = crypto.randomBytes(4).toString('hex');
  const fname = `orig_${stamp}_${rand}.${ext}`;
  fs.writeFileSync(path.join(STORAGE_DIR, fname), buf);
  return fname;
}

function normalizeRecommendations(rawList) {
  const defaults = [
    { wallCode: 'AKD-104', trimName: 'Antrasit Söve', reason: 'Antalya güneşinde ısıyı yansıtan sıcak krem gövde ile modern antrasit söve kontrastı binayı ferah ve prestijli gösterir.' },
    { wallCode: 'AKD-203', trimName: 'Kırık Beyaz Söve', reason: 'Kir ve toz göstermeyen dengeli açık taş grisi tonu, kırık beyaz sövelerle çağdaş bir cephe dengesi oluşturur.' },
    { wallCode: 'AKD-307', trimName: 'Krem Söve', reason: 'Doğal vizon-toprak tonu uzun yıllar UV solmasına karşı yüksek direnç sunar ve binanın emlak değerini artırır.' },
  ];

  const used = new Set();
  const out = [];
  const src = Array.isArray(rawList) ? rawList : [];

  for (const item of src) {
    const code = String(item?.wallCode || '').toUpperCase().trim();
    const color = COLOR_BY_CODE[code];
    if (!color || used.has(code)) continue;
    used.add(code);
    const tName = TRIMS[item?.trimName] ? item.trimName : 'Kırık Beyaz Söve';
    out.push({
      rank: out.length + 1,
      wallCode: color.code,
      wallName: color.name,
      wallHex: color.hex,
      trimName: tName,
      trimHex: TRIMS[tName],
      reason: sanitizeText(item?.reason, 'Antalya iklimi ve bina mimarisi için yüksek UV dayanımlı dengeli dış cephe önerisi.', 220),
    });
    if (out.length === 3) break;
  }

  for (const d of defaults) {
    if (out.length >= 3) break;
    if (used.has(d.wallCode)) continue;
    const color = COLOR_BY_CODE[d.wallCode];
    used.add(d.wallCode);
    out.push({
      rank: out.length + 1,
      wallCode: color.code,
      wallName: color.name,
      wallHex: color.hex,
      trimName: d.trimName,
      trimHex: TRIMS[d.trimName],
      reason: d.reason,
    });
  }

  return out;
}

// ── Gemini 2.5 Flash (Ücretsiz Katman — 200 OK) ile Bina Cephe Analizi ──────
async function runGeminiFacadeAnalysis(apiKey, base64Img, mimeType) {
  const paletteText = AKD_COLORS.map((c) => `${c.code} ${c.name} (${c.hex}, ${c.cat})`).join('\n');

  const prompt = [
    'Sen Antalya\'da 20 yıllık deneyime sahip uzman bir dış cephe mimarı ve mantolama keşif mühendisisin (Akdeniz Yapı Dekorasyon).',
    'Yüklenen fotoğrafı dikkatlice incele ve SADECE geçerli bir JSON nesnesi döndür (markdown veya ek açıklama yazma):',
    '{',
    '  "isBuilding": true,',
    '  "buildingType": "Örn: 5 Katlı Apartman / Müstakil 2 Katlı Villa / Zemin Kat Dükkanlı Apartman / Site Bloğu",',
    '  "estimatedFloors": 5,',
    '  "currentColor": "Mevcut baskın dış cephe rengi (kısa Türkçe)",',
    '  "currentCondition": "Sıva, boya solması, çatlak, kirlenme veya genel cephe durumu hakkında 1-2 cümlelik net profesyonel tespit",',
    '  "hasSove": true,',
    '  "soveAssessment": "Pencere sövesi ve kat silmesi durumu ile yeni söve önerisi (1 cümle)",',
    '  "recommendedService": "En uygun uygulama paketi (Örn: 5 cm Karbonlu EPS Mantolama + Söve + Silikonlu Boya veya İskeleli Tamirat + UV Silikonlu Dış Cephe Boya)",',
    '  "estimatedAreaRange": "Tahmini toplam dış cephe alanı aralığı (Örn: 450 – 650 m²)",',
    '  "uvNote": "Antalya güneşi, UV ışınları ve nemi için 1 cümlelik teknik boya/yalıtım tavsiyesi",',
    '  "recommendations": [',
    '    { "wallCode": "AKD-104", "trimName": "Antrasit Söve", "reason": "Bu binaya neden çok yakışacağını açıklayan 1-2 cümlelik özel mimari gerekçe" },',
    '    { "wallCode": "AKD-203", "trimName": "Kırık Beyaz Söve", "reason": "..." },',
    '    { "wallCode": "AKD-307", "trimName": "Krem Söve", "reason": "..." }',
    '  ]',
    '}',
    '',
    'KURALLAR:',
    '- Eğer fotoğrafta hiçbir bina/yapı dış cephesi yoksa (ör. insan yüzü, hayvan, boş ekran, belge, araba içi) "isBuilding": false döndür.',
    '- "recommendations" dizisinde mutlaka birbirinden farklı 3 kategori/tondan (ör. 1 açık krem/bej, 1 modern gri/akdeniz, 1 sıcak toprak/vizon) renk öner ve SADECE aşağıdaki AKD kodlarını kullan:',
    paletteText,
    '- "trimName" değeri SADECE şu 3 seçenekten biri olsun: "Kırık Beyaz Söve", "Krem Söve", "Antrasit Söve".',
    '- Tüm metinler doğal, güven veren, sade Türkçe olsun.',
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
        temperature: 0.35,
      },
    }),
  });

  if (!apiRes.ok) {
    const errBody = await apiRes.text().catch(() => '');
    throw new Error(`Gemini HTTP ${apiRes.status}: ${errBody.slice(0, 200)}`);
  }

  const payload = await apiRes.json();
  const rawText = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(cleaned);

  if (parsed && parsed.isBuilding === false) {
    return { isBuilding: false };
  }

  return {
    isBuilding: true,
    buildingType: sanitizeText(parsed.buildingType, 'Apartman / Konut Binası', 80),
    estimatedFloors: Math.max(1, Math.min(30, parseInt(parsed.estimatedFloors, 10) || 4)),
    currentColor: sanitizeText(parsed.currentColor, 'Açık ton dış cephe', 60),
    currentCondition: sanitizeText(parsed.currentCondition, 'Mevcut dış cephede güneş yıpranması ve yüzey yenileme ihtiyacı gözlemlenmektedir.', 280),
    hasSove: Boolean(parsed.hasSove),
    soveAssessment: sanitizeText(parsed.soveAssessment, 'Pencere sövesi ve kat silmesi uygulamasıyla bina cephesine belirgin mimari derinlik kazandırılabilir.', 240),
    recommendedService: sanitizeText(parsed.recommendedService, 'İskeleli Sıva Tamiratı + UV Dayanımlı Silikonlu Dış Cephe Boya / Mantolama', 120),
    estimatedAreaRange: sanitizeText(parsed.estimatedAreaRange, 'Keşif ile netleştirilir', 60),
    uvNote: sanitizeText(parsed.uvNote, 'Antalya\'nın yoğun UV güneş ışınlarına karşı %100 saf akrilik veya tam silikonlu dış cephe boyası önerilir.', 240),
    recommendations: normalizeRecommendations(parsed.recommendations),
  };
}

// ── GET /api/simulate/status ────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  let savedCount = 0;
  try {
    const row = await db.getAsync('SELECT COUNT(*) as cnt FROM simulator_uploads');
    savedCount = Number(row?.cnt || 0);
  } catch (_) {}

  res.json({
    ok: true,
    mode: 'ai-facade-analysis-and-3d-request',
    geminiConnected: Boolean(getGeminiKey()),
    model: GEMINI_VISION_MODEL,
    originalStorage: { enabled: true, savedCount },
  });
});

// ── POST /api/simulate/analyze (Orijinal Fotoğraf Kayıt + Ücretsiz AI Rapor) ─
router.post('/analyze', analyzeLimiter, (req, res) => {
  upload.single('photo')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message || 'Fotoğraf yüklenemedi.' });
    }
    const imgInfo = req.file ? detectImageType(req.file.buffer) : null;
    if (!req.file || !imgInfo) {
      return res.status(400).json({ error: 'Lütfen geçerli bir bina fotoğrafı (JPG, PNG veya WebP) yükleyin.' });
    }

    const ip = getClientIp(req);
    const isSample = String(req.body.isSample || '') === '1';

    // Orijinal fotoğrafı gerçek müşteri yüklemelerinde sunucu diskine + SQLite'a kaydet
    let uploadId = null;
    let savedOrigFile = null;
    if (!isSample) {
      try {
        savedOrigFile = saveOriginalPhoto(imgInfo.ext, req.file.buffer);
        const ins = await db.runAsync(
          'INSERT INTO simulator_uploads (original_filename, original_file, style, pipeline, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
          [
            sanitizeText(req.file.originalname, 'bina.' + imgInfo.ext, 120),
            savedOrigFile,
            'ai-analiz',
            'gemini-2.5-flash',
            ip.slice(0, 64),
            String(req.headers['user-agent'] || '').slice(0, 220),
          ]
        );
        uploadId = ins.lastID || null;
      } catch (err) {
        console.error('[Simulate/Analyze] Orijinal fotoğraf kayıt hatası:', err.message);
      }
    }

    const apiKey = getGeminiKey();
    if (!apiKey) {
      return res.json({
        ok: true,
        uploadId,
        savedOriginal: Boolean(savedOrigFile),
        aiUsed: false,
        analysis: {
          isBuilding: true,
          buildingType: 'Antalya Konut / Apartman Cephesi',
          estimatedFloors: 4,
          currentColor: 'Standart Cephe',
          currentCondition: 'Fotoğrafınız güvenle alındı. Uzman ekibimiz seçtiğiniz AKD renkleriyle ücretsiz 3D cephe tasarımınızı hazırlayacaktır.',
          hasSove: false,
          soveAssessment: 'Pencere sövesi ve kat silmesi uygulamasıyla cephenizde modern bir görünüm elde edilebilir.',
          recommendedService: 'Dış Cephe Mantolama / Silikonlu Cephe Boya',
          estimatedAreaRange: 'Ücretsiz lazer metraj keşfi ile belirlenir',
          uvNote: 'Antalya ikliminde açık krem, taş grisi ve doğal vizon tonları yüksek güneş yansıtma sağlar.',
          recommendations: normalizeRecommendations([]),
        },
      });
    }

    try {
      const base64Img = req.file.buffer.toString('base64');
      const analysis = await runGeminiFacadeAnalysis(apiKey, base64Img, imgInfo.mime);

      if (!analysis.isBuilding) {
        if (uploadId) {
          await db.runAsync('UPDATE simulator_uploads SET pipeline = ? WHERE id = ?', ['rejected-non-building', uploadId]).catch(() => {});
        }
        return res.status(422).json({
          error: 'Yüklenen fotoğrafta bina dış cephesi tespit edilemedi. Lütfen apartman veya villanızın dış cephe fotoğrafını yükleyin.',
        });
      }

      if (uploadId) {
        await db.runAsync(
          'UPDATE simulator_uploads SET analysis_json = ? WHERE id = ?',
          [JSON.stringify(analysis).slice(0, 6000), uploadId]
        ).catch(() => {});
      }

      return res.json({
        ok: true,
        uploadId,
        savedOriginal: Boolean(savedOrigFile),
        aiUsed: true,
        analysis,
      });
    } catch (err) {
      console.error('[Simulate/Analyze] Gemini analiz hatası:', err.message);
      return res.json({
        ok: true,
        uploadId,
        savedOriginal: Boolean(savedOrigFile),
        aiUsed: false,
        analysis: {
          isBuilding: true,
          buildingType: 'Antalya Konut / Apartman Cephesi',
          estimatedFloors: 4,
          currentColor: 'Mevcut Dış Cephe',
          currentCondition: 'Fotoğrafınız orijinal haliyle kaydedildi. Aşağıdan 3D tasarım için beğendiğiniz renkleri seçip WhatsApp numaranızı bırakabilirsiniz.',
          hasSove: false,
          soveAssessment: 'Keşif sırasında pencere sövesi ve kat silmesi alternatifleri de 3D tasarıma eklenebilir.',
          recommendedService: 'İskeleli Sıva Tamiratı + Silikonlu Boya / Mantolama',
          estimatedAreaRange: 'Ücretsiz yerinde keşif ile netleşir',
          uvNote: 'Antalya güneşine dayanıklı tam silikonlu ve UV kalkanlı boya sistemleri önerilir.',
          recommendations: normalizeRecommendations([]),
        },
      });
    }
  });
});

// ── POST /api/simulate/request-3d (Fotoğraflı Ücretsiz 3D Tasarım Talebi) ───
router.post('/request-3d', leadLimiter, async (req, res) => {
  try {
    const {
      name,
      phone,
      district,
      uploadId,
      selectedColors,
      trimName,
      serviceType,
      notes,
      kvkk_consent,
    } = req.body || {};

    if (kvkk_consent === false) {
      return res.status(400).json({ error: 'Lütfen KVKK Aydınlatma Metni onay kutusunu işaretleyin.' });
    }

    const cleanName = sanitizeText(name, '', 100);
    const cleanPhone = String(phone || '').replace(/[^\d+\s()-]/g, '').trim().slice(0, 30);
    const cleanDistrict = sanitizeText(district, 'Antalya', 60);
    const cleanService = sanitizeText(serviceType, 'Dış Cephe Boya + 3D Tasarım', 80);
    const cleanTrim = sanitizeText(trimName, 'Kırık Beyaz Söve', 40);
    const cleanNotes = sanitizeText(notes, '', 400);

    if (!cleanName || cleanPhone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: 'Lütfen adınız ve geçerli bir WhatsApp telefon numarası girin.' });
    }

    // Seçilen 1-3 AKD rengini doğrula
    const picked = [];
    if (Array.isArray(selectedColors)) {
      for (const item of selectedColors.slice(0, 3)) {
        const code = String(item?.code || item || '').toUpperCase().trim();
        if (COLOR_BY_CODE[code]) {
          picked.push(`${COLOR_BY_CODE[code].code} ${COLOR_BY_CODE[code].name}`);
        }
      }
    }
    const colorSummary = picked.length ? picked.join(', ') : 'AKD-104 KALEİÇİ KREMİ';

    // Kayıtlı fotoğraf & AI rapor özetini çek
    let photoInfoLine = 'Fotoğraf yüklenmedi (Örnek / Doğrudan Talep)';
    let aiSummaryLine = '';
    const safeUploadId = uploadId ? parseInt(uploadId, 10) : null;
    if (safeUploadId) {
      try {
        const row = await db.getAsync(
          'SELECT id, original_filename, original_file, analysis_json FROM simulator_uploads WHERE id = ?',
          [safeUploadId]
        );
        if (row) {
          photoInfoLine = `Ref #${row.id} | Dosya: ${row.original_file} (Orijinal ad: ${row.original_filename || '-'})`;
          if (row.analysis_json) {
            const parsed = JSON.parse(row.analysis_json);
            aiSummaryLine = `AI Tespit: ${parsed.buildingType || '-'} (~${parsed.estimatedFloors || '-'} kat, ${parsed.estimatedAreaRange || '-'}) — ${parsed.currentCondition || ''}`;
          }
        }
      } catch (_) {}
    }

    const subject = `Ücretsiz 3D Bina Tasarım Talebi (${cleanDistrict}) ${safeUploadId ? '#Ref-' + safeUploadId : ''}`.trim();
    const messageBody = [
      'AI Cephe Analizi & Ücretsiz 3D Tasarım Talebi:',
      `- Müşteri: ${cleanName}`,
      `- Telefon (WhatsApp): ${cleanPhone}`,
      `- İlçe: ${cleanDistrict}`,
      `- İstenen İşlem: ${cleanService}`,
      `- Seçilen AKD Renkleri: ${colorSummary}`,
      `- Söve Tercihi: ${cleanTrim}`,
      `- Kayıtlı Orijinal Bina Fotoğrafı: ${photoInfoLine}`,
      aiSummaryLine ? `- ${aiSummaryLine}` : null,
      cleanNotes ? `- Müşteri Notu: ${cleanNotes}` : null,
    ].filter(Boolean).join('\n');

    await db.runAsync(
      'INSERT INTO messages (name, phone, email, subject, message) VALUES (?, ?, ?, ?, ?)',
      [cleanName, cleanPhone, null, subject, messageBody]
    );

    try {
      await sendContactNotification({
        name: cleanName,
        phone: cleanPhone,
        email: null,
        subject,
        message: messageBody,
      });
    } catch (mailErr) {
      console.error('[Simulate/3DRequest] E-posta gönderim hatası:', mailErr.message);
    }

    const waText = encodeURIComponent(
      `Merhaba, antalyadiscephe.com üzerinden ücretsiz 3D cephe tasarımı talep ettim (${cleanDistrict}${safeUploadId ? ', Foto Ref #' + safeUploadId : ''}). Seçtiğim renkler: ${colorSummary} | ${cleanTrim} | ${cleanService}.`
    );

    return res.status(201).json({
      ok: true,
      uploadId: safeUploadId,
      whatsappUrl: `https://wa.me/905309361017?text=${waText}`,
      message: 'Talebiniz ve orijinal bina fotoğrafınız ekibimize ulaştı! Seçtiğiniz renklerle 3D cephe tasarımınız hazırlanıp WhatsApp numaranıza ücretsiz gönderilecektir.',
    });
  } catch (err) {
    console.error('[Simulate/3DRequest] Hata:', err);
    return res.status(500).json({ error: 'Talebiniz kaydedilirken sunucu hatası oluştu.' });
  }
});

// ── ADMIN: Kaydedilen Orijinal Bina Fotoğraflarını Listele ve İndir ─────────
router.get('/uploads', auth, async (req, res) => {
  try {
    const rows = await db.allRowsAsync(
      'SELECT id, original_filename, original_file, style, pipeline, analysis_json, ip, created_at FROM simulator_uploads ORDER BY id DESC LIMIT 100'
    );
    res.json({ ok: true, count: rows.length, storageDir: STORAGE_DIR, uploads: rows });
  } catch (err) {
    res.status(500).json({ error: 'Yükleme kayıtları alınamadı: ' + err.message });
  }
});

router.get('/uploads/:id/file/:kind', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const kindMap = { original: 'original_file', model: 'model_file', wall: 'wall_mask_file', trim: 'trim_mask_file' };
    const col = kindMap[req.params.kind];
    if (!id || !col) return res.status(400).json({ error: 'Geçersiz istek.' });

    const row = await db.getAsync(`SELECT ${col} as fname FROM simulator_uploads WHERE id = ?`, [id]);
    if (!row || !row.fname) return res.status(404).json({ error: 'Dosya bulunamadı.' });

    const filePath = path.join(STORAGE_DIR, path.basename(row.fname));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Dosya diskte bulunamadı.' });

    res.sendFile(filePath);
  } catch (_) {
    res.status(500).json({ error: 'Dosya okunamadı.' });
  }
});

module.exports = router;
