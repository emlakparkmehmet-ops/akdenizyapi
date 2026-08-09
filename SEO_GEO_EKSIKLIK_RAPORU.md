# SEO & GEO Eksiklik Raporu — Akdeniz Yapı Dekorasyon

> ## ✅ GÜNCELLEME — 7 Ağustos 2026: Onarım tamamlandı
>
> Bu rapordaki bulguların **kod ile çözülebilir olanların tamamı düzeltildi** (18 ajanlık onarım + 4 ajanlık cila turu, tamamı bağımsız doğrulamadan geçti). Onarım sonrası yapılan tarafsız yeniden denetimde genel puan **52 → 87**'ye çıktı (Yapısal Veri 38→94, Meta/İçerik 52→94, Performans 48→90, Yerel SEO 52→88, GEO 58→82, Teknik SEO 58→80, Dinamik İndexleme 55→80). 87 puanlamasından sonra kalan kod maddeleri de (trust proxy, referans slug'ları, robots.txt bot grupları, şema normalizasyonu vb.) cila turunda kapatıldı.
>
> **Başlıca onarımlar:** Muratpaşa sayfasını boşaltan kırık JSON-LD onarıldı; soft-404 yerine gerçek 404 + özel 404 sayfası; hizmet **ve** referans detayları için temiz URL + sunucu tarafı render (AI botları artık içeriği görüyor); 4 yeni sayfa (Antalya Isı Yalıtımı pillar + Döşemealtı/Aksu/Serik); kesik ilçe içerikleri git geçmişinden kurtarılıp zenginleştirildi; tüm sayfalarda canonical/OG/Twitter/geo meta/şema tamamlandı; NAP her yerde Kepez adresiyle eşitlendi; sahte 4.9/128 puanı kaldırıldı; FAQ şemaları görünür içerikle birebir eşitlendi; görseller WebP'ye çevrildi, Unsplash hero'lar yerelleştirildi; gerçek favicon + favicon.ico; çift sitemap tekleştirildi; robots.txt 13 bot grubuyla yeniden yazıldı; llms.txt/llms-full.txt genişletildi; admin paneli noindex'lendi; git'teki gizli anahtarlar temizlendi (secret'lar yenilendi).
>
> **Doğrulama sonuçları:** 34/34 JSON-LD bloğu geçerli · 561 iç link kırıksız · 12/12 referans slug eşleşmesi · FAQ şemaları 9 sayfada birebir eşleşme · `node --check` temiz · smoke testte 404/301/SSR/sitemap davranışları doğrulandı.
>
> **Karar gereği yayınlanmadı:** Değişiklikler yerel çalışma ağacında bekliyor (kullanıcı kararı — commit/deploy yapılmadı; canlı site hâlâ eski sürümü çalıştırıyor).
>
> **Kalan işler yalnızca işletme sahibinin yapabilecekleri:**
> 1. Google İşletme Profili adını siteyle eşitleme ("AkdenizYapı Mantolama" → "Akdeniz Yapı Dekorasyon"; köprü olarak şemaya alternateName eklendi)
> 2. Gerçek şantiye/önce-sonra fotoğrafları (stok Unsplash görsellerinin yerine)
> 3. GA4 ölçüm kimliği (G-XXXX) — verilirse kod 10 dakikada eklenir
> 4. Yayınlamaya karar verilirse: Railway kalıcı volume, Railway'deki JWT_SECRET/admin şifresi rotasyonu (eskileri git geçmişinde), Google Cloud service account anahtarı rotasyonu
> 5. Alıntılanabilir gerçek fiyat aralığı (m² fiyatları) — işletmeden güncel rakam gelirse eklenir
>
> Aşağıdaki bölümler, 6 Ağustos tarihli orijinal denetimin arşiv halidir.

---

**Tarih:** 6 Ağustos 2026
**Kapsam:** 11 bağımsız denetçi ajan, 302 dosya incelemesi, 7 boyut (teknik SEO, meta/içerik, yapısal veri, GEO/AI görünürlüğü, yerel SEO, performans, dinamik indexlenebilirlik). Tüm bulgular dosya kanıtına karşı ikinci bir doğrulama turundan geçirildi.

## Genel Puan: 52 / 100

| Boyut | Puan | Özet |
|---|---|---|
| Teknik SEO | 58 | Canonical'lı ana/ilçe sayfaları, SSR meta enjeksiyonlu temiz hizmet URL'leri ve dinamik sitemap iyi; soft-404 catch-all, çelişen çift sitemap, 5 sayfada canonical eksiği puanı düşürüyor |
| Meta & İçerik | 52 | Şablonlar iyi kurgulanmış; ancak Muratpaşa sayfası fiilen boş, 3 ilçe sayfası yarıda kesik, 6 sayfada OG/canonical eksik |
| Yapısal Veri (Schema) | 38 | En zayıf boyut: kırık JSON-LD, görünür içerikle eşleşmeyen FAQ, doğrulanamayan aggregateRating, yanlış ilçeli adres; @id/sameAs/BreadcrumbList hiç yok, 6 sayfa şemasız |
| GEO (AI Görünürlüğü) | 58 | llms.txt/llms-full.txt standarda uygun, robots.txt AI botlarına açık; ancak tüm hizmet/kampanya/referans içeriği yalnızca JS ile yükleniyor, istatistikler çelişkili |
| Yerel SEO | 52 | Tel/WhatsApp linkleri ve geo meta temelleri var; NAP adres çelişkisi (Kepez vs Muratpaşa), işletme adı tutarsızlığı, ince ilçe içerikleri |
| Performans (CWV) | 48 | Compression aktif, CSS minify; ancak 3.3MB kırık LCP görseli, 285KB JPEG favicon, cache header yok, render-engelleyici fontlar |
| Dinamik İndexleme | 55 | Hizmet detayları için temiz URL + SSR meta doğru kurulmuş; referans sayfaları arama motorlarına tamamen görünmez, soft-404 yaygın |

---

## 🔴 KRİTİK (derhal düzeltilmeli)

### 1. Muratpaşa sayfası fiilen BOŞ — kapatılmamış JSON-LD tüm sayfayı yutuyor
**Dosya:** `frontend/muratpasa-mantolama.html:17`
Satır 17'de açılan `<script type="application/ld+json">` bloğu satır 23'te `"provider": {` ifadesinde yarıda kesiliyor; `</script>` kapanışı yok. İlk `</script>` ancak satır 272'de geldiği için **satır 18–272 arasındaki her şey (navbar, H1, tüm metin, FAQ bölümü, mahalle listesi, footer) script verisi olarak yutuluyor** — tarayıcı, Googlebot ve AI botları için sayfa boş. Ayrıca bu bozulma sırasında `style.css` + Google Fonts + Font Awesome linkleri de dosyadan silinmiş (diğer ilçe sayfalarında 33–36. satırlarda mevcut).
**Çözüm:** JSON-LD'yi `kepez-isi-yalitimi.html:17-32`'deki tam Service şeması gibi tamamlayıp (`provider`, `areaServed`, `description`) `</script>` ile kapatın; style.css ve font linklerini geri ekleyin. Sonrasında Google Rich Results Test ile doğrulayın.

### 2. Catch-all rota her bilinmeyen URL'ye 200 + ana sayfa dönüyor (soft-404)
**Dosya:** `backend/server.js:295`
`app.get('*')` hiçbir 404 durumu olmadan `index.html` gönderiyor. `/olmayan-sayfa`, `/isi-yalitimi-antalya.html`, kırık görsel istekleri dahil **sonsuz sayıda URL ana sayfanın kopyası olarak indekslenebilir** (soft-404 + duplicate content).
**Çözüm:** Bilinmeyen yollar için `res.status(404)` ile özel bir 404.html servis edin; uzantılı isteklere (`.png`, `.jpg`, `.css`...) dosya yoksa 404 döndüren bir koşul ekleyin.

### 3. Hizmet/kampanya/referans içerikleri yalnızca client-side JS ile yükleniyor
**Dosyalar:** `frontend/hizmet-detay.html:55`, `frontend/hizmetler.html:175`, `frontend/referans-detay.html`, `frontend/kampanyalar.html`
Sunucu hizmet detaylarında yalnızca meta enjekte ediyor; **gövde içeriği fetch ile geliyor, JS çalıştırmayan AI botları (ChatGPT, Claude, Perplexity) ve bazı crawler'lar hiçbir içerik göremiyor**. hizmetler.html kaynağında tek bir hizmet adı/linki yok.
**Çözüm:** `/hizmetler/:slug` rotasında zaten çekilen kaydın h1/açıklama/özelliklerini gövdeye de enjekte edin (SSR); hizmetler.html'e statik fallback kartlar gömün (main.js:249'daki "API boşsa dokunma" deseni doğru yaklaşım).

### 4. Güvenlik: Gizli anahtarlar repoda (SEO'yu da tehdit ediyor)
**Dosyalar:** `backend/.env:2`, `README.md`, `service_account.json:1`
`backend/.env` (JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD) git'te takip ediliyor; JWT_SECRET README'de açık yazılı; Google Indexing API özel anahtarı (`service_account.json`) proje kökünde. Admin ele geçirilirse spam içerik enjeksiyonuyla tüm SEO itibarı çökebilir; Indexing API anahtarıyla üçüncü kişiler Search Console mülkü adına toplu URL silme/bildirme yapabilir.
**Çözüm:** `git rm --cached backend/.env`, tüm secret'ları derhal değiştirin, service_account.json'u secret store'a taşıyıp anahtarı rotasyona sokun, README'ye placeholder koyun. `admin/login.html`'deki "Varsayılan: admin / admin123" notunu kaldırın.

---

## 🟠 YÜKSEK

### İndexleme & URL Yapısı
- **Çift sitemap çelişkisi:** `frontend/sitemap.xml` dinamik `/sitemap.xml` rotası (server.js:111) tarafından gölgeleniyor ve içerikleri çelişiyor. Statik dosyayı silin, tek kaynak dinamik rota kalsın.
- **5–6 sayfada canonical yok:** hizmetler, referanslar, kampanyalar, iletisim, referans-detay. Catch-all'ın ürettiği sonsuz kopya URL riski nedeniyle her sayfaya mutlak canonical ekleyin.
- **Var olmayan `/isi-yalitimi-antalya.html`** sayfasına 9 iç link + statik sitemap kaydı gidiyor. Ya bu sayfayı "Antalya Isı Yalıtımı" pillar sayfası olarak gerçekten oluşturun (en değerli seçenek) ya da tüm linkleri kaldırın.
- **Referans detayları görünmez:** query-param URL (`?slug=`), tamamen CSR, canonical/sitemap yok (main.js:267). Hizmetlerdeki modeli kopyalayın: `/referanslar/:slug` rotası + SSR meta + 301 + sitemap.
- **`/hizmetler/:slug` bilinmeyen slug'da 200 dönüyor** (server.js:199) — service null ise 404 döndürün.
- **Admin paneli korumasız:** robots.txt'de Disallow yok, noindex yok. `Disallow: /admin/` + `/api/` ekleyin ve `/admin` yanıtlarına `X-Robots-Tag: noindex, nofollow` başlığı koyun.
- **index_pages.py** Indexing API'ye var olmayan/yönlenen URL'leri bildiriyor — Google politikasına aykırı; normal kurumsal sayfalar için sitemap + Search Console kullanın.
- **Railway'de uploads kalıcı değil** — deploy sonrası görseller kaybolup 200+HTML dönüyor (görsel soft-404). Kalıcı volume veya S3/Cloudinary kullanın.

### İçerik & Meta
- **Konyaaltı, Kepez ve Lara sayfalarında içerik yarıda kesilmiş** (konyaalti-dis-cephe.html:119): eksik `</ul>`, kesilen hizmet listeleri, mahalle bölümü açılışı kayıp. Git geçmişindeki `6f90741` commit'iyle karşılaştırıp kaybolan içeriği kurtarın; her sayfaya Muratpaşa'daki gibi ilçeye özel FAQ + fiyat bölümü ekleyip 400–500 kelime özgün metin sağlayın.
- **6 sayfada Open Graph seti eksik** (yalnızca og:image var) — WhatsApp ağırlıklı bir işletme için paylaşım önizlemeleri doğrudan dönüşümü etkiler.
- **İlçe sayfalarına ana menüden link yok**; 4 iç sayfanın footer'ında ilçe linkleri eksik. index.html'deki "Hizmet Bölgeleri" footer sütununu (satır 697–706) tüm sayfalara kopyalayın.

### Yapısal Veri & Tutarlılık
- **FAQPage şeması görünür FAQ ile eşleşmiyor** (index.html:84) — Google yönerge ihlali, rich result kaybı/manuel aksiyon riski. Şemayı görünür 5 soru-cevabın birebir aynısıyla yeniden yazın.
- **aggregateRating 4.9/128 hiçbir görünür yorumla desteklenmiyor** (index.html:60) — ya gerçek yorumları görünür ekleyip Review markup'layın ya da bloğu kaldırın.
- **NAP çelişkisi:** şema adresi "Muratpaşa", görünür/gerçek adres Kepez (Şafak Mah. 4258. Sk. No:12, 07090); streetAddress/postalCode şemada yok; llms.txt'de adres hiç yok. Tek doğru adresi her yerde birebir aynı kullanın.
- **İşletme adı tutarsızlığı:** sitede "Akdeniz Yapı Dekorasyon", Google kaydında "AkdenizYapı Mantolama" — GBP'yi güncelleyin veya şemaya `alternateName` ekleyin.
- **Çelişkili istatistikler:** 500+ vs 12+ proje, %100 vs %98 memnuniyet — AI motorları tutarsız veriyi alıntılamaz; tek rakam seti belirleyip her yerde (HTML + llms.txt + şema) kullanın.

### Performans
- **hizmetler.html LCP görseli kırık:** `.jpg` isteniyor, diskte `.jfif` var; fallback 200+HTML dönüyor. WebP'ye çevirip doğru adla bağlayın.
- **favicon.png aslında 1024×1024, 285KB JPEG** — her sayfada yükleniyor. 32×32 gerçek PNG (<5KB) + 180×180 apple-touch-icon üretin.
- **index dışındaki tüm sayfalarda Google Fonts + Font Awesome render-engelleyici** — index'teki `media="print" onload` desenini kopyalayın; ideali self-host + inline SVG ikonlar.
- **LCP hero görselleri Unsplash'tan**, preconnect/fetchpriority/width-height yok — yerel WebP'ye alın, LCP görseline `fetchpriority="high"` + preload verin.

---

## 🟡 ORTA

- **Cache-Control yok:** statik varlıklar max-age=0 ile servis ediliyor (server.js:250) → `express.static(dir, { maxAge: '30d' })` + HTML için no-cache.
- **http→https ve www birleştirme yönlendirmesi yok** (server.js) → `x-forwarded-proto` kontrolü ile 301 middleware ekleyin.
- **Dinamik sitemap lastmod'u her istekte "bugün"** (server.js:134) → Google sahte lastmod'u yok saymaya başlar; gerçek tarihleri kullanın.
- **Twitter Card yalnızca index'te** → tüm sayfalara ekleyin.
- **İç sayfa title'ları kısa/anahtar kelimesiz; ana sayfa 78 karakterle uzun** → "Antalya Mantolama ve Yalıtım Hizmetleri | Akdeniz Yapı" formatına geçin.
- **7 sayfanın meta description'ı 120 karakterin altında** → hizmet + lokasyon + güven sinyali + CTA kalıbıyla genişletin.
- **Hiçbir şemada `@id` yok** → `https://antalyadiscephe.com/#organization` ile varlık bağlama kurun; ilçe Service şemaları provider'ı @id ile referanslasın.
- **`sameAs` eksik:** Instagram (ve GBP'de doğrulanmış TikTok + Facebook) şemaya ve footer'a bağlanmamış.
- **Görünür breadcrumb var, BreadcrumbList şeması yok** → düşük maliyetli rich result fırsatı.
- **6 sayfa tamamen şemasız** → hizmetler: OfferCatalog, kampanyalar: Offer (validThrough), iletisim: ContactPage+LocalBusiness, referanslar: ItemList.
- **Somut fiyat aralığı hiçbir yerde yok** ("fiyat" başlığı var ama içerik yok) → AI motorlarının alıntılayacağı "EPS mantolama X–Y TL/m²" tarzı güncel aralık ekleyin.
- **GBP ve yol tarifi linki hiçbir sayfada yok** → `google.com/maps/dir/?api=1&destination=...` formatında "Yol Tarifi Al" butonu ekleyin.
- **ICBM/geo meta eksik**; iletisim.html'de geo meta hiç yok; koordinatlar şehir merkezini gösteriyor (gerçek konum: 36.9136919, 30.6436956).
- **Şemada vaat edilen Döşemealtı, Aksu, Serik, Manavgat, Alanya için sayfa yok** → sırasıyla özgün içerikli sayfalar açın (fırsat).
- **Referans projelerde konum yalnızca "Antalya"** → ilçe/mahalle yazın, ilçe sayfalarına "bu bölgede yaptığımız işler" bölümüyle bağlayın.
- **main.js/painter.js minify edilmemiş, defer yok**; hiçbir `<img>`'de width/height yok (CLS riski); og-banner.png 846KB JPEG ve 1200×630 deklarasyonuyla çelişiyor; WebP/AVIF hiç kullanılmıyor (3.3MB ölü ağırlık).
- **`/hizmetler/:slug`'da çift og:image** (statik banner + enjekte edilen görsel, server.js:227); geçersiz slug'da canonical yönlenen adrese işaret ediyor.
- **llms.txt dinamik hizmet URL'lerini içermiyor**; sitemap'te llms.txt bir sayfa gibi listeleniyor.
- **Hiç analitik yok** — SEO çalışmasının etkisi ölçülemiyor; GA4 eklerken CSP'ye ilgili alan adlarını dahil etmeyi unutmayın (mevcut CSP engeller).

## 🟢 DÜŞÜK

- robots.txt'de AI botları için açık direktif yok (erişim örtük; açık `Allow` blokları niyet belgesi işlevi görür) ve `/api/` taramaya kapalı değil.
- URL yapısı tutarsız: statik sayfalar `.html` uzantılı, hizmetler temiz URL; `/index.html` → `/` 301'i yok.
- Hero alt metni jenerik; referans kartlarında stok Unsplash görselleri (gerçek şantiye fotoğraflarıyla değiştirin).
- Başlık hiyerarşisi atlamaları: kampanyalar'da H1→H3; referanslar'da bölüm başlıkları heading değil.
- Footer'da 5 farklı "Hizmetlerimiz" anchor'ı aynı URL'ye gidiyor; Muratpaşa WhatsApp linkinde kodlanmamış boşluk ("Murat pa"); bir H2'de İngilizce "Solutions" kalıntısı.
- WebSite şeması yok (SERP site adı gösterimi için); areaServed düz metin (AdministrativeArea + containedInPlace biçimine getirin); şemadaki çalışma saatleri sayfada görünmüyor.
- llms.txt `text/plain` servis ediliyor ama sayfalar `text/markdown` ilan ediyor (server.js:95).
- Mahalle listeleri ilçeler arasında çakışıyor (Uncalı Konyaaltı'na ait, Şirinyalı/Fener iki sayfada birden).
- Üçüncü telefon (0505 086 98 07) ve tam adres yalnızca iletişim sayfasında — ortak footer'a tam NAP bloğu ekleyin.
- style.css gereksiz preload; async font yüklemede `<noscript>` fallback yok.
- Ana sayfa statik referans kartları API boş dönünce JS tarafından siliniyor (main.js:261).
- Yüklenen görsel adları anahtar kelimesiz timestamp (services.js:17) — slug tabanlı adlandırın.
- PROJECT_GROWTH_REPORT.md'deki "tüm sayfalara şema eklendi" kaydı gerçek durumla çelişiyor.

---

## Öncelikli Eylem Planı

**Bugün (1–2 saat):**
1. `muratpasa-mantolama.html` kırık JSON-LD + eksik CSS linklerini onar (sayfa şu an tamamen boş!)
2. `backend/.env`'i git'ten çıkar, secret'ları değiştir, `service_account.json`'u taşı
3. Konyaaltı/Kepez/Lara kesik içeriklerini `6f90741` commit'inden kurtar

**Bu hafta:**
4. Catch-all'a gerçek 404 + statik `frontend/sitemap.xml`'i sil
5. NAP'ı tek doğru adresle (Kepez) her yerde eşitle; aggregateRating'i kaldır veya gerçek yorumlarla destekle
6. Eksik canonical + OG setlerini 6 sayfaya ekle; ilçe linklerini tüm footer'lara kopyala
7. favicon + kırık LCP görseli + Cache-Control

**Bu ay:**
8. Hizmet detay gövdesine SSR; `/referanslar/:slug` rotası; hizmetler.html'e statik fallback
9. `isi-yalitimi-antalya.html` pillar sayfasını oluştur
10. BreadcrumbList + @id + sameAs + eksik sayfa şemaları; Döşemealtı/Aksu/Serik sayfaları; GA4
