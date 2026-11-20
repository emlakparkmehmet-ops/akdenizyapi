import argparse
import json
import math
import os
import shutil
import subprocess
import tempfile
import wave
from datetime import datetime
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
LOGO_PATH = os.path.join(PROJECT_ROOT, "frontend", "apple-touch-icon.png")
HISTORY_PATH = os.path.join(SCRIPT_DIR, "reels_history.json")

FFMPEG_CANDIDATES = [
    shutil.which("ffmpeg"),
    r"C:\Users\vampi\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe",
    r"C:\Users\vampi\AppData\Local\Microsoft\WinGet\Packages\yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-N-124716-g054dffd133-win64-gpl\bin\ffmpeg.exe",
]

EPISODES = [
    {
        "id": "ep01_3d_wipe_apartman",
        "template": "split_wipe",
        "hook_top": "25 YILLIK APARTMANIN",
        "hook_gold": "10 GÜNDE DEĞİŞİMİ!",
        "badge": "ÜCRETSİZ 3D TASARIM",
        "cards": [
            ("1. ADIM", "WhatsApp'tan bina fotoğrafınızı gönderin"),
            ("2. ADIM", "3 farklı 3D renk & söve tasarımını görün"),
            ("3. ADIM", "10 yıl sözleşmeli garantiyle uygulayalım"),
        ],
        "cta_main": "0530 936 10 17",
        "cta_sub": "ÜCRETSİZ KEŞİF & 3D TASARIM • ANTALYA",
        "image_prompt": "Vertical 9:16 split-screen architectural photograph of the exact same 4-story residential apartment building in Antalya Turkey with palm trees under sunny Mediterranean sky: LEFT HALF shows old weathered faded cracked peach plaster facade before renovation, RIGHT HALF shows brand new luxury cream and anthracite grey exterior thermal insulation facade with decorative white window moldings (sove) and glass balconies, ultra realistic daytime architectural photography, no text.",
        "caption": "🎨 Binanız boyanmadan önce yeni halini 3D olarak görün!\n\n\"Acaba bu renk binamıza yakışır mı?\" endişesine son veriyoruz. Cephe fotoğrafınızı WhatsApp'tan gönderin, 3 farklı renk ve söve alternatifini ücretsiz hazırlayalım.\n\n✅ Jotun / Filli Boya / Weber Sistemleri\n✅ 10 Yıl Sözleşmeli İşçilik & Malzeme Garantisi\n✅ Teslimatta Ücretsiz Enerji Kimlik Belgesi (EKB)\n\n📲 WhatsApp Keşif & 3D Tasarım: 0530 936 10 17\n🌐 antalyadiscephe.com\n\nSizce açık krem-antrasit mi yoksa toprak tonları mı apartmanlara daha çok yakışıyor? Yorumlara yazın 👇\n\n#AntalyaMantolama #DışCepheBoyama #3DCepheTasarım #AntalyaDışCephe #BinaYenileme #AkdenizYapı"
    },
    {
        "id": "ep02_2026_m2_maliyet",
        "template": "cards_zoom",
        "hook_top": "2026 ANTALYA MANTOLAMA",
        "hook_gold": "GÜNCEL m² MALİYETLERİ",
        "badge": "LAZIM OLUR KAYDEDİN",
        "cards": [
            ("4 cm Karbonlu EPS Paket", "550 – 650 ₺ / m²  (İskele + Boya Dahil)"),
            ("5 cm Karbonlu EPS Paket", "650 – 750 ₺ / m²  (%50 Klima Tasarrufu)"),
            ("5 cm A1 Taşyünü Paket", "850 – 1.050 ₺ / m²  (Isı + Ses + Yangın)"),
            ("12 Daireli Bina Ortalaması", "Daire Başı 32.500 – 36.000 ₺  (EKB Hediye)"),
        ],
        "cta_main": "0530 936 10 17",
        "cta_sub": "AYNI GÜN ÜCRETSİZ ÖLÇÜM & TEKLİF",
        "image_prompt": "Vertical 9:16 photorealistic architectural photograph of a newly renovated modern 5-story apartment building in Antalya Turkey with clean warm beige and dark grey facade, white decorative window frames, lush Mediterranean palm trees and blue sky, professional real estate photography, no text.",
        "caption": "📌 Lazım olur, mutlaka kaydedin! 2026 Antalya dış cephe mantolama ve boya güncel m² maliyet aralıkları:\n\n🔹 4 cm Karbonlu EPS Sistem: 550 – 650 ₺/m²\n🔹 5 cm Karbonlu EPS Sistem: 650 – 750 ₺/m²\n🔹 5 cm Taşyünü (A1 Yanmaz): 850 – 1.050 ₺/m²\n🏢 4 Katlı 12 Daireli Örnek Apartmanda Daire Başı: ~32.500 – 36.000 ₺\n\n✔️ Çelik İskele + Fileli Çift Kat Sıva + Silikonlu Boya Dahil\n✔️ Yönetici Tahsilatla Uğraşmaz (Kat Maliki Bazlı Ödeme Planı)\n✔️ 10 Yıl Garanti & Ücretsiz EKB\n\n📞 Ücretsiz Keşif: 0530 936 10 17\n🌐 Online m² Hesaplama: https://antalyadiscephe.com/antalya-mantolama-fiyatlari.html\n\nBinanız kaç katlı? Yorumlara yazın, yaklaşık metraj ve bütçeyi hemen yanıtlayalım 👇\n\n#MantolamaFiyatları #AntalyaMantolama #IsıYalıtımı #ApartmanYönetimi #DışCepheKaplama"
    },
    {
        "id": "ep03_boya_kabarma_tartisma",
        "template": "cards_zoom",
        "hook_top": "CEPHE BOYASI NEDEN KABARIR?",
        "hook_gold": "BOYADAN MI, USTADAN MI?",
        "badge": "USTA SIRRI • ANTALYA",
        "cards": [
            ("HATA 1: Yıkanmamış Cephe", "Tuzlu nem ve toz temizlenmeden astar tutmaz!"),
            ("HATA 2: Eksik Fileli Sıva", "Kılcal çatlaklar kapatılmazsa ilk kışta su alır."),
            ("ÇÖZÜM: Silikonlu UV Sistem", " Çift kat fileli sıva + Jotun/Filli silikonlu boya."),
        ],
        "cta_main": "0530 936 10 17",
        "cta_sub": "10 YIL KABARMA & SOLMA GARANTİSİ",
        "image_prompt": "Vertical 9:16 photorealistic close-up architectural view of professional facade craftsmen on steel scaffolding applying crisp grey silicone exterior paint with a roller over smooth white reinforced plaster on an apartment building in sunny Antalya, clean workmanship, no text.",
        "caption": "🤔 Dış cephede boyanın 2 yılda kabarıp dökülmesi sizce malzemeden mi kaynaklanır, yoksa işçilikten mi?\n\nAntalya gibi yüksek UV güneşi ve deniz nemi olan şehirlerde en pahalı boyayı da alsanız; yüzey yüksek basınçla yıkanmadan, kılcal çatlaklar tamir edilip uygun astar vurulmadan yapılan uygulama uzun ömürlü olmaz.\n\nAkdeniz Yapı Dekorasyon olarak tüm dış cephe uygulamalarımızı 10 Yıl Yazılı Sözleşmeli Garanti ile teslim ediyoruz.\n\n📲 Ücretsiz Cephe Kontrolü & Keşif: 0530 936 10 17\n🌐 antalyadiscephe.com\n\nSiz bu konuda ne düşünüyorsunuz? Yorumlarda buluşalım 👇\n\n#DışCepheBoya #BinaBoyama #AntalyaBoya #Mantolama #İnşaatİşçilik #AkdenizYapı"
    },
    {
        "id": "ep04_dosemealti_villa_sove",
        "template": "split_wipe",
        "hook_top": "DÖŞEMEALTI VİLLALARINDA",
        "hook_gold": "TAŞYÜNÜ & SÖVE DÖNÜŞÜMÜ",
        "badge": "VİLLA ÖZEL PAKETİ",
        "cards": [
            ("A1 Yanmaz Taşyünü", "Kış ayazı ve yaz sıcağına maksimum yalıtım"),
            ("Mimari Söve & Fuga", "Pencere sövesi, kat silmesi ve köşe taşı estetiği"),
            ("Ücretsiz 3D Sunum", "Uygulama öncesi villanızın yeni tasarımını görün"),
        ],
        "cta_main": "0530 936 10 17",
        "cta_sub": "YEŞİLBAYIR • ALTINKALE • YENİKÖY",
        "image_prompt": "Vertical 9:16 split-screen architectural photo of a 2-story detached villa with garden in Dosemealti Antalya: LEFT HALF shows plain dated weathered beige plaster villa exterior, RIGHT HALF shows luxury modern renovated villa facade with anthracite grey accents, white decorative window moldings (sove), warm architectural lighting and stone details, ultra realistic photography, no text.",
        "caption": "🏡 Döşemealtı (Yeşilbayır, Altınkale, Yeniköy, Çıplaklı) villalarına özel A1 sınıfı Taşyünü Mantolama & Mimari Söve Yenileme!\n\nHem kışın ısı kaybını hem yazın bunaltıcı sıcağı %50'ye varan oranda kesen taşyünü ve fugalı cephe sistemleriyle villanızın değerini artırın.\n\n📲 Ücretsiz Villa Keşfi & 3D Tasarım: 0530 936 10 17\n🌐 https://antalyadiscephe.com/dosemealti-mantolama.html\n\n#Döşemealtı #AntalyaVilla #VillaTadilat #SöveKaplama #TaşyünüMantolama #AkdenizYapı"
    },
    {
        "id": "ep05_yonetici_tahsilat_cozumu",
        "template": "cards_zoom",
        "hook_top": "APARTMAN YÖNETİCİLERİ",
        "hook_gold": "ARTIK TAHSİLATLA UĞRAŞMIYOR!",
        "badge": "YÖNETİMLERE ÖZEL SİSTEM",
        "cards": [
            ("Ayrı Ödeme Planı", "Her kat malikiyle birebir sözleşme ve ödeme planı"),
            ("Tam Güvenlik & SGK", "Kendi çelik iskelemiz ve tam sigortalı uzman ekip"),
            ("Ücretsiz EKB Belgesi", "Yasal zorunlu Enerji Kimlik Belgesi bizden hediye!"),
        ],
        "cta_main": "0530 936 10 17",
        "cta_sub": "BİNA TOPLANTISINA ÜCRETSİZ SUNUM",
        "image_prompt": "Vertical 9:16 photorealistic daytime architectural shot of a clean newly painted 6-story residential site block in Muratpasa Lara Antalya with neat landscaping, modern cream and grey facade insulation finish, blue sky, no text.",
        "caption": "🏢 Apartman ve site yöneticilerimizin en büyük derdi olan \"komşulardan para toplama\" yükünü tamamen ortadan kaldırıyoruz!\n\n✅ Bina genel kurul toplantınıza ücretsiz katılıp numune ve 3D tasarım sunumu yapıyoruz.\n✅ Her daire sahibiyle ayrı ödeme/taksit planı oluşturuyoruz.\n✅ 10 yıl sözleşmeli garanti ve ücretsiz Enerji Kimlik Belgesi (EKB) ile anahtar teslim tamamlıyoruz.\n\n📞 Yönetimlere Özel Danışma Hattı: 0530 936 10 17\n🌐 antalyadiscephe.com\n\n#ApartmanYönetimi #SiteYönetimi #AntalyaMantolama #EnerjiKimlikBelgesi #BinaMantolama"
    },
    {
        "id": "ep06_konyaalti_lara_tuzlu_nem",
        "template": "cards_zoom",
        "hook_top": "DENİZE YAKIN BİNALARDA",
        "hook_gold": "TUZ KOROZYONUNA SON!",
        "badge": "KONYAALTI & LARA ÖZEL",
        "cards": [
            ("Tuz & Nem Bariyeri", "Deniz tuzuna dirençli özel astar ve mineral sıva"),
            ("Klima Faturasında -%50", "16-20 dansite karbonlu EPS ile serin daireler"),
            ("UV Korumalı Renkler", "Antalya güneşinde solmayan Jotun / Filli kartelası"),
        ],
        "cta_main": "0530 936 10 17",
        "cta_sub": "KONYAALTI • LARA • MURATPAŞA",
        "image_prompt": "Vertical 9:16 photorealistic architectural photograph of a modern coastal 5-story apartment building near Konyaalti Antalya beach boulevard with palm trees, fresh crisp white and slate grey silicone exterior facade, sunny Mediterranean light, no text.",
        "caption": "🌊 Konyaaltı ve Lara gibi sahil bandındaki binalarda sıradan dış cephe boyaları deniz tuzu ve nem yüzünden hızla kabarır.\n\nSahil iklimine özel alkali dirençli astar, çift kat fileli sıva ve tam silikonlu UV boya sistemlerimizle cephenizi 10 yıl garanti altına alıyoruz.\n\n📲 Ücretsiz Nem & Cephe Keşfi: 0530 936 10 17\n🌐 https://antalyadiscephe.com/konyaalti-mantolama.html\n\n#Konyaaltı #LaraAntalya #Muratpaşa #DışCepheYenileme #AntalyaMantolama #AkdenizYapı"
    },
    {
        "id": "ep07_eps_mi_tasyunu_mu",
        "template": "cards_zoom",
        "hook_top": "ANTALYA SICAĞINDA HANGİSİ?",
        "hook_gold": "KARBONLU EPS Mİ, TAŞYÜNÜ MÜ?",
        "badge": "KARŞILAŞTIRMA REHBERİ",
        "cards": [
            ("5 cm Karbonlu EPS", "Fiyat/performans lideri • Hafif • %50 ısı tasarrufu"),
            ("5 cm A1 Taşyünü", "Tam yanmaz (A1) • Yüksek ses + ısı yalıtımı • Nefes alır"),
            ("Hangisi Size Uygun?", "Binanızın konumuna göre ücretsiz keşifte belirliyoruz!"),
        ],
        "cta_main": "0530 936 10 17",
        "cta_sub": "ÜCRETSİZ KEŞİF & NUMUNE SUNUMU",
        "image_prompt": "Vertical 9:16 photorealistic architectural close-up of thermal insulation layers installed cleanly on a modern residential building wall in sunny Antalya, showing neat grey carbon EPS and mineral wool boards with fiberglass mesh and smooth plaster finish, professional construction photography, no text.",
        "caption": "⚖️ Antalya'da dış cephe mantolama yaptıracakların en çok sorduğu soru: Karbonlu EPS mi, yoksa Taşyünü mü?\n\n🔹 Karbonlu EPS: Bütçe dostudur, grafit katkısı sayesinde güneş radyasyonunu yansıtır ve apartmanlarda en hızlı amorti eden sistemdir.\n🔹 Taşyünü: A1 sınıfı hiç yanmaz malzemedir, cadde gürültüsünü keser ve üst düzey nefes alma kapasitesine sahiptir (villalar ve ana cadde binaları için idealdir).\n\nSiz binanızda hangisini tercih ederdiniz? Yorumlara yazın 👇\n\n📞 Ücretsiz Keşif: 0530 936 10 17 | 🌐 antalyadiscephe.com\n\n#IsıYalıtımı #Taşyünü #KarbonluEPS #AntalyaMantolama #DışCephe"
    },
]


def get_ffmpeg():
    for c in FFMPEG_CANDIDATES:
        if c and os.path.exists(c):
            return c
    raise RuntimeError("ffmpeg executable not found!")


def fnt(size, bold=True):
    p = r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf"
    try:
        return ImageFont.truetype(p, size)
    except Exception:
        return ImageFont.load_default()


def crop_fill(img, tw, th):
    iw, ih = img.size
    scale = max(tw / iw, th / ih)
    nw, nh = int(iw * scale), int(ih * scale)
    resized = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return resized.crop((left, top, left + tw, top + th))


def generate_ambient_wav(wav_path, duration_sec=12.0, sample_rate=44100):
    """Synthesize a clean, pleasant, copyright-free corporate ambient pulse & warm chord."""
    total_samples = int(duration_sec * sample_rate)
    t = np.arange(total_samples, dtype=np.float64) / sample_rate
    fade_in = np.minimum(1.0, t / 0.6)
    fade_out = np.minimum(1.0, (duration_sec - t) / 1.0)
    env = fade_in * fade_out

    # Soft rhythmic pulse at 110 BPM
    beat_phase = np.mod(t * (110.0 / 60.0), 1.0)
    pulse = 0.65 + 0.35 * np.exp(-5.0 * beat_phase)

    freqs = [220.0, 277.18, 329.63, 440.0]  # Warm A-major corporate pad
    val = np.zeros(total_samples, dtype=np.float64)
    for idx, fq in enumerate(freqs):
        val += np.sin(2.0 * np.pi * fq * t) * (0.32 / (idx + 1))

    # Subtle intro chime at t=0.08 and card chimes
    for chime_t, chime_f in [(0.08, 880.0), (2.2, 659.25), (4.6, 783.99), (7.0, 880.0)]:
        mask = t >= chime_t
        dt = t[mask] - chime_t
        val[mask] += 0.18 * np.sin(2.0 * np.pi * chime_f * dt) * np.exp(-4.5 * dt)

    samples = np.clip(val * env * pulse * 0.45, -1.0, 1.0)
    pcm = (samples * 32767.0).astype("<i2").tobytes()

    with wave.open(wav_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm)


def ease_out_cubic(x):
    x = max(0.0, min(1.0, x))
    return 1.0 - (1.0 - x) ** 3


def render_episode_video(ep, img_path, out_mp4, duration_sec=12.0, fps=30):
    W, H = 1080, 1920
    total_frames = int(duration_sec * fps)
    base_raw = Image.open(img_path).convert("RGB")
    logo = Image.open(LOGO_PATH).convert("RGBA").resize((86, 86), Image.LANCZOS) if os.path.exists(LOGO_PATH) else None

    GOLD = (224, 178, 46)
    GOLD_LIGHT = (250, 218, 112)
    NAVY = (12, 19, 33)
    WHITE = (255, 255, 255)
    GREEN = (37, 211, 102)

    # For split_wipe: build full symmetric BEFORE & AFTER facades from split-screen halves!
    iw, ih = base_raw.size
    if ep["template"] == "split_wipe":
        base_fitted = crop_fill(base_raw, int(W * 1.08), int(H * 1.08))
        bw, bh = base_fitted.size
        half_w = bw // 2
        # Trim 14px around center seam so any white divider line in source photo is cleanly removed
        lh = base_fitted.crop((0, 0, half_w - 14, bh)).resize((half_w, bh), Image.LANCZOS)
        rh = base_fitted.crop((half_w + 14, 0, bw, bh)).resize((bw - half_w, bh), Image.LANCZOS)
        left_src = Image.new("RGB", (bw, bh))
        left_src.paste(lh, (0, 0))
        left_src.paste(ImageOps.mirror(lh), (half_w, 0))
        right_src = Image.new("RGB", (bw, bh))
        right_src.paste(ImageOps.mirror(rh).resize((half_w, bh), Image.LANCZOS), (0, 0))
        right_src.paste(rh, (half_w, 0))
    else:
        hero_src = crop_fill(base_raw, int(W * 1.15), int(H * 1.15))

    # Pre-cache fonts once outside the frame loop
    f_brand = fnt(29, True)
    f_badge = fnt(22, True)
    f_tag = fnt(25, True)
    f_hook_top = fnt(52, True)
    f_hook_gold = fnt(50, True)
    f_ctitle = fnt(31, True)
    f_cdesc = fnt(25, False)
    f_cdesc_sm = fnt(23, False)
    f_cta_main = fnt(43, True)
    f_cta_sub = fnt(25, True)

    # Pre-compute static gradient + header overlay once outside the frame loop
    static_overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(static_overlay)
    for y in range(0, 500):
        alpha = int(225 * (1.0 - y / 500.0) ** 1.25)
        sd.line([(0, y), (W, y)], fill=(10, 16, 28, alpha))
    for y in range(920, H):
        alpha = int(245 * ((y - 920) / (H - 920)) ** 0.85)
        sd.line([(0, y), (W, y)], fill=(12, 19, 33, min(248, alpha)))
    if logo:
        static_overlay.paste(logo, (48, 140), logo)
    sd.text((152, 148), "AKDENİZ YAPI DEKORASYON", font=f_brand, fill=WHITE)
    sd.rounded_rectangle([152, 188, 540, 228], radius=10, fill=GOLD)
    sd.text((170, 195), ep["badge"], font=f_badge, fill=NAVY)

    ffmpeg_bin = get_ffmpeg()
    tmp_dir = tempfile.mkdtemp(prefix="akdeniz_reel_")
    wav_path = os.path.join(tmp_dir, "audio.wav")
    err_log = os.path.join(tmp_dir, "ffmpeg.err")

    try:
        generate_ambient_wav(wav_path, duration_sec=duration_sec)
        cmd_enc = [
            ffmpeg_bin, "-y",
            "-loglevel", "warning",
            "-f", "rawvideo",
            "-vcodec", "rawvideo",
            "-s", f"{W}x{H}",
            "-pix_fmt", "rgb24",
            "-r", str(fps),
            "-i", "-",
            "-i", wav_path,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "fast",
            "-crf", "21",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            "-movflags", "+faststart",
            out_mp4,
        ]
        with open(err_log, "wb") as err_f:
            proc = subprocess.Popen(cmd_enc, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=err_f)

            for f_idx in range(total_frames):
                t = f_idx / fps
                prog = f_idx / max(1, total_frames - 1)

                # Background motion (Ken Burns + full-building laser wipe)
                if ep["template"] == "split_wipe":
                    zx = int((left_src.width - W) * prog * 0.6)
                    zy = int((left_src.height - H) * prog * 0.5)
                    bg_before = left_src.crop((zx, zy, zx + W, zy + H))
                    bg_after = right_src.crop((zx, zy, zx + W, zy + H))
                    # t=0..0.9s: 92% old building -> t=0.9..3.4s: full sweep to new -> t=3.4..5.2s: settle at 50/50 split!
                    if t < 0.9:
                        split_x = int(W * 0.92)
                    elif t < 3.4:
                        k = ease_out_cubic((t - 0.9) / 2.5)
                        split_x = int(W * 0.92 * (1.0 - k) + W * 0.08 * k)
                    elif t < 5.2:
                        k = ease_out_cubic((t - 3.4) / 1.8)
                        split_x = int(W * 0.08 * (1.0 - k) + (W // 2) * k)
                    else:
                        split_x = int(W // 2 + 18 * math.sin((t - 5.2) * 1.8))
                    frame = bg_after.copy()
                    frame.paste(bg_before.crop((0, 0, split_x, H)), (0, 0))
                else:
                    zx = int((hero_src.width - W) * prog)
                    zy = int((hero_src.height - H) * prog * 0.7)
                    frame = hero_src.crop((zx, zy, zx + W, zy + H))

                frame_rgba = Image.alpha_composite(frame.convert("RGBA"), static_overlay)
                draw = ImageDraw.Draw(frame_rgba, "RGBA")

                if ep["template"] == "split_wipe":
                    draw.rectangle([split_x - 4, 400, split_x + 4, 1005], fill=(250, 218, 112, 245))
                    if split_x >= 260:
                        draw.rounded_rectangle([40, 420, 226, 476], radius=14, fill=(185, 45, 45, 230))
                        draw.text((68, 434), "ÖNCESİ", font=f_tag, fill=WHITE)
                    if split_x <= W - 330:
                        draw.rounded_rectangle([W - 304, 420, W - 40, 476], radius=14, fill=(37, 211, 102, 235))
                        draw.text((W - 280, 434), "3D YENİ CEPHE", font=f_tag, fill=NAVY)

                # Hook headline slide-in (first 0.5s)
                hk = ease_out_cubic(t / 0.45)
                hy = int(262 + (1.0 - hk) * 40)
                draw.text((52, hy), ep["hook_top"], font=f_hook_top, fill=WHITE)
                draw.text((52, hy + 64), ep["hook_gold"], font=f_hook_gold, fill=GOLD_LIGHT)

                # Sequential animated value cards
                cards = ep["cards"]
                if len(cards) <= 3:
                    card_h, card_gap, start_y, title_dy, desc_dy, desc_font = 112, 16, 1025, 14, 58, f_cdesc
                else:
                    card_h, card_gap, start_y, title_dy, desc_dy, desc_font = 96, 12, 980, 11, 50, f_cdesc_sm
                for idx, (c_title, c_desc) in enumerate(cards):
                    appear_t = 1.6 + idx * 1.7
                    if t >= appear_t:
                        ck = ease_out_cubic((t - appear_t) / 0.45)
                        cx_off = int((1.0 - ck) * 120)
                        cy = start_y + idx * (card_h + card_gap)
                        draw.rounded_rectangle(
                            [52 + cx_off, cy, W - 52 + cx_off, cy + card_h],
                            radius=20,
                            fill=(22, 32, 52, int(235 * ck)),
                            outline=GOLD,
                            width=3,
                        )
                        draw.text((82 + cx_off, cy + title_dy), c_title, font=f_ctitle, fill=GOLD_LIGHT)
                        draw.text((82 + cx_off, cy + desc_dy), c_desc, font=desc_font, fill=WHITE)

                # Bottom WhatsApp CTA pill (pulses gently after t=3s, lifted into FB Safe Zone)
                pulse_pad = int(4 * math.sin(t * 5.0)) if t > 3.0 else 0
                draw.rounded_rectangle(
                    [52 - pulse_pad, 1430 - pulse_pad, W - 52 + pulse_pad, 1568 + pulse_pad],
                    radius=28,
                    fill=GREEN,
                )
                draw.text((92, 1450), f"WHATSAPP KEŞİF:  {ep['cta_main']}", font=f_cta_main, fill=(10, 26, 15))
                draw.text((92, 1510), ep["cta_sub"], font=f_cta_sub, fill=(16, 44, 24))

                proc.stdin.write(frame_rgba.convert("RGB").tobytes())

            proc.stdin.close()
            ret = proc.wait()

        if ret != 0:
            stderr_out = ""
            if os.path.exists(err_log):
                with open(err_log, "r", encoding="utf-8", errors="replace") as rf:
                    stderr_out = rf.read()
            raise RuntimeError(f"FFmpeg exited with {ret}: {stderr_out[-600:]}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def load_history():
    if os.path.exists(HISTORY_PATH):
        try:
            with open(HISTORY_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"posted": []}


def pick_next_episode(history):
    posted_ids = [item["episode_id"] for item in history.get("posted", [])]
    for ep in EPISODES:
        if ep["id"] not in posted_ids:
            return ep
    # All episodes used once -> cycle from oldest!
    idx = len(posted_ids) % len(EPISODES)
    return EPISODES[idx]


def main():
    parser = argparse.ArgumentParser(description="Akdeniz Yapı Viral Facebook Reels Generator")
    parser.add_argument("--next-plan", action="store_true", help="Output JSON plan for next unposted Reel episode")
    parser.add_argument("--render", action="store_true", help="Render MP4 Reel from image")
    parser.add_argument("--episode-id", type=str, help="Episode ID to render")
    parser.add_argument("--image", type=str, help="Input background/split image path")
    parser.add_argument("--out", type=str, help="Output MP4 file path")
    parser.add_argument("--mark-posted", action="store_true", help="Record episode in reels_history.json")
    args = parser.parse_args()

    history = load_history()

    if args.next_plan:
        ep = pick_next_episode(history)
        print(json.dumps(ep, ensure_ascii=False, indent=2))
        return

    if args.render:
        ep = next((e for e in EPISODES if e["id"] == args.episode_id), EPISODES[0])
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        render_episode_video(ep, args.image, args.out)
        print(f"RENDERED_OK: {args.out} ({os.path.getsize(args.out)} bytes)")

    if args.mark_posted and args.episode_id:
        history.setdefault("posted", []).append({
            "episode_id": args.episode_id,
            "posted_at": datetime.now().isoformat(),
        })
        with open(HISTORY_PATH, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
        print(f"MARKED_POSTED: {args.episode_id}")


if __name__ == "__main__":
    main()
