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

  const COLOR_MAP = Object.fromEntries(COLORS.map((c) => [c.code, c]));

  const state = {
    uploadId: null,
    isSample: false,
    busy: false,
    analysis: null,

    // Aktif canlı boyama durumu
    paintReady: false,
    w: 0,
    h: 0,
    origDataUrl: '',
    baseData: null,           // Uint8ClampedArray (RGBA)
    wallAlpha: null,          // Uint8Array (0..255) — SegFormer-B2 + OpenCV maskesi
    maskHistory: [],

    // Görünüm & opsiyonel fırça
    viewMode: 'split',        // 'full' | 'split'
    splitPct: 48,
    refineOpen: false,
    refineTool: 'eraser',     // 'brush' | 'eraser'
    brushRadius: 22,
    isDrawing: false,
    lastPt: null,

    // Seçilen renkler
    activePaintCode: 'AKD-301', // Ekranda o an boyanan renk
    selectedCodes: ['AKD-301'], // 3D talep için seçili 1-3 renk
    colorCat: 'all',
    trimName: 'Kırık Beyaz Söve',
    serviceType: 'Mantolama + Söve & Boya',
  };

  const $ = (id) => document.getElementById(id);

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    ];
  }

  function loadImg(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = src;
    });
  }

  function setBanner(type, html) {
    const el = $('aiStatusBanner');
    if (!el) return;
    if (!html) { el.style.display = 'none'; return; }
    el.className = 'sim-status-banner sim-status-' + type;
    el.innerHTML = html;
    el.style.display = 'flex';
  }

  // ── 0 ms Canlı Fotoğraf Boyama Motoru (SegFormer-B2 Maskesi Üzerinden) ────
  function renderLivePaintedPhoto() {
    if (!state.paintReady || !state.baseData || !state.wallAlpha) return;
    const canvas = $('simLiveCanvas');
    const ctx = canvas.getContext('2d');
    const w = state.w, h = state.h;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const src = state.baseData;
    const mask = state.wallAlpha;
    const out = ctx.createImageData(w, h);
    const dst = out.data;

    const c = COLOR_MAP[state.activePaintCode] || COLORS[14];
    const [tr, tg, tb] = hexToRgb(c.hex);
    const total = w * h;

    // Binanın kendi duvar parlaklığını dinamik normalize et (gölge & doku %100 korunur)
    let lumSum = 0, lumCnt = 0;
    for (let i = 0; i < total; i += 4) {
      if (mask[i] > 128) {
        const idx = i * 4;
        lumSum += (0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2]) / 255;
        lumCnt++;
      }
    }
    const baseLum = lumCnt > 40 ? Math.max(0.35, Math.min(0.86, lumSum / lumCnt)) : 0.72;

    for (let i = 0; i < total; i++) {
      const idx = i * 4;
      const a = mask[i] / 255;
      const sr = src[idx], sg = src[idx + 1], sb = src[idx + 2];

      if (a <= 0.01) {
        dst[idx] = sr;
        dst[idx + 1] = sg;
        dst[idx + 2] = sb;
        dst[idx + 3] = 255;
        continue;
      }

      const lum = (0.299 * sr + 0.587 * sg + 0.114 * sb) / 255;
      const shade = Math.max(0.18, Math.min(1.34, lum / baseLum));
      const nr = Math.min(255, tr * 255 * shade);
      const ng = Math.min(255, tg * 255 * shade);
      const nb = Math.min(255, tb * 255 * shade);

      dst[idx] = Math.round(sr * (1 - a) + nr * a);
      dst[idx + 1] = Math.round(sg * (1 - a) + ng * a);
      dst[idx + 2] = Math.round(sb * (1 - a) + nb * a);
      dst[idx + 3] = 255;
    }

    ctx.putImageData(out, 0, 0);

    if ($('baAfterTag')) {
      $('baAfterTag').textContent = `BOYALI (${c.code} ${c.name})`;
    }
    if ($('btnDownloadPainted')) {
      $('btnDownloadPainted').disabled = false;
    }
  }

  function setViewMode(mode) {
    state.viewMode = mode;
    if ($('btnViewFull')) $('btnViewFull').classList.toggle('active', mode === 'full');
    if ($('btnViewSplit')) $('btnViewSplit').classList.toggle('active', mode === 'split');

    const wrap = $('stageCompareWrap');
    if (!wrap) return;
    if (mode === 'split' && state.paintReady) {
      wrap.classList.add('is-split');
      applySplitPct(state.splitPct);
    } else {
      wrap.classList.remove('is-split');
      if ($('afterClipWrap')) $('afterClipWrap').style.clipPath = 'inset(0 0 0 0)';
    }
  }

  function applySplitPct(pct) {
    const c = Math.max(2, Math.min(98, pct));
    state.splitPct = c;
    if (state.viewMode === 'split') {
      if ($('afterClipWrap')) $('afterClipWrap').style.clipPath = `inset(0 0 0 ${c}%)`;
      if ($('splitHandle')) $('splitHandle').style.left = `${c}%`;
    }
  }

  // ── 30'luk AKD Kartela ────────────────────────────────────────────────────
  function renderPalette() {
    const grid = $('simPaletteGrid');
    if (!grid) return;
    const list = state.colorCat === 'all' ? COLORS : COLORS.filter((c) => c.cat === state.colorCat);
    grid.innerHTML = list.map((c) => {
      const isPainting = c.code === state.activePaintCode;
      const inReq = state.selectedCodes.includes(c.code);
      const fg = c.light ? '#1a2e44' : '#ffffff';
      return `<button type="button" class="sim-swatch ${isPainting ? 'is-painting' : ''} ${inReq ? 'active' : ''}" data-code="${c.code}" style="background:${c.hex};color:${fg};" title="Tıklayın: binanızı ${c.code} ${c.name} ile anında boyayın">
        ${isPainting ? '<span class="sw-pick-badge"><i class="fas fa-paint-roller"></i></span>' : ''}
        <span class="sw-code">${c.code}</span>
        <span class="sw-name">${c.name}</span>
      </button>`;
    }).join('');
  }

  function renderSelectedChips() {
    const wrap = $('selectedColorChips');
    if (!wrap) return;
    wrap.innerHTML = state.selectedCodes.map((code) => {
      const c = COLOR_MAP[code];
      if (!c) return '';
      const isAct = code === state.activePaintCode ? 'is-active-chip' : '';
      return `<span class="picked-chip ${isAct}" data-focus-code="${c.code}" style="cursor:pointer;" title="Binada bu rengi göster">
        <span class="picked-dot" style="background:${c.hex};"></span>
        <span>${c.code} ${c.name}</span>
        <button type="button" data-remove="${c.code}" aria-label="${c.code} kaldır">&times;</button>
      </span>`;
    }).join('');
    updateQuickWaLink();
  }

  function applyPaintColor(code, alsoAddToList = true) {
    if (!COLOR_MAP[code]) return;
    state.activePaintCode = code;

    if (alsoAddToList && !state.selectedCodes.includes(code)) {
      if (state.selectedCodes.length >= 3) state.selectedCodes.shift();
      state.selectedCodes.push(code);
    }

    renderPalette();
    renderSelectedChips();
    highlightRecCards();
    if (state.paintReady) renderLivePaintedPhoto();
  }

  function removeColorCode(code) {
    const idx = state.selectedCodes.indexOf(code);
    if (idx !== -1 && state.selectedCodes.length > 1) {
      state.selectedCodes.splice(idx, 1);
      if (state.activePaintCode === code) {
        state.activePaintCode = state.selectedCodes[0];
      }
      renderPalette();
      renderSelectedChips();
      highlightRecCards();
      if (state.paintReady) renderLivePaintedPhoto();
    }
  }

  function setTrim(trimName) {
    state.trimName = trimName;
    document.querySelectorAll('.sim-trim-dot').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.name === trimName);
    });
    if ($('lblSelectedTrim')) $('lblSelectedTrim').textContent = trimName;
    updateQuickWaLink();
  }

  function updateQuickWaLink() {
    const names = state.selectedCodes.map((code) => {
      const c = COLOR_MAP[code];
      return c ? `${c.code} ${c.name}` : code;
    }).join(', ');
    const refPart = state.uploadId ? ` (Yüklenen Bina Fotoğrafı Ref #${state.uploadId})` : '';
    const msg = encodeURIComponent(
      `Merhaba, antalyadiscephe.com Canlı Bina Boyama Simülatöründe kendi fotoğrafımı boyadım${refPart}. Seçtiğim renkler: ${names} | ${state.trimName} | ${state.serviceType}. Ücretsiz keşif ve teklif almak istiyorum.`
    );
    const url = `https://wa.me/905309361017?text=${msg}`;
    if ($('floatWaBtn')) $('floatWaBtn').href = url;
    if ($('btnDirectWa')) $('btnDirectWa').href = url;
  }

  // ── AI Cephe Raporu + Öneri Kartları ──────────────────────────────────────
  function renderAiReport(analysis, uploadId, aiUsed, maskMeta) {
    state.analysis = analysis;
    const card = $('aiReportSection');
    if (!card) return;

    $('repBuildingType').textContent = analysis.buildingType || 'Konut / Apartman';
    $('repFloors').textContent = `${analysis.estimatedFloors || '-'} Kat`;
    $('repArea').textContent = analysis.estimatedAreaRange || 'Keşif ile netleşir';
    $('repSoveState').textContent = analysis.hasSove ? 'Mevcut Söveli' : 'Söve Eklenebilir';
    $('repCurrentColor').textContent = analysis.currentColor || '-';
    $('repCondition').textContent = analysis.currentCondition || '-';
    $('repSoveAssessment').textContent = analysis.soveAssessment || '-';
    $('repService').textContent = analysis.recommendedService || '-';
    $('repUvNote').textContent = analysis.uvNote || '-';

    const refBadge = $('repUploadRefBadge');
    if (refBadge) {
      refBadge.textContent = uploadId
        ? `Orijinal Fotoğraf Kaydedildi • Ref #${uploadId}`
        : 'Örnek Bina Testi (Kendi fotoğrafınızı yükleyebilirsiniz)';
      refBadge.style.display = 'inline-flex';
    }
    if ($('repAiEngineTag')) {
      const msTxt = maskMeta?.processingMs ? ` • SegFormer ${(maskMeta.processingMs / 1000).toFixed(1)}s` : '';
      $('repAiEngineTag').textContent = (aiUsed ? 'Gemini 2.5 Flash' : 'Yerel Analiz') + msTxt;
    }

    const recs = Array.isArray(analysis.recommendations) ? analysis.recommendations : [];
    $('aiRecGrid').innerHTML = recs.map((r, i) => `
      <div class="ai-rec-card" data-rec-code="${esc(r.wallCode)}" data-rec-trim="${esc(r.trimName)}">
        <div class="rec-top">
          <span class="rec-rank">AI Öneri #${i + 1}</span>
          <div class="rec-swatches">
            <span class="rec-sw-wall" style="background:${esc(r.wallHex)};" title="${esc(r.wallCode)}"></span>
            <span class="rec-sw-trim" style="background:${esc(r.trimHex)};" title="${esc(r.trimName)}"></span>
          </div>
        </div>
        <div class="rec-title">${esc(r.wallCode)} ${esc(r.wallName)}</div>
        <div class="rec-trim">+ ${esc(r.trimName)}</div>
        <p class="rec-reason">${esc(r.reason)}</p>
        <button type="button" class="btn-rec-pick" data-pick-code="${esc(r.wallCode)}" data-pick-trim="${esc(r.trimName)}">
          <i class="fas fa-paint-roller"></i> Binamda Boya &amp; Seç
        </button>
      </div>
    `).join('');

    card.style.display = 'block';
    highlightRecCards();
  }

  function highlightRecCards() {
    document.querySelectorAll('.ai-rec-card').forEach((el) => {
      const code = el.dataset.recCode;
      const isPainting = code === state.activePaintCode;
      el.classList.toggle('is-picked', isPainting);
      const btn = el.querySelector('.btn-rec-pick');
      if (btn) {
        btn.innerHTML = isPainting
          ? '<i class="fas fa-check-double"></i> Şu An Binada Uygulu'
          : '<i class="fas fa-paint-roller"></i> Binamda Boya &amp; Seç';
      }
    });
  }

  // ── Fotoğraf Yükle → SegFormer-B2 Canlı Boyama + Gemini AI Raporu ─────────
  async function analyzeAndPaintFile(file, previewUrl, isSample = false) {
    if (state.busy) return;
    state.busy = true;
    state.isSample = isSample;
    state.uploadId = null;
    state.paintReady = false;
    state.wallAlpha = null;
    state.maskHistory = [];
    state.origDataUrl = previewUrl;

    $('uploadDropzone').style.display = 'none';
    $('photoPreviewBox').style.display = 'block';
    $('stageReadyControls').style.display = 'none';
    $('photoScanLoader').style.display = 'flex';
    $('btnChangePhoto').style.display = 'inline-flex';
    $('req3dSuccessBox').style.display = 'none';

    // Önce ham fotoğrafı sahneye çiz
    try {
      const baseIm = await loadImg(previewUrl);
      const maxW = 1040, maxH = 760;
      const ratio = Math.min(1, maxW / baseIm.naturalWidth, maxH / baseIm.naturalHeight);
      state.w = Math.max(120, Math.round(baseIm.naturalWidth * ratio));
      state.h = Math.max(120, Math.round(baseIm.naturalHeight * ratio));

      const canvas = $('simLiveCanvas');
      canvas.width = state.w;
      canvas.height = state.h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(baseIm, 0, 0, state.w, state.h);
      state.baseData = ctx.getImageData(0, 0, state.w, state.h).data;
      $('imgOriginalBg').src = previewUrl;
      setViewMode('full');
    } catch (_) {
      state.busy = false;
      $('photoScanLoader').style.display = 'none';
      setBanner('error', 'Görsel okunamadı. Lütfen başka bir bina fotoğrafı deneyin.');
      return;
    }

    setBanner('info', '<i class="fas fa-spinner fa-spin"></i> Yerel <strong>SegFormer-B2 Sinir Ağı</strong> binanızın duvarlarını maskeliyor ve <strong>Gemini AI</strong> cephe raporunu hazırlıyor (3–5 sn)...');

    try {
      const fd = new FormData();
      fd.append('photo', file, file.name || 'bina.jpg');
      if (isSample) fd.append('isSample', '1');

      const res = await fetch('/api/simulate/analyze', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setBanner('error', '<i class="fas fa-exclamation-triangle"></i> ' + (data.error || 'Bina fotoğrafı işlenemedi.'));
        return;
      }

      state.uploadId = data.uploadId || null;

      // AI önerisinden 1. rengi aktif boyama rengi yap
      const recs = data.analysis?.recommendations || [];
      if (recs.length && COLOR_MAP[recs[0].wallCode]) {
        state.activePaintCode = recs[0].wallCode;
        state.selectedCodes = recs.slice(0, 2).map((r) => r.wallCode).filter((c) => Boolean(COLOR_MAP[c]));
        setTrim(recs[0].trimName || 'Kırık Beyaz Söve');
      }

      // SegFormer-B2 maskesini yükle ve ANINDA BOYALI GÖSTER!
      if (data.paintReady && data.wallMaskDataUrl) {
        const maskIm = await loadImg(data.wallMaskDataUrl);
        const mc = document.createElement('canvas');
        mc.width = state.w;
        mc.height = state.h;
        const mctx = mc.getContext('2d', { willReadFrequently: true });
        mctx.drawImage(maskIm, 0, 0, state.w, state.h);
        const md = mctx.getImageData(0, 0, state.w, state.h).data;
        state.wallAlpha = new Uint8Array(state.w * state.h);
        for (let i = 0; i < state.w * state.h; i++) {
          state.wallAlpha[i] = md[i * 4 + 3];
        }
        state.paintReady = true;
        $('stageReadyControls').style.display = 'flex';
        renderLivePaintedPhoto();
        setViewMode('split');
        applySplitPct(46);

        const sec = data.maskMeta?.processingMs ? (data.maskMeta.processingMs / 1000).toFixed(1) : '3.5';
        setBanner(
          'success',
          `<i class="fas fa-check-circle"></i> <span><strong>Binanız ${sec} sn'de Boyamaya Hazırlandı!</strong> Sağdaki <strong>30 AKD rengine</strong> tıklayarak kendi binanızda 0 saniyede canlı deneyin; ortadaki çizgiyi kaydırıp Öncesi / Sonrası farkına bakın.</span>`
        );
      } else {
        setBanner('info', '<i class="fas fa-info-circle"></i> AI cephe raporunuz hazır! Bu fotoğrafın profesyonel 3D boyama görseli için sağdaki formdan WhatsApp numaranızı bırakabilirsiniz.');
      }

      renderPalette();
      renderSelectedChips();
      renderAiReport(data.analysis, state.uploadId, Boolean(data.aiUsed), data.maskMeta);
      updateQuickWaLink();
    } catch (_) {
      setBanner('error', '<i class="fas fa-wifi"></i> Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
    } finally {
      state.busy = false;
      $('photoScanLoader').style.display = 'none';
    }
  }

  function handleUserFile(file) {
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      setBanner('error', '<i class="fas fa-exclamation-triangle"></i> Sadece JPG, PNG veya WebP bina fotoğrafı yükleyebilirsiniz.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setBanner('error', '<i class="fas fa-exclamation-triangle"></i> Dosya boyutu 10 MB üzerinde. Lütfen daha küçük bir fotoğraf seçin.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => analyzeAndPaintFile(file, ev.target.result, false);
    reader.readAsDataURL(file);
  }

  async function testSampleBuilding(url, filename) {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const file = new File([blob], filename, { type: blob.type || 'image/webp' });
      analyzeAndPaintFile(file, url, true);
    } catch (_) {
      setBanner('error', 'Örnek bina görseli yüklenemedi.');
    }
  }

  // ── Opsiyonel İnce Düzeltme (Fırça / Silgi) ───────────────────────────────
  function pushUndo() {
    if (!state.wallAlpha) return;
    state.maskHistory.push(new Uint8Array(state.wallAlpha));
    if (state.maskHistory.length > 12) state.maskHistory.shift();
  }

  function paintBrushAt(cx, cy, r, addMode) {
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
        if (dx * dx + dy * dy <= rSq) state.wallAlpha[row + x] = val;
      }
    }
  }

  function paintSeg(p1, p2, r, addMode) {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(1, Math.ceil(dist / Math.max(2, r * 0.3)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      paintBrushAt(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t, r, addMode);
    }
  }

  function getCanvasPt(clientX, clientY) {
    const c = $('simLiveCanvas');
    const rect = c.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * c.width,
      y: ((clientY - rect.top) / rect.height) * c.height,
    };
  }

  // ── Filigranlı Boyalı Görsel İndir (WhatsApp Grubu İçin) ──────────────────
  function downloadWatermarked() {
    if (!state.paintReady) return;
    const srcCanvas = $('simLiveCanvas');
    const w = srcCanvas.width, h = srcCanvas.height;
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
    const col = COLOR_MAP[state.activePaintCode] || COLORS[14];

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${fMain}px Montserrat, Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText('AKDENİZ YAPI DEKORASYON', pad, h + footerH * 0.36);

    ctx.fillStyle = '#E5C65C';
    ctx.font = `600 ${fSub}px Open Sans, Arial, sans-serif`;
    ctx.fillText('antalyadiscephe.com  •  Ücretsiz Keşif: 0530 936 10 17', pad, h + footerH * 0.72);

    const label = `${col.code} ${col.name}`;
    ctx.font = `700 ${fSub}px Montserrat, Arial, sans-serif`;
    const txtW = ctx.measureText(label).width;
    const swSize = Math.round(footerH * 0.44);
    const rightX = w - pad;

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.fillText(label, rightX, h + footerH * 0.42);

    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = `600 ${Math.max(10, fSub - 1)}px Open Sans, Arial, sans-serif`;
    ctx.fillText(state.trimName, rightX, h + footerH * 0.74);

    const boxX = rightX - txtW - swSize - 10;
    const boxY = h + (footerH - swSize) / 2;
    ctx.fillStyle = col.hex;
    ctx.fillRect(boxX, boxY, swSize, swSize);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, swSize, swSize);

    const link = document.createElement('a');
    link.download = `akdeniz-yapi-${col.code.toLowerCase()}.jpg`;
    link.href = exp.toDataURL('image/jpeg', 0.92);
    link.click();
  }

  // ── Ücretsiz 3D Tasarım / Keşif Formu Gönderimi ───────────────────────────
  async function submit3DRequest(ev) {
    ev.preventDefault();
    const msgEl = $('req3dErrorMsg');
    const submitBtn = $('btnSubmit3d');
    msgEl.style.display = 'none';

    if (!$('reqKvkk').checked) {
      msgEl.textContent = 'Lütfen KVKK Aydınlatma Metni onay kutusunu işaretleyin.';
      msgEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    const origHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';

    try {
      const res = await fetch('/api/simulate/request-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: $('reqName').value.trim(),
          phone: $('reqPhone').value.trim(),
          district: $('reqDistrict').value,
          uploadId: state.uploadId,
          selectedColors: state.selectedCodes.map((code) => ({ code, name: COLOR_MAP[code]?.name || '' })),
          trimName: state.trimName,
          serviceType: state.serviceType,
          notes: $('reqNotes').value.trim(),
          kvkk_consent: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        msgEl.textContent = data.error || 'Talebiniz gönderilemedi.';
        msgEl.style.display = 'block';
        return;
      }

      if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', {
          event_category: 'local_segformer_simulator',
          event_label: `${state.selectedCodes.join('_')}_${$('reqDistrict').value}`,
        });
      }

      $('req3dSuccessText').textContent = data.message;
      $('btnSuccessWa').href = data.whatsappUrl || 'https://wa.me/905309361017';
      $('req3dSuccessBox').style.display = 'block';
      $('req3dForm').reset();
      $('req3dSuccessBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {
      msgEl.textContent = 'Bağlantı hatası. Doğrudan 0530 936 10 17 numarasından ulaşabilirsiniz.';
      msgEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  }

  // ── Başlat & Event Bağla ──────────────────────────────────────────────────
  function init() {
    renderPalette();
    renderSelectedChips();

    const fileInput = $('buildingFileInput');
    const dropzone = $('uploadDropzone');
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleUserFile(e.target.files[0]);
      fileInput.value = '';
    });
    $('btnChangePhoto').addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('is-dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleUserFile(e.dataTransfer.files[0]);
    });

    $('btnSampleApt').addEventListener('click', () => testSampleBuilding('/images/sim-apartman-base.webp?v=20261123', 'ornek-apartman.webp'));
    $('btnSampleVilla').addEventListener('click', () => testSampleBuilding('/images/sim-villa-base.webp?v=20261123b', 'ornek-villa.webp'));

    $('aiRecGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-rec-pick');
      if (!btn) return;
      applyPaintColor(btn.dataset.pickCode, true);
      if (btn.dataset.pickTrim) setTrim(btn.dataset.pickTrim);
      $('photoPreviewBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

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
      if (sw) applyPaintColor(sw.dataset.code, true);
    });

    $('selectedColorChips').addEventListener('click', (e) => {
      const rm = e.target.closest('button[data-remove]');
      if (rm) { removeColorCode(rm.dataset.remove); return; }
      const chip = e.target.closest('.picked-chip');
      if (chip && chip.dataset.focusCode) applyPaintColor(chip.dataset.focusCode, false);
    });

    document.querySelectorAll('.sim-trim-dot').forEach((btn) => {
      btn.addEventListener('click', () => setTrim(btn.dataset.name));
    });

    document.querySelectorAll('.service-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.service-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.serviceType = btn.dataset.service;
        updateQuickWaLink();
      });
    });

    // Görünüm geçişi & Öncesi/Sonrası kaydırıcı
    $('btnViewFull').addEventListener('click', () => setViewMode('full'));
    $('btnViewSplit').addEventListener('click', () => setViewMode('split'));
    $('btnDownloadPainted').addEventListener('click', downloadWatermarked);

    const wrap = $('stageCompareWrap');
    let dragSplit = false;
    function moveSplit(clientX) {
      const rect = wrap.getBoundingClientRect();
      applySplitPct(((clientX - rect.left) / rect.width) * 100);
    }
    wrap.addEventListener('mousedown', (e) => {
      if (state.viewMode !== 'split' || state.refineOpen) return;
      dragSplit = true;
      moveSplit(e.clientX);
    });
    window.addEventListener('mousemove', (e) => { if (dragSplit) moveSplit(e.clientX); });
    window.addEventListener('mouseup', () => { dragSplit = false; });
    wrap.addEventListener('touchstart', (e) => {
      if (state.viewMode !== 'split' || state.refineOpen || !e.touches[0]) return;
      dragSplit = true;
      moveSplit(e.touches[0].clientX);
    }, { passive: true });
    wrap.addEventListener('touchmove', (e) => {
      if (dragSplit && e.touches[0]) moveSplit(e.touches[0].clientX);
    }, { passive: true });
    wrap.addEventListener('touchend', () => { dragSplit = false; });

    // Opsiyonel İnce Düzeltme
    $('btnToggleRefine').addEventListener('click', () => {
      state.refineOpen = !state.refineOpen;
      $('refineDrawer').style.display = state.refineOpen ? 'flex' : 'none';
      $('btnToggleRefine').classList.toggle('active', state.refineOpen);
      if (state.refineOpen) setViewMode('full');
      $('simLiveCanvas').style.cursor = state.refineOpen ? 'crosshair' : 'default';
    });
    document.querySelectorAll('.refine-tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.refine-tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.refineTool = btn.dataset.tool;
      });
    });
    $('rangeBrush').addEventListener('input', (e) => {
      state.brushRadius = parseInt(e.target.value, 10) || 22;
      $('lblBrush').textContent = state.brushRadius + 'px';
    });
    $('btnUndoRefine').addEventListener('click', () => {
      if (!state.maskHistory.length) return;
      state.wallAlpha = state.maskHistory.pop();
      renderLivePaintedPhoto();
    });

    const canvas = $('simLiveCanvas');
    canvas.addEventListener('mousedown', (e) => {
      if (!state.refineOpen || !state.paintReady) return;
      pushUndo();
      state.isDrawing = true;
      const pt = getCanvasPt(e.clientX, e.clientY);
      state.lastPt = pt;
      paintBrushAt(pt.x, pt.y, state.brushRadius, state.refineTool === 'brush');
      renderLivePaintedPhoto();
    });
    window.addEventListener('mousemove', (e) => {
      if (!state.isDrawing) return;
      const pt = getCanvasPt(e.clientX, e.clientY);
      paintSeg(state.lastPt || pt, pt, state.brushRadius, state.refineTool === 'brush');
      state.lastPt = pt;
      renderLivePaintedPhoto();
    });
    window.addEventListener('mouseup', () => { state.isDrawing = false; state.lastPt = null; });

    canvas.addEventListener('touchstart', (e) => {
      if (!state.refineOpen || !state.paintReady || !e.touches[0]) return;
      e.preventDefault();
      pushUndo();
      state.isDrawing = true;
      const pt = getCanvasPt(e.touches[0].clientX, e.touches[0].clientY);
      state.lastPt = pt;
      paintBrushAt(pt.x, pt.y, state.brushRadius, state.refineTool === 'brush');
      renderLivePaintedPhoto();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      if (!state.isDrawing || !e.touches[0]) return;
      e.preventDefault();
      const pt = getCanvasPt(e.touches[0].clientX, e.touches[0].clientY);
      paintSeg(state.lastPt || pt, pt, state.brushRadius, state.refineTool === 'brush');
      state.lastPt = pt;
      renderLivePaintedPhoto();
    }, { passive: false });
    canvas.addEventListener('touchend', () => { state.isDrawing = false; state.lastPt = null; });

    $('req3dForm').addEventListener('submit', submit3DRequest);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
