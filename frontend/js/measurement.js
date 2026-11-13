/* Akdeniz Yapı: GA4 contact measurement & Mobile Conversion Bar. Active by default with opt-out control. */
(function () {
  'use strict';
  if (window.AkdenizAnalytics) return;

  const ID = 'G-PF6G0JVHK5';
  const KEY = 'akdeniz_measurement_consent_v1';
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  let saved = null;
  try {
    const choice = JSON.parse(localStorage.getItem(KEY));
    if (choice && ['granted', 'denied'].includes(choice.value)
      && Date.now() - choice.time < MAX_AGE && choice.time <= Date.now()) saved = choice.value;
  } catch (_) { /* Storage can be unavailable in private browsing. */ }

  let allowed = saved !== 'denied';
  let loaded = false;
  let banner;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window['ga-disable-' + ID] = !allowed;
  window.gtag('consent', 'default', {
    analytics_storage: allowed ? 'granted' : 'denied',
    ad_storage: allowed ? 'granted' : 'denied',
    ad_user_data: allowed ? 'granted' : 'denied',
    ad_personalization: 'denied'
  });

  function safeLocation() {
    const url = new URL(window.location.href);
    const kept = new URLSearchParams();
    for (const name of ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const value = url.searchParams.get(name);
      if (value) kept.set(name, value.slice(0, 200));
    }
    return url.origin + url.pathname + (kept.size ? '?' + kept.toString() : '');
  }

  function hasAdClickParam() {
    try {
      const sp = new URLSearchParams(window.location.search);
      return Boolean(sp.get('gclid') || sp.get('gbraid') || sp.get('wbraid') || sp.get('utm_campaign'));
    } catch (_) { return false; }
  }

  function loadTag() {
    if (loaded) return;
    loaded = true;
    window.gtag('js', new Date());
    window.gtag('config', ID, {
      page_location: safeLocation(),
      page_referrer: document.referrer ? new URL(document.referrer).origin : '',
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    script.id = 'akdeniz-google-tag';
    document.head.appendChild(script);
  }

  function clearMeasurementCookies() {
    const names = document.cookie.split(';').map(part => part.split('=')[0].trim())
      .filter(name => /^(_ga(?:_|$)|_gcl_)/.test(name));
    for (const name of names) {
      for (const domain of ['', window.location.hostname, '.' + window.location.hostname]) {
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax; Secure' + (domain ? '; Domain=' + domain : '');
      }
    }
  }

  function choose(value, remember) {
    allowed = value === 'granted';
    window['ga-disable-' + ID] = !allowed;
    window.gtag('consent', 'update', {
      analytics_storage: allowed ? 'granted' : 'denied',
      ad_storage: allowed ? 'granted' : 'denied',
      ad_user_data: allowed ? 'granted' : 'denied',
      ad_personalization: 'denied'
    });
    if (remember) {
      try { localStorage.setItem(KEY, JSON.stringify({ value, time: Date.now() })); } catch (_) {}
    }
    if (allowed) loadTag();
    else clearMeasurementCookies();
    if (banner) banner.hidden = true;
  }

  function recordServerClick(eventType, targetHref) {
    try {
      const payload = JSON.stringify({
        event_type: eventType,
        page_path: window.location.pathname,
        target_href: targetHref || '',
        has_gclid: hasAdClickParam()
      });
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/settings/track-click', blob);
      } else {
        fetch('/api/settings/track-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        }).catch(function () {});
      }
    } catch (_) {}
  }

  function track(name, params) {
    if (!allowed) return false;
    try {
      window.gtag('event', name, Object.assign({
        send_to: ID, page_location: safeLocation(), page_path: window.location.pathname
      }, params));
      return true;
    } catch (_) { return false; }
  }

  window.AkdenizAnalytics = Object.freeze({
    trackLead: function () { return track('generate_lead', { lead_source: 'contact_form' }); }
  });

  document.addEventListener('click', function (event) {
    const target = event.target && (event.target.closest ? event.target : event.target.parentElement);
    const link = target && target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (/^tel:/i.test(href)) {
      track('phone_click', { contact_method: 'phone' });
      track('generate_lead', { lead_source: 'phone_click', contact_method: 'phone' });
      recordServerClick('phone_click', href);
      return;
    }
    try {
      const url = new URL(href, window.location.href);
      if (['wa.me', 'api.whatsapp.com', 'web.whatsapp.com', 'www.whatsapp.com', 'whatsapp.com'].includes(url.hostname)) {
        track('whatsapp_click', { contact_method: 'whatsapp' });
        track('generate_lead', { lead_source: 'whatsapp_click', contact_method: 'whatsapp' });
        recordServerClick('whatsapp_click', href);
      }
    } catch (_) {}
  }, { passive: true });

  function initConsentAndMobileBar() {
    const style = document.createElement('style');
    style.textContent = [
      '.ay-consent[hidden]{display:none!important}',
      '.ay-consent{position:fixed;z-index:10001;bottom:70px;left:50%;transform:translateX(-50%);width:min(680px,calc(100% - 32px));box-sizing:border-box;padding:18px;background:#fff;color:#202020;box-shadow:0 4px 28px #0003;border:1px solid #ddd;border-radius:12px;font:14px/1.5 Arial,sans-serif}',
      '.ay-consent p{margin:0 0 12px}',
      '.ay-consent a{color:#202020;font-weight:700;text-decoration:underline}',
      '.ay-consent-actions{display:flex;gap:10px;flex-wrap:wrap}',
      '.ay-consent button,.ay-consent-pref{font:inherit;cursor:pointer;border:1px solid #333;border-radius:6px;padding:8px 14px;background:#fff;color:#202020}',
      '.ay-consent button:first-child{background:#202020;color:#fff}',
      '.ay-consent-pref{position:fixed;z-index:9998;bottom:10px;left:10px;font:11px Arial,sans-serif;padding:5px 9px;opacity:.75}',
      '.ay-mobile-cta{display:none}',
      '@media(max-width:768px){',
      '  body{padding-bottom:64px}',
      '  .wa-float{display:none!important}',
      '  .ay-consent-pref{bottom:68px;left:8px;font-size:10px;padding:4px 7px;background:rgba(255,255,255,.9)}',
      '  .ay-mobile-cta{display:grid;grid-template-columns:1fr 1fr;position:fixed;bottom:0;left:0;right:0;z-index:10000;background:#fff;box-shadow:0 -3px 18px rgba(0,0,0,.15);border-top:2px solid #c9a227}',
      '  .ay-mobile-cta a{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 8px;font:800 14px/1.2 Montserrat,Arial,sans-serif;text-decoration:none;color:#fff;text-align:center}',
      '  .ay-mobile-cta-call{background:linear-gradient(135deg,#c9a227,#a07d10)}',
      '  .ay-mobile-cta-wa{background:linear-gradient(135deg,#25d366,#1da851)}',
      '}'
    ].join('');
    document.head.appendChild(style);

    banner = document.createElement('section');
    banner.className = 'ay-consent';
    banner.setAttribute('aria-label', 'İstatistik ve reklam ölçümü çerezleri');
    const text = document.createElement('p');
    text.append('Site kullanımını ve reklamlarımızdan gelen iletişim taleplerini ölçmek için çerezler kullanıyoruz. Tercihinizi dilediğiniz zaman değiştirebilirsiniz. Detaylı bilgi için ');
    const policyLink = document.createElement('a');
    policyLink.href = '/kvkk.html#cerez-politikasi';
    policyLink.textContent = 'KVKK ve Çerez Politikası';
    text.append(policyLink, ' sayfamızı inceleyebilirsiniz.');
    banner.appendChild(text);

    const actions = document.createElement('div');
    actions.className = 'ay-consent-actions';
    for (const [value, label] of [['granted', 'Kabul et'], ['denied', 'Reddet']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', function () { choose(value, true); });
      actions.appendChild(button);
    }
    banner.appendChild(actions);
    // Do not block the screen on load; user can open preferences anytime
    banner.hidden = true;
    document.body.appendChild(banner);

    const preferences = document.createElement('button');
    preferences.type = 'button';
    preferences.className = 'ay-consent-pref';
    preferences.textContent = 'Çerez tercihleri';
    preferences.addEventListener('click', function () { banner.hidden = !banner.hidden; });
    document.body.appendChild(preferences);

    // Sticky Mobile Conversion Bar (Phone + WhatsApp)
    const mobileBar = document.createElement('nav');
    mobileBar.className = 'ay-mobile-cta';
    mobileBar.setAttribute('aria-label', 'Hızlı İletişim');
    mobileBar.innerHTML =
      '<a href="tel:05309361017" class="ay-mobile-cta-call"><i class="fas fa-phone-alt"></i> Hemen Ara</a>' +
      '<a href="https://wa.me/905309361017?text=Merhaba%2C%20%C3%BCcretsiz%20ke%C5%9Fif%20ve%20fiyat%20teklifi%20almak%20istiyorum." target="_blank" rel="noopener" class="ay-mobile-cta-wa"><i class="fab fa-whatsapp" style="font-size:17px"></i> WhatsApp Teklif</a>';
    document.body.appendChild(mobileBar);

    if (saved) choose(saved, false);
    else loadTag();
  }

  if (allowed) loadTag();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initConsentAndMobileBar, { once: true });
  else initConsentAndMobileBar();
})();
