#!/usr/bin/env python3
"""Unified IndexNow (Bing/Yandex) + Google Indexing API submission CLI."""

import argparse
import json
import os
import sys
import urllib.request
import xml.etree.ElementTree as ET

SITE_HOST = "antalyadiscephe.com"
SITE_URL = f"https://{SITE_HOST}"
DEFAULT_INDEXNOW_KEY = "a8f3d92c4e71b605f29a8c3d7e10b452"
SITEMAP_URL = f"{SITE_URL}/sitemap.xml"

FALLBACK_URLS = [
    f"{SITE_URL}/",
    f"{SITE_URL}/antalya-mantolama-fiyatlari.html",
    f"{SITE_URL}/antalya-cati-izolasyonu.html",
    f"{SITE_URL}/antalya-boya-badana.html",
    f"{SITE_URL}/dis-cephe-renkleri.html",
    f"{SITE_URL}/antalya-sove-kaplama.html",
    f"{SITE_URL}/hizmetler.html",
    f"{SITE_URL}/referanslar.html",
    f"{SITE_URL}/kampanyalar.html",
    f"{SITE_URL}/isi-yalitimi-antalya.html",
    f"{SITE_URL}/kepez-mantolama.html",
    f"{SITE_URL}/muratpasa-mantolama.html",
    f"{SITE_URL}/konyaalti-mantolama.html",
    f"{SITE_URL}/dosemealti-mantolama.html",
    f"{SITE_URL}/aksu-mantolama.html",
    f"{SITE_URL}/lara-mantolama.html",
    f"{SITE_URL}/serik-isi-yalitimi.html",
    f"{SITE_URL}/kemer-mantolama.html",
    f"{SITE_URL}/manavgat-mantolama.html",
    f"{SITE_URL}/iletisim.html",
]


def fetch_sitemap_urls(sitemap_url: str) -> list[str]:
    """Fetch canonical URLs from sitemap.xml, falling back to static list on error."""
    try:
        req = urllib.request.Request(
            sitemap_url,
            headers={"User-Agent": "AkdenizYapi-IndexingBot/1.0"},
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            xml_data = resp.read()
        root = ET.fromstring(xml_data)
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        urls = [el.text.strip() for el in root.findall(".//sm:loc", ns) if el.text]
        return urls or FALLBACK_URLS
    except Exception as exc:
        print(f"[WARN] Sitemap okunamadi ({exc}), yedek URL listesi kullaniliyor.")
        return FALLBACK_URLS


def submit_indexnow(urls: list[str], key: str, dry_run: bool = False) -> bool:
    """Submit URL batch to api.indexnow.org (Bing, Yandex, Seznam, Naver)."""
    payload = {
        "host": SITE_HOST,
        "key": key,
        "keyLocation": f"{SITE_URL}/{key}.txt",
        "urlList": urls,
    }
    if dry_run:
        print(f"[DRY-RUN][IndexNow] {len(urls)} URL hazir: keyLocation={payload['keyLocation']}")
        return True

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            print(f"[OK][IndexNow] HTTP {resp.status} — {len(urls)} URL gonderildi.")
            return resp.status in (200, 202)
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="ignore")
        print(f"[ERR][IndexNow] HTTP {err.code}: {body}")
        return False
    except Exception as exc:
        print(f"[ERR][IndexNow] Baglanti hatasi: {exc}")
        return False


def submit_google_indexing(urls: list[str], key_file: str, dry_run: bool = False) -> None:
    """Submit URLs via Google Indexing API using service_account.json."""
    if dry_run:
        print(f"[DRY-RUN][Google] {len(urls)} URL hazir (key_file={key_file}).")
        return
    if not os.path.exists(key_file):
        print(f"[ERR][Google] {key_file} bulunamadi.")
        return

    import requests
    from google.auth.transport.requests import Request
    from google.oauth2 import service_account

    creds = service_account.Credentials.from_service_account_file(
        key_file, scopes=["https://www.googleapis.com/auth/indexing"]
    )
    creds.refresh(Request())
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {creds.token}",
    }
    endpoint = "https://indexing.googleapis.com/v3/urlNotifications:publish"
    ok_count = 0
    for url in urls:
        resp = requests.post(
            endpoint,
            data=json.dumps({"url": url, "type": "URL_UPDATED"}),
            headers=headers,
            timeout=15,
        )
        if resp.status_code == 200:
            ok_count += 1
        else:
            print(f"[ERR][Google] {resp.status_code} {url}: {resp.text}")
    print(f"[OK][Google] {ok_count}/{len(urls)} URL bildirildi.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Akdeniz Yapi IndexNow & Google Indexing CLI")
    parser.add_argument("--indexnow", action="store_true", help="IndexNow API'ye gonder")
    parser.add_argument("--google", action="store_true", help="Google Indexing API'ye gonder")
    parser.add_argument("--all", action="store_true", help="Hem IndexNow hem Google'a gonder")
    parser.add_argument("--url", action="append", help="Tekil URL gonder (tekrarlanabilir)")
    parser.add_argument("--dry-run", action="store_true", help="Istek atmadan ciktiyi dogrula")
    args = parser.parse_args()

    run_indexnow = args.indexnow or args.all or (not args.google)
    run_google = args.google or args.all

    urls = args.url if args.url else fetch_sitemap_urls(SITEMAP_URL)
    indexnow_key = os.environ.get("INDEXNOW_KEY", DEFAULT_INDEXNOW_KEY).strip()
    key_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "service_account.json")

    ok = True
    if run_indexnow:
        ok = submit_indexnow(urls, indexnow_key, dry_run=args.dry_run) and ok
    if run_google:
        submit_google_indexing(urls, key_file, dry_run=args.dry_run)

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
