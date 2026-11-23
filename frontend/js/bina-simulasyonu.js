(function () {
  'use strict';

  const COLORS = [
    { code: 'AKD-101', name: 'PATARA KUMU', hex: '#EFECE4', cat: 'krem', light: true },
    { code: 'AKD-102', name: 'ASPENDOS FİLDİŞİ', hex: '#EFEAD8', cat: 'krem', light: true },
    { code: 'AKD-103', name: 'TOROS KARI', hex: '#F4F4EA', cat: 'krem', light: true },
    { code: 'AKD-104', name: 'KALEİÇİ KREMİ', hex: '#F5EED7', cat: 'krem', light: true },
    { code: 'AKD-105', name: 'LARA GÜNEŞİ', hex: '#EBD8A5', cat: 'krem', light: true },
    { code: 'AKD-106', name: 'PERGE TRAVERTENİ', hex: '#DBCDA0', cat: 'krem', light: true },
    { code: 'AKD-107', name: 'ÇIRALI ŞAFAĞI', hex: '#FAD6BA', cat: 'krem', light: true },
    { code: 'AKD-108', name: 'SİDE KUMTAŞI', hex: '#BCA179', cat: 'krem', light: false },
    { code: 'AKD-201', name: 'DÜDEN SİSİ', hex: '#DFE1DB', cat: 'gri', light: true },
    { code: 'AKD-202', name: 'BEYDAĞI BULUTU', hex: '#E3E8EE', cat: 'gri', light: true },
    { code: 'AKD-203', name: 'KONYAALTI ÇAKILI', hex: '#C6C2BA', cat: 'gri', light: true },
    { code: 'AKD-204', name: 'FALEZ GRİSİ', hex: '#9E9B95', cat: 'gri', light: false },
    { code: 'AKD-205', name: 'TAHTALI KAYASI', hex: '#838689', cat: 'gri', light: false },
    { code: 'AKD-206', name: 'KURŞUNLU ANTRASİT', hex: '#484C52', cat: 'gri', light: false },
    { code: 'AKD-301', name: 'KIZILKULE KİREMİT', hex: '#8A452B', cat: 'toprak', light: false },
    { code: 'AKD-302', name: 'LİKYA BORDO', hex: '#6B1D1D', cat: 'toprak', light: false },
    { code: 'AKD-303', name: 'TERMESSOS TOPRAĞI', hex: '#A46257', cat: 'toprak', light: false },
    { code: 'AKD-304', name: 'BEGONYA GÜLÜ', hex: '#E29E90', cat: 'toprak', light: true },
    { code: 'AKD-305', name: 'PORTAKAL ÇİÇEĞİ', hex: '#F8DFD8', cat: 'toprak', light: true },
    { code: 'AKD-306', name: 'ANTİK KİL', hex: '#AF8B79', cat: 'toprak', light: false },
    { code: 'AKD-307', name: 'DÖŞEMEALTI VİZON', hex: '#988F82', cat: 'toprak', light: false },
    { code: 'AKD-308', name: 'KÖPRÜLÜ KANYON', hex: '#7B5E40', cat: 'toprak', light: false },
    { code: 'AKD-309', name: 'SEDİR KAHVE', hex: '#5D3A28', cat: 'toprak', light: false },
    { code: 'AKD-310', name: 'KEÇİBOYNUZU KOYU', hex: '#463A32', cat: 'toprak', light: false },
    { code: 'AKD-401', name: 'KAŞ ESİNTİSİ', hex: '#CBE0E8', cat: 'akdeniz', light: true },
    { code: 'AKD-402', name: 'KEKOVA MAVİSİ', hex: '#B5C6D4', cat: 'akdeniz', light: true },
    { code: 'AKD-403', name: 'ADRASAN KOYU', hex: '#7D8B9B', cat: 'akdeniz', light: false },
    { code: 'AKD-404', name: 'PHASELİS LİLA', hex: '#A59290', cat: 'akdeniz', light: false },
    { code: 'AKD-405', name: 'OLYMPOS ZEYTİNİ', hex: '#AAB9A0', cat: 'akdeniz', light: true },
    { code: 'AKD-406', name: 'ÇAMDAĞI YEŞİLİ', hex: '#8FA287', cat: 'akdeniz', light: false },
  ];

  const STYLE_LABELS = {
    boya: 'Temiz Sıva + Dış Cephe Boya',
    mantolama_sove: 'Mantolama + Söve & Kat Silmesi',
    modern_antrasit: 'Modern Antrasit & Mimari Detay',
  };

  const state = {
    apiStatus: null,
    selectedColor: COLORS[14], // AKD-301 KIZILKULE KİREMİT
    colorCat: 'all',
    trimHex: '#F5F3EE',
    trimName: 'Kırık Beyaz Söve',
    style: 'mantolama_sove',

    // Yüklenen orijinal bina fotoğrafı
    hasPhoto: false,
    rawFile: null,             // Sunucuya orijinal haliyle kaydedilecek File nesnesi
    origDataUrl: '',
    uploadId: null,
    isSample: false,

    // Maket & Maskeler (Tek seferlik üretim sonrası 0 ms canlı boyama için)
    modelReady: false,
    busy: false,
    w: 0,
    h: 0,
    baseData: null,            // Uint8ClampedArray (RGBA) — temiz maket (veya orijinal)
    wallAlpha: null,           // Uint8Array (0..255)
    trimAlpha: null,           // Uint8Array (0..255)
    maskHistory: [],

    // Görünüm & Opsiyonel İnce Düzeltme
    viewMode: 'full',          // 'full' | 'split'
    splitPct: 50,
    editDrawerOpen: false,
    editTool: 'brush',         // 'brush' | 'eraser'
    brushRadius: 22,
    isDrawing: false,
    lastPt: null,
  };

  const $ = (id) => document.getElementById(id);

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    ];
  }

  function loadImageEl(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = src;
    });
  }

  function setBanner(type, html) {
    const el = $('simStatusBanner');
    if (!el) return;
    if (!html) {
      el.style.display = 'none';
      return;
    }
    el.className = 'sim-status-banner sim-status-' + type;
    el.innerHTML = html;
    el.style.display = 'flex';
  }

  // ── API Durumu ────────────────────────────────────────────────────────────
  async function loadApiStatus() {
    try {
      const res = await fetch('/api/simulate/status');
      const data = await res.json();
      if (!data || !data.ok) return;
      state.apiStatus = data;
      updateEnginePills();
    } catch (_) {}
  }

  function updateEnginePills() {
    const st = state.apiStatus;
    if (!st) return;

    const gEl = $('pillGeminiStatus');
    const sEl = $('pillSam2Status');
    const qEl = $('quotaBadgeText');

    if (gEl) {
      const ok = Boolean(st.engines?.geminiModel?.connected);
      gEl.textContent = ok ? 'Maket: Gemini Bağlı' : 'Maket: Anahtar Bekliyor';
      gEl.className = 'engine-pill ' + (ok ? 'is-ok' : 'is-wait');
    }
    if (sEl) {
      const ok = Boolean(st.engines?.sam2Mask?.connected);
      sEl.textContent = ok ? 'Maske: SAM2 Aktif' : 'Maske: SAM2 Bekliyor';
      sEl.className = 'engine-pill ' + (ok ? 'is-ok' : 'is-wait');
    }
    if (qEl) {
      qEl.textContent = `Kalan Ücretsiz Maket Hakkı: ${st.remainingFree}`;
    }
  }

  // ── 30'luk AKD Renk Kartelası ─────────────────────────────────────────────
  function renderPalette() {
    const grid = $('simPaletteGrid');
    if (!grid) return;
    const list = state.colorCat === 'all' ? COLORS : COLORS.filter((c) => c.cat === state.colorCat);
    grid.innerHTML = list.map((c) => {
      const act = c.code === state.selectedColor.code ? 'active' : '';
      const fg = c.light ? '#1a2e44' : '#ffffff';
      return `<button type="button" class="sim-swatch ${act}" data-code="${c.code}" style="background:${c.hex};color:${fg};" title="${c.code} ${c.name}">
        <span class="sw-code">${c.code}</span>
        <span class="sw-name">${c.name}</span>
      </button>`;
    }).join('');
  }

  function selectColor(code) {
    const found = COLORS.find((c) => c.code === code);
    if (!found) return;
    state.selectedColor = found;
    renderPalette();
    updateBottomSummary();
    if (state.modelReady) renderLiveModel();
  }

  function updateBottomSummary() {
    const c = state.selectedColor;
    if ($('selColorDot')) $('selColorDot').style.background = c.hex;
    if ($('selColorTitle')) $('selColorTitle').textContent = `${c.code} - ${c.name}`;
    if ($('selColorSub')) {
      const refTxt = state.uploadId ? ` • Ref #${state.uploadId}` : (state.isSample ? ' • Örnek Maket' : '');
      $('selColorSub').textContent = `${state.trimName} • ${STYLE_LABELS[state.style]}${refTxt}`;
    }

    const refPart = state.uploadId ? ` (Kayıtlı bina fotoğrafı Ref #${state.uploadId})` : '';
    const waMsg = encodeURIComponent(
      `Merhaba, antalyadiscephe.com Bina Maket Simülatöründe ${c.code} ${c.name} + ${state.trimName} (${STYLE_LABELS[state.style]}) kombinasyonunu denedim${refPart}. Ücretsiz keşif ve fiyat teklifi almak istiyorum.`
    );
    const waUrl = `https://wa.me/905309361017?text=${waMsg}`;
    if ($('btnQuoteWa')) $('btnQuoteWa').href = waUrl;
    if ($('floatWaBtn')) $('floatWaBtn').href = waUrl;

    if ($('btnDownloadImg')) $('btnDownloadImg').disabled = !state.modelReady;
    if ($('baAfterTag')) $('baAfterTag').textContent = `YENİ MAKET (${c.code})`;
  }

  // ── 0 ms Canlı Boyama Motoru (Duvar + Söve) ───────────────────────────────
  function renderLiveModel() {
    if (!state.modelReady || !state.baseData) return;
    const canvas = $('simLiveCanvas');
    const ctx = canvas.getContext('2d');
    const w = state.w, h = state.h;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const src = state.baseData;
    const wMask = state.wallAlpha;
    const tMask = state.trimAlpha;
    const out = ctx.createImageData(w, h);
    const dst = out.data;

    const [wr, wg, wb] = hexToRgb(state.selectedColor.hex);
    const [tr, tg, tb] = hexToRgb(state.trimHex);
    const total = w * h;

    // Duvar ve söve parlaklığını maketin kendi ışığına göre dinamik normalize et
    let wLumSum = 0, wLumCnt = 0;
    let tLumSum = 0, tLumCnt = 0;
    for (let i = 0; i < total; i += 4) {
      const idx = i * 4;
      const lum = (0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2]) / 255;
      if (wMask && wMask[i] > 128) { wLumSum += lum; wLumCnt++; }
      else if (tMask && tMask[i] > 128) { tLumSum += lum; tLumCnt++; }
    }
    const baseWLum = wLumCnt > 40 ? Math.max(0.36, Math.min(0.86, wLumSum / wLumCnt)) : 0.72;
    const baseTLum = tLumCnt > 20 ? Math.max(0.20, Math.min(0.88, tLumSum / tLumCnt)) : 0.80;

    for (let i = 0; i < total; i++) {
      const idx = i * 4;
      const sr = src[idx], sg = src[idx + 1], sb = src[idx + 2];
      const wa = wMask ? wMask[i] / 255 : 0;
      const ta = tMask ? tMask[i] / 255 : 0;

      if (wa <= 0.01 && ta <= 0.01) {
        dst[idx] = sr;
        dst[idx + 1] = sg;
        dst[idx + 2] = sb;
        dst[idx + 3] = 255;
        continue;
      }

      const lum = (0.299 * sr + 0.587 * sg + 0.114 * sb) / 255;
      let r = sr, g = sg, b = sb;

      if (wa > 0.01) {
        const shade = Math.max(0.18, Math.min(1.34, lum / baseWLum));
        const nr = Math.min(255, wr * 255 * shade);
        const ng = Math.min(255, wg * 255 * shade);
        const nb = Math.min(255, wb * 255 * shade);
        r = r * (1 - wa) + nr * wa;
        g = g * (1 - wa) + ng * wa;
        b = b * (1 - wa) + nb * wa;
      }

      if (ta > 0.01) {
        const shadeT = Math.max(0.24, Math.min(1.28, lum / baseTLum));
        const nr = Math.min(255, tr * 255 * shadeT);
        const ng = Math.min(255, tg * 255 * shadeT);
        const nb = Math.min(255, tb * 255 * shadeT);
        r = r * (1 - ta) + nr * ta;
        g = g * (1 - ta) + ng * ta;
        b = b * (1 - ta) + nb * ta;
      }

      dst[idx] = Math.round(r);
      dst[idx + 1] = Math.round(g);
      dst[idx + 2] = Math.round(b);
      dst[idx + 3] = 255;
    }

    ctx.putImageData(out, 0, 0);
  }

  // ── Görünüm (Tam Ekran Maket ↔ Öncesi / Sonrası Kaydırıcı) ────────────────
  function setViewMode(mode) {
    state.viewMode = mode;
    $('btnViewFull').classList.toggle('active', mode === 'full');
    $('btnViewSplit').classList.toggle('active', mode === 'split');

    const wrap = $('stageCompareWrap');
    if (mode === 'split' && state.modelReady) {
      wrap.classList.add('is-split');
      applySplitPct(state.splitPct);
    } else {
      wrap.classList.remove('is-split');
      $('afterClipWrap').style.clipPath = 'inset(0 0 0 0)';
    }
  }

  function applySplitPct(pct) {
    const c = Math.max(2, Math.min(98, pct));
    state.splitPct = c;
    if (state.viewMode === 'split') {
      $('afterClipWrap').style.clipPath = `inset(0 0 0 ${c}%)`;
      $('splitHandle').style.left = `${c}%`;
    }
  }

  // ── Fotoğraf Yükleme (Orijinal Dosyayı Koruyarak) ─────────────────────────
  function handleUploadedFile(file) {
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      setBanner('error', '<i class="fas fa-exclamation-triangle"></i> Lütfen JPG, PNG veya WebP formatında bir bina fotoğrafı seçin.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setBanner('error', '<i class="fas fa-exclamation-triangle"></i> Fotoğraf boyutu 10 MB üzerinde. Lütfen daha küçük bir görsel seçin.');
      return;
    }

    state.rawFile = file;
    state.isSample = false;
    state.uploadId = null;
    state.modelReady = false;
    state.wallAlpha = null;
    state.trimAlpha = null;
    state.maskHistory = [];

    const reader = new FileReader();
    reader.onload = async (ev) => {
      state.origDataUrl = ev.target.result;
      try {
        const im = await loadImageEl(state.origDataUrl);
        initStageWithImage(im);
        state.hasPhoto = true;
        $('uploadDropzone').classList.add('has-photo');
        $('activeStageWrap').style.display = 'block';
        $('btnChangePhoto').style.display = 'inline-flex';
        $('stageReadyControls').style.display = 'none';
        $('stagePreModelHint').style.display = 'flex';
        $('btnBuildModel').disabled = false;
        setViewMode('full');
        setBanner('info', '<i class="fas fa-camera"></i> Bina fotoğrafınız yüklendi! Sağdan maket paketini seçip <strong>"1. Binamın Maketini Çıkar"</strong> butonuna basın (fotoğrafınız orijinal haliyle kaydedilip tek seferde modellenecektir).');
        updateBottomSummary();
      } catch (_) {
        setBanner('error', 'Fotoğraf okunamadı. Lütfen başka bir görsel deneyin.');
      }
    };
    reader.readAsDataURL(file);
  }

  function initStageWithImage(im) {
    const maxW = 1040, maxH = 760;
    const ratio = Math.min(1, maxW / im.naturalWidth, maxH / im.naturalHeight);
    const w = Math.max(120, Math.round(im.naturalWidth * ratio));
    const h = Math.max(120, Math.round(im.naturalHeight * ratio));

    state.w = w;
    state.h = h;

    const canvas = $('simLiveCanvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(im, 0, 0, w, h);
    state.baseData = ctx.getImageData(0, 0, w, h).data;

    $('imgOriginalBg').src = state.origDataUrl;
  }

  // ── Hazır Örnek Maketleri Yükle (Apartman & Villa — 0 sn Canlı Demo!) ─────
  async function loadSampleModel(kind) {
    const cfg = kind === 'villa'
      ? {
          base: '/images/sim-villa-base.webp?v=20261123b',
          wall: '/images/sim-villa-wall-mask.png?v=20261123b',
          trim: '/images/sim-villa-trim-mask.png?v=20261123b',
          label: 'Örnek Müstakil Villa',
        }
      : {
          base: '/images/sim-apartman-base.webp?v=20261123',
          wall: '/images/sim-apartman-wall-mask.png?v=20261123',
          trim: '/images/sim-apartman-trim-mask.png?v=20261123',
          label: 'Örnek 5 Katlı Apartman',
        };

    setBanner('info', `<i class="fas fa-spinner fa-spin"></i> ${cfg.label} maketi ve duvar/söve katmanları yükleniyor...`);
    try {
      const [baseIm, wallIm, trimIm] = await Promise.all([
        loadImageEl(cfg.base),
        loadImageEl(cfg.wall),
        loadImageEl(cfg.trim),
      ]);

      state.hasPhoto = true;
      state.isSample = true;
      state.rawFile = null;
      state.uploadId = null;
      state.origDataUrl = cfg.base;

      initStageWithImage(baseIm);
      state.wallAlpha = extractAlphaChannel(wallIm, state.w, state.h, true);
      state.trimAlpha = extractAlphaChannel(trimIm, state.w, state.h, true);
      state.modelReady = true;
      state.maskHistory = [];

      $('uploadDropzone').classList.add('has-photo');
      $('activeStageWrap').style.display = 'block';
      $('btnChangePhoto').style.display = 'inline-flex';
      $('stageReadyControls').style.display = 'flex';
      $('stagePreModelHint').style.display = 'none';
      $('btnBuildModel').disabled = true;

      renderLiveModel();
      setViewMode('full');
      setBanner('success', `<i class="fas fa-check-circle"></i> <strong>${cfg.label} Maketi Hazır!</strong> Sağdaki 30 AKD rengine ve 3 söve tonuna tıklayarak 0 saniyede canlı geçişi test edin. Kendi binanız için üstten <strong>"Fotoğraf Değiştir"</strong>e basın.`);
      updateBottomSummary();
    } catch (_) {
      setBanner('error', 'Örnek maket yüklenemedi.');
    }
  }

  function extractAlphaChannel(im, w, h, useAlpha = true) {
    const tc = document.createElement('canvas');
    tc.width = w;
    tc.height = h;
    const ctx = tc.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(im, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const out = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      out[i] = useAlpha ? d[i * 4 + 3] : d[i * 4]; // SAM2 siyah-beyaz PNG'de R kanalı, şeffaf maskede Alpha kanalı
    }
    return out;
  }

  // ── Yedek Maske Oluşturucu (Vision Hints / Temiz Maket Chroma) ────────────
  function buildMaskFromHints(srcRgba, w, h, hints, isCleanNeutralModel) {
    const wall = new Uint8Array(w * h);
    const trim = new Uint8Array(w * h);

    const bBox = hints?.buildingBox || [60, 60, 940, 940];
    const minX = Math.max(0, Math.floor((bBox[1] / 1000) * w));
    const maxX = Math.min(w - 1, Math.ceil((bBox[3] / 1000) * w));
    const minY = Math.max(0, Math.floor((bBox[0] / 1000) * h));
    const maxY = Math.min(h - 1, Math.ceil((bBox[2] / 1000) * h));

    const excl = (hints?.excludeBoxes || []).map((b) => [
      Math.floor((b[1] / 1000) * w),
      Math.floor((b[0] / 1000) * h),
      Math.ceil((b[3] / 1000) * w),
      Math.ceil((b[2] / 1000) * h),
    ]);

    function isExcl(x, y) {
      for (let k = 0; k < excl.length; k++) {
        const r = excl[k];
        if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return true;
      }
      return false;
    }

    // Temiz Gemini maketi üretildiyse (#EAE7E0 nötr duvar + #383D45 koyu söve) doğrudan tonla ayır
    if (isCleanNeutralModel) {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (isExcl(x, y)) continue;
          const p = y * w + x;
          const idx = p * 4;
          const r = srcRgba[idx], g = srcRgba[idx + 1], b = srcRgba[idx + 2];
          const maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
          const sat = maxc === 0 ? 0 : (maxc - minc) / maxc;
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          if (sat < 0.18 && lum > 0.54 && lum < 0.96) {
            wall[p] = 255;
          } else if (sat < 0.22 && lum >= 0.14 && lum <= 0.36) {
            trim[p] = 255;
          }
        }
      }
      softenMask(wall, w, h);
      softenMask(trim, w, h);
      return { wall, trim };
    }

    // Aksi halde Vision duvar tohumlarından kontrollü flood-fill
    const seeds = hints?.wallSeeds || [[500, 450]];
    const tol = 34;
    const maxDistSq = tol * tol * 3.1;
    const stepSq = 24 * 24 * 3;
    const visited = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);

    for (const seed of seeds) {
      const sx = Math.max(minX, Math.min(maxX, Math.round((seed[0] / 1000) * w)));
      const sy = Math.max(minY, Math.min(maxY, Math.round((seed[1] / 1000) * h)));
      const sPos = sy * w + sx;
      if (visited[sPos] || isExcl(sx, sy)) continue;

      const sIdx = sPos * 4;
      const sr = srcRgba[sIdx], sg = srcRgba[sIdx + 1], sb = srcRgba[sIdx + 2];
      let head = 0, tail = 0;
      visited[sPos] = 1;
      queue[tail++] = sPos;

      while (head < tail) {
        const pos = queue[head++];
        const x = pos % w;
        const y = (pos - x) / w;
        if (isExcl(x, y)) continue;
        wall[pos] = 255;

        const pIdx = pos * 4;
        const pr = srcRgba[pIdx], pg = srcRgba[pIdx + 1], pb = srcRgba[pIdx + 2];
        const nb = [
          x > minX ? pos - 1 : -1,
          x < maxX ? pos + 1 : -1,
          y > minY ? pos - w : -1,
          y < maxY ? pos + w : -1,
        ];
        for (let k = 0; k < 4; k++) {
          const np = nb[k];
          if (np < 0 || visited[np]) continue;
          const nIdx = np * 4;
          const nr = srcRgba[nIdx], ng = srcRgba[nIdx + 1], nbv = srcRgba[nIdx + 2];
          if ((nr - sr) ** 2 + (ng - sg) ** 2 + (nbv - sb) ** 2 > maxDistSq) continue;
          if ((nr - pr) ** 2 + (ng - pg) ** 2 + (nbv - pb) ** 2 > stepSq) continue;
          visited[np] = 1;
          queue[tail++] = np;
        }
      }
    }
    softenMask(wall, w, h);
    return { wall, trim };
  }

  function softenMask(arr, w, h) {
    const cp = new Uint8Array(arr);
    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const i = row + x;
        arr[i] = Math.round(
          (cp[i - w - 1] + cp[i - w] + cp[i - w + 1] +
           cp[i - 1] + cp[i] * 2 + cp[i + 1] +
           cp[i + w - 1] + cp[i + w] + cp[i + w + 1]) / 10
        );
      }
    }
  }

  // ── TEK SEFERLİK MAKET + SAM2 MASKE ÇALIŞTIRICI ───────────────────────────
  async function runBuildModel() {
    if (!state.rawFile) {
      setBanner('error', '<i class="fas fa-camera"></i> Lütfen önce kendi bina fotoğrafınızı yükleyin.');
      return;
    }
    if (state.busy) return;

    state.busy = true;
    const btn = $('btnBuildModel');
    const loader = $('modelBuildLoader');
    const stepTxt = $('loaderStepText');
    btn.disabled = true;
    if (loader) loader.style.display = 'flex';
    if (stepTxt) stepTxt.textContent = 'Adım 1/2: Orijinal fotoğrafınız kaydediliyor ve temiz mimari maket üretiliyor (Gemini)...';
    setBanner('info', '<i class="fas fa-spinner fa-spin"></i> Tek seferlik bina maketiniz ve SAM2 maskeleriniz hazırlanıyor (10–15 sn)...');

    const stepTimer = setTimeout(() => {
      if (stepTxt) stepTxt.textContent = 'Adım 2/2: Duvar ve söve katmanları piksel hassasiyetinde ayrıştırılıyor (SAM2)...';
    }, 4500);

    try {
      const fd = new FormData();
      fd.append('photo', state.rawFile, state.rawFile.name || 'bina.jpg');
      fd.append('style', state.style);

      const res = await fetch('/api/simulate/build-model', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));

      if (res.status === 402 && data.needsLeadUnlock) {
        openLeadModal('Ücretsiz bina modelleme hakkınız doldu! Telefon ve ilçe bilginizi bırakarak +5 ücretsiz hak açabilirsiniz.');
        setBanner('warn', '<i class="fas fa-lock"></i> ' + (data.error || 'Ek hak için formu doldurun.'));
        return;
      }

      if (!res.ok || !data.ok) {
        setBanner('error', '<i class="fas fa-exclamation-triangle"></i> ' + (data.error || 'Bina maketi oluşturulamadı.'));
        return;
      }

      state.uploadId = data.uploadId || null;
      if (typeof data.remainingFree === 'number' && state.apiStatus) {
        state.apiStatus.remainingFree = data.remainingFree;
        updateEnginePills();
      }

      // 1) Base görseli yükle (Gemini temiz maketi geldiyse onu, gelmediyse mevcut fotoğrafı)
      if (data.baseDataUrl) {
        const modelIm = await loadImageEl(data.baseDataUrl);
        initStageWithImage(modelIm);
      }

      // 2) Maskeleri yükle (SAM2 PNG maskeleri geldiyse onları, değilse akıllı yedek maskeyi)
      if (data.wallMaskDataUrl) {
        const wIm = await loadImageEl(data.wallMaskDataUrl);
        state.wallAlpha = extractAlphaChannel(wIm, state.w, state.h, false);
        if (data.trimMaskDataUrl) {
          const tIm = await loadImageEl(data.trimMaskDataUrl);
          state.trimAlpha = extractAlphaChannel(tIm, state.w, state.h, false);
          for (let i = 0; i < state.wallAlpha.length; i++) {
            if (state.trimAlpha[i] > 128) state.wallAlpha[i] = 0;
          }
        } else {
          state.trimAlpha = new Uint8Array(state.w * state.h);
        }
      } else {
        const built = buildMaskFromHints(state.baseData, state.w, state.h, data.hints, Boolean(data.hasCleanModel));
        state.wallAlpha = built.wall;
        state.trimAlpha = built.trim;
      }

      state.modelReady = true;
      state.maskHistory = [];
      $('stageReadyControls').style.display = 'flex';
      $('stagePreModelHint').style.display = 'none';

      renderLiveModel();
      setViewMode('split');
      applySplitPct(45);

      const bannerKind = data.isFullQuality ? 'success' : 'warn';
      const icon = data.isFullQuality ? 'fa-check-circle' : 'fa-database';
      setBanner(bannerKind, `<i class="fas ${icon}"></i> <span>${data.notice || 'Bina maketiniz hazır!'}</span>`);
      updateBottomSummary();
    } catch (_) {
      setBanner('error', '<i class="fas fa-wifi"></i> Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
    } finally {
      clearTimeout(stepTimer);
      state.busy = false;
      btn.disabled = false;
      if (loader) loader.style.display = 'none';
    }
  }

  // ── Opsiyonel İnce Düzeltme Fırçası ───────────────────────────────────────
  function pushUndo() {
    if (!state.wallAlpha) return;
    state.maskHistory.push(new Uint8Array(state.wallAlpha));
    if (state.maskHistory.length > 12) state.maskHistory.shift();
  }

  function paintAt(cx, cy, r, addMode) {
    if (!state.wallAlpha) return;
    const w = state.w, h = state.h;
    const rad = Math.max(4, Math.round(r));
    const rSq = rad * rad;
    const x0 = Math.max(0, Math.floor(cx - rad));
    const x1 = Math.min(w - 1, Math.ceil(cx + rad));
    const y0 = Math.max(0, Math.floor(cy - rad));
    const y1 = Math.min(h - 1, Math.ceil(cy + rad));
    const val = addMode ? 255 : 0;
    for (let y = y0; y <= y1; y++) {
      const dy = y - cy;
      const row = y * w;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        if (dx * dx + dy * dy <= rSq) {
          state.wallAlpha[row + x] = val;
        }
      }
    }
  }

  function paintSegment(p1, p2, r, addMode) {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(1, Math.ceil(dist / Math.max(2, r * 0.3)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      paintAt(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t, r, addMode);
    }
  }

  function canvasPt(clientX, clientY) {
    const canvas = $('simLiveCanvas');
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  // ── Filigranlı JPG İndir (WhatsApp Grubu Paylaşımı İçin) ──────────────────
  function downloadWatermarkedJpg() {
    if (!state.modelReady) return;
    const srcCanvas = $('simLiveCanvas');
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const footerH = Math.max(54, Math.round(h * 0.095));

    const exp = document.createElement('canvas');
    exp.width = w;
    exp.height = h + footerH;
    const ctx = exp.getContext('2d');

    ctx.drawImage(srcCanvas, 0, 0, w, h);
    ctx.fillStyle = '#1A2E44';
    ctx.fillRect(0, h, w, footerH);
    ctx.fillStyle = '#C9A227';
    ctx.fillRect(0, h, w, 3);

    const pad = Math.round(w * 0.025);
    const fMain = Math.max(13, Math.round(footerH * 0.30));
    const fSub = Math.max(11, Math.round(footerH * 0.22));

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${fMain}px Montserrat, Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText('AKDENİZ YAPI DEKORASYON', pad, h + footerH * 0.36);

    ctx.fillStyle = '#E5C65C';
    ctx.font = `600 ${fSub}px Open Sans, Arial, sans-serif`;
    ctx.fillText('antalyadiscephe.com  •  Ücretsiz Keşif: 0530 936 10 17', pad, h + footerH * 0.72);

    const label = `${state.selectedColor.code} ${state.selectedColor.name}`;
    ctx.font = `700 ${fSub}px Montserrat, Arial, sans-serif`;
    const txtW = ctx.measureText(label).width;
    const swSize = Math.round(footerH * 0.44);
    const rightX = w - pad;

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.fillText(label, rightX, h + footerH * 0.40);

    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = `600 ${Math.max(10, fSub - 1)}px Open Sans, Arial, sans-serif`;
    ctx.fillText(state.trimName, rightX, h + footerH * 0.74);

    const boxX = rightX - txtW - swSize - 10;
    const boxY = h + (footerH - swSize) / 2;
    ctx.fillStyle = state.selectedColor.hex;
    ctx.fillRect(boxX, boxY, swSize, swSize);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, swSize, swSize);

    const link = document.createElement('a');
    link.download = `akdeniz-yapi-maket-${state.selectedColor.code.toLowerCase()}.jpg`;
    link.href = exp.toDataURL('image/jpeg', 0.92);
    link.click();
  }

  // ── Lead Unlock Modalı ────────────────────────────────────────────────────
  function openLeadModal(txt) {
    if (txt) $('leadModalSub').textContent = txt;
    $('leadFormMsg').style.display = 'none';
    $('leadModal').style.display = 'flex';
  }

  function closeLeadModal() {
    $('leadModal').style.display = 'none';
  }

  async function submitLeadForm(ev) {
    ev.preventDefault();
    const msgEl = $('leadFormMsg');
    const submitBtn = $('leadSubmitBtn');
    const kvkk = $('leadKvkk').checked;
    if (!kvkk) {
      msgEl.className = 'lead-msg is-err';
      msgEl.textContent = 'Lütfen KVKK Aydınlatma Metni onay kutusunu işaretleyin.';
      msgEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    try {
      const res = await fetch('/api/simulate/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: $('leadName').value.trim(),
          phone: $('leadPhone').value.trim(),
          district: $('leadDistrict').value,
          colorCode: state.selectedColor.code,
          colorName: state.selectedColor.name,
          trimName: state.trimName,
          style: state.style,
          uploadId: state.uploadId,
          kvkk_consent: kvkk,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        msgEl.className = 'lead-msg is-err';
        msgEl.textContent = data.error || 'Talebiniz gönderilemedi.';
        msgEl.style.display = 'block';
        return;
      }

      if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', {
          event_category: 'facade_model_simulator',
          event_label: `${state.selectedColor.code}_${$('leadDistrict').value}`,
        });
      }
      if (typeof data.remainingFree === 'number' && state.apiStatus) {
        state.apiStatus.remainingFree = data.remainingFree;
        updateEnginePills();
      }
      msgEl.className = 'lead-msg is-ok';
      msgEl.textContent = data.message || 'Talebiniz alındı! +5 ücretsiz hak tanımlandı.';
      msgEl.style.display = 'block';
      $('leadForm').reset();
      setTimeout(closeLeadModal, 1800);
    } catch (_) {
      msgEl.className = 'lead-msg is-err';
      msgEl.textContent = 'Bağlantı hatası. Doğrudan 0530 936 10 17 numarasından ulaşabilirsiniz.';
      msgEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
    }
  }

  // ── Event Listener'lar ────────────────────────────────────────────────────
  function bindEvents() {
    const fileInput = $('buildingFileInput');
    const dropzone = $('uploadDropzone');

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleUploadedFile(e.target.files[0]);
      fileInput.value = '';
    });
    $('btnChangePhoto').addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('is-dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleUploadedFile(e.dataTransfer.files[0]);
    });

    $('btnSampleApt').addEventListener('click', () => loadSampleModel('apartman'));
    $('btnSampleVilla').addEventListener('click', () => loadSampleModel('villa'));

    document.querySelectorAll('.style-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.style-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.style = btn.dataset.style;
        updateBottomSummary();
      });
    });

    $('btnBuildModel').addEventListener('click', runBuildModel);

    document.querySelectorAll('#simCatTabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#simCatTabs button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.colorCat = btn.dataset.cat;
        renderPalette();
      });
    });

    $('simPaletteGrid').addEventListener('click', (e) => {
      const sw = e.target.closest('.sim-swatch');
      if (sw) selectColor(sw.dataset.code);
    });

    document.querySelectorAll('.sim-trim-dot').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sim-trim-dot').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.trimHex = btn.dataset.trim;
        state.trimName = btn.dataset.name;
        updateBottomSummary();
        if (state.modelReady) renderLiveModel();
      });
    });

    $('btnViewFull').addEventListener('click', () => setViewMode('full'));
    $('btnViewSplit').addEventListener('click', () => setViewMode('split'));

    // Öncesi / Sonrası kaydırıcı sürükleme
    const wrap = $('stageCompareWrap');
    let draggingSplit = false;
    function updateSplit(clientX) {
      const rect = wrap.getBoundingClientRect();
      applySplitPct(((clientX - rect.left) / rect.width) * 100);
    }
    wrap.addEventListener('mousedown', (e) => {
      if (state.viewMode !== 'split' || state.editDrawerOpen) return;
      draggingSplit = true;
      updateSplit(e.clientX);
    });
    window.addEventListener('mousemove', (e) => { if (draggingSplit) updateSplit(e.clientX); });
    window.addEventListener('mouseup', () => { draggingSplit = false; });
    wrap.addEventListener('touchstart', (e) => {
      if (state.viewMode !== 'split' || state.editDrawerOpen || !e.touches[0]) return;
      draggingSplit = true;
      updateSplit(e.touches[0].clientX);
    }, { passive: true });
    wrap.addEventListener('touchmove', (e) => {
      if (draggingSplit && e.touches[0]) updateSplit(e.touches[0].clientX);
    }, { passive: true });
    wrap.addEventListener('touchend', () => { draggingSplit = false; });

    // Opsiyonel İnce Düzeltme çekmecesi
    $('btnToggleRefine').addEventListener('click', () => {
      state.editDrawerOpen = !state.editDrawerOpen;
      $('refineDrawer').style.display = state.editDrawerOpen ? 'flex' : 'none';
      $('btnToggleRefine').classList.toggle('active', state.editDrawerOpen);
      if (state.editDrawerOpen) setViewMode('full');
      $('simLiveCanvas').style.cursor = state.editDrawerOpen ? 'crosshair' : 'default';
    });

    document.querySelectorAll('.refine-tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.refine-tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.editTool = btn.dataset.tool;
      });
    });
    $('rangeBrush').addEventListener('input', (e) => {
      state.brushRadius = parseInt(e.target.value, 10) || 22;
      $('lblBrush').textContent = state.brushRadius + 'px';
    });
    $('btnUndoRefine').addEventListener('click', () => {
      if (!state.maskHistory.length) return;
      state.wallAlpha = state.maskHistory.pop();
      renderLiveModel();
    });

    const canvas = $('simLiveCanvas');
    canvas.addEventListener('mousedown', (e) => {
      if (!state.editDrawerOpen || !state.modelReady) return;
      pushUndo();
      state.isDrawing = true;
      const pt = canvasPt(e.clientX, e.clientY);
      state.lastPt = pt;
      paintAt(pt.x, pt.y, state.brushRadius, state.editTool === 'brush');
      renderLiveModel();
    });
    window.addEventListener('mousemove', (e) => {
      if (!state.isDrawing) return;
      const pt = canvasPt(e.clientX, e.clientY);
      paintSegment(state.lastPt || pt, pt, state.brushRadius, state.editTool === 'brush');
      state.lastPt = pt;
      renderLiveModel();
    });
    window.addEventListener('mouseup', () => { state.isDrawing = false; state.lastPt = null; });

    canvas.addEventListener('touchstart', (e) => {
      if (!state.editDrawerOpen || !state.modelReady || !e.touches[0]) return;
      e.preventDefault();
      pushUndo();
      state.isDrawing = true;
      const pt = canvasPt(e.touches[0].clientX, e.touches[0].clientY);
      state.lastPt = pt;
      paintAt(pt.x, pt.y, state.brushRadius, state.editTool === 'brush');
      renderLiveModel();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      if (!state.isDrawing || !e.touches[0]) return;
      e.preventDefault();
      const pt = canvasPt(e.touches[0].clientX, e.touches[0].clientY);
      paintSegment(state.lastPt || pt, pt, state.brushRadius, state.editTool === 'brush');
      state.lastPt = pt;
      renderLiveModel();
    }, { passive: false });
    canvas.addEventListener('touchend', () => { state.isDrawing = false; state.lastPt = null; });

    $('btnDownloadImg').addEventListener('click', downloadWatermarkedJpg);
    $('btnOpenLeadModal').addEventListener('click', () => {
      openLeadModal('Binanız için ücretsiz yerinde basılı kartela keşfi ve +5 ek bina maketi hakkı kazanın.');
    });
    $('btnCloseLeadModal').addEventListener('click', closeLeadModal);
    $('leadModal').addEventListener('click', (e) => { if (e.target === $('leadModal')) closeLeadModal(); });
    $('leadForm').addEventListener('submit', submitLeadForm);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderPalette();
    bindEvents();
    updateBottomSummary();
    loadApiStatus();
  });
})();
