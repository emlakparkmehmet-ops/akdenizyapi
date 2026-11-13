const path = require('path');
const bcrypt = require('bcryptjs');

const isPostgres = Boolean(process.env.DATABASE_URL);
let pool = null;
let sqliteDb = null;

if (isPostgres) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
} else {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(__dirname, 'akdeniz_yapi.db');
  sqliteDb = new DatabaseSync(dbPath);
}

const MOCK_SERVICES = [
  {
    id: 1, category_id: 1, category_name: 'Isı Yalıtımı', category_icon: '🧱',
    title: 'Dış Cephe Isı Yalıtımı (EPS Mantolama)', slug: 'dis-cephe-isi-yalitimi',
    short_desc: 'TS EN 13163 standartlarında karbonlu EPS ve taşyünü levhalarla ısı kaybını %50\'ye kadar azaltan, 10 yıl garantili dış cephe mantolama teknik sistemi.',
    description: 'Antalya\'nın yüksek yaz sıcaklığı, yoğun UV ışınımı ve kış aylarındaki ani yağış rejimi, binaların dış kabuğunda standartların üzerinde bir termal koruma gerektirir. Akdeniz Yapı Dekorasyon tarafından uygulanan Dış Cephe Isı Yalıtımı (EPS ve Taşyünü Mantolama) teknik şartnamesi, TS 825 Binalarda Isı Yalıtım Kuralları ve ETAG 004 standartlarına tam uyumlu paket sistemlerden oluşur. Uygulama öncesinde bina cephesindeki tüm gevşek sıvalar kazınır, yüzey aderans astarı ile güçlendirilir ve subasman profili teraziye alınarak sistemin mekanik temeli oluşturulur.\n\nIsı yalıtım levhalarının (16-20 dansite grafit katkılı karbonlu EPS veya A1 sınıfı yanmaz taşyünü) yapıştırılmasında mutlaka \'çerçeve ve nokta\' yöntemi uygulanır. Levha kenarlarına çepeçevre harç sürülerek levha arkasında hava sirkülasyonu oluşması engellenir ve ısı köprüleri tamamen ortadan kaldırılır. Levhalar şaşırtmalı (tuğla dizilimi) olarak yerleştirilir; bina köşelerinde dişli kenetleme yapılır ve pencere/kapı merkezlerinde L kesim tekniği kullanılarak köşe çatlakları önlenir.\n\nYapıştırma harcının prizini almasının ardından (minimum 24 saat sonra), metrekareye 6 adet ve rüzgar yükünün yüksek olduğu bina köşe noktalarında metrekareye 8-10 adet gelecek şekilde TSE belgeli plastik veya çelik çivili mantolama dübelleri çakılır. Tüm bina köşeleri, denizlik altları ve dilatasyon derzleri PVC fileli köşe profilleri ve damlalık profilleri ile güvenceye alınır.\n\nSıva katmanında elyaf katkılı birinci kat sıva harcı yüzeye çekilir ve henüz yaşken 160 gr/m² alkali dayanımlı (C-glas) sıva filesi birbiri üzerine 10 cm binecek şekilde harcın ilk üçte birlik kısmına gömülür. İkinci kat düzeltme sıvası, mineral doku kaplaması, silikonlu dış cephe astarı ve UV dirençli 2 kat elastomerik/silikonlu son kat dış cephe boyası ile sistem tamamlanır. Tüm projelerimiz 10 yıl resmi yazılı sözleşme garantisi ve Enerji Kimlik Belgesi (EKB) teslimi ile güvence altındadır.',
    image: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=800&q=80', featured: 1, sort_order: 1
  },
  {
    id: 2, category_id: 1, category_name: 'Isı Yalıtımı', category_icon: '🧱',
    title: 'Mineral Sıva Uygulaması', slug: 'mineral-siva',
    short_desc: 'Yüksek buhar geçirgenliği, UV dayanımı ve dekoratif doku sunan çimento esaslı, polimer takviyeli dış cephe mineral kaplama sistemi.',
    description: 'Mineral sıva uygulaması, dış cephe ısı yalıtım (mantolama) sistemlerinin son kat dekoratif kaplaması olarak kullanılan, doğal mermer ve kuvars granülleri içeren çimento esaslı yüksek performanslı bir cephe kaplama malzemesidir. Antalya gibi nem oranının yüksek olduğu kıyı iklimlerinde binanın nefes almasını (su buharı difüzyonunu) sağlarken dışarıdan gelen yağmur suyunu itici (hidrofobik) yapısı sayesinde cepheyi korur.\n\nAkdeniz Yapı Dekorasyon olarak uyguladığımız 1.5 mm ve 2.0 mm tane dokulu (çizgi veya tane dokulu) mineral sıvalar, polimer ve silikon katkıları sayesinde kılcal çatlaklara karşı maksimum esneklik gösterir. Uygulama öncesinde fileli sıva katmanının kürünü tamamlamış olması kontrol edilir ve yüzey, mineral sıvanın tutunmasını artıran kuvars dolgulu özel kaplama astarı (grenli astar) ile tamamen astarlanır.\n\nAstar kuruduktan sonra paslanmaz çelik mala ile yüzeye homojen kalınlıkta yayılan mineral sıva, hemen ardından plastik mala ile dairesel hareketlerle desenlendirilir. İskele katları arasında ek yeri (soğuk derz) oluşmaması için her cephe yeterli sayıda uzman usta ile tek seferde kesintisiz olarak tamamlanır.\n\nMineral sıva kuruduktan sonra üzerine uygulanan silikonlu dış cephe astarı ve iki kat saf akrilik veya silikonlu dış cephe boyası, cephenin kir tutmasını engeller ve güneşin kavurucu UV ışınlarına karşı renklerin 10 yıldan uzun süre ilk günkü canlılığını korumasını sağlar. Apartman, site ve villa projelerinde hem mekanik darbe dayanımı hem de estetik mimari görünüm için en uzun ömürlü dış cephe çözümüdür.',
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80', featured: 1, sort_order: 2
  },
  {
    id: 3, category_id: 2, category_name: 'Su Yalıtımı', category_icon: '💧',
    title: 'Su Yalıtımı & Termal Kaplama', slug: 'su-yalitimi-termal',
    short_desc: 'Teras, çatı, balkon, temel ve ıslak hacimler için poliüretan likit membran, bitümlü örtü ve kristalize su yalıtım sistemleri.',
    description: 'Binaların taşıyıcı betonarme sistemini korozyondan koruyan en kritik uygulama profesyonel su yalıtımıdır. Antalya\'da kış aylarında yaşanan şiddetli sağanak yağışlar ve yaz aylarındaki yüksek genleşme farkları, teras çatılarda, balkonlarda ve temel perde duvarlarında ciddi su sızıntılarına yol açar. Akdeniz Yapı Dekorasyon, yapıdaki su ve nem problemini kaynağında çözen ileri teknoloji izolasyon sistemleri uygular.\n\nAçık teras ve gezilebilir çatı alanlarında %400\'ün üzerinde elastikiyete sahip, UV dayanımlı çift bileşenli poliüretan likit membran ve poliürea kaplama sistemleri tercih edilmektedir. Uygulama öncesinde mevcut zemin elmas uçlu makinelerle silinir, pah bantları ile tüm köşe birleşimleri (parapet dönüşleri) yuvarlatılır ve epoksi/poliüretan astar ile beton gözenekleri mühürlenir. Ardından eksiz (monolitik) olarak iki kat halinde uygulanan likit membran, zeminde su geçirmez kauçuksu bir tabaka oluşturur.\n\nEğim betonu ve seramik altı teras/balkon uygulamalarında ise tam elastik çift bileşenli çimento esaslı su yalıtım harçları (file takviyeli) veya polyester keçe taşıyıcılı elastomerik bitümlü membranlar kullanılır. Süzgeç ve gider etrafları özel manşetlerle detaylandırılır.\n\nSu yalıtımı tamamlanan teraslarda hem ısı hem su izolasyonunu bir arada sunan XPS/EPS ters teras çatı sistemleri veya yüksek güneş yansıtma indeksine sahip (Cool Roof) beyaz termal kaplamalar uygulanarak en üst kat dairelerin yazın aşırı ısınması ve kışın rutubetlenmesi %100 garantili olarak engellenir.',
    image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80', featured: 1, sort_order: 3
  },
  {
    id: 4, category_id: 3, category_name: 'Boya & Sıva', category_icon: '🎨',
    title: 'İç & Dış Cephe Boyası', slug: 'ic-dis-cephe-boyasi',
    short_desc: 'Jotun, Filli Boya, DYO ve Marshall A+ seri ürünlerle 3D renk simülasyonlu dış cephe ve eşyalı daire iç cephe boya uygulaması.',
    description: 'İç ve dış cephe boya uygulamaları, bir yapının hem estetik değerini belirleyen hem de duvar yüzeylerini dış etkenlere karşı koruyan en önemli son kat işlemidir. Akdeniz Yapı Dekorasyon olarak Antalya genelinde apartman, site ve villaların dış cephe boyamalarında yüksek UV ve alkali direncine sahip silikonlu, grenli ve elastomerik dış cephe boyaları (Jotun Jotashield, Filli Boya Amphisilan, Weber, Marshall) kullanıyoruz.\n\nDış cephe boyası öncesinde binanın tamamı yüksek basınçlı su ile yıkanarak tuz, toz ve tebeşirlenmiş eski boya kalıntılarından arındırılır. Cephedeki tüm kılcal ve yapısal çatlaklar, elastik dış cephe macunu ve elyaf takviyeli tamir harçları ile onarılır. Yüzey emiciliğini dengeleyen pigmentli/şeffaf bağlayıcı astar katmanının ardından, iki kat rulo veya airless püskürtme sistemiyle homojen boya uygulaması gerçekleştirilir. Uygulama öncesinde apartman yönetimlerine ücretsiz 3D cephe renk simülasyonu sunularak karar süreci kolaylaştırılır.\n\nİç cephe daire ve villa boyama süreçlerimizde ise eşyalı veya boş konutlarda \'sıfır leke ve tozsuz teslimat\' prensibiyle çalışıyoruz. Tüm mobilyalar ve parkeler kalın koruyucu örtüler ve maskeleme bantlarıyla izole edilir.\n\nDuvarlardaki çivi delikleri, alçı kabarmaları ve köşe kırıkları saten alçı ile onarılıp zımparalandıktan sonra alçı astarı ve silinebilir, antibakteriyel, kokusuz su bazlı iç cephe boyaları (ipek mat veya soft mat) iki kat halinde uygulanır. İş bitiminde tüm koruma örtüleri toplanarak yaşam alanınız tertemiz teslim edilir.',
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80', featured: 1, sort_order: 4
  },
  {
    id: 5, category_id: 4, category_name: 'Alçı & Dekorasyon', category_icon: '🏛️',
    title: 'Alçı & Kartonpiyer', slug: 'alci-kartonpiyer',
    short_desc: 'Alçıpan asma tavan, gizli LED ışık bandı, dekoratif kartonpiyer, duvar çıtalama ve makine/el saten alçı sıva uygulamaları.',
    description: 'Modern iç mimarinin temelini oluşturan alçı sıva, asma tavan ve dekoratif kartonpiyer uygulamaları, yaşam alanlarına ferahlık, akustik konfor ve estetik derinlik kazandırır. Akdeniz Yapı Dekorasyon bünyesindeki uzman alçı ve dekorasyon ustaları, Antalya\'daki konut, ofis, mağaza ve villa projelerinde milimetrik terazi hassasiyetiyle anahtar teslim çözümler üretmektedir.\n\nBoya öncesi pürüzsüz duvar yüzeyleri elde etmek için kaba sıva veya beton yüzeyler üzerine perlitli sıva alçısı, ardından saten perdah alçısı uygulanır. Lazer terazi kontrolünde yerleştirilen köşe profilleri sayesinde tüm kolon, kiriş ve duvar birleşimleri 90 derece kusursuz diklikte teslim edilir. Vakumlu zımpara makineleri ile tozsuz şekilde zımparalanan yüzeyler, ipek mat boya uygulamaları için ayna pürüzsüzlüğüne kavuşturulur.\n\nTavan dekorasyonunda Knauf ve Dalsan standartlarında galvanizli çelik karkas sistemleri üzerine suya ve neme dayanıklı (yeşil) veya yangına dayanıklı (kırmızı) alçıpan levhalar monte edilir. Salon ve antrelerde gizli LED ışık bantları, spot havuzları, perdelik detayları ve ses yalıtımlı akustik asma tavan tasarımları hayata geçirilir.\n\nAyrıca klasik ve neoklasik tarz seven müşterilerimiz için yüksek yoğunluklu poliüretan duvar çıtalama, stropiyer, döküm alçı kartonpiyer ve TV ünitesi niş tasarımları uzman ekibimiz tarafından projelendirilip eksiksiz olarak uygulanmaktadır.',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80', featured: 0, sort_order: 5
  },
  {
    id: 6, category_id: 5, category_name: 'Çatı', category_icon: '🏠',
    title: 'Çatı Onarım & Yenileme', slug: 'cati-onarim',
    short_desc: 'Kiremit çatı aktarma, membran su yalıtımı, çelik/ahşap karkas güçlendirme, gizli dere izolasyonu ve çatı arası ısı yalıtımı.',
    description: 'Antalya\'da kış aylarında etkili olan fırtınalı lodos rüzgarları ve sağanak yağışlar, bakımsız çatılarda kiremit uçmalarına, mahya çatlaklarına ve en üst kat dairelerde ciddi tavan akmalarına neden olur. Akdeniz Yapı Dekorasyon, apartman ve site yönetimleri için sızdırmazlık garantili komple çatı onarım, aktarma ve yenileme hizmeti sunmaktadır.\n\nÇatı aktarma ve revizyon sürecimiz, mevcut kiremitlerin dikkatlice sökülerek sağlam olanların ayrıştırılmasıyla başlar. Çürümüş veya sehim yapmış ahşap/çelik çatı karkası ile OSB kaplama tahtaları yenilenir. Karkas üzerine polyester keçe taşıyıcılı, arduazlı veya alüminyum folyo kaplı bitümlü membranlar şaloma ateşiyle tam yapıştırma tekniğiyle serilerek çatı %100 su geçirmez hale getirilir.\n\nBaca dipleri, havalandırma boruları, asansör kulesi birleşimleri ve gizli yağmur dereleri, çatı sızıntılarının %80\'inin kaynağını oluşturur. Bu kritik noktalarda poliüretan mastik, pah bandı ve çift kat likit membran uygulaması yapılarak suyun göllenmesi ve sızması kesin olarak engellenir. Yağmur olukları ve iniş boruları temizlenir veya eksiz galvaniz/PVC oluk sistemleriyle değiştirilir.\n\nAyrıca çatı döşemesi üzerine serilen 10 cm kalınlığında camyünü, taşyünü şilte veya püskürtme poliüretan köpük ısı yalıtımı sayesinde, en üst kat dairelerin yazın fırın gibi ısınması ve kışın soğuması önlenerek bina genelinde %35\'e varan ek enerji tasarrufu sağlanır.',
    image: 'https://images.unsplash.com/photo-1632759145351-1d592919f522?w=800&q=80', featured: 0, sort_order: 6
  },
  {
    id: 7, category_id: 6, category_name: 'Seramik & Mermer', category_icon: '📐',
    title: 'Seramik & Mermer Döşeme', slug: 'seramik-mermer-doseme',
    short_desc: 'Banyo, mutfak, teras ve cephelerde büyük ebat porselen seramik, granit, doğal mermer ve traverten kaplama uygulamaları.',
    description: 'Seramik, granit ve doğal mermer kaplama uygulamaları, hem ıslak hacimlerin (banyo, tuvalet, mutfak) hem de teras, balkon ve bina giriş hollerinin uzun ömürlü ve prestijli görünmesini sağlayan uzmanlık gerektiren bir işçilik dalıdır. Akdeniz Yapı Dekorasyon, lazer hizalama ve klipsli seviye tespit sistemleriyle sıfır kot farkı (diş yapmayan) profesyonel döşeme hizmeti sunar.\n\nUygulama öncesinde zemin şapının terazisi ve nem oranı kontrol edilir; bozuk yüzeyler kendiliğinden yayılan tesviye şapı (self-leveling) ile pürüzsüzleştirilir. Banyo ve teras gibi suyla temas eden tüm alanlarda seramik döşemesi öncesinde mutlaka çift bileşenli tam elastik su yalıtımı ve köşe pah bantları uygulanır.\n\n60x120 cm, 80x160 cm gibi büyük ebatlı rektifiyeli porselen seramik ve granitlerin yapıştırılmasında, C2TE S1/S2 sınıfı yüksek performanslı esnek yapıştırma harçları kullanılır. Hem zemine hem de seramiğin arkasına taraklı mala ile harç sürülerek (çift taraflı yapıştırma) seramik altında boşluk kalması ve kırılmalar tamamen engellenir.\n\nKöşe dönüşlerinde 45 derece pahlı kesim (gönye burun) veya paslanmaz çelik/alüminyum seramik profilleri uygulanır. Son aşamada antibakteriyel, su itici ve leke tutmayan silikon/epoksi esaslı derz dolgularla işlem tamamlanarak mekanlarınız kusursuz bir estetikle teslim edilir.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', featured: 0, sort_order: 7
  },
  {
    id: 8, category_id: 7, category_name: 'Tadilat', category_icon: '🔨',
    title: 'Komple Tadilat & Renovasyon', slug: 'komple-tadilat',
    short_desc: 'Daire, villa ve ticari mekanlarda mimari tasarım, kırım-döküm, elektrik/su tesisatı, mutfak, banyo ve anahtar teslim renovasyon.',
    description: 'Eskiyen bir daireyi veya villayı baştan sona yenilemek; yıkım, elektrik, sıhhi tesisat, alçı, boya, seramik, doğrama ve mobilya gibi 10\'dan fazla farklı usta grubunun kusursuz koordinasyonunu gerektirir. Akdeniz Yapı Dekorasyon, Antalya genelinde tek muhatap ve sabit bütçe garantisiyle anahtar teslim komple tadilat ve renovasyon hizmeti sunmaktadır.\n\nSürecimiz, mekanın yerinde rölövesinin alınması ve ihtiyaçlarınıza uygun 3 boyutlu mimari yerleşim planının hazırlanmasıyla başlar. Onaylanan iş programı ve teknik şartname doğrultusunda eski seramiklerin, mutfak dolaplarının ve sıhhi tesisatın kırım-söküm işlemleri yapılarak molozlar çevreye rahatsızlık vermeden tahliye edilir.\n\nAltyapı aşamasında tüm temiz ve pis su tesisatı (PPRC ve sessiz borular), kombi/klima altyapısı ile yanmaz kablo ve sigorta panosu dahil komple elektrik tesisatı güncel yönetmeliklere uygun olarak yenilenir. Ardından şap, su yalıtımı, ıslak hacim porselen seramik kaplamaları, alçıpan asma tavan, gizli ışık bantları ve saten alçı-boya imalatları sırasıyla tamamlanır.\n\nSon aşamada lake veya akrilik özel üretim mutfak dolapları, banyo mobilyaları, duşakabin, vitrifiye montajları, derzli laminat parke döşemesi, iç oda kapıları ve çelik kapı montajı yapılarak ince temizlik sonrası yeni yaşam alanınız sözleşmede belirtilen tarihte anahtar teslim olarak tarafınıza sunulur.',
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80', featured: 1, sort_order: 8
  }
];

// services sorguları için tek satırlık MOCK fallback.
function mockServiceLookup(sql, params = []) {
  if (!sql || !sql.includes('services')) return null;
  if (/COUNT\s*\(/i.test(sql)) return { cnt: MOCK_SERVICES.length };
  const key = params[0];
  const bySlug = /\bslug\s*=/.test(sql);
  return MOCK_SERVICES.find(s => bySlug ? s.slug === key : String(s.id) === String(key)) || null;
}

function toSqlite(sql) {
  if (!sql) return '';
  return sql.replace(/\$\d+/g, '?');
}

// SQLite ? parametrelerini PostgreSQL $1, $2... formatına çevirir
function toPostgres(sql) {
  if (!sql) return '';
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// SQLite ile PostgreSQL için ortak API — route dosyaları değişmesin
const db = {
  // Tek satır döner
  getAsync: async (sql, params = []) => {
    if (isPostgres) {
      try {
        const pgSql = toPostgres(sql);
        const { rows } = await pool.query(pgSql, params);
        if (rows[0]) return rows[0];
        return mockServiceLookup(sql, params);
      } catch (err) {
        return mockServiceLookup(sql, params);
      }
    } else {
      try {
        const sSql = toSqlite(sql);
        const row = sqliteDb.prepare(sSql).get(...params);
        if (row) return row;
        return mockServiceLookup(sql, params);
      } catch (err) {
        return mockServiceLookup(sql, params);
      }
    }
  },

  // Çok satır döner
  allAsync: async (sql, params = []) => {
    if (isPostgres) {
      try {
        const pgSql = toPostgres(sql);
        const { rows } = await pool.query(pgSql, params);
        if (rows && rows.length > 0) return rows;
        return (sql && sql.includes('services')) ? MOCK_SERVICES : [];
      } catch (err) {
        if (sql && sql.includes('services')) return MOCK_SERVICES;
        return [];
      }
    } else {
      try {
        const sSql = toSqlite(sql);
        const rows = sqliteDb.prepare(sSql).all(...params);
        if (rows && rows.length > 0) return rows;
        return (sql && sql.includes('services')) ? MOCK_SERVICES : [];
      } catch (err) {
        if (sql && sql.includes('services')) return MOCK_SERVICES;
        return [];
      }
    }
  },

  // Çok satır döner — MOCK fallback YOK (sitemap/SSR gibi gerçek veri gereken yerler için)
  allRowsAsync: async (sql, params = []) => {
    if (isPostgres) {
      try {
        const { rows } = await pool.query(toPostgres(sql), params);
        return rows || [];
      } catch (err) {
        return [];
      }
    } else {
      try {
        const sSql = toSqlite(sql);
        const rows = sqliteDb.prepare(sSql).all(...params);
        return rows || [];
      } catch (err) {
        return [];
      }
    }
  },

  // INSERT/UPDATE/DELETE — { lastID, changes } döner (SQLite compat)
  runAsync: async (sql, params = []) => {
    if (isPostgres) {
      try {
        const pgSql = toPostgres(sql);
        const { rows, rowCount } = await pool.query(pgSql, params);
        return {
          lastID: rows[0]?.id ?? null,
          changes: rowCount,
        };
      } catch (err) {
        return { lastID: null, changes: 0 };
      }
    } else {
      try {
        const sSql = toSqlite(sql);
        const info = sqliteDb.prepare(sSql).run(...params);
        return {
          lastID: Number(info.lastInsertRowid),
          changes: Number(info.changes),
        };
      } catch (err) {
        console.error('[SQLite runAsync error]:', err.message);
        return { lastID: null, changes: 0 };
      }
    }
  },

  // Toplu SQL (init için)
  execAsync: async (sql) => {
    if (isPostgres) {
      try {
        await pool.query(sql);
      } catch (err) {}
    } else {
      try {
        sqliteDb.exec(sql);
      } catch (err) {}
    }
  },
};

// Başlıktan Türkçe karakter dönüşümlü URL slug'ı üretir
function slugify(text) {
  const map = { 'ç':'c','Ç':'c','ğ':'g','Ğ':'g','ı':'i','İ':'i','ö':'o','Ö':'o','ş':'s','Ş':'s','ü':'u','Ü':'u' };
  return String(text || '')
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, ch => map[ch])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function initDatabase() {
  if (!isPostgres) {
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS click_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        page_path TEXT,
        target_href TEXT,
        has_gclid INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const existingAdmin = sqliteDb.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
    if (!existingAdmin) {
      const hash = await bcrypt.hash('admin123', 10);
      sqliteDb.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', hash);
      console.log('✅ Varsayılan admin oluşturuldu: admin / admin123 (SQLite)');
    }
    // SQLite için projects slug & detail_text backfill + services zengin içerik güncellemesi
    const richProjects = [
      ['Bayındır Pınarlar Sitesi', 'bayindir-pinarlar-sitesi', 'Muratpaşa / Antalya', 'Dış cephe mantolama ve mineral sıva uygulaması', 1,
        `Antalya Muratpaşa Bayındır Mahallesi'nde yer alan Bayındır Pınarlar Sitesi'nde kapsamlı dış cephe ısı yalıtımı (mantolama), dekoratif mineral sıva ve silikonlu dış cephe boya uygulaması Akdeniz Yapı Dekorasyon uzman ekipleri tarafından başarıyla tamamlanmıştır.\n\nProje kapsamında öncelikle mevcut cephedeki kabarmış ve mukavemetini yitirmiş eski sıva katmanları raspa edilerek temizlenmiş, yüzey aderans astarı ile sağlamlaştırılmıştır. TS EN 13163 standartlarına uygun yüksek yoğunluklu karbonlu EPS ısı yalıtım levhaları çerçeve-nokta yöntemiyle yapıştırılmış ve metrekareye 6 adet TSE belgeli mantolama dübeli ile mekanik olarak sabitlenmiştir.\n\n160 gr/m² alkali dayanımlı sıva filesi ve elyaf katkılı çift kat sıva uygulamasının ardından 1.5 mm tane dokulu mineral sıva çekilmiş; UV ışınlarına ve Antalya'nın nemli iklimine dayanıklı Jotun/Filli Boya silikonlu dış cephe boyası ile bina modern ve uzun ömürlü bir görünüme kavuşturulmuştur. Proje 10 yıl yazılı işçilik ve malzeme garantisiyle site yönetimine teslim edilmiştir.`],
      ['AYT Park Villa Sitesi', 'ayt-park-villa-sitesi', 'Döşemealtı / Antalya', 'Isı yalıtımı ve boya uygulaması', 1,
        `Antalya'nın seçkin konut projelerinden AYT Park Villa Sitesi'nde dış cephe ısı yalıtımı, söve detay uygulamaları ve elastomerik dış cephe boya yenileme çalışmaları Akdeniz Yapı Dekorasyon güvencesiyle gerçekleştirilmiştir.\n\nVilla mimarisinin estetik hatlarını ön plana çıkarmak amacıyla pencere kenarları ve kat silmelerinde yüksek yoğunluklu dekoratif söve profilleri kullanılmış, cephe yüzeylerinde ısı köprülerini tamamen ortadan kaldıran paket mantolama sistemi uygulanmıştır. Köşe birleşimlerinde PVC fileli köşe profilleri ve damlalık detayları eksiksiz olarak işlenmiştir.\n\nYüzey hazırlığı ve fileli sıva katmanlarının tamamlanmasının ardından, güneşin kavurucu UV etkisine ve yağışlara karşı üstün koruma sağlayan su itici silikonlu dış cephe boyası iki kat halinde uygulanarak villaların hem enerji verimliliği hem de mimari prestiji en üst seviyeye taşınmıştır.`],
      ['Ergin Sitesi', 'ergin-sitesi', 'Kepez / Antalya', 'Dış cephe yenileme ve mineral sıva', 0,
        `Antalya'da bulunan Ergin Sitesi'nin dış cephe yenileme, çatlak onarımı, fileli sıva ve mineral kaplama projesi Akdeniz Yapı Dekorasyon tarafından anahtar teslim olarak tamamlanmıştır.\n\nYıllar içinde dış hava koşulları nedeniyle yıpranan bina cephesi yüksek basınçlı su ile yıkanmış, yapısal ve kılcal çatlaklar elyaf takviyeli tamir harçları ile onarılmıştır. Cephe bütününde yüzey mukavemetini artırmak amacıyla alkali dayanımlı donatı filesi ve polimer modifiyeli sıva katmanı oluşturulmuştur.\n\nSon katmanda uygulanan dekoratif mineral sıva ve iki kat silikonlu dış cephe boyası sayesinde site blokları su sızdırmaz, nefes alabilen ve 10 yıl boyunca rengini koruyan estetik bir dış kabuğa kavuşmuştur.`],
      ['Özcağatay Apt.', 'ozcagatay-apt', 'Muratpaşa / Antalya', 'Tamiratlı boya ve dış cephe uygulaması', 0,
        `Antalya Muratpaşa'da yer alan Özcağatay Apartmanı'nda kapsamlı dış cephe betonarme onarımı, tamiratlı sıva ve A+ kalite dış cephe boya uygulaması gerçekleştirilmiştir.\n\nBalkon alınları, denizlik altları ve kolon-kiriş birleşimlerinde korozyona uğramış bölgeler kırılarak pas dönüştürücü astar ve yapısal tamir harçları ile restore edilmiştir. Tüm cephe yüzeyi dış cephe macunu ve dolgu astarı ile pürüzsüz hale getirilmiştir.\n\nApartman yönetiminin 3D renk simülasyonu üzerinden seçtiği modern renk paleti, yüksek örtücülüğe ve UV direncine sahip silikonlu dış cephe boyası ile iki kat halinde uygulanarak bina zamanında ve eksiksiz teslim edilmiştir.`],
      ['Varsak Güneş Konakları', 'varsak-gunes-konaklari', 'Kepez / Antalya', 'Tam cephe yenileme projesi', 1,
        `Antalya Kepez Varsak bölgesinde yer alan Varsak Güneş Konakları'nda tam kapsamlı dış cephe ısı yalıtımı, su yalıtımı ve cephe renklendirme projesi Akdeniz Yapı Dekorasyon ekibi tarafından tamamlanmıştır.\n\nÇok bloklu site yapısında kurulan TSE belgeli güvenlikli çelik iskele sistemleri üzerinden tüm cephelerde ısı yalıtım levhası montajı, çelik çivili dübelleme ve 160 gr/m² fileli sıva uygulaması standartlara uygun şekilde yürütülmüştür. Parapet ve çatı birleşim detaylarında su sızıntılarını önleyici likit membran izolasyonları yapılmıştır.\n\nMineral doku kaplaması ve silikon esaslı dış cephe boyası ile tamamlanan proje sonucunda dairelerde %50'ye varan ısı tasarrufu sağlanırken, siteye çağdaş ve prestijli bir mimari görünüm kazandırılmıştır.`],
      ['Bayram Yanık Apt.', 'bayram-yanik-apt', 'Kepez / Antalya', 'Mineral sıva ve boya', 0,
        `Antalya'da bulunan Bayram Yanık Apartmanı'nın dış cephesinde fileli sıva yenileme, dekoratif mineral sıva ve silikonlu boya uygulaması Akdeniz Yapı Dekorasyon tarafından başarıyla teslim edilmiştir.\n\nUygulama öncesinde bina yüzeyindeki tüm gevşek dokular temizlenmiş, pencere merkezleri ve bina köşeleri fileli PVC köşe profilleriyle teraziye alınmıştır. Çimento esaslı mineral sıva uygulaması, ek yeri belli olmayacak şekilde uzman sıva ekiplerimizce homojen dokuda tamamlanmıştır.\n\nAstar katmanının ardından uygulanan iki kat UV dayanımlı dış cephe boyası ile bina hem yağmur ve nem etkilerine karşı tam korumaya alınmış hem de uzun yıllar bakım gerektirmeyecek estetik bir cepheye kavuşturulmuştur.`],
      ['Anadolu Sitesi', 'anadolu-sitesi', 'Konyaaltı / Antalya', 'Dış cephe mantolama', 0,
        `Antalya'da yer alan Anadolu Sitesi'nde enerji verimliliğini artırmak ve cephe yorgunluğunu gidermek amacıyla dış cephe EPS mantolama ve boya projesi gerçekleştirilmiştir.\n\nTS 825 ısı yalıtım standartlarına uygun olarak seçilen grafit katkılı karbonlu EPS levhalar, çerçeve-nokta yapıştırma tekniği ve mekanik dübelleme ile cepheye uygulanmıştır. Pencere dönüşleri, denizlik altları ve kat birleşimlerinde ısı ve su köprülerini engelleyen özel profil detayları kullanılmıştır.\n\nFileli sıva, mineral kaplama ve silikonlu son kat boya aşamalarının eksiksiz tamamlanmasıyla Anadolu Sitesi sakinleri yazın serin, kışın sıcak konut konforuna ve 10 yıl garantili bir dış cepheye sahip olmuştur.`],
      ['Koza Sitesi', 'koza-sitesi', 'Muratpaşa / Antalya', 'Isı yalıtımı ve renklendirme', 0,
        `Antalya Koza Sitesi'nde dış cephe ısı yalıtımı (mantolama), cephe onarımı ve mimari renklendirme uygulaması Akdeniz Yapı Dekorasyon tarafından tamamlanmıştır.\n\nSite bloklarının dış cephelerinde ısı kaybına yol açan yalıtımsız yüzeyler yüksek yoğunluklu mantolama levhaları ve elyaf katkılı fileli sıva sistemi ile kaplanmıştır. Uygulama öncesinde site yönetimine sunulan 3 boyutlu renk alternatifleri doğrultusunda modern antrasit ve sıcak krem tonları seçilmiştir.\n\nYüksek su iticiliğe ve kir tutmama özelliğine sahip silikonlu dış cephe boyası ile tamamlanan proje, iş güvenliği kurallarına tam uyumla ve söz verilen teslim tarihinde eksiksiz olarak teslim edilmiştir.`],
      ['Bileydı Konakları', 'bileydi-konaklari', 'Konyaaltı / Antalya', 'Kapsamlı cephe yenileme', 0,
        `Antalya Konyaaltı bölgesinin prestijli yerleşimlerinden Bileydı Konakları'nda deniz nemine ve tuzlu rüzgar etkisine dayanıklı kapsamlı dış cephe yenileme projesi gerçekleştirilmiştir.\n\nDenize yakın konumdaki binalarda sıkça görülen sıva kabarmaları ve demir donatı korozyonları özel kimyasal tamir harçları ile onarılmış, cephe yüzeyi alkali dirençli fileli sıva ve mineral kaplama ile güçlendirilmiştir.\n\nSon katmanda uygulanan yüksek nefes alabilirliğe sahip elastomerik ve silikonlu dış cephe boyası sayesinde Bileydı Konakları, Konyaaltı'nın zorlu kıyı iklimine karşı 10 yıl garantili tam koruma altına alınmıştır.`],
      ['Sarı İsmail Apt.', 'sari-ismail-apt', 'Muratpaşa / Antalya', 'Boya ve onarım', 0,
        `Antalya'da yer alan Sarı İsmail Apartmanı'nda dış cephe çatlak onarımı, yüzey yenileme ve silikonlu dış cephe boya uygulaması Akdeniz Yapı Dekorasyon ekibi tarafından tamamlanmıştır.\n\nBina cephesindeki eskiyen boya tabakası raspa ve basınçlı yıkama ile temizlenmiş, derin sıva çatlakları elastik dış cephe macunu ve pah bantları ile kalıcı olarak onarılmıştır. Yüzey emiciliğini dengeleyen bağlayıcı astar uygulaması sonrasında iki kat 1. sınıf dış cephe boyası uygulanmıştır.\n\nHızlı, temiz ve sözleşmeli çalışma prensibimizle tamamlanan proje sonucunda apartman dış cephesi sıfır bina görünümüne kavuşturulmuştur.`],
      ['Huzur Apt.', 'huzur-apt', 'Kepez / Antalya', 'Dış cephe boya uygulaması', 0,
        `Antalya Huzur Apartmanı'nda dış cephe tamiratı, astar ve UV dayanımlı dış cephe boya yenileme çalışması Akdeniz Yapı Dekorasyon güvencesiyle gerçekleştirilmiştir.\n\nCephedeki tüm dökülmeler, balkon altı sıva bozuklukları ve denizlik kenarları polimer takviyeli tamir harçlarıyla elden geçirilmiş, su sızıntılarına karşı pencere doğrama birleşimleri poliüretan mastik ile izole edilmiştir.\n\nGüneş ışınlarına karşı solmayan ve yağmur suyunu iten silikonlu dış cephe boyası ile boyanan Huzur Apartmanı, temiz çevre düzenlemesiyle birlikte apartman yönetimine teslim edilmiştir.`],
      ['Sarısu Klas Sitesi', 'sarisu-klas-sitesi', 'Konyaaltı / Antalya', 'Mineral sıva ve boya sistemi', 1,
        `Antalya Konyaaltı Sarısu Mahallesi'nde bulunan Sarısu Klas Sitesi'nde dış cephe ısı yalıtımı onarımı, dekoratif mineral sıva ve silikonlu boya sistemi uygulanmıştır.\n\nSarısu bölgesinin yüksek nem ve rüzgar yükü dikkate alınarak cephede yüksek mukavemetli fileli sıva ve 1.5 mm mineral sıva dokusu oluşturulmuştur. Köşe, damlalık ve dilatasyon profilleri yenilenerek cephenin mekanik dayanımı artırılmıştır.\n\nÜzerine uygulanan astar ve çift kat silikonlu dış cephe boyası ile Sarısu Klas Sitesi blokları hem estetik hem de teknik açıdan kusursuz bir dış cephe korumasına kavuşturulmuştur.`]
    ];
    try {
      for (const [title, slug, location, desc, featured, detailText] of richProjects) {
        const existing = sqliteDb.prepare('SELECT id FROM projects WHERE title = ? OR slug = ?').get(title, slug);
        if (existing) {
          sqliteDb.prepare('UPDATE projects SET slug = ?, location = ?, detail_text = ? WHERE id = ?').run(slug, location, detailText, existing.id);
        } else {
          sqliteDb.prepare('INSERT INTO projects (title, slug, location, description, detail_text, featured) VALUES (?, ?, ?, ?, ?, ?)').run(title, slug, location, desc, detailText, featured);
        }
      }
      // Ayrıca başlığı farklı olan ve slug'ı boş kalan satırları otomatik slugify et
      const nullRows = sqliteDb.prepare("SELECT id, title FROM projects WHERE slug IS NULL OR slug = ''").all();
      for (const r of nullRows) {
        sqliteDb.prepare('UPDATE projects SET slug = ? WHERE id = ?').run(slugify(r.title), r.id);
      }
      // Services tablosundaki kısa açıklamaları zengin teknik içerikle güncelle
      for (const svc of MOCK_SERVICES) {
        sqliteDb.prepare('UPDATE services SET short_desc = ?, description = ? WHERE slug = ?').run(svc.short_desc, svc.description, svc.slug);
      }
    } catch (e) {
      console.warn('SQLite backfill uyarısı:', e.message);
    }
    console.log('✅ Veritabanı hazır (SQLite)');
    return;
  }

  // Kategoriler
  await pool.query(`

    CREATE TABLE IF NOT EXISTS categories (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      slug       TEXT NOT NULL UNIQUE,
      icon       TEXT DEFAULT '🔧',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Hizmetler
  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id          SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      title       TEXT NOT NULL,
      slug        TEXT NOT NULL UNIQUE,
      short_desc  TEXT,
      description TEXT,
      image       TEXT,
      featured    INTEGER DEFAULT 0,
      sort_order  INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Referans Projeler
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id           SERIAL PRIMARY KEY,
      title        TEXT NOT NULL,
      slug         TEXT,
      location     TEXT,
      description  TEXT,
      detail_text  TEXT,
      image        TEXT,
      gallery      TEXT,
      year         INTEGER,
      area         TEXT,
      service_type TEXT,
      client       TEXT,
      featured     INTEGER DEFAULT 0,
      sort_order   INTEGER DEFAULT 0,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // İletişim Mesajları
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      phone      TEXT,
      email      TEXT,
      subject    TEXT,
      message    TEXT NOT NULL,
      is_read    INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Kampanyalar
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id            SERIAL PRIMARY KEY,
      title         TEXT NOT NULL,
      description   TEXT,
      badge_text    TEXT,
      badge_color   TEXT DEFAULT 'red',
      old_price     TEXT,
      new_price     TEXT,
      discount_text TEXT,
      days_left     INTEGER DEFAULT 30,
      image         TEXT,
      active        INTEGER DEFAULT 1,
      sort_order    INTEGER DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Admin Kullanıcıları
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id            SERIAL PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Tıklama Etkinlikleri (Telefon & WhatsApp)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS click_events (
      id          SERIAL PRIMARY KEY,
      event_type  TEXT NOT NULL,
      page_path   TEXT,
      target_href TEXT,
      has_gclid   INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Site Ayarları
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Varsayılan admin
  const existingAdmin = await db.getAsync('SELECT id FROM admin_users WHERE username = $1', ['admin']);
  if (!existingAdmin) {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query('INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)', ['admin', hash]);
    console.log('✅ Varsayılan admin oluşturuldu: admin / admin123');
  }

  // Varsayılan site ayarları
  const defaultSettings = [
    ['site_title',   'Akdeniz Yapı Dekorasyon'],
    ['site_slogan',  'Yapınıza Değer Katıyoruz'],
    ['phone1',       '0530 936 10 17'],
    ['phone2',       '0535 876 35 04'],
    ['phone3',       '0531 977 31 13'],
    ['whatsapp',     '905309361017'],
    ['instagram',    'akdeniz.yapidekorasyon'],
    ['address',      'Antalya, Türkiye'],
    ['email',        'info@akdenizyapi.com'],
    ['about_text',   'Firmamız ısı, su, ses, yangın yalıtımı yanı sıra iç-dış boya, alçı, kartonpiyer, asma tavan, çatı, asansör revizyon, drenaj, seramik-mermer uygulamaları ve tadilat alanlarında faaliyetlerini sürdürmektedir.'],
    ['vision',       'Tam memnuniyet için kaliteli, güvenilir, konforlu yaşatılabilecek yalıtımları sunmak; müşterilerimiz, tedarikçilerimiz, iş ortaklarımızla uyumlu ve huzur içinde ticari faaliyetlerimizi devam ettirmek.'],
    ['mission',      'Kaliteli işler çıkartmak için teknik iş gücünün gelişmesine katkıda bulunarak, sürekli yenilikçi çözümler getirmek ve daimi müşteri memnuniyeti ile sektörde zirveye ulaşmak.'],
  ];
  for (const [key, value] of defaultSettings) {
    await pool.query(
      `INSERT INTO site_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING`,
      [key, value]
    );
  }

  // Varsayılan kategoriler
  const { rows: catRows } = await pool.query('SELECT COUNT(*) AS cnt FROM categories');
  if (parseInt(catRows[0].cnt) === 0) {
    const cats = [
      ['Isı Yalıtımı',      'isi-yalitimi',    '🏠'],
      ['Su Yalıtımı',       'su-yalitimi',     '💧'],
      ['Boya & Sıva',       'boya-siva',        '🎨'],
      ['Alçı & Dekorasyon', 'alci-dekorasyon',  '✨'],
      ['Çatı',              'cati',             '🏗️'],
      ['Seramik & Mermer',  'seramik-mermer',   '🪨'],
      ['Tadilat',           'tadilat',          '🔨'],
    ];
    for (const [name, slug, icon] of cats) {
      await pool.query(
        'INSERT INTO categories (name, slug, icon) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING',
        [name, slug, icon]
      );
    }
  }

  // Varsayılan hizmetler
  const { rows: svcRows } = await pool.query('SELECT COUNT(*) AS cnt FROM services');
  if (parseInt(svcRows[0].cnt) === 0) {
    const getCatId = async (slug) => {
      const row = await db.getAsync('SELECT id FROM categories WHERE slug = $1', [slug]);
      return row ? row.id : null;
    };

    const services = [
      ['Dış Cephe Isı Yalıtımı (EPS Mantolama)', 'dis-cephe-isi-yalitimi', 'isi-yalitimi',
        'Enerji tasarrufu sağlayan, ısı kaybını %50\'ye kadar azaltan EPS levha mantolama sistemi.',
        'Dış cephe ısı yalıtımı, binanın enerji verimliliğini artırmak ve ısı kayıplarını önlemek amacıyla uygulanan en etkili yöntemdir.', 1, 1],
      ['Mineral Sıva Uygulaması', 'mineral-siva', 'isi-yalitimi',
        'Yüksek nefes alabilirlik, UV dayanımı ve estetik görünüm sunan mineral bazlı dış cephe sıvası.',
        'Mineral sıva; çimento bazlı, su itici ve hava geçirgen yapısıyla dış cephelerde uzun ömürlü koruma sağlar.', 1, 2],
      ['Su Yalıtımı & Termal Kaplama', 'su-yalitimi-termal', 'su-yalitimi',
        'Çatı, teras, balkon ve bodrum katı için poliüretan ve bitümlü membran su yalıtım sistemleri.',
        'Poliüretan likit membran, bitümlü örtü ve kristalize su yalıtımı yöntemleriyle yüzey tamamen su geçirmez hale getirilir.', 1, 3],
      ['İç & Dış Cephe Boyası', 'ic-dis-cephe-boyasi', 'boya-siva',
        'Filli Boya, DYO ve Marshall markalı A+ ürünlerle profesyonel iç ve dış cephe boya uygulaması.',
        'Deneyimli ekibimiz; yüzey temizliği, macun, astar ve kat boya süreçlerini eksiksiz uygular.', 1, 4],
      ['Alçı & Kartonpiyer', 'alci-kartonpiyer', 'alci-dekorasyon',
        'Asma tavan, kartonpiyer ve alçı sıva uygulamaları ile mekanlara estetik ve modern bir görünüm kazandırıyoruz.',
        'Alçı levha, alçı sıva ve dekoratif kartonpiyer uygulamalarında geniş model yelpazemiz ile mekanınızı dönüştürüyoruz.', 0, 5],
      ['Çatı Onarım & Yenileme', 'cati-onarim', 'cati',
        'Kiremit çatı, shingle ve termoizole çatı sistemleri; sızdırmazlık garantisiyle onarım ve yenileme.',
        'Çatı muayenesi, kiremit değişimi, mahya çimento yenileme ve çatı altı yalıtımı hizmetlerimiz kapsamındadır.', 0, 6],
      ['Seramik & Mermer Döşeme', 'seramik-mermer-doseme', 'seramik-mermer',
        'Zemin ve duvar seramik, granit ve mermer kaplama uygulamaları; kesim, döşeme ve derz dahil.',
        'İç mekan zemin ve duvar kaplamalarında seramik, granit, mermer ve mozaik uygulamaları yapılmaktadır.', 0, 7],
      ['Komple Tadilat & Renovasyon', 'komple-tadilat', 'tadilat',
        'Daire, villa ve ticari alanlarda anahtar teslim komple tadilat; elektrik, sıhhi tesisat dahil.',
        'Konut ve ticari mekan tadilatlarında mimari proje desteği, malzeme tedariki ve uygulama hizmetleri sunulmaktadır.', 1, 8],
    ];

    for (const [title, slug, catSlug, short_desc, description, featured, sort_order] of services) {
      const category_id = await getCatId(catSlug);
      await pool.query(
        `INSERT INTO services (title, slug, category_id, short_desc, description, featured, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (slug) DO NOTHING`,
        [title, slug, category_id, short_desc, description, featured, sort_order]
      );
    }
    console.log('✅ Varsayılan hizmetler eklendi.');
  }

  // Varsayılan referanslar
  // NOT: slug'lar frontend/referanslar.html'deki statik /referanslar/<slug> linkleriyle
  // BİREBİR aynıdır (başlıktan slugify() ile üretilip statik linklerle doğrulanmıştır).
  const { rows: projRows } = await pool.query('SELECT COUNT(*) AS cnt FROM projects');
  if (parseInt(projRows[0].cnt) === 0) {
    const projects = [
      ['Bayındır Pınarlar Sitesi', 'Antalya', 'Dış cephe mantolama ve mineral sıva uygulaması', 1,
        'Bayındır Pınarlar Sitesi\'nde dış cephe mantolama ve mineral sıva uygulaması gerçekleştirilmiştir. Antalya\'da yer alan sitenin dış cepheleri ısı yalıtımı ile kaplanmış, üzerine mineral sıva uygulanmıştır. Proje Akdeniz Yapı Dekorasyon ekibi tarafından tamamlanmıştır.'],
      ['AYT Park Villa Sitesi',    'Antalya', 'Isı yalıtımı ve boya uygulaması', 1,
        'AYT Park Villa Sitesi\'nde ısı yalıtımı ve boya uygulaması yapılmıştır. Antalya\'daki villa sitesinin dış cephelerinde yalıtım ve boya işleri bir arada yürütülmüştür. Uygulama Akdeniz Yapı Dekorasyon ekibi tarafından tamamlanmıştır.'],
      ['Ergin Sitesi',             'Antalya', 'Dış cephe yenileme ve mineral sıva', 0,
        'Ergin Sitesi\'nde dış cephe yenileme ve mineral sıva uygulaması gerçekleştirilmiştir. Antalya\'da bulunan sitenin cepheleri yenilenmiş ve mineral sıva ile kaplanmıştır.'],
      ['Özcağatay Apt.',           'Antalya', 'Tamiratlı boya ve dış cephe uygulaması', 0,
        'Özcağatay Apartmanı\'nda tamiratlı boya ve dış cephe uygulaması yapılmıştır. Antalya\'daki binanın cephe onarımları tamamlandıktan sonra boya uygulamasına geçilmiştir. Proje Akdeniz Yapı Dekorasyon ekibi tarafından teslim edilmiştir.'],
      ['Varsak Güneş Konakları',   'Antalya', 'Tam cephe yenileme projesi', 1,
        'Varsak Güneş Konakları\'nda tam cephe yenileme projesi gerçekleştirilmiştir. Antalya\'da yer alan konakların dış cepheleri kapsamlı bir yenileme çalışmasıyla elden geçirilmiştir. Uygulama Akdeniz Yapı Dekorasyon ekibi tarafından tamamlanmıştır.'],
      ['Bayram Yanık Apt.',        'Antalya', 'Mineral sıva ve boya', 0,
        'Bayram Yanık Apartmanı\'nda mineral sıva ve boya uygulaması yapılmıştır. Antalya\'daki binanın dış cephesi mineral sıva ile kaplanmış ve boya işleriyle tamamlanmıştır.'],
      ['Anadolu Sitesi',           'Antalya', 'Dış cephe mantolama', 0,
        'Anadolu Sitesi\'nde dış cephe mantolama uygulaması gerçekleştirilmiştir. Antalya\'da bulunan sitenin cephelerine ısı yalıtımı uygulanmıştır. Proje Akdeniz Yapı Dekorasyon ekibi tarafından tamamlanmıştır.'],
      ['Koza Sitesi',              'Antalya', 'Isı yalıtımı ve renklendirme', 0,
        'Koza Sitesi\'nde ısı yalıtımı ve renklendirme uygulaması yapılmıştır. Antalya\'daki sitenin dış cepheleri yalıtımın ardından renklendirme çalışmasıyla tamamlanmıştır.'],
      ['Bileydı Konakları',        'Antalya', 'Kapsamlı cephe yenileme', 0,
        'Bileydı Konakları\'nda kapsamlı cephe yenileme çalışması gerçekleştirilmiştir. Antalya\'da yer alan konakların dış cepheleri Akdeniz Yapı Dekorasyon ekibi tarafından yenilenmiştir.'],
      ['Sarı İsmail Apt.',         'Antalya', 'Boya ve onarım', 0,
        'Sarı İsmail Apartmanı\'nda boya ve onarım çalışması yapılmıştır. Antalya\'daki binanın cephe onarımları tamamlanmış ve ardından boya uygulaması gerçekleştirilmiştir.'],
      ['Huzur Apt.',               'Antalya', 'Dış cephe boya uygulaması', 0,
        'Huzur Apartmanı\'nda dış cephe boya uygulaması gerçekleştirilmiştir. Antalya\'da bulunan binanın dış cephesi Akdeniz Yapı Dekorasyon ekibi tarafından boyanarak yenilenmiştir.'],
      ['Sarısu Klas Sitesi',       'Antalya', 'Mineral sıva ve boya sistemi', 1,
        'Sarısu Klas Sitesi\'nde mineral sıva ve boya sistemi uygulanmıştır. Antalya\'da yer alan sitenin dış cepheleri mineral sıva ile kaplanmış ve boya uygulamasıyla tamamlanmıştır.'],
    ];
    for (const [title, location, description, featured, detail_text] of projects) {
      await pool.query(
        'INSERT INTO projects (title, slug, location, description, detail_text, featured) VALUES ($1, $2, $3, $4, $5, $6)',
        [title, slugify(title), location, description, detail_text, featured]
      );
    }
  }

  // Mevcut dolu DB'ler için: slug'ı NULL (veya boş) kalan referans kayıtlarına
  // başlıktan slug backfill et — statik /referanslar/<slug> linkleri 404 vermesin.
  const { rows: nullSlugRows } = await pool.query(
    `SELECT id, title FROM projects WHERE slug IS NULL OR slug = ''`
  );
  for (const row of nullSlugRows) {
    const slug = slugify(row.title);
    if (slug) {
      await pool.query('UPDATE projects SET slug = $1 WHERE id = $2', [slug, row.id]);
    }
  }
  if (nullSlugRows.length > 0) {
    console.log(`✅ ${nullSlugRows.length} referans kaydına slug backfill edildi.`);
  }

  console.log('✅ Veritabanı hazır (PostgreSQL)');
}

initDatabase().catch((err) => {
  console.warn('⚠️ Yerel veritabanı uyarısı:', err.message);
});

module.exports = db;
