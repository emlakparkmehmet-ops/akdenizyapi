#!/usr/bin/env python3
"""Technical SEO, Schema.org JSON-LD, and GEO validation suite."""

import glob
import json
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND = os.path.join(ROOT, "frontend")

SKIP_META_FILES = {
    "404.html",
    "google104fca0d398f5179.html",
    "hizmet-detay.html",
    "referans-detay.html",
    "kepez-isi-yalitimi.html",
    "konyaalti-dis-cephe.html",
    "kvkk.html",
}

GEO_TLDR_PAGES = {
    "index.html",
    "antalya-mantolama-fiyatlari.html",
    "antalya-boya-badana.html",
    "antalya-cati-izolasyonu.html",
    "antalya-sove-kaplama.html",
    "dis-cephe-renkleri.html",
    "isi-yalitimi-antalya.html",
    "dis-cephe-boya-sarfiyati.html",
    "apartman-dis-cephe-dukkana-katilir-mi.html",
    "hizmetler.html",
    "kepez-mantolama.html",
    "muratpasa-mantolama.html",
    "konyaalti-mantolama.html",
    "dosemealti-mantolama.html",
    "aksu-mantolama.html",
    "lara-mantolama.html",
    "serik-isi-yalitimi.html",
    "kemer-mantolama.html",
    "manavgat-mantolama.html",
}


class SeoHtmlParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.title = []
        self.desc = ""
        self.canonical = ""
        self.og = set()
        self.tw = False
        self.h1_count = 0
        self.bad_imgs = []
        self.in_ld = False
        self.ld_buf = []
        self.ld_blocks = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "title":
            self.in_title = True
        elif tag == "meta":
            name = (d.get("name") or "").lower()
            prop = (d.get("property") or "").lower()
            if name == "description":
                self.desc = d.get("content", "")
            elif prop.startswith("og:"):
                self.og.add(prop)
            elif name == "twitter:card":
                self.tw = True
        elif tag == "link" and (d.get("rel") or "").lower() == "canonical":
            self.canonical = d.get("href", "")
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "img":
            alt = d.get("alt")
            aria_hidden = d.get("aria-hidden", "").lower() == "true"
            if alt is None or (alt.strip() == "" and not aria_hidden):
                self.bad_imgs.append(d.get("src", "?"))
        elif tag == "script" and (d.get("type") or "").lower() == "application/ld+json":
            self.in_ld = True
            self.ld_buf = []

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        elif tag == "script" and self.in_ld:
            self.in_ld = False
            self.ld_blocks.append("".join(self.ld_buf))

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if self.in_ld:
            self.ld_buf.append(data)


def validate_ld(block: str, fname: str, errors: list[str]) -> int:
    try:
        data = json.loads(block)
    except Exception as exc:
        errors.append(f"{fname}: Gecersiz JSON-LD ({exc})")
        return 0

    nodes = data.get("@graph", [data]) if isinstance(data, dict) else (data if isinstance(data, list) else [])
    if isinstance(data, dict) and "@context" not in data:
        errors.append(f"{fname}: JSON-LD @context eksik")

    count = 0
    for node in nodes:
        if not isinstance(node, dict):
            continue
        count += 1
        t = node.get("@type")
        if not t:
            errors.append(f"{fname}: JSON-LD dugumunde @type eksik")
            continue
        types = t if isinstance(t, list) else [t]
        if "FAQPage" in types and not node.get("mainEntity"):
            errors.append(f"{fname}: FAQPage mainEntity eksik")
        if "BreadcrumbList" in types and not node.get("itemListElement"):
            errors.append(f"{fname}: BreadcrumbList itemListElement eksik")
        if any(x in types for x in ("LocalBusiness", "HomeAndConstructionBusiness")):
            if not node.get("name") or not node.get("telephone") or not node.get("address"):
                errors.append(f"{fname}: LocalBusiness name/telephone/address eksik")
    return count


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    ld_total = 0

    html_files = sorted(glob.glob(os.path.join(FRONTEND, "*.html")))
    for path in html_files:
        fname = os.path.basename(path)
        raw = open(path, encoding="utf-8", errors="ignore").read()
        p = SeoHtmlParser()
        p.feed(raw)
        title = "".join(p.title).strip()

        for b in p.ld_blocks:
            ld_total += validate_ld(b, fname, errors)

        if p.bad_imgs:
            errors.append(f"{fname}: alt eksik gorseller: {p.bad_imgs}")

        if fname in GEO_TLDR_PAGES and 'class="geo-tldr' not in raw:
            errors.append(f"{fname}: GEO .geo-tldr (Kisa Ozet) blogu eksik")

        if fname in SKIP_META_FILES:
            continue

        if not (45 <= len(title) <= 65):
            warnings.append(f"{fname}: title uzunlugu {len(title)} krk (ideal 50-60)")
        if not (135 <= len(p.desc) <= 160):
            warnings.append(f"{fname}: description uzunlugu {len(p.desc)} krk (ideal 140-155)")
        if not p.canonical:
            errors.append(f"{fname}: canonical etiketi eksik")
        for req_og in ("og:title", "og:description", "og:image", "og:url", "og:type"):
            if req_og not in p.og:
                errors.append(f"{fname}: {req_og} eksik")
        if not p.tw:
            errors.append(f"{fname}: twitter:card eksik")
        if p.h1_count != 1:
            errors.append(f"{fname}: H1 sayisi {p.h1_count} (1 olmali)")

    for req_file in ("robots.txt", "llms.txt", "llms-full.txt", "a8f3d92c4e71b605f29a8c3d7e10b452.txt"):
        if not os.path.exists(os.path.join(FRONTEND, req_file)):
            errors.append(f"frontend/{req_file} dosyasi eksik")

    robots = open(os.path.join(FRONTEND, "robots.txt"), encoding="utf-8").read()
    for bot in ("GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Google-Extended", "ClaudeBot", "Sitemap:"):
        if bot not in robots:
            errors.append(f"robots.txt icinde {bot} eksik")

    print(f"Taranan HTML: {len(html_files)} | Dogrulanan JSON-LD dugumu: {ld_total}")
    if warnings:
        print(f"Uyarilar ({len(warnings)}):")
        for w in warnings:
            print(f"  [WARN] {w}")
    if errors:
        print(f"Hatalar ({len(errors)}):")
        for e in errors:
            print(f"  [FAIL] {e}")
        return 1

    print("[PASS] Tum teknik SEO, JSON-LD ve GEO kontrolleri gecti.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
