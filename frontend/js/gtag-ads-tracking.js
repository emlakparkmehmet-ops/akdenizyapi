/**
 * 2026 Google Ads & GA4 Dönüşüm İzleme Modülü
 * Hedef Alan Adı: https://antalyadiscephe.com/ (Akdeniz Yapı Dekorasyon)
 * Google Ads Kimliği: AW-18544431674
 *
 * Telefon (tel:), WhatsApp (wa.me/), iletişim formu ve m² hesaplama
 * etkileşimlerini otomatik olarak generate_lead dönüşümü olarak bildirir.
 */
(function () {
  const ADS_CONVERSION_ID = window.GOOGLE_ADS_ID || 'AW-18544431674';
  const LABELS = {
    whatsapp_click: '',
    phone_click: '',
    calculator_lead: '',
    contact_form: ''
  };

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  function fireAdsConversion(type, valueTL) {
    const val = Number(valueTL) || 250.0;
    if (typeof window.gtag === 'function' && !ADS_CONVERSION_ID.includes('XXXX')) {
      // GA4 / Google Ads birincil hedefi: generate_lead
      window.gtag('event', 'generate_lead', {
        event_category: 'lead',
        event_label: type,
        value: val,
        currency: 'TRY',
        page_path: window.location.pathname
      });

      const label = LABELS[type];
      if (label && !label.endsWith('_LABEL')) {
        window.gtag('event', 'conversion', {
          send_to: `${ADS_CONVERSION_ID}/${label}`,
          value: val,
          currency: 'TRY'
        });
      }
    }
    window.dataLayer.push({
      event: `ads_lead_${type}`,
      lead_type: type,
      lead_value: val,
      currency: 'TRY',
      page_path: window.location.pathname
    });
  }

  document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link) return;
    const href = (link.getAttribute('href') || '').toLowerCase();

    if (href.includes('wa.me/') || href.includes('whatsapp.com')) {
      fireAdsConversion('whatsapp_click', 300.0);
    } else if (href.startsWith('tel:')) {
      fireAdsConversion('phone_click', 400.0);
    }
  });

  document.addEventListener('submit', function (e) {
    const form = e.target;
    if (form && form.matches && form.matches('form')) {
      fireAdsConversion('contact_form', 500.0);
    }
  });

  window.trackAdsCalculatorLead = function (estimatedBudget) {
    fireAdsConversion('calculator_lead', estimatedBudget || 500.0);
  };
})();
