#!/usr/bin/env python3
"""
Akdeniz Yapi Dekorasyon - Yerel Dis Cephe Segmentasyon Servisi (SegFormer-B2 ADE20K + OpenCV)
Sadece 127.0.0.1:5055 uzerinden Node.js backend tarafindan cagirilir (disariya kapali, 0 TL API maliyeti).
"""

import base64
import io
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, SegformerForSemanticSegmentation

PORT = int(os.environ.get("FACADE_AI_PORT", "5055"))
MODEL_ID = os.environ.get("FACADE_AI_MODEL", "nvidia/segformer-b2-finetuned-ade-512-512")
MAX_DIM = int(os.environ.get("FACADE_AI_MAX_DIM", "1040"))

# CPU cekirdeklerini dengeli kullan (Node.js ve nginx icin pay birak)
torch.set_num_threads(max(2, min(6, (os.cpu_count() or 4) - 1)))

# ADE20K sinif indeksleri
FACADE_CLASSES = [0, 1, 25, 48, 84]  # wall, building, house, skyscraper, tower
EXCLUDE_CLASSES = [
    2,   # sky
    3,   # floor
    4,   # tree
    5,   # ceiling
    6,   # road
    8,   # windowpane
    9,   # grass
    11,  # sidewalk
    12,  # person
    13,  # earth
    14,  # door
    17,  # plant
    20,  # car
    21,  # water
    26,  # sea
    29,  # field
    32,  # fence
    38,  # railing
    43,  # signboard
    46,  # sand
    52,  # path
    66,  # flower
    72,  # palm
    80,  # bus
    83,  # truck
    86,  # awning
    87,  # streetlight
    93,  # pole
    116, # bicycle
    127, # van
    136, # traffic light
    149, # flag
]

print(f"[FacadeAI] Model yukleniyor: {MODEL_ID} ...", flush=True)
t0 = time.time()
processor = AutoImageProcessor.from_pretrained(MODEL_ID)
model = SegformerForSemanticSegmentation.from_pretrained(MODEL_ID)
model.eval()
print(f"[FacadeAI] Model hazir ({time.time() - t0:.1f}s) | Port: 127.0.0.1:{PORT}", flush=True)


def fast_guided_filter(guide_gray_f32: np.ndarray, src_f32: np.ndarray, radius: int = 6, eps: float = 0.0025) -> np.ndarray:
    """Kenar koruyan Guided Filter (maskeyi pencere, sacak ve balkon kenarlarina jilet gibi oturtur)."""
    ksize = (2 * radius + 1, 2 * radius + 1)
    mean_I = cv2.boxFilter(guide_gray_f32, cv2.CV_32F, ksize)
    mean_p = cv2.boxFilter(src_f32, cv2.CV_32F, ksize)
    corr_I = cv2.boxFilter(guide_gray_f32 * guide_gray_f32, cv2.CV_32F, ksize)
    corr_Ip = cv2.boxFilter(guide_gray_f32 * src_f32, cv2.CV_32F, ksize)

    var_I = np.maximum(corr_I - mean_I * mean_I, 0.0)
    cov_Ip = corr_Ip - mean_I * mean_p

    a = cov_Ip / (var_I + eps)
    b = mean_p - a * mean_I

    mean_a = cv2.boxFilter(a, cv2.CV_32F, ksize)
    mean_b = cv2.boxFilter(b, cv2.CV_32F, ksize)
    return np.clip(mean_a * guide_gray_f32 + mean_b, 0.0, 1.0)


def segment_facade_wall(img_bytes: bytes) -> dict:
    start_ts = time.time()

    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    orig_w, orig_h = pil_img.size
    scale = min(1.0, MAX_DIM / max(orig_w, orig_h))
    w = max(128, int(round(orig_w * scale)))
    h = max(128, int(round(orig_h * scale)))
    if scale < 1.0:
        pil_work = pil_img.resize((w, h), Image.Resampling.LANCZOS)
    else:
        pil_work = pil_img

    rgb = np.array(pil_work, dtype=np.uint8)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)

    # 1) SegFormer-B2 ADE20K derin ogrenme cikarimi
    inputs = processor(images=pil_work, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits  # [1, 150, H/4, W/4]
        up_logits = torch.nn.functional.interpolate(
            logits, size=(h, w), mode="bilinear", align_corners=False
        )
        probs = torch.softmax(up_logits, dim=1)[0].cpu().numpy()  # [150, h, w]

    p_facade = np.sum(probs[FACADE_CLASSES], axis=0)
    p_exclude = np.sum(probs[EXCLUDE_CLASSES], axis=0)
    p_window = probs[8] + probs[14]  # windowpane + door

    # Temel bina siniri (sinir agi)
    building_raw = (p_facade > 0.36) & (p_exclude < 0.30)
    facade_pct = float(np.mean(building_raw) * 100.0)

    if facade_pct < 2.5:
        return {
            "ok": False,
            "isBuilding": False,
            "error": "Fotografta belirgin bir bina dis cephesi algilanamadi. Lutfen binayi karsidan goren net bir cephe fotografi yukleyin.",
            "processingMs": int((time.time() - start_ts) * 1000),
        }

    # 2) Pencere, cam, koyu golge, bitki ve cati temizligi (yuksek cozunurluk OpenCV)
    H_ch, S_ch, V_ch = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    B_ch, G_ch, R_ch = bgr[:, :, 0].astype(np.int16), bgr[:, :, 1].astype(np.int16), bgr[:, :, 2].astype(np.int16)
    L_ch, A_ch, Bb_ch = lab[:, :, 0], lab[:, :, 1], lab[:, :, 2]

    # Bitki/yaprak tasmasini ele
    is_veg = ((H_ch >= 28) & (H_ch <= 92) & (S_ch > 48)) | ((G_ch > R_ch + 12) & (G_ch > B_ch + 8))
    # Koyu pencere cami, panjur, klima, balkon boslugu, koyu kiremit/cati ele
    is_dark = V_ch < 74
    # Pencere camindaki parlak mavi gokyuzu yansimasi ele
    is_blue_glass = (H_ch >= 92) & (H_ch <= 132) & (S_ch > 46) & ((B_ch - R_ch) > 18)

    # Ic bina orneklem bolgesi (sinirlardan 4px iceride)
    eroded_bldg = cv2.erode(building_raw.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    sample_mask = eroded_bldg & (~is_veg) & (~is_dark) & (~is_blue_glass) & (p_window < 0.12)
    if np.sum(sample_mask) < 300:
        sample_mask = building_raw & (~is_veg) & (~is_dark)

    # 3) Lab renk uzayinda baskin dis cephe siva tonunu bul (aydinlik/golge ayni kume)
    sample_pts = np.stack([
        L_ch[sample_mask] * 0.35,  # parlaklik farkina toleransli (gunes + golge ayni duvar!)
        A_ch[sample_mask],
        Bb_ch[sample_mask],
    ], axis=1).astype(np.float32)

    if len(sample_pts) > 12000:
        idx = np.linspace(0, len(sample_pts) - 1, 12000, dtype=np.int32)
        sample_pts = sample_pts[idx]

    K = 3 if len(sample_pts) >= 600 else 1
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 15, 1.0)
    _, labels, centers = cv2.kmeans(sample_pts, K, None, criteria, 3, cv2.KMEANS_PP_CENTERS)

    counts = np.bincount(labels.flatten(), minlength=K)
    order = np.argsort(-counts)
    total_s = float(np.sum(counts))

    # Ana siva kumesini sec (+ cok renkli cepheyse %28 ustu ikinci acik/orta siva kumesini dahil et)
    kept_clusters = []
    for ci in order:
        ratio = counts[ci] / max(1.0, total_s)
        c_L = centers[ci][0] / 0.35
        c_A = centers[ci][1]
        c_B = centers[ci][2]
        # Cok koyu (cati/cam) veya cok mavi cam kumelerini alma
        if c_L < 85 and len(kept_clusters) >= 1:
            continue
        if len(kept_clusters) == 0 or (ratio >= 0.28 and c_L >= 95):
            kept_clusters.append((c_L, c_A, c_B))

    # Her pikselin secilen siva kumelerine chroma + parlaklik uzakligi
    plaster_match = np.zeros((h, w), dtype=bool)
    wall_is_blue = False
    for c_L, c_A, c_B in kept_clusters:
        if c_B < 118:
            wall_is_blue = True
        d_chroma = np.sqrt((A_ch - c_A) ** 2 + (Bb_ch - c_B) ** 2)
        d_lum_low = np.maximum(0.0, c_L - L_ch)
        d_lum_high = np.maximum(0.0, L_ch - c_L)
        # Acik renk duvarlarda koyu gri kiremit/catiyi (L~75..120) kesin koru
        lum_low_limit = 68.0 if c_L > 165.0 else 82.0
        min_L_guard = 102.0 if c_L > 165.0 else 72.0
        m = (d_chroma < 16.5) & (d_lum_low < lum_low_limit) & (d_lum_high < 65.0) & (L_ch > min_L_guard)
        plaster_match |= m

    if wall_is_blue:
        is_blue_glass = np.zeros((h, w), dtype=bool)

    wall_bin = building_raw & plaster_match & (~is_veg) & (~is_dark) & (~is_blue_glass) & (p_window < 0.12)

    # Kucuk gurultu noktalarini temizle + sadece cok kucuk delikleri (klima borusu/leke) kapat
    wall_u8 = (wall_bin.astype(np.uint8) * 255)
    wall_u8 = cv2.morphologyEx(wall_u8, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    wall_u8 = cv2.morphologyEx(wall_u8, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))

    # Kucuk bagimsiz parcalari (< %0.07 alan) temizle
    num_lbl, cc, stats, _ = cv2.connectedComponentsWithStats(wall_u8, connectivity=8)
    min_area = max(90, int(w * h * 0.0007))
    clean_u8 = np.zeros_like(wall_u8)
    for lid in range(1, num_lbl):
        if stats[lid, cv2.CC_STAT_AREA] >= min_area:
            clean_u8[cc == lid] = 255

    # 4) Guided Filter ile gercek goruntu kenarlarina jilet gibi oturt
    gray_f = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    soft_f = fast_guided_filter(gray_f, clean_u8.astype(np.float32) / 255.0, radius=5, eps=0.002)

    # Sadece kesin bina disi (gokyuzu/agac/pencere) piksellerini sertce 0 yap
    hard_out = (p_exclude > 0.45) | is_veg
    soft_f[hard_out] = 0.0

    # Kontrasti hafif keskinlestir (puslu yari-saydamlik azalsin)
    soft_f = np.clip((soft_f - 0.18) / 0.64, 0.0, 1.0)
    alpha_u8 = (soft_f * 255.0).astype(np.uint8)

    wall_pct = float(np.mean(alpha_u8 > 128) * 100.0)

    # PNG (tek kanal grayscale veya RGBA seffaf maske -> RGBA alpha olarak gonder)
    rgba_mask = np.zeros((h, w, 4), dtype=np.uint8)
    rgba_mask[:, :, :3] = 255
    rgba_mask[:, :, 3] = alpha_u8
    ok_enc, png_buf = cv2.imencode(".png", rgba_mask)
    if not ok_enc:
        raise RuntimeError("PNG maske kodlanamadi")

    mask_b64 = base64.b64encode(png_buf.tobytes()).decode("ascii")
    elapsed_ms = int((time.time() - start_ts) * 1000)

    return {
        "ok": True,
        "isBuilding": True,
        "width": w,
        "height": h,
        "facadePct": round(facade_pct, 1),
        "wallPct": round(wall_pct, 1),
        "processingMs": elapsed_ms,
        "wallMaskDataUrl": f"data:image/png;base64,{mask_b64}",
    }


class FacadeHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[FacadeAI] {self.address_string()} - {fmt % args}", flush=True)

    def _send_json(self, code: int, obj: dict):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self._send_json(200, {"ok": True, "model": MODEL_ID, "port": PORT})
        return self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        if self.path != "/mask":
            return self._send_json(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 12 * 1024 * 1024:
                return self._send_json(400, {"error": "Gecersiz gorsel boyutu."})
            raw = self.rfile.read(length)
            result = segment_facade_wall(raw)
            code = 200 if result.get("ok") else 422
            return self._send_json(code, result)
        except Exception as exc:
            print(f"[FacadeAI] Hata: {exc}", flush=True)
            return self._send_json(500, {"ok": False, "error": str(exc)})


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), FacadeHandler)
    print(f"[FacadeAI] Dinleniyor: http://127.0.0.1:{PORT}", flush=True)
    server.serve_forever()
