/* ============================================================================
   Akdeniz Yapı Dekorasyon — Gerçekçi Bina & Boyacı Usta Simülatörü
   - Fotogerçekçi Apartman & Villa üzerinde 30 özgün AKD rengi + 3 söve tonu
   - Seçenek 1: TSE Çelik İskele Kurulumu + Kat Kat Zig-Zag Boyama + Söküm (~10 sn)
   - Seçenek 2: Asma Sepet ile Yavaş & Akıcı Boyama (~8 sn)
   - Boya bitiminde usta elinde kovasıyla zeminde dolanıp cepheyi kontrol eder
   - Üstte kurumsal ışıklı 3D kompozit AKDENİZ YAPI tabelası
   - İlk tuğla duvar ustası yedeği: /js/painter-classic-backup.js
   ============================================================================ */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const REF_W = 640;
  const REF_H = 356;

  function ensureRoundRect(ctx) {
    if (ctx.roundRect) return;
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const rad = Math.min(Math.abs(r || 0), Math.abs(w) / 2, Math.abs(h) / 2);
      this.beginPath();
      this.moveTo(x + rad, y);
      this.lineTo(x + w - rad, y);
      this.arcTo(x + w, y, x + w, y + h, rad);
      this.lineTo(x + w, y + h - rad);
      this.arcTo(x + w, y + h, x, y + h, rad);
      this.lineTo(x + rad, y + h);
      this.arcTo(x, y + h, x, y, rad);
      this.lineTo(x, y + rad);
      this.arcTo(x, y, x + w, y, rad);
      this.closePath();
      return this;
    };
  }

  function hexToRgb01(hex) {
    const h = String(hex || '#8A452B').replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    ];
  }

  function adjBright(hex, amt) {
    const h = String(hex || '#8A452B').replace('#', '');
    const r = Math.min(255, Math.max(0, parseInt(h.slice(0, 2), 16) + amt));
    const g = Math.min(255, Math.max(0, parseInt(h.slice(2, 4), 16) + amt));
    const b = Math.min(255, Math.max(0, parseInt(h.slice(4, 6), 16) + amt));
    return `rgb(${r},${g},${b})`;
  }

  function R(deg) { return (deg * Math.PI) / 180; }
  function pt(ox, oy, len, ang) {
    return { x: ox + Math.cos(ang) * len, y: oy + Math.sin(ang) * len };
  }

  function loadImg(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = src;
    });
  }

  function create(opts) {
    const canvas = typeof opts.canvas === 'string' ? document.getElementById(opts.canvas) : opts.canvas;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    ensureRoundRect(ctx);

    const W = opts.width || canvas.width || 640;
    const H = opts.height || canvas.height || 356;
    canvas.width = W;
    canvas.height = H;
    const sx = W / REF_W;
    const sy = H / REF_H;

    const SCENES = {
      Apartman: {
        baseSrc: '/images/sim-apartman-base.webp?v=20261123',
        wallSrc: '/images/sim-apartman-wall-mask.png?v=20261123',
        trimSrc: '/images/sim-apartman-trim-mask.png?v=20261123',
        loaded: false, loading: false, baseData: null, wallAlpha: null, trimAlpha: null,
        xMin: 28, xMax: 612, groundY: 346,
        tiers: [
          { deckY: 166, paintY0: 48,  paintY1: 170 },
          { deckY: 254, paintY0: 170, paintY1: 258 },
          { deckY: 338, paintY0: 258, paintY1: 356 },
        ],
        cradleY: 234,
      },
      Villa: {
        baseSrc: '/images/sim-villa-base.webp?v=20261123b',
        wallSrc: '/images/sim-villa-wall-mask.png?v=20261123b',
        trimSrc: '/images/sim-villa-trim-mask.png?v=20261123b',
        loaded: false, loading: false, baseData: null, wallAlpha: null, trimAlpha: null,
        xMin: 98, xMax: 546, groundY: 346,
        tiers: [
          { deckY: 226, paintY0: 90,  paintY1: 230 },
          { deckY: 336, paintY0: 230, paintY1: 356 },
        ],
        cradleY: 248,
      },
    };

    const prevLayer = document.createElement('canvas');
    prevLayer.width = W; prevLayer.height = H;
    const nextLayer = document.createElement('canvas');
    nextLayer.width = W; nextLayer.height = H;

    let currentB = opts.initialBuilding === 'Villa' ? 'Villa' : 'Apartman';
    let mode = opts.initialMode === 'cradle' ? 'cradle' : 'scaffold';
    let prevColor = opts.initialPrevColor || { code: 'AKD-104', name: 'KALEİÇİ KREMİ', hex: '#F5EED7' };
    let targetColor = opts.initialColor || { code: 'AKD-301', name: 'KIZILKULE KİREMİT', hex: '#8A452B' };
    let trimHex = opts.initialTrimHex || '#F5F3EE';
    const onStatus = typeof opts.onStatus === 'function' ? opts.onStatus : function () {};

    let signTick = 0;
    let lastTs = performance.now();
    let isVisible = true;
    let rafStarted = false;

    const anim = {
      phase: 'patrol', // 'build' | 'paint' | 'teardown' | 'patrol'
      t: 0,
      tierIdx: 0,
      tierProgress: 0,
      scaffoldBuild: 0,
      cradleProgress: 0,
      patrolX: 160,
      patrolDir: 1,
      patrolWalk: 0,
      patrolPause: 0,
    };

    function extractPixels(img) {
      const oc = document.createElement('canvas');
      oc.width = W; oc.height = H;
      const ox = oc.getContext('2d', { willReadFrequently: true });
      ox.drawImage(img, 0, 0, W, H);
      return ox.getImageData(0, 0, W, H).data;
    }

    function bakeLayer(targetCanvas, s, wallHex, trHex) {
      if (!s.loaded) return;
      const c = targetCanvas.getContext('2d');
      const out = c.createImageData(W, H);
      const dst = out.data;
      const src = s.baseData;
      const wa = s.wallAlpha;
      const ta = s.trimAlpha;
      const [wr, wg, wb] = hexToRgb01(wallHex);
      const [tr, tg, tb] = hexToRgb01(trHex);
      const n = W * H;

      for (let i = 0; i < n; i++) {
        const p = i * 4;
        let r = src[p], g = src[p + 1], b = src[p + 2];
        const wm = wa[i];
        if (wm > 0) {
          const m = wm / 255;
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 234.6;
          const shade = lum > 1.08 ? 1.08 : lum;
          r = r * (1 - m) + Math.min(255, wr * 255 * shade) * m;
          g = g * (1 - m) + Math.min(255, wg * 255 * shade) * m;
          b = b * (1 - m) + Math.min(255, wb * 255 * shade) * m;
        }
        const tm = ta[i];
        if (tm > 0) {
          const m = tm / 255;
          const lum = (0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2]) / 234.6;
          const shade = lum > 1.08 ? 1.08 : lum;
          r = r * (1 - m) + Math.min(255, tr * 255 * shade) * m;
          g = g * (1 - m) + Math.min(255, tg * 255 * shade) * m;
          b = b * (1 - m) + Math.min(255, tb * 255 * shade) * m;
        }
        dst[p] = r;
        dst[p + 1] = g;
        dst[p + 2] = b;
        dst[p + 3] = 255;
      }
      c.putImageData(out, 0, 0);
    }

    function ensureScene(key) {
      const s = SCENES[key];
      if (s.loaded) return Promise.resolve(s);
      if (s.loading) return s.promise;
      s.loading = true;
      s.promise = Promise.all([loadImg(s.baseSrc), loadImg(s.wallSrc), loadImg(s.trimSrc)])
        .then(([bImg, wImg, tImg]) => {
          s.baseData = extractPixels(bImg);
          const wPx = extractPixels(wImg);
          const tPx = extractPixels(tImg);
          const n = W * H;
          s.wallAlpha = new Uint8Array(n);
          s.trimAlpha = new Uint8Array(n);
          for (let i = 0; i < n; i++) {
            s.wallAlpha[i] = wPx[i * 4 + 3];
            s.trimAlpha[i] = tPx[i * 4 + 3];
          }
          s.loaded = true;
          return s;
        })
        .catch(() => { s.loading = false; return null; });
      return s.promise;
    }

    // ── 1) Lüks 3D Işıklı Kompozit AKDENİZ YAPI Tabelası (REF_W x REF_H uzayında) ──
    function drawLuxurySign() {
      signTick++;
      const pulse = 0.88 + Math.sin(signTick * 0.065) * 0.12;
      const shimmerX = ((signTick * 2.2) % 420) - 90;

      const boxW = 292, boxH = 40;
      const boxX = (REF_W - boxW) / 2, boxY = 6;
      const cx = REF_W / 2, cy = boxY + boxH / 2;

      ctx.save();
      for (const spotX of [boxX + 54, boxX + boxW - 54]) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(spotX - 2, 0, 4, boxY + 2);
        const sp = ctx.createRadialGradient(spotX, boxY + 2, 1, spotX, boxY + 22, 46);
        sp.addColorStop(0, `rgba(255, 224, 130, ${0.28 * pulse})`);
        sp.addColorStop(1, 'rgba(255, 224, 130, 0)');
        ctx.fillStyle = sp;
        ctx.beginPath(); ctx.arc(spotX, boxY + 18, 46, 0, TAU); ctx.fill();
      }

      ctx.save();
      ctx.shadowColor = `rgba(212, 175, 55, ${0.65 * pulse})`;
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#0f1b2d';
      ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 9); ctx.fill();
      ctx.restore();

      const bg = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
      bg.addColorStop(0, '#1e324b');
      bg.addColorStop(0.45, '#111e30');
      bg.addColorStop(1, '#0b1422');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 9); ctx.fill();

      ctx.save();
      ctx.beginPath(); ctx.roundRect(boxX + 1, boxY + 1, boxW - 2, boxH * 0.45, 8); ctx.clip();
      const gloss = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH * 0.45);
      gloss.addColorStop(0, 'rgba(255,255,255,0.16)');
      gloss.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gloss;
      ctx.fillRect(boxX, boxY, boxW, boxH * 0.45);
      ctx.restore();

      const rim = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
      rim.addColorStop(0, '#f3d678');
      rim.addColorStop(0.5, '#c9a227');
      rim.addColorStop(1, '#f7e199');
      ctx.strokeStyle = rim;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 9); ctx.stroke();

      ctx.strokeStyle = 'rgba(243, 214, 120, 0.25)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.roundRect(boxX + 3.5, boxY + 3.5, boxW - 7, boxH - 7, 6); ctx.stroke();

      // Sol mimari 'A' amblem rozeti
      const emX = boxX + 25, emY = cy;
      const emGrad = ctx.createLinearGradient(emX - 12, emY - 12, emX + 12, emY + 12);
      emGrad.addColorStop(0, '#f9e28c');
      emGrad.addColorStop(1, '#b88915');
      ctx.fillStyle = emGrad;
      ctx.beginPath(); ctx.roundRect(emX - 13, emY - 12, 26, 24, 6); ctx.fill();
      ctx.strokeStyle = '#111e30'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(emX - 8, emY + 1); ctx.lineTo(emX, emY - 7.5); ctx.lineTo(emX + 8, emY + 1);
      ctx.stroke();
      ctx.fillStyle = '#111e30';
      ctx.font = "900 10.5px 'Montserrat', sans-serif";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('A', emX, emY + 4.5);

      const txtCx = cx + 12;
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const txtGrad = ctx.createLinearGradient(txtCx - 90, boxY + 6, txtCx + 90, boxY + 24);
      txtGrad.addColorStop(0, '#fff4cc');
      txtGrad.addColorStop(0.5, '#f3ce63');
      txtGrad.addColorStop(1, '#fff0b8');

      ctx.font = "900 14px 'Montserrat', sans-serif";
      ctx.shadowColor = `rgba(255, 213, 79, ${0.85 * pulse})`;
      ctx.shadowBlur = 10 * pulse;
      ctx.fillStyle = txtGrad;
      ctx.fillText('AKDENİZ YAPI', txtCx, cy - 6);

      ctx.shadowBlur = 4;
      ctx.font = "700 8px 'Montserrat', sans-serif";
      ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
      ctx.fillText('DIŞ CEPHE  •  MANTOLAMA  •  ANTALYA', txtCx, cy + 8.5);
      ctx.restore();

      ctx.save();
      ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 9); ctx.clip();
      const shG = ctx.createLinearGradient(boxX + shimmerX, boxY, boxX + shimmerX + 46, boxY + boxH);
      shG.addColorStop(0, 'rgba(255,255,255,0)');
      shG.addColorStop(0.5, 'rgba(255,244,204,0.16)');
      shG.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shG;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = `rgba(255, 224, 130, ${0.72 * pulse})`;
      ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = 8;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(boxX + 18, boxY + boxH - 1);
      ctx.lineTo(boxX + boxW - 18, boxY + boxH - 1);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    }

    // ── 2) TSE Çelik Dış Cephe İskelesi ──────────────────────────────────────
    function drawScaffolding(b, progress) {
      if (progress <= 0.01) return;
      const x0 = b.xMin - 6, x1 = b.xMax + 6;
      const fullTop = b.tiers[0].deckY - 46;
      const bot = b.groundY;
      const curTop = bot - (bot - fullTop) * progress;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 - 12, curTop - 12, (x1 - x0) + 24, bot - curTop + 20);
      ctx.clip();

      const cols = currentB === 'Apartman' ? 6 : 4;
      const stepX = (x1 - x0) / cols;

      ctx.strokeStyle = 'rgba(148,163,184,0.48)';
      ctx.lineWidth = 1.4;
      for (let t = 0; t < b.tiers.length; t++) {
        const yBot = b.tiers[t].deckY;
        const yTop = t === 0 ? fullTop : b.tiers[t - 1].deckY;
        for (let c = 0; c < cols; c++) {
          if ((c + t) % 2 !== 0) continue;
          const cx0 = x0 + c * stepX, cx1 = cx0 + stepX;
          ctx.beginPath();
          ctx.moveTo(cx0, yBot); ctx.lineTo(cx1, yTop);
          ctx.moveTo(cx1, yBot); ctx.lineTo(cx0, yTop);
          ctx.stroke();
        }
      }

      for (let c = 0; c <= cols; c++) {
        const px = x0 + c * stepX;
        ctx.strokeStyle = 'rgba(71,85,105,0.8)';
        ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(px, bot); ctx.lineTo(px, fullTop); ctx.stroke();
        ctx.strokeStyle = 'rgba(226,232,240,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px - 0.8, bot); ctx.lineTo(px - 0.8, fullTop); ctx.stroke();
      }

      for (let t = 0; t < b.tiers.length; t++) {
        const y = b.tiers[t].deckY;
        ctx.strokeStyle = 'rgba(201,162,39,0.78)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, y - 22); ctx.lineTo(x1, y - 22); ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.fillRect(x0 - 2, y, (x1 - x0) + 4, 6);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x0 - 2, y, (x1 - x0) + 4, 1.6);
      }

      ctx.restore();
    }

    // ── 3) Gerçekçi Çift Gözlü Akdeniz Yapı Ustası ──────────────────────────
    function drawUsta(x, footY, uOpts) {
      const SC = uOpts.scale || 0.92;
      const dir = uOpts.dir || 1;
      const walking = Boolean(uOpts.walking);
      const walkPhase = uOpts.walkPhase || 0;
      const painting = Boolean(uOpts.painting);
      const paintColor = uOpts.paintColor || '#8A452B';
      const rollerBob = uOpts.rollerBob || 0;

      const LEG_H = SC * 22;
      const HIP_Y = -LEG_H;
      const TRS_H = SC * 27;
      const SHLD_Y = HIP_Y - TRS_H;
      const HEAD_R = SC * 10;
      const HEAD_CY = SHLD_Y - SC * 5.2 - HEAD_R;
      const legSwing = walking ? Math.sin(walkPhase) * 19 : 0;

      ctx.save();
      ctx.translate(x, footY);
      ctx.scale(dir, 1);

      ctx.fillStyle = 'rgba(15,23,42,0.36)';
      ctx.beginPath(); ctx.ellipse(0, 1.5, SC * 12, SC * 3.2, 0, 0, TAU); ctx.fill();

      // Dizlikli iş pantolonu + iş botları
      for (const [ox, sw, shade] of [[-SC * 3.6, legSwing, '#1e2f5e'], [SC * 3.6, -legSwing, '#283d78']]) {
        ctx.save();
        ctx.translate(ox, HIP_Y);
        ctx.rotate(R(sw));
        ctx.fillStyle = shade;
        ctx.beginPath(); ctx.roundRect(-SC * 3.1, 0, SC * 6.2, LEG_H * 0.56, SC * 2); ctx.fill();
        ctx.fillStyle = '#141e38';
        ctx.beginPath(); ctx.roundRect(-SC * 2.9, LEG_H * 0.42, SC * 5.8, LEG_H * 0.20, SC * 1.2); ctx.fill();
        ctx.fillStyle = shade;
        ctx.beginPath(); ctx.roundRect(-SC * 2.8, LEG_H * 0.54, SC * 5.6, LEG_H * 0.42, SC * 1.6); ctx.fill();
        ctx.fillStyle = '#3e2723';
        ctx.beginPath(); ctx.roundRect(-SC * 3.2, LEG_H * 0.86, SC * 9.2, SC * 4.4, SC * 2); ctx.fill();
        ctx.fillStyle = '#111827';
        ctx.fillRect(-SC * 3.4, LEG_H * 0.86 + SC * 3.2, SC * 9.6, SC * 1.5);
        ctx.restore();
      }

      // Arka kol + eldiven + boya kovası
      const bAng = walking ? R(14 - Math.sin(walkPhase) * 15) : R(10);
      const bEl = pt(-SC * 4, SHLD_Y + SC * 3, SC * 12, bAng + Math.PI / 2);
      const bHd = pt(bEl.x, bEl.y, SC * 10, bAng * 0.6 + Math.PI / 2);
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = SC * 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-SC * 4, SHLD_Y + SC * 3); ctx.lineTo(bEl.x, bEl.y); ctx.lineTo(bHd.x, bHd.y); ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.beginPath(); ctx.arc(bHd.x, bHd.y, SC * 3.1, 0, TAU); ctx.fill();

      if (!painting) {
        ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(bHd.x, bHd.y + SC * 4.2, SC * 4.2, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.roundRect(bHd.x - SC * 5.5, bHd.y + SC * 4, SC * 11, SC * 10.5, 2); ctx.fill();
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.fillStyle = paintColor;
        ctx.fillRect(bHd.x - SC * 4.5, bHd.y + SC * 6, SC * 9, SC * 4);
      }

      // Gömlek + reflektörlü lacivert kurumsal iş yeleği
      const shirtG = ctx.createLinearGradient(-SC * 9.5, SHLD_Y, SC * 9.5, HIP_Y);
      shirtG.addColorStop(0, '#f1f5f9'); shirtG.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = shirtG;
      ctx.beginPath(); ctx.roundRect(-SC * 9.5, SHLD_Y, SC * 19, TRS_H, SC * 3); ctx.fill();

      const vestG = ctx.createLinearGradient(-SC * 8.5, SHLD_Y, SC * 8.5, HIP_Y);
      vestG.addColorStop(0, '#1e3a5f'); vestG.addColorStop(1, '#132234');
      ctx.fillStyle = vestG;
      ctx.beginPath(); ctx.roundRect(-SC * 8.4, SHLD_Y + SC * 1.5, SC * 16.8, TRS_H - SC * 2.5, SC * 2.5); ctx.fill();

      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(-SC * 3.2, SHLD_Y + SC * 1);
      ctx.lineTo(SC * 3.2, SHLD_Y + SC * 1);
      ctx.lineTo(0, SHLD_Y + SC * 9.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#e5c65c';
      ctx.fillRect(-SC * 8.4, HIP_Y - SC * 8.5, SC * 16.8, SC * 2.1);
      ctx.fillRect(-SC * 8.4, HIP_Y - SC * 13.5, SC * 16.8, SC * 1.6);

      ctx.fillStyle = paintColor;
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.ellipse(-SC * 4.5, SHLD_Y + SC * 11, SC * 2.2, SC * 1.3, -0.3, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#1f2937'; ctx.fillRect(-SC * 9.2, HIP_Y - SC * 2.2, SC * 18.4, SC * 3.6);
      ctx.fillStyle = '#d4af37'; ctx.fillRect(-SC * 2.4, HIP_Y - SC * 2.2, SC * 4.8, SC * 3.6);

      // Boyun + kulak + 3D cilt gradyanlı kafa + ÇİFT GÖZ + bıyık + gülümseme
      ctx.fillStyle = '#e8b384';
      ctx.beginPath(); ctx.roundRect(-SC * 3, HEAD_CY + HEAD_R - SC * 2, SC * 6, SC * 6.5, SC * 1.8); ctx.fill();

      ctx.fillStyle = '#e8b384';
      ctx.beginPath(); ctx.ellipse(-HEAD_R * 0.86, HEAD_CY + HEAD_R * 0.08, SC * 2.2, SC * 3.1, -0.15, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c48a5b'; ctx.lineWidth = SC * 0.6; ctx.stroke();

      const skinG = ctx.createRadialGradient(HEAD_R * 0.25, HEAD_CY - HEAD_R * 0.2, SC * 1.5, 0, HEAD_CY, HEAD_R * 1.15);
      skinG.addColorStop(0, '#ffd8b5');
      skinG.addColorStop(0.7, '#f2bd91');
      skinG.addColorStop(1, '#d99a6c');
      ctx.fillStyle = skinG;
      ctx.beginPath(); ctx.ellipse(0, HEAD_CY, HEAD_R * 0.96, HEAD_R * 1.04, 0, 0, TAU); ctx.fill();

      ctx.fillStyle = '#3e2723';
      ctx.beginPath(); ctx.roundRect(-HEAD_R * 0.88, HEAD_CY - HEAD_R * 0.28, SC * 2.6, SC * 4.4, 1.5); ctx.fill();

      const eyeY = HEAD_CY + HEAD_R * 0.04;
      const eyes = [
        { ex: -HEAD_R * 0.14, rx: SC * 1.95, ry: SC * 2.25 },
        { ex:  HEAD_R * 0.44, rx: SC * 1.80, ry: SC * 2.20 },
      ];
      for (const e of eyes) {
        ctx.strokeStyle = '#3e2723'; ctx.lineWidth = SC * 1.25; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(e.ex - e.rx * 1.1, eyeY - e.ry * 1.45);
        ctx.quadraticCurveTo(e.ex, eyeY - e.ry * 1.95, e.ex + e.rx * 1.1, eyeY - e.ry * 1.35);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(e.ex, eyeY, e.rx, e.ry, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2d1e17';
        ctx.beginPath(); ctx.arc(e.ex + SC * 0.45, eyeY + SC * 0.1, SC * 1.15, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(e.ex + SC * 0.8, eyeY - SC * 0.45, SC * 0.45, 0, TAU); ctx.fill();
      }

      ctx.strokeStyle = '#c48658'; ctx.lineWidth = SC * 0.95; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(HEAD_R * 0.18, eyeY + SC * 0.4);
      ctx.lineTo(HEAD_R * 0.30, HEAD_CY + HEAD_R * 0.34);
      ctx.lineTo(HEAD_R * 0.12, HEAD_CY + HEAD_R * 0.39);
      ctx.stroke();

      ctx.fillStyle = '#3e2723';
      ctx.beginPath(); ctx.ellipse(HEAD_R * 0.16, HEAD_CY + HEAD_R * 0.50, SC * 3.6, SC * 1.25, 0.04, 0, TAU); ctx.fill();

      ctx.strokeStyle = '#9c4221'; ctx.lineWidth = SC * 1.0; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(HEAD_R * 0.16, HEAD_CY + HEAD_R * 0.54, SC * 2.6, 0.2, Math.PI * 0.82); ctx.stroke();

      // Siperlikli 3D Sarı Baret + 'A' logosu
      const kg = ctx.createLinearGradient(-HEAD_R, HEAD_CY - HEAD_R * 1.2, HEAD_R, HEAD_CY);
      kg.addColorStop(0, '#fff59d');
      kg.addColorStop(0.45, '#f9a825');
      kg.addColorStop(1, '#d97706');
      ctx.fillStyle = kg;
      ctx.beginPath(); ctx.ellipse(0, HEAD_CY - HEAD_R * 0.24, HEAD_R * 1.18, HEAD_R * 0.88, 0, Math.PI, 0); ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.34)';
      ctx.beginPath(); ctx.ellipse(0, HEAD_CY - HEAD_R * 0.76, HEAD_R * 0.48, HEAD_R * 0.26, 0, Math.PI, 0); ctx.fill();

      ctx.fillStyle = '#eab308';
      ctx.beginPath(); ctx.ellipse(HEAD_R * 0.22, HEAD_CY - HEAD_R * 0.24, HEAD_R * 1.28, HEAD_R * 0.26, 0.04, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = '#b45309'; ctx.lineWidth = SC * 0.7; ctx.stroke();

      ctx.fillStyle = '#132234';
      ctx.beginPath(); ctx.roundRect(-SC * 2.8, HEAD_CY - HEAD_R * 0.88, SC * 6.4, SC * 5.4, 2); ctx.fill();
      ctx.fillStyle = '#f3d678'; ctx.font = `900 ${SC * 4.2}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('A', SC * 0.4, HEAD_CY - HEAD_R * 0.60);

      // Ön kol + eldiven + teleskopik rulo
      const fAng = painting ? R(-50) + Math.sin(rollerBob) * 0.22 : R(-18 + Math.sin(walkPhase) * 14);
      const fEl = pt(SC * 3, SHLD_Y + SC * 3, SC * 13, fAng);
      const fHd = pt(fEl.x, fEl.y, SC * 11, fAng * 0.65);
      ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = SC * 5.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(SC * 3, SHLD_Y + SC * 3); ctx.lineTo(fEl.x, fEl.y); ctx.lineTo(fHd.x, fHd.y); ctx.stroke();

      const sapAng = painting ? (-0.28 + Math.sin(rollerBob) * 0.18) : -0.65;
      const sapLen = painting ? SC * 34 : SC * 26;
      const sapEnd = pt(fHd.x, fHd.y, sapLen, sapAng);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = SC * 2.8;
      ctx.beginPath(); ctx.moveTo(fHd.x, fHd.y); ctx.lineTo(sapEnd.x, sapEnd.y); ctx.stroke();
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = SC * 4.4;
      const grip = pt(fHd.x, fHd.y, SC * 9.5, sapAng);
      ctx.beginPath(); ctx.moveTo(fHd.x, fHd.y); ctx.lineTo(grip.x, grip.y); ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.beginPath(); ctx.arc(fHd.x, fHd.y, SC * 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(fHd.x + SC * 0.6, fHd.y - SC * 0.5, SC * 1.8, 0, TAU); ctx.fill();

      ctx.save();
      ctx.translate(sapEnd.x, sapEnd.y);
      ctx.rotate(painting ? 0 : sapAng + Math.PI / 2);
      const rRad = SC * 5.2, rLen = SC * 13.5;
      const rg = ctx.createLinearGradient(0, -rLen, 0, rLen);
      rg.addColorStop(0, adjBright(paintColor, -35));
      rg.addColorStop(0.35, adjBright(paintColor, 25));
      rg.addColorStop(0.75, paintColor);
      rg.addColorStop(1, adjBright(paintColor, -30));
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.roundRect(-rRad, -rLen, rRad * 2, rLen * 2, rRad * 0.7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();

      ctx.restore();
    }

    function drawCradleWrapper(manX, cradleY) {
      const platW = 78;
      const left = manX - 37;
      ctx.save();
      ctx.strokeStyle = 'rgba(30,41,59,0.58)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(left + 6, 46); ctx.lineTo(left + 6, cradleY);
      ctx.moveTo(left + platW - 6, 46); ctx.lineTo(left + platW - 6, cradleY);
      ctx.stroke();

      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.roundRect(left, cradleY - 36, platW, 36, 4); ctx.stroke();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.roundRect(left - 2, cradleY - 2, platW + 4, 10, 3); ctx.fill();
      ctx.fillStyle = '#C9A227';
      ctx.fillRect(left + 2, cradleY + 1, platW - 4, 3);
      ctx.restore();
    }

    function startJob(newCol) {
      const b = SCENES[currentB];
      if (!b || !b.loaded) {
        targetColor = newCol;
        ensureScene(currentB).then(() => startJob(targetColor));
        return;
      }

      if (anim.phase === 'patrol') prevColor = targetColor;
      targetColor = newCol;
      bakeLayer(prevLayer, b, prevColor.hex, trimHex);
      bakeLayer(nextLayer, b, targetColor.hex, trimHex);

      anim.t = 0;
      anim.tierIdx = 0;
      anim.tierProgress = 0;
      anim.cradleProgress = 0;

      if (mode === 'scaffold') {
        anim.phase = 'build';
        anim.scaffoldBuild = 0;
        onStatus(`${targetColor.code} • ${targetColor.name} • İskele kuruluyor...`, targetColor);
      } else {
        anim.phase = 'paint';
        anim.scaffoldBuild = 0;
        onStatus(`${targetColor.code} • ${targetColor.name} • Asma sepetle boyanıyor...`, targetColor);
      }
    }

    function updatePatrol(b, dt) {
      if (anim.patrolPause > 0) { anim.patrolPause -= dt; return; }
      anim.patrolWalk += dt * 5.2;
      anim.patrolX += anim.patrolDir * dt * 36;
      if (anim.patrolX >= b.xMax - 36) { anim.patrolDir = -1; anim.patrolPause = 1.1; }
      else if (anim.patrolX <= b.xMin + 36) { anim.patrolDir = 1; anim.patrolPause = 1.1; }
    }

    function update(dt) {
      const b = SCENES[currentB];
      if (!b || !b.loaded) return;
      anim.t += dt;

      if (mode === 'scaffold') {
        if (anim.phase === 'build') {
          const dur = 2.0;
          anim.scaffoldBuild = Math.min(1, anim.t / dur);
          if (anim.t >= dur) {
            anim.phase = 'paint'; anim.t = 0; anim.tierIdx = 0; anim.tierProgress = 0;
            onStatus(`${targetColor.code} • ${targetColor.name} • 1. etap boyanıyor...`, targetColor);
          }
        } else if (anim.phase === 'paint') {
          const perTier = 6.4 / b.tiers.length;
          anim.tierProgress = Math.min(1, anim.t / perTier);
          if (anim.t >= perTier) {
            anim.tierIdx++; anim.t = 0; anim.tierProgress = 0;
            if (anim.tierIdx >= b.tiers.length) {
              anim.phase = 'teardown'; anim.scaffoldBuild = 1; prevColor = targetColor;
              onStatus(`${targetColor.code} • ${targetColor.name} • İskele sökülüyor...`, targetColor);
            } else {
              onStatus(`${targetColor.code} • ${targetColor.name} • ${anim.tierIdx + 1}. etap boyanıyor...`, targetColor);
            }
          }
        } else if (anim.phase === 'teardown') {
          const dur = 1.5;
          anim.scaffoldBuild = Math.max(0, 1 - anim.t / dur);
          if (anim.t >= dur) {
            anim.phase = 'patrol'; anim.t = 0; anim.patrolX = b.xMin + 48; anim.patrolDir = 1;
            onStatus(`${targetColor.code} • ${targetColor.name}`, targetColor);
          }
        } else {
          updatePatrol(b, dt);
        }
      } else {
        if (anim.phase === 'paint') {
          const dur = 7.5;
          anim.cradleProgress = Math.min(1, anim.t / dur);
          if (anim.t >= dur) {
            anim.phase = 'patrol'; anim.t = 0; prevColor = targetColor;
            anim.patrolX = b.xMax - 60; anim.patrolDir = -1;
            onStatus(`${targetColor.code} • ${targetColor.name}`, targetColor);
          }
        } else {
          updatePatrol(b, dt);
        }
      }
    }

    function render() {
      const b = SCENES[currentB];
      if (!b || !b.loaded) return;

      ctx.clearRect(0, 0, W, H);

      // 1) Yüksek çözünürlüklü (W x H) bina katmanları
      if (anim.phase === 'patrol' || anim.phase === 'teardown') {
        ctx.drawImage(nextLayer, 0, 0);
      } else if (anim.phase === 'build') {
        ctx.drawImage(prevLayer, 0, 0);
      } else if (anim.phase === 'paint' && mode === 'scaffold') {
        ctx.drawImage(prevLayer, 0, 0);
        for (let i = 0; i < anim.tierIdx; i++) {
          const tr = b.tiers[i];
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, tr.paintY0 * sy, W, (tr.paintY1 - tr.paintY0) * sy);
          ctx.clip();
          ctx.drawImage(nextLayer, 0, 0);
          ctx.restore();
        }
        const curTier = b.tiers[anim.tierIdx];
        if (curTier) {
          const leftToRight = anim.tierIdx % 2 === 0;
          const curXRef = leftToRight
            ? b.xMin + (b.xMax - b.xMin) * anim.tierProgress
            : b.xMax - (b.xMax - b.xMin) * anim.tierProgress;
          const curX = curXRef * sx;
          ctx.save();
          ctx.beginPath();
          if (leftToRight) ctx.rect(0, curTier.paintY0 * sy, curX, (curTier.paintY1 - curTier.paintY0) * sy);
          else ctx.rect(curX, curTier.paintY0 * sy, W - curX, (curTier.paintY1 - curTier.paintY0) * sy);
          ctx.clip();
          ctx.drawImage(nextLayer, 0, 0);
          ctx.restore();
        }
      } else if (anim.phase === 'paint' && mode === 'cradle') {
        ctx.drawImage(prevLayer, 0, 0);
        const curX = (b.xMin + (b.xMax - b.xMin) * anim.cradleProgress) * sx;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, curX, H); ctx.clip();
        ctx.drawImage(nextLayer, 0, 0);
        ctx.restore();
      }

      // 2) Vektörel katmanlar (REF_W x REF_H koordinatlarına orantılı ölçeklenir)
      ctx.save();
      ctx.scale(sx, sy);

      if (mode === 'scaffold' && anim.scaffoldBuild > 0.01) {
        drawScaffolding(b, anim.scaffoldBuild);
      }

      if (anim.phase === 'build' || anim.phase === 'teardown') {
        drawUsta(b.xMin + 34, b.groundY, {
          scale: 0.90, dir: 1, walking: false, painting: false, paintColor: targetColor.hex,
        });
      } else if (anim.phase === 'paint' && mode === 'scaffold') {
        const curTier = b.tiers[anim.tierIdx];
        if (curTier) {
          const leftToRight = anim.tierIdx % 2 === 0;
          const curX = leftToRight
            ? b.xMin + (b.xMax - b.xMin) * anim.tierProgress
            : b.xMax - (b.xMax - b.xMin) * anim.tierProgress;
          const manX = leftToRight ? curX - 38 : curX + 38;
          drawUsta(manX, curTier.deckY, {
            scale: 0.86, dir: leftToRight ? 1 : -1, walking: true,
            walkPhase: anim.t * 7.5, painting: true, paintColor: targetColor.hex, rollerBob: anim.t * 11,
          });
        }
      } else if (anim.phase === 'paint' && mode === 'cradle') {
        const curX = b.xMin + (b.xMax - b.xMin) * anim.cradleProgress;
        const manX = curX - 44;
        const cy = b.cradleY + Math.sin(anim.t * 2.5) * 3;
        drawCradleWrapper(manX, cy);
        drawUsta(manX, cy - 2, {
          scale: 0.94, dir: 1, walking: false, painting: true,
          paintColor: targetColor.hex, rollerBob: anim.t * 9,
        });
      } else if (anim.phase === 'patrol') {
        drawUsta(anim.patrolX, b.groundY, {
          scale: 0.92, dir: anim.patrolDir, walking: anim.patrolPause <= 0,
          walkPhase: anim.patrolWalk, painting: false, paintColor: targetColor.hex,
        });
      }

      drawLuxurySign();
      ctx.restore();
    }

    function loop(now) {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      if (isVisible) {
        update(dt);
        render();
      }
      requestAnimationFrame(loop);
    }

    if ('IntersectionObserver' in global) {
      const io = new IntersectionObserver((entries) => {
        isVisible = Boolean(entries[0] && entries[0].isIntersecting);
        if (isVisible) lastTs = performance.now();
      }, { threshold: 0.05 });
      io.observe(canvas);
    }

    // İlk sahneyi yükle & başlat
    ensureScene(currentB).then((s) => {
      if (!s) return;
      bakeLayer(prevLayer, s, prevColor.hex, trimHex);
      bakeLayer(nextLayer, s, targetColor.hex, trimHex);
      startJob(targetColor);
      if (!rafStarted) {
        rafStarted = true;
        lastTs = performance.now();
        requestAnimationFrame(loop);
      }
      // İkinci binayı arka planda sessizce önbelleğe al
      setTimeout(() => ensureScene(currentB === 'Apartman' ? 'Villa' : 'Apartman'), 900);
    });

    return {
      setColor(col) {
        startJob(col);
      },
      setTrim(hex) {
        trimHex = hex || '#F5F3EE';
        const b = SCENES[currentB];
        if (b && b.loaded) {
          bakeLayer(prevLayer, b, prevColor.hex, trimHex);
          bakeLayer(nextLayer, b, targetColor.hex, trimHex);
        }
      },
      setBuilding(name) {
        const key = name === 'Villa' ? 'Villa' : 'Apartman';
        currentB = key;
        prevColor = { code: 'AKD-104', name: 'KALEİÇİ KREMİ', hex: '#F5EED7' };
        ensureScene(key).then(() => startJob(targetColor));
      },
      setMode(m) {
        mode = m === 'cradle' ? 'cradle' : 'scaffold';
        prevColor = targetColor.hex === '#F5EED7'
          ? { code: 'AKD-203', name: 'KONYAALTI ÇAKILI', hex: '#C6C2BA' }
          : { code: 'AKD-104', name: 'KALEİÇİ KREMİ', hex: '#F5EED7' };
        startJob(targetColor);
      },
      replay() {
        prevColor = targetColor.hex === '#F5EED7'
          ? { code: 'AKD-203', name: 'KONYAALTI ÇAKILI', hex: '#C6C2BA' }
          : { code: 'AKD-104', name: 'KALEİÇİ KREMİ', hex: '#F5EED7' };
        startJob(targetColor);
      },
    };
  }

  global.AkdenizUstaSim = { create };
})(window);
