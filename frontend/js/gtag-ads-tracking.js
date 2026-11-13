/**
 * 2026 Google Ads Gelişmiş Dönüşüm İzleme Modülü (Enhanced Conversions)
 * Hedef Alan Adı: https://antalyadiscephe.com/ (Akdeniz Yapı Dekorasyon)
 *
 * Kurulum: Google Ads hesabınızdan aldığınız AW-XXXXXXXXXX kimliğini
 * aşağıdaki ADS_CONVERSION_ID alanına yazmanız yeterlidir.
 * Telefon (tel:05309361017), WhatsApp (wa.me/905309361017) ve
 * m² Maliyet Hesaplama Aracı tıklamalarını otomatik olarak Google Ads'e bildirir.
 */
(function () {
  const ADS_CONVERSION_ID = window.GOOGLE_ADS_ID || 'AW-XXXXXXXXXX';
  const LABELS = {
    whatsapp_click: 'WHATSAPP_KESIF_LABEL',
    phone_click: 'TELEFON_ARAMA_LABEL',
    calculator_lead: 'M2_HESAPLAMA_LABEL',
    contact_form: 'ILETISIM_FORM_LABEL'
  };

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  function fireAdsConversion(type, valueTL) {
    if (typeof window.gtag === 'function' && !ADS_CONVERSION_ID.includes('XXXX')) {
      window.gtag('event', 'conversion', {
        send_to: `${ADS_CONVERSION_ID}/${LABELS[type] || ''}`,
        value: valueTL || 250.0,
        currency: 'TRY'
      });
    }
    window.dataLayer.push({
      event: `ads_lead_${type}`,
      lead_type: type,
      lead_value: valueTL || 250.0,
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

  window.trackAdsCalculatorLead = function (estimatedBudget) {
    fireAdsConversion('calculator_lead', estimatedBudget || 500.0);
  };
})();
