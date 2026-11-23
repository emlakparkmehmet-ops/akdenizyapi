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
    boya: 'Sadece Dış Cephe Boya',
    mantolama_sove: 'Mantolama + Söve & Kat Silmesi',
    modern_antrasit: 'Modern Antrasit & Mimari Detay',
  };

  // ── Uygulama Durumu ───────────────────────────────────────────────────────
  const state = {
    activeMode: 'a',          // 'a' | 'b'
    apiStatus: null,
    selectedColor: COLORS[14], // AKD-301 KIZILKULE KİREMİT
    colorCat: 'all',
    trimHex: '#F5F3EE',
    trimName: 'Kırık Beyaz Söve',
    style: 'boya',

    // Yüklenen bina fotoğrafı
    hasPhoto: false,
    imgW: 0,
    imgH: 0,
    origCanvas: null,         // Offscreen canvas (max 1080px)
    origImageData: null,      // Uint8ClampedArray (RGBA)
    uploadBlob: null,         // Compressed JPEG Blob
    origDataUrl: '',

    // Mod A sonucu
    modeAResultCanvas: null,
    modeADemo: false,
    modeASliderPos: 52,       // % (0..100)
    modeABusy: false,

    // Mod B maskesi ve araçları
    mask: null,               // Uint8Array (imgW * imgH)
    maskHistory: [],          // Undo stack
    maskTool: 'wand',         // 'wand' | 'brush' | 'eraser'
    tolerance: 34,
    brushRadius: 24,
    showOriginalB: false,
    showMaskOverlay: false,
    isDrawing: false,
    lastPt: null,
  };

  // ── DOM Referansları ──────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    ];
  }

  function rgbToHsv(r, g, b) {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === rn) h = ((gn - bn) / d) % 6;
      else if (max === gn) h = (bn - rn) / d + 2;
      else h = (rn - gn) / d + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    return [h, s, max];
  }

  function setStatusBanner(type, text) {
    const el = $('simStatusBanner');
    if (!el) return;
    if (!text) {
      el.style.display = 'none';
      return;
    }
    el.className = 'sim-status-banner sim-status-' + type;
    el.innerHTML = text;
    el.style.display = 'flex';
  }

  // ── API Durumunu Yükle ────────────────────────────────────────────────────
  async function loadApiStatus() {
    try {
      const res = await fetch('/api/simulate/status');
      const data = await res.json();
      if (!data || !data.ok) return;
      state.apiStatus = data;

      // Devre dışı bırakılan mod varsa sekmesini gizle
      if (data.modes && !data.modes.a.enabled && data.modes.b.enabled) {
        $('tabModeA').style.display = 'none';
        switchMode('b');
      } else if (data.modes && !data.modes.b.enabled && data.modes.a.enabled) {
        $('tabModeB').style.display = 'none';
        switchMode('a');
      }

      updateBadges();
    } catch (_) {
      // Offline / statik test durumunda sessizce devam et
    }
  }

  function updateBadges() {
    const st = state.apiStatus;
    if (!st) return;

    const badgeA = $('badgeApiA');
    const badgeB = $('badgeApiB');
    if (badgeA) {
      badgeA.textContent = st.modes.a.apiConnected ? 'AI Aktif' : 'Demo Hazır';
      badgeA.className = 'mode-pill-status ' + (st.modes.a.apiConnected ? 'is-live' : 'is-demo');
    }
    if (badgeB) {
      badgeB.textContent = st.modes.b.autoMaskReady ? 'AI + Canlı' : 'Anlık Aktif';
      badgeB.className = 'mode-pill-status is-live';
    }

    const qEl = $('quotaBadgeText');
    if (qEl) {
      qEl.textContent = `Kalan Ücretsiz AI Hakkı: ${st.remainingFree}`;
    }
  }

  // ── Sekme Geçişi (Mod A / Mod B) ──────────────────────────────────────────
  function switchMode(mode) {
    state.activeMode = mode;
    $('tabModeA').classList.toggle('active', mode === 'a');
    $('tabModeB').classList.toggle('active', mode === 'b');
    $('panelControlsA').style.display = mode === 'a' ? 'block' : 'none';
    $('panelControlsB').style.display = mode === 'b' ? 'block' : 'none';
    $('stageModeA').style.display = mode === 'a' ? 'block' : 'none';
    $('stageModeB').style.display = mode === 'b' ? 'block' : 'none';
    if ($('btnRunModeA')) $('btnRunModeA').style.display = mode === 'a' ? 'inline-flex' : 'none';

    if (state.hasPhoto) {
      if (mode === 'b') {
        renderModeBCanvas();
      } else {
        renderModeAView();
      }
    }
    updateBottomBar();
  }

  // ── Renk Kartelası Render ─────────────────────────────────────────────────
  function renderPalette() {
    const grid = $('simPaletteGrid');
    if (!grid) return;
    const list = state.colorCat === 'all'
      ? COLORS
      : COLORS.filter((c) => c.cat === state.colorCat);

    grid.innerHTML = list.map((c) => {
      const isAct = c.code === state.selectedColor.code ? 'active' : '';
      const txtCol = c.light ? '#1a2e44' : '#ffffff';
      return `<button type="button" class="sim-swatch ${isAct}" data-code="${c.code}" style="background:${c.hex};color:${txtCol};" title="${c.code} ${c.name}">
        <span class="sw-code">${c.code}</span>
        <span class="sw-name">${c.name}</span>
      </button>`;
    }).join('');
  }

  function selectColorByCode(code) {
    const found = COLORS.find((c) => c.code === code);
    if (!found) return;
    state.selectedColor = found;
    renderPalette();
    updateBottomBar();

    // Mod B'de 0 ms canlı boyama!
    if (state.hasPhoto && state.activeMode === 'b') {
      state.showOriginalB = false;
      updateOrigToggleBtn();
      renderModeBCanvas();
    }
    // Mod A demo modundaysa ve önceden demo çalıştırıldıysa anında rengi yenile
    if (state.hasPhoto && state.activeMode === 'a' && state.modeADemo && state.modeAResultCanvas) {
      generateClientDemoModeA();
    }
  }

  function updateBottomBar() {
    const c = state.selectedColor;
    const dot = $('selColorDot');
    if (dot) dot.style.background = c.hex;
    const title = $('selColorTitle');
    if (title) title.textContent = `${c.code} - ${c.name}`;
    const sub = $('selColorSub');
    if (sub) {
      const modeTxt = state.activeMode === 'a' ? `Mod A (${STYLE_LABELS[state.style]})` : 'Mod B (Canlı Maskeleme)';
      sub.textContent = `${state.trimName} • ${modeTxt}`;
    }

    const waMsg = encodeURIComponent(
      `Merhaba, antalyadiscephe.com Bina Cephe Simülatöründe ${c.code} ${c.name} ve ${state.trimName} (${STYLE_LABELS[state.style]}) kombinasyonunu denedim. Binamız için ücretsiz keşif ve fiyat teklifi almak istiyorum.`
    );
    const waUrl = `https://wa.me/905309361017?text=${waMsg}`;
    const waBtn = $('btnQuoteWa');
    if (waBtn) waBtn.href = waUrl;
    const floatWa = $('floatWaBtn');
    if (floatWa) floatWa.href = waUrl;

    const dlBtn = $('btnDownloadImg');
    if (dlBtn) {
      const canExport = state.hasPhoto && (
        (state.activeMode === 'a' && Boolean(state.modeAResultCanvas)) ||
        (state.activeMode === 'b' && hasAnyMaskPixels())
      );
      dlBtn.disabled = !canExport;
    }
  }

  // ── Fotoğraf Yükleme & Otomatik Boyutlandırma (Max 1080px) ────────────────
  function loadImageFromSource(imgEl) {
    const maxW = 1080;
    const maxH = 820;
    let w = imgEl.naturalWidth || imgEl.width;
    let h = imgEl.naturalHeight || imgEl.height;
    const ratio = Math.min(1, maxW / w, maxH / h);
    w = Math.max(120, Math.round(w * ratio));
    h = Math.max(120, Math.round(h * ratio));

    const oc = document.createElement('canvas');
    oc.width = w;
    oc.height = h;
    const octx = oc.getContext('2d', { willReadFrequently: true });
    octx.drawImage(imgEl, 0, 0, w, h);

    state.hasPhoto = true;
    state.imgW = w;
    state.imgH = h;
    state.origCanvas = oc;
    state.origImageData = octx.getImageData(0, 0, w, h).data;
    state.origDataUrl = oc.toDataURL('image/jpeg', 0.9);
    state.modeAResultCanvas = null;
    state.modeADemo = false;
    state.mask = new Uint8Array(w * h);
    state.maskHistory = [];
    state.showOriginalB = false;

    oc.toBlob((blob) => {
      state.uploadBlob = blob;
    }, 'image/jpeg', 0.88);

    // Arayüzü göster
    $('uploadDropzone').classList.add('has-photo');
    $('emptyStageHint').style.display = 'none';
    $('activeStageWrap').style.display = 'block';
    $('btnChangePhoto').style.display = 'inline-flex';
    setStatusBanner('', '');

    // Mod A önce görüntüsü
    const beforeImg = $('imgBeforeA');
    const afterImg = $('imgAfterA');
    if (beforeImg) beforeImg.src = state.origDataUrl;
    if (afterImg) afterImg.src = state.origDataUrl;
    $('baSliderWrap').classList.remove('has-result');
    $('baHintOverlay').style.display = 'flex';
    $('baAfterTag').textContent = 'SONRASI (Hazırlanıyor)';

    // Mod B canvas boyutlandır + ilk otomatik duvar seçimi öner
    const canvasB = $('canvasModeB');
    canvasB.width = w;
    canvasB.height = h;
    renderModeBCanvas();

    if (state.activeMode === 'b') {
      // Hemen akıllı duvar seçimi önerisi göster
      setStatusBanner('info', '<i class="fas fa-magic"></i> Fotoğraf yüklendi! <strong>"Otomatik Duvar Seç"</strong> butonuna basın veya doğrudan <strong>duvarın üzerine tıklayın</strong>, ardından sağdan istediğiniz rengi 0 saniyede deneyin.');
    } else {
      setStatusBanner('info', '<i class="fas fa-wand-magic-sparkles"></i> Fotoğrafınız hazır! Sağdan renginizi ve yenileme paketini seçip <strong>"AI ile Binamı Yenile"</strong> butonuna basın.');
    }

    updateBottomBar();
  }

  function handleFileInput(file) {
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      setStatusBanner('error', '<i class="fas fa-exclamation-triangle"></i> Lütfen JPG, PNG veya WebP formatında bir bina fotoğrafı seçin.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setStatusBanner('error', '<i class="fas fa-exclamation-triangle"></i> Dosya boyutu 15 MB üzerinde. Lütfen daha küçük bir fotoğraf seçin.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const im = new Image();
      im.onload = () => loadImageFromSource(im);
      im.onerror = () => setStatusBanner('error', 'Görsel okunamadı. Lütfen başka bir fotoğraf deneyin.');
      im.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function loadSampleBuilding(srcUrl, preMaskUrl) {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => {
      loadImageFromSource(im);
      // Örnek binada Mod B aktifse hazır maskesini de yükleyip anında WOW deneyimi ver!
      if (preMaskUrl) {
        const mm = new Image();
        mm.crossOrigin = 'anonymous';
        mm.onload = () => {
          const tc = document.createElement('canvas');
          tc.width = state.imgW;
          tc.height = state.imgH;
          const tctx = tc.getContext('2d', { willReadFrequently: true });
          tctx.drawImage(mm, 0, 0, state.imgW, state.imgH);
          const md = tctx.getImageData(0, 0, state.imgW, state.imgH).data;
          pushMaskUndo();
          for (let i = 0; i < state.imgW * state.imgH; i++) {
            state.mask[i] = md[i * 4 + 3];
          }
          if (state.activeMode === 'b') {
            renderModeBCanvas();
            setStatusBanner('success', '<i class="fas fa-check-circle"></i> Örnek bina maskesi hazır! Şimdi sağdaki 30 AKD rengine tıklayarak anında (0 sn) renk değişimini test edebilirsiniz.');
          }
          updateBottomBar();
        };
        mm.src = preMaskUrl;
      }
    };
    im.src = srcUrl;
  }

  // ── MOD A: AI Fotogerçekçi Cephe Yenileme ─────────────────────────────────
  function renderModeAView() {
    if (!state.hasPhoto) return;
    $('imgBeforeA').src = state.origDataUrl;
    if (state.modeAResultCanvas) {
      $('imgAfterA').src = state.modeAResultCanvas.toDataURL('image/jpeg', 0.92);
      $('baSliderWrap').classList.add('has-result');
      $('baHintOverlay').style.display = 'none';
      $('baAfterTag').textContent = `SONRASI (${state.selectedColor.code} ${state.selectedColor.name})`;
      setBeforeAfterSplit(state.modeASliderPos);
    } else {
      $('imgAfterA').src = state.origDataUrl;
      $('baSliderWrap').classList.remove('has-result');
      $('baHintOverlay').style.display = 'flex';
    }
  }

  function setBeforeAfterSplit(pct) {
    const clamped = Math.max(2, Math.min(98, pct));
    state.modeASliderPos = clamped;
    const afterClip = $('baAfterClip');
    const handle = $('baHandle');
    if (afterClip) afterClip.style.clipPath = `inset(0 0 0 ${clamped}%)`;
    if (handle) handle.style.left = `${clamped}%`;
  }

  // API anahtarı bağlanmadan önce Mod A arayüzünün test edilebilmesi için akıllı yerel demo önizleyici
  function generateClientDemoModeA() {
    if (!state.hasPhoto) return;
    const w = state.imgW, h = state.imgH;
    const tempMask = hasAnyMaskPixels() ? state.mask : computeHeuristicWallMask();
    const outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    const ctx = outCanvas.getContext('2d');
    const outData = ctx.createImageData(w, h);
    applyLuminanceRecolor(state.origImageData, tempMask, outData.data, w, h, state.selectedColor.hex);
    ctx.putImageData(outData, 0, 0);

    state.modeAResultCanvas = outCanvas;
    state.modeADemo = true;
    renderModeAView();
    updateBottomBar();
  }

  async function runModeAGenerate() {
    if (!state.hasPhoto) {
      setStatusBanner('error', '<i class="fas fa-camera"></i> Önce binanızın bir fotoğrafını yükleyin veya alttaki örnek binalardan birini seçin.');
      return;
    }
    if (state.modeABusy) return;

    state.modeABusy = true;
    const btn = $('btnRunModeA');
    const loader = $('modeALoader');
    btn.disabled = true;
    if (loader) loader.style.display = 'flex';
    setStatusBanner('info', '<i class="fas fa-spinner fa-spin"></i> Yapay zeka cephe analizi ve renk uygulaması çalışıyor...');

    try {
      // Blob hazır değilse anlık üret
      const blob = state.uploadBlob || await new Promise((resolve) => state.origCanvas.toBlob(resolve, 'image/jpeg', 0.88));
      const fd = new FormData();
      fd.append('photo', blob, 'bina.jpg');
      fd.append('wallHex', state.selectedColor.hex);
      fd.append('wallCode', state.selectedColor.code);
      fd.append('wallName', state.selectedColor.name);
      fd.append('trimHex', state.trimHex);
      fd.append('trimName', state.trimName);
      fd.append('style', state.style);

      const res = await fetch('/api/simulate/ai-edit', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));

      if (res.status === 402 && data.needsLeadUnlock) {
        openLeadModal('Ücretsiz önizleme hakkınız doldu! Telefon ve ilçe bilginizi bırakın, +5 ücretsiz yapay zeka cephe tasarım hakkı hemen açılsın.');
        setStatusBanner('warn', '<i class="fas fa-lock"></i> ' + (data.error || 'Ek hak için formu doldurun.'));
        return;
      }

      if (!res.ok || !data.ok) {
        setStatusBanner('error', '<i class="fas fa-exclamation-circle"></i> ' + (data.error || 'Simülasyon oluşturulamadı.'));
        return;
      }

      if (typeof data.remainingFree === 'number' && state.apiStatus) {
        state.apiStatus.remainingFree = data.remainingFree;
        updateBadges();
      }

      if (data.demoMode) {
        if (data.hints && Array.isArray(data.hints.wallSeeds) && data.hints.wallSeeds.length > 0 && !hasAnyMaskPixels()) {
          state.mask.fill(0);
          for (const seed of data.hints.wallSeeds) {
            const sx = Math.round((seed[0] / 1000) * state.imgW);
            const sy = Math.round((seed[1] / 1000) * state.imgH);
            floodFillWall(sx, sy, Math.max(30, state.tolerance), true, data.hints.buildingBox, data.hints.excludeBoxes);
          }
          softenMask(state.mask, state.imgW, state.imgH);
        }
        generateClientDemoModeA();
        setStatusBanner(
          'warn',
          '<i class="fas fa-sparkles"></i> <span>' +
          (data.notice || 'Gemini API görsel üretim kotası bekleniyor; şu an hızlı önizleme gösteriliyor.') +
          '</span>'
        );
      } else if (data.imageDataUrl) {
        await new Promise((resolve, reject) => {
          const im = new Image();
          im.onload = () => {
            const c = document.createElement('canvas');
            c.width = state.imgW;
            c.height = state.imgH;
            c.getContext('2d').drawImage(im, 0, 0, state.imgW, state.imgH);
            state.modeAResultCanvas = c;
            state.modeADemo = false;
            resolve();
          };
          im.onerror = reject;
          im.src = data.imageDataUrl;
        });
        renderModeAView();
        setStatusBanner('success', `<i class="fas fa-check-circle"></i> <strong>${state.selectedColor.code} ${state.selectedColor.name}</strong> yapay zeka cephe tasarımınız hazır! Ortadaki çizgiyi sağa-sola kaydırarak Öncesi / Sonrası farkını inceleyin.`);
      }
    } catch (err) {
      setStatusBanner('error', '<i class="fas fa-wifi"></i> Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      state.modeABusy = false;
      btn.disabled = false;
      if (loader) loader.style.display = 'none';
      updateBottomBar();
    }
  }

  // ── MOD B: Canlı Maskeleme + 0ms Gerçek Zamanlı Boyama Motoru ─────────────
  function hasAnyMaskPixels() {
    if (!state.mask) return false;
    for (let i = 0; i < state.mask.length; i += 17) {
      if (state.mask[i] > 20) return true;
    }
    for (let i = 0; i < state.mask.length; i++) {
      if (state.mask[i] > 20) return true;
    }
    return false;
  }

  function pushMaskUndo() {
    if (!state.mask) return;
    state.maskHistory.push(new Uint8Array(state.mask));
    if (state.maskHistory.length > 15) state.maskHistory.shift();
  }

  function undoMask() {
    if (!state.maskHistory.length) return;
    state.mask = state.maskHistory.pop();
    renderModeBCanvas();
    updateBottomBar();
  }

  function clearMask() {
    if (!state.mask) return;
    pushMaskUndo();
    state.mask.fill(0);
    renderModeBCanvas();
    updateBottomBar();
  }

  // Aydınlık (luminance) koruyarak gerçekçi boya uygulaması
  function applyLuminanceRecolor(srcRgba, maskArr, dstRgba, w, h, hex) {
    const [tr, tg, tb] = hexToRgb(hex);
    const total = w * h;

    // Maskeli alandaki ortalama parlaklığı dinamik normalize et (her binada doğal doku için)
    let lumSum = 0, lumCnt = 0;
    for (let i = 0; i < total; i += 4) {
      if (maskArr[i] > 128) {
        const idx = i * 4;
        const l = (0.299 * srcRgba[idx] + 0.587 * srcRgba[idx + 1] + 0.114 * srcRgba[idx + 2]) / 255;
        lumSum += l;
        lumCnt++;
      }
    }
    const baseLum = lumCnt > 40 ? Math.max(0.32, Math.min(0.86, lumSum / lumCnt)) : 0.72;

    for (let i = 0; i < total; i++) {
      const idx = i * 4;
      const a = maskArr[i] / 255;
      const sr = srcRgba[idx], sg = srcRgba[idx + 1], sb = srcRgba[idx + 2];

      if (a <= 0.01) {
        dstRgba[idx] = sr;
        dstRgba[idx + 1] = sg;
        dstRgba[idx + 2] = sb;
        dstRgba[idx + 3] = 255;
        continue;
      }

      const lum = (0.299 * sr + 0.587 * sg + 0.114 * sb) / 255;
      const shade = Math.max(0.18, Math.min(1.32, lum / baseLum));
      const nr = Math.min(255, Math.round(tr * 255 * shade));
      const ng = Math.min(255, Math.round(tg * 255 * shade));
      const nb = Math.min(255, Math.round(tb * 255 * shade));

      dstRgba[idx] = Math.round(sr * (1 - a) + nr * a);
      dstRgba[idx + 1] = Math.round(sg * (1 - a) + ng * a);
      dstRgba[idx + 2] = Math.round(sb * (1 - a) + nb * a);
      dstRgba[idx + 3] = 255;
    }
  }

  function renderModeBCanvas() {
    if (!state.hasPhoto) return;
    const canvas = $('canvasModeB');
    const ctx = canvas.getContext('2d');
    const w = state.imgW, h = state.imgH;

    if (state.showOriginalB || !hasAnyMaskPixels()) {
      ctx.drawImage(state.origCanvas, 0, 0);
      return;
    }

    const outImg = ctx.createImageData(w, h);
    applyLuminanceRecolor(state.origImageData, state.mask, outImg.data, w, h, state.selectedColor.hex);

    if (state.showMaskOverlay) {
      const d = outImg.data;
      for (let i = 0; i < w * h; i++) {
        if (state.mask[i] > 40) {
          const idx = i * 4;
          d[idx] = Math.round(d[idx] * 0.72 + 201 * 0.28);
          d[idx + 1] = Math.round(d[idx + 1] * 0.72 + 162 * 0.28);
          d[idx + 2] = Math.round(d[idx + 2] * 0.72 + 39 * 0.28);
        }
      }
    }

    ctx.putImageData(outImg, 0, 0);
  }

  // Hızlı BFS renk-benzeri duvar seçici (Smart Magic Wand)
  function floodFillWall(startX, startY, tol, addMode = true, bounds = null, excludeBoxes = null) {
    const w = state.imgW, h = state.imgH;
    const sx = Math.floor(startX), sy = Math.floor(startY);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return 0;

    const src = state.origImageData;
    const sIdx = (sy * w + sx) * 4;
    const sr = src[sIdx], sg = src[sIdx + 1], sb = src[sIdx + 2];

    const minX = bounds ? Math.max(0, Math.floor((bounds[1] / 1000) * w)) : 0;
    const maxX = bounds ? Math.min(w - 1, Math.ceil((bounds[3] / 1000) * w)) : w - 1;
    const minY = bounds ? Math.max(0, Math.floor((bounds[0] / 1000) * h)) : 0;
    const maxY = bounds ? Math.min(h - 1, Math.ceil((bounds[2] / 1000) * h)) : h - 1;

    const exclRects = (excludeBoxes || []).map((b) => [
      Math.floor((b[1] / 1000) * w),
      Math.floor((b[0] / 1000) * h),
      Math.ceil((b[3] / 1000) * w),
      Math.ceil((b[2] / 1000) * h),
    ]);

    function isExcluded(x, y) {
      for (let k = 0; k < exclRects.length; k++) {
        const r = exclRects[k];
        if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return true;
      }
      return false;
    }

    const visited = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0, tail = 0;
    const maxDistSq = tol * tol * 3.1;
    const edgeJumpSq = Math.max(22, tol * 0.72) ** 2 * 3;
    const val = addMode ? 255 : 0;
    let count = 0;

    const startPos = sy * w + sx;
    visited[startPos] = 1;
    queue[tail++] = startPos;

    while (head < tail) {
      const pos = queue[head++];
      const x = pos % w;
      const y = (pos - x) / w;

      if (exclRects.length && isExcluded(x, y)) continue;
      state.mask[pos] = val;
      count++;

      const pIdx = pos * 4;
      const pr = src[pIdx], pg = src[pIdx + 1], pb = src[pIdx + 2];

      const neighbors = [
        x > minX ? pos - 1 : -1,
        x < maxX ? pos + 1 : -1,
        y > minY ? pos - w : -1,
        y < maxY ? pos + w : -1,
      ];

      for (let n = 0; n < 4; n++) {
        const np = neighbors[n];
        if (np < 0 || visited[np]) continue;
        const nIdx = np * 4;
        const nr = src[nIdx], ng = src[nIdx + 1], nb = src[nIdx + 2];

        const dSeed = (nr - sr) ** 2 + (ng - sg) ** 2 + (nb - sb) ** 2;
        if (dSeed > maxDistSq) continue;

        const dStep = (nr - pr) ** 2 + (ng - pg) ** 2 + (nb - pb) ** 2;
        if (dStep > edgeJumpSq) continue;

        visited[np] = 1;
        queue[tail++] = np;
      }
    }

    return count;
  }

  // Hafif kenar yumuşatma (1px box blur maske kenarlarında keskin merdiveni azaltır)
  function softenMask(maskArr, w, h) {
    const copy = new Uint8Array(maskArr);
    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const i = row + x;
        const sum =
          copy[i - w - 1] + copy[i - w] + copy[i - w + 1] +
          copy[i - 1] + copy[i] * 2 + copy[i + 1] +
          copy[i + w - 1] + copy[i + w] + copy[i + w + 1];
        maskArr[i] = Math.round(sum / 10);
      }
    }
  }

  // Yerel sezgisel duvar maskesi (API anahtarı bağlı değilken hızlı otomatik başlangıç)
  function computeHeuristicWallMask() {
    const w = state.imgW, h = state.imgH;
    const src = state.origImageData;
    const out = new Uint8Array(w * h);

    // Binanın orta bölgesinden baskın sıva tonunu örnekle (gökyüzü ve yeşil bitkileri hariç tut)
    let rSum = 0, gSum = 0, bSum = 0, cnt = 0;
    const y1 = Math.floor(h * 0.24), y2 = Math.floor(h * 0.72);
    const x1 = Math.floor(w * 0.20), x2 = Math.floor(w * 0.80);

    for (let y = y1; y < y2; y += 3) {
      for (let x = x1; x < x2; x += 3) {
        const idx = (y * w + x) * 4;
        const r = src[idx], g = src[idx + 1], b = src[idx + 2];
        const [hue, sat, val] = rgbToHsv(r, g, b);
        const isSky = hue >= 185 && hue <= 240 && sat > 0.22 && val > 0.52;
        const isVeg = hue >= 65 && hue <= 165 && sat > 0.22;
        const isDarkGlass = val < 0.34;
        if (!isSky && !isVeg && !isDarkGlass && sat < 0.42) {
          rSum += r; gSum += g; bSum += b; cnt++;
        }
      }
    }
    const mr = cnt ? rSum / cnt : 195;
    const mg = cnt ? gSum / cnt : 190;
    const mb = cnt ? bSum / cnt : 182;

    const maxD = 58 * 58 * 3;
    for (let y = Math.floor(h * 0.08); y < Math.floor(h * 0.90); y++) {
      for (let x = Math.floor(w * 0.04); x < Math.floor(w * 0.96); x++) {
        const p = y * w + x;
        const idx = p * 4;
        const r = src[idx], g = src[idx + 1], b = src[idx + 2];
        const [hue, sat, val] = rgbToHsv(r, g, b);
        const isSky = (y < h * 0.38) && hue >= 180 && hue <= 245 && sat > 0.16 && val > 0.55;
        const isVeg = hue >= 62 && hue <= 168 && sat > 0.20;
        const isDark = val < 0.30;
        if (isSky || isVeg || isDark) continue;

        const d = (r - mr) ** 2 + (g - mg) ** 2 + (b - mb) ** 2;
        if (d < maxD) out[p] = 255;
      }
    }
    softenMask(out, w, h);
    return out;
  }

  async function runModeBAutoMask() {
    if (!state.hasPhoto) {
      setStatusBanner('error', '<i class="fas fa-camera"></i> Önce binanızın fotoğrafını yükleyin.');
      return;
    }
    const btn = $('btnAutoMaskB');
    btn.disabled = true;
    setStatusBanner('info', '<i class="fas fa-spinner fa-spin"></i> Bina duvar yüzeyi otomatik algılanıyor...');

    try {
      const blob = state.uploadBlob || await new Promise((resolve) => state.origCanvas.toBlob(resolve, 'image/jpeg', 0.88));
      const fd = new FormData();
      fd.append('photo', blob, 'bina.jpg');

      const res = await fetch('/api/simulate/auto-mask', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setStatusBanner('error', '<i class="fas fa-exclamation-triangle"></i> ' + (data.error || 'Otomatik maske çıkarılamadı.'));
        return;
      }

      pushMaskUndo();

      if (data.wallMaskDataUrl) {
        // Replicate SAM gerçek maske görseli
        await new Promise((resolve, reject) => {
          const im = new Image();
          im.onload = () => {
            const tc = document.createElement('canvas');
            tc.width = state.imgW;
            tc.height = state.imgH;
            const tctx = tc.getContext('2d', { willReadFrequently: true });
            tctx.drawImage(im, 0, 0, state.imgW, state.imgH);
            const md = tctx.getImageData(0, 0, state.imgW, state.imgH).data;
            for (let i = 0; i < state.imgW * state.imgH; i++) {
              state.mask[i] = md[i * 4]; // beyaz=duvar, siyah=arka plan
            }
            resolve();
          };
          im.onerror = reject;
          im.src = data.wallMaskDataUrl;
        });
        renderModeBCanvas();
        setStatusBanner('success', '<i class="fas fa-check-circle"></i> <strong>AI Otomatik Duvar Maskesi (SAM)</strong> hazır! Sağdaki 30 renge tıklayarak 0 saniyede canlı boyayın.');
      } else if (data.hints && Array.isArray(data.hints.wallSeeds)) {
        // Gemini Vision duvar tohumları + pencere/gökyüzü hariç tutma kutuları
        state.mask.fill(0);
        for (const seed of data.hints.wallSeeds) {
          const sx = Math.round((seed[0] / 1000) * state.imgW);
          const sy = Math.round((seed[1] / 1000) * state.imgH);
          floodFillWall(sx, sy, Math.max(30, state.tolerance), true, data.hints.buildingBox, data.hints.excludeBoxes);
        }
        softenMask(state.mask, state.imgW, state.imgH);
        renderModeBCanvas();
        setStatusBanner('success', '<i class="fas fa-check-circle"></i> <strong>AI Duvar Algılama</strong> tamamlandı! İstediğiniz renge tıklayın; ince düzeltme için Fırça veya Silgi kullanabilirsiniz.');
      } else {
        // API anahtarı henüz yoksa yerel akıllı cephe algılama
        state.mask = computeHeuristicWallMask();
        renderModeBCanvas();
        setStatusBanner(
          'warn',
          '<i class="fas fa-magic"></i> <span><strong>Yerel Akıllı Seçim Uygulandı:</strong> Eksik kalan duvar parçalarına tıklayarak ekleyebilir, taşan yerleri <strong>Silgi</strong> ile temizleyebilirsiniz. API anahtarı bağlandığında yapay zeka segmentasyonu otomatik devreye girer.</span>'
        );
      }
      updateBottomBar();
    } catch (_) {
      pushMaskUndo();
      state.mask = computeHeuristicWallMask();
      renderModeBCanvas();
      setStatusBanner('warn', 'Yerel duvar seçimi uygulandı. Duvar üzerine tıklayarak veya Fırça/Silgi ile ince ayar yapabilirsiniz.');
      updateBottomBar();
    } finally {
      btn.disabled = false;
    }
  }

  function paintBrushAt(cx, cy, radius, addMode) {
    const w = state.imgW, h = state.imgH;
    const r = Math.max(4, Math.round(radius));
    const rSq = r * r;
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(h - 1, Math.ceil(cy + r));
    const val = addMode ? 255 : 0;

    for (let y = y0; y <= y1; y++) {
      const dy = y - cy;
      const row = y * w;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        if (dx * dx + dy * dy <= rSq) {
          state.mask[row + x] = val;
        }
      }
    }
  }

  function paintLine(p1, p2, radius, addMode) {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(1, Math.ceil(dist / Math.max(2, radius * 0.3)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      paintBrushAt(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t, radius, addMode);
    }
  }

  function getCanvasCoords(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function updateOrigToggleBtn() {
    const btn = $('btnToggleOrigB');
    if (!btn) return;
    btn.classList.toggle('active', state.showOriginalB);
    btn.innerHTML = state.showOriginalB
      ? '<i class="fas fa-eye"></i> Boyalıyı Göster'
      : '<i class="fas fa-eye-slash"></i> Orijinali Gör';
  }

  // ── Filigranlı Görsel İndirme (WhatsApp Grubu Paylaşımı İçin) ─────────────
  function downloadWatermarkedResult() {
    if (!state.hasPhoto) return;
    const srcCanvas = state.activeMode === 'a' ? state.modeAResultCanvas : $('canvasModeB');
    if (!srcCanvas) return;

    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const footerH = Math.max(54, Math.round(h * 0.095));

    const exp = document.createElement('canvas');
    exp.width = w;
    exp.height = h + footerH;
    const ctx = exp.getContext('2d');

    ctx.drawImage(srcCanvas, 0, 0, w, h);

    // Alt kurumsal marka şeridi
    ctx.fillStyle = '#1A2E44';
    ctx.fillRect(0, h, w, footerH);
    ctx.fillStyle = '#C9A227';
    ctx.fillRect(0, h, w, 3);

    const pad = Math.round(w * 0.025);
    const fontMain = Math.max(13, Math.round(footerH * 0.30));
    const fontSub = Math.max(11, Math.round(footerH * 0.22));

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${fontMain}px Montserrat, Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText('AKDENİZ YAPI DEKORASYON', pad, h + footerH * 0.37);

    ctx.fillStyle = '#E5C65C';
    ctx.font = `600 ${fontSub}px Open Sans, Arial, sans-serif`;
    ctx.fillText('antalyadiscephe.com  •  Ücretsiz Keşif: 0530 936 10 17', pad, h + footerH * 0.72);

    // Sağ tarafta renk kutusu + AKD kodu
    const label = `${state.selectedColor.code} ${state.selectedColor.name}`;
    ctx.font = `700 ${fontSub}px Montserrat, Arial, sans-serif`;
    const txtW = ctx.measureText(label).width;
    const swSize = Math.round(footerH * 0.44);
    const rightX = w - pad;

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.fillText(label, rightX, h + footerH * 0.42);

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `600 ${Math.max(10, fontSub - 1)}px Open Sans, Arial, sans-serif`;
    ctx.fillText(state.trimName, rightX, h + footerH * 0.74);

    const boxX = rightX - txtW - swSize - 10;
    const boxY = h + (footerH - swSize) / 2;
    ctx.fillStyle = state.selectedColor.hex;
    ctx.fillRect(boxX, boxY, swSize, swSize);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, swSize, swSize);

    const link = document.createElement('a');
    link.download = `akdeniz-yapi-cephe-${state.selectedColor.code.toLowerCase()}.jpg`;
    link.href = exp.toDataURL('image/jpeg', 0.92);
    link.click();
  }

  // ── Lead Unlock / Ücretsiz Keşif Modalı ───────────────────────────────────
  function openLeadModal(customTitle) {
    const modal = $('leadModal');
    if (!modal) return;
    if (customTitle) $('leadModalSub').textContent = customTitle;
    $('leadFormMsg').style.display = 'none';
    modal.style.display = 'flex';
  }

  function closeLeadModal() {
    const modal = $('leadModal');
    if (modal) modal.style.display = 'none';
  }

  async function submitLeadForm(ev) {
    ev.preventDefault();
    const name = $('leadName').value.trim();
    const phone = $('leadPhone').value.trim();
    const district = $('leadDistrict').value;
    const kvkk = $('leadKvkk').checked;
    const msgEl = $('leadFormMsg');
    const submitBtn = $('leadSubmitBtn');

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
          name,
          phone,
          district,
          colorCode: state.selectedColor.code,
          colorName: state.selectedColor.name,
          trimName: state.trimName,
          style: state.style,
          mode: state.activeMode,
          kvkk_consent: kvkk,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        msgEl.className = 'lead-msg is-err';
        msgEl.textContent = data.error || 'Talebiniz iletilemedi. Lütfen bilgilerinizi kontrol edin.';
        msgEl.style.display = 'block';
        return;
      }

      // Google Ads dönüşüm olayı
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', {
          event_category: 'facade_simulator',
          event_label: `${state.selectedColor.code}_${district}`,
        });
      }

      if (typeof data.remainingFree === 'number' && state.apiStatus) {
        state.apiStatus.remainingFree = data.remainingFree;
        updateBadges();
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

  // ── Event Listener Bağlantıları ───────────────────────────────────────────
  function initEvents() {
    // Mod sekmeleri
    $('tabModeA').addEventListener('click', () => switchMode('a'));
    $('tabModeB').addEventListener('click', () => switchMode('b'));

    // Dosya yükleme
    const fileInput = $('buildingFileInput');
    const dropzone = $('uploadDropzone');
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleFileInput(e.target.files[0]);
      fileInput.value = '';
    });
    $('btnChangePhoto').addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileInput(e.dataTransfer.files[0]);
      }
    });

    // Örnek binalar
    $('btnSampleApt').addEventListener('click', () => {
      loadSampleBuilding('/images/sim-apartman-base.webp?v=20261123', '/images/sim-apartman-wall-mask.png?v=20261123');
    });
    $('btnSampleVilla').addEventListener('click', () => {
      loadSampleBuilding('/images/sim-villa-base.webp?v=20261123b', '/images/sim-villa-wall-mask.png?v=20261123b');
    });

    // Kategori filtreleri
    document.querySelectorAll('#simCatTabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#simCatTabs button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.colorCat = btn.dataset.cat;
        renderPalette();
      });
    });

    // Renk seçimi
    $('simPaletteGrid').addEventListener('click', (e) => {
      const sw = e.target.closest('.sim-swatch');
      if (sw) selectColorByCode(sw.dataset.code);
    });

    // Söve rengi seçimi
    document.querySelectorAll('.sim-trim-dot').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sim-trim-dot').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.trimHex = btn.dataset.trim;
        state.trimName = btn.dataset.name;
        updateBottomBar();
      });
    });

    // Mod A stil seçimi
    document.querySelectorAll('.style-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.style-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.style = btn.dataset.style;
        updateBottomBar();
      });
    });

    // Mod A üret butonu
    $('btnRunModeA').addEventListener('click', runModeAGenerate);

    // Mod A Öncesi/Sonrası kaydırıcı (mouse + touch)
    const baWrap = $('baSliderWrap');
    let draggingBA = false;
    function updateBAFromClientX(clientX) {
      const rect = baWrap.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setBeforeAfterSplit(pct);
    }
    baWrap.addEventListener('mousedown', (e) => {
      if (!baWrap.classList.contains('has-result')) return;
      draggingBA = true;
      updateBAFromClientX(e.clientX);
    });
    window.addEventListener('mousemove', (e) => {
      if (draggingBA) updateBAFromClientX(e.clientX);
    });
    window.addEventListener('mouseup', () => { draggingBA = false; });
    baWrap.addEventListener('touchstart', (e) => {
      if (!baWrap.classList.contains('has-result') || !e.touches[0]) return;
      draggingBA = true;
      updateBAFromClientX(e.touches[0].clientX);
    }, { passive: true });
    baWrap.addEventListener('touchmove', (e) => {
      if (draggingBA && e.touches[0]) updateBAFromClientX(e.touches[0].clientX);
    }, { passive: true });
    baWrap.addEventListener('touchend', () => { draggingBA = false; });

    // Mod B araç çubuğu
    $('btnAutoMaskB').addEventListener('click', runModeBAutoMask);
    document.querySelectorAll('.mask-tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mask-tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.maskTool = btn.dataset.tool;
      });
    });

    $('rangeTolerance').addEventListener('input', (e) => {
      state.tolerance = parseInt(e.target.value, 10) || 34;
      $('lblTolerance').textContent = state.tolerance;
    });
    $('rangeBrush').addEventListener('input', (e) => {
      state.brushRadius = parseInt(e.target.value, 10) || 24;
      $('lblBrush').textContent = state.brushRadius + 'px';
    });

    $('btnUndoMaskB').addEventListener('click', undoMask);
    $('btnClearMaskB').addEventListener('click', clearMask);
    $('btnToggleOrigB').addEventListener('click', () => {
      state.showOriginalB = !state.showOriginalB;
      updateOrigToggleBtn();
      renderModeBCanvas();
    });

    // Mod B Canvas etkileşimi (tıkla-seç + fırça/silgi)
    const canvasB = $('canvasModeB');
    function startInteractB(clientX, clientY, shiftKey) {
      if (!state.hasPhoto) return;
      const pt = getCanvasCoords(canvasB, clientX, clientY);
      state.showOriginalB = false;
      updateOrigToggleBtn();

      if (state.maskTool === 'wand') {
        pushMaskUndo();
        const addMode = !shiftKey;
        const added = floodFillWall(pt.x, pt.y, state.tolerance, addMode);
        if (added > 0) {
          softenMask(state.mask, state.imgW, state.imgH);
          renderModeBCanvas();
          updateBottomBar();
        }
        return;
      }

      pushMaskUndo();
      state.isDrawing = true;
      state.lastPt = pt;
      paintBrushAt(pt.x, pt.y, state.brushRadius, state.maskTool === 'brush');
      renderModeBCanvas();
      updateBottomBar();
    }

    function moveInteractB(clientX, clientY) {
      if (!state.isDrawing || !state.hasPhoto) return;
      const pt = getCanvasCoords(canvasB, clientX, clientY);
      paintLine(state.lastPt || pt, pt, state.brushRadius, state.maskTool === 'brush');
      state.lastPt = pt;
      renderModeBCanvas();
    }

    canvasB.addEventListener('mousedown', (e) => startInteractB(e.clientX, e.clientY, e.shiftKey));
    window.addEventListener('mousemove', (e) => moveInteractB(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => { state.isDrawing = false; state.lastPt = null; });

    canvasB.addEventListener('touchstart', (e) => {
      if (!e.touches[0]) return;
      if (state.maskTool !== 'wand') e.preventDefault();
      startInteractB(e.touches[0].clientX, e.touches[0].clientY, false);
    }, { passive: false });
    canvasB.addEventListener('touchmove', (e) => {
      if (!state.isDrawing || !e.touches[0]) return;
      e.preventDefault();
      moveInteractB(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    canvasB.addEventListener('touchend', () => { state.isDrawing = false; state.lastPt = null; });

    // İndirme & Lead Modalı
    $('btnDownloadImg').addEventListener('click', downloadWatermarkedResult);
    $('btnOpenLeadModal').addEventListener('click', () => {
      openLeadModal('Binanız için ücretsiz yerinde basılı kartela keşfi ve +5 ek yapay zeka simülasyon hakkı kazanın.');
    });
    $('btnCloseLeadModal').addEventListener('click', closeLeadModal);
    $('leadModal').addEventListener('click', (e) => {
      if (e.target === $('leadModal')) closeLeadModal();
    });
    $('leadForm').addEventListener('submit', submitLeadForm);
  }

  // Başlat
  document.addEventListener('DOMContentLoaded', () => {
    renderPalette();
    initEvents();
    switchMode('a');
    updateBottomBar();
    loadApiStatus();
  });
})();
