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
    colorCat: 'all',
    selectedCodes: ['AKD-104'], // En fazla 3 renk seçilebilir
    trimName: 'Antrasit Söve',
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

  function setBanner(type, html) {
    const el = $('aiStatusBanner');
    if (!el) return;
    if (!html) {
      el.style.display = 'none';
      return;
    }
    el.className = 'sim-status-banner sim-status-' + type;
    el.innerHTML = html;
    el.style.display = 'flex';
  }

  // ── 30'luk AKD Renk Kartelası (3D Tasarım İçin En Fazla 3 Renk Seçimi) ────
  function renderPalette() {
    const grid = $('simPaletteGrid');
    if (!grid) return;
    const list = state.colorCat === 'all' ? COLORS : COLORS.filter((c) => c.cat === state.colorCat);
    grid.innerHTML = list.map((c) => {
      const idx = state.selectedCodes.indexOf(c.code);
      const isSelected = idx !== -1;
      const fg = c.light ? '#1a2e44' : '#ffffff';
      return `<button type="button" class="sim-swatch ${isSelected ? 'active' : ''}" data-code="${c.code}" style="background:${c.hex};color:${fg};" title="${c.code} ${c.name}">
        ${isSelected ? `<span class="sw-pick-badge">${idx + 1}</span>` : ''}
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
      return `<span class="picked-chip">
        <span class="picked-dot" style="background:${c.hex};"></span>
        <span>${c.code} ${c.name}</span>
        <button type="button" data-remove="${c.code}" aria-label="${c.code} kaldır">&times;</button>
      </span>`;
    }).join('');

    updateQuickWaLink();
  }

  function toggleColorCode(code) {
    if (!COLOR_MAP[code]) return;
    const idx = state.selectedCodes.indexOf(code);
    if (idx !== -1) {
      if (state.selectedCodes.length > 1) {
        state.selectedCodes.splice(idx, 1);
      }
    } else {
      if (state.selectedCodes.length >= 3) {
        state.selectedCodes.shift(); // En eski seçimi çıkar, en fazla 3 renk tut
      }
      state.selectedCodes.push(code);
    }
    renderPalette();
    renderSelectedChips();
    highlightRecCards();
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
      `Merhaba, antalyadiscephe.com AI Cephe Analizi sayfasından ücretsiz 3D bina tasarımı istiyorum${refPart}. Seçtiğim renkler: ${names} | ${state.trimName} | ${state.serviceType}.`
    );
    const url = `https://wa.me/905309361017?text=${msg}`;
    if ($('floatWaBtn')) $('floatWaBtn').href = url;
    if ($('btnDirectWa')) $('btnDirectWa').href = url;
  }

  // ── AI Raporunu Ekrana Bas ────────────────────────────────────────────────
  function renderAiReport(analysis, uploadId, aiUsed) {
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
      if (uploadId) {
        refBadge.textContent = `Orijinal Fotoğraf Kaydedildi • Ref #${uploadId}`;
        refBadge.style.display = 'inline-flex';
      } else {
        refBadge.textContent = 'Örnek Bina Analizi (Kendi fotoğrafınızı yükleyebilirsiniz)';
        refBadge.style.display = 'inline-flex';
      }
    }

    const aiTag = $('repAiEngineTag');
    if (aiTag) {
      aiTag.textContent = aiUsed ? 'Gemini 2.5 Flash Canlı AI Analizi' : 'Standart Mimari Değerlendirme';
    }

    // 3 Önerilen AKD Renk Kombinasyon Kartları
    const recs = Array.isArray(analysis.recommendations) ? analysis.recommendations : [];
    const recGrid = $('aiRecGrid');
    recGrid.innerHTML = recs.map((r, i) => `
      <div class="ai-rec-card" data-rec-code="${esc(r.wallCode)}" data-rec-trim="${esc(r.trimName)}">
        <div class="rec-top">
          <span class="rec-rank">Öneri #${i + 1}</span>
          <div class="rec-swatches">
            <span class="rec-sw-wall" style="background:${esc(r.wallHex)};" title="${esc(r.wallCode)}"></span>
            <span class="rec-sw-trim" style="background:${esc(r.trimHex)};" title="${esc(r.trimName)}"></span>
          </div>
        </div>
        <div class="rec-title">${esc(r.wallCode)} ${esc(r.wallName)}</div>
        <div class="rec-trim">+ ${esc(r.trimName)}</div>
        <p class="rec-reason">${esc(r.reason)}</p>
        <div class="rec-actions">
          <button type="button" class="btn-rec-pick" data-pick-code="${esc(r.wallCode)}" data-pick-trim="${esc(r.trimName)}">
            <i class="fas fa-check-circle"></i> 3D Tasarım İçin Seç
          </button>
        </div>
      </div>
    `).join('');

    // İlk 2 AI önerisini otomatik 3D tasarım listesine ekle
    if (recs.length > 0) {
      state.selectedCodes = recs.slice(0, 2).map((r) => r.wallCode).filter((c) => Boolean(COLOR_MAP[c]));
      if (!state.selectedCodes.length) state.selectedCodes = ['AKD-104'];
      setTrim(recs[0].trimName || 'Antrasit Söve');
      renderPalette();
      renderSelectedChips();
      highlightRecCards();
    }

    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function highlightRecCards() {
    document.querySelectorAll('.ai-rec-card').forEach((el) => {
      const code = el.dataset.recCode;
      const isPicked = state.selectedCodes.includes(code);
      el.classList.toggle('is-picked', isPicked);
      const btn = el.querySelector('.btn-rec-pick');
      if (btn) {
        btn.innerHTML = isPicked
          ? '<i class="fas fa-check-double"></i> 3D Listesinde Seçili'
          : '<i class="fas fa-plus-circle"></i> 3D Tasarım İçin Seç';
      }
    });
  }

  // ── Fotoğraf Yükleme & Otomatik AI Cephe Analizi ──────────────────────────
  async function analyzeFile(file, previewUrl, isSample = false) {
    if (state.busy) return;
    state.busy = true;
    state.isSample = isSample;
    state.uploadId = null;

    $('uploadDropzone').style.display = 'none';
    $('photoPreviewBox').style.display = 'block';
    $('imgUploadedPreview').src = previewUrl;
    $('photoScanLoader').style.display = 'flex';
    $('btnChangePhoto').style.display = 'inline-flex';
    $('req3dSuccessBox').style.display = 'none';
    setBanner('info', '<i class="fas fa-spinner fa-spin"></i> Yapay zeka (Gemini 2.5 Flash) binanızın cephesini analiz ediyor ve en uygun AKD renklerini belirliyor (3–5 sn)...');

    try {
      const fd = new FormData();
      fd.append('photo', file, file.name || 'bina.jpg');
      if (isSample) fd.append('isSample', '1');

      const res = await fetch('/api/simulate/analyze', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setBanner('error', '<i class="fas fa-exclamation-triangle"></i> ' + (data.error || 'Fotoğraf analiz edilemedi. Lütfen net bir bina cephe fotoğrafı yükleyin.'));
        return;
      }

      state.uploadId = data.uploadId || null;
      renderAiReport(data.analysis, state.uploadId, Boolean(data.aiUsed));

      if (data.aiUsed) {
        setBanner(
          'success',
          `<i class="fas fa-check-circle"></i> <span><strong>AI Cephe Analiziniz Hazır!</strong> ${state.uploadId ? `Orijinal fotoğrafınız <strong>Ref #${state.uploadId}</strong> koduyla kaydedildi. ` : ''}Aşağıdan beğendiğiniz renkleri seçip <strong>ücretsiz 3D cephe tasarımınızı</strong> WhatsApp numaranıza isteyebilirsiniz.</span>`
        );
      } else {
        setBanner('info', '<i class="fas fa-info-circle"></i> Fotoğrafınız alındı! Aşağıdan 1–3 AKD rengi seçip ücretsiz 3D tasarım talebinizi iletebilirsiniz.');
      }
      updateQuickWaLink();
    } catch (_) {
      setBanner('error', '<i class="fas fa-wifi"></i> Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
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
    reader.onload = (ev) => analyzeFile(file, ev.target.result, false);
    reader.readAsDataURL(file);
  }

  async function analyzeSampleBuilding(url, filename) {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const file = new File([blob], filename, { type: blob.type || 'image/webp' });
      analyzeFile(file, url, true);
    } catch (_) {
      setBanner('error', 'Örnek bina görseli yüklenemedi.');
    }
  }

  // ── Ücretsiz 3D Tasarım Formu Gönderimi ───────────────────────────────────
  async function submit3DRequest(ev) {
    ev.preventDefault();
    const msgEl = $('req3dErrorMsg');
    const submitBtn = $('btnSubmit3d');
    msgEl.style.display = 'none';

    const name = $('reqName').value.trim();
    const phone = $('reqPhone').value.trim();
    const district = $('reqDistrict').value;
    const notes = $('reqNotes').value.trim();
    const kvkk = $('reqKvkk').checked;

    if (!kvkk) {
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
          name,
          phone,
          district,
          uploadId: state.uploadId,
          selectedColors: state.selectedCodes.map((code) => ({
            code,
            name: COLOR_MAP[code]?.name || '',
          })),
          trimName: state.trimName,
          serviceType: state.serviceType,
          notes,
          kvkk_consent: kvkk,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        msgEl.textContent = data.error || 'Talebiniz gönderilemedi. Lütfen bilgilerinizi kontrol edin.';
        msgEl.style.display = 'block';
        return;
      }

      // Google Ads dönüşüm olayı
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', {
          event_category: 'ai_facade_3d_request',
          event_label: `${state.selectedCodes.join('_')}_${district}`,
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

  // ── Event Listener Bağlantıları ───────────────────────────────────────────
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

    $('btnSampleApt').addEventListener('click', () => analyzeSampleBuilding('/images/sim-apartman-base.webp?v=20261123', 'ornek-apartman.webp'));
    $('btnSampleVilla').addEventListener('click', () => analyzeSampleBuilding('/images/sim-villa-base.webp?v=20261123b', 'ornek-villa.webp'));

    $('aiRecGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-rec-pick');
      if (!btn) return;
      const code = btn.dataset.pickCode;
      const trim = btn.dataset.pickTrim;
      toggleColorCode(code);
      if (trim) setTrim(trim);
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
      if (sw) toggleColorCode(sw.dataset.code);
    });

    $('selectedColorChips').addEventListener('click', (e) => {
      const rm = e.target.closest('button[data-remove]');
      if (rm) toggleColorCode(rm.dataset.remove);
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

    $('req3dForm').addEventListener('submit', submit3DRequest);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
