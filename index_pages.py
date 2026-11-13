import json
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

# Service account credentials file
KEY_FILE = "service_account.json"
SCOPES = ["https://www.googleapis.com/auth/indexing"]

urls_to_index = [
    "https://antalyadiscephe.com/",
    "https://antalyadiscephe.com/antalya-mantolama-fiyatlari.html",
    "https://antalyadiscephe.com/antalya-cati-izolasyonu.html",
    "https://antalyadiscephe.com/antalya-boya-badana.html",
    "https://antalyadiscephe.com/dis-cephe-renkleri.html",
    "https://antalyadiscephe.com/antalya-sove-kaplama.html",
    "https://antalyadiscephe.com/hizmetler.html",
    "https://antalyadiscephe.com/referanslar.html",
    "https://antalyadiscephe.com/kampanyalar.html",
    "https://antalyadiscephe.com/iletisim.html",
    "https://antalyadiscephe.com/isi-yalitimi-antalya.html",
    "https://antalyadiscephe.com/muratpasa-mantolama.html",
    "https://antalyadiscephe.com/konyaalti-dis-cephe.html",
    "https://antalyadiscephe.com/kepez-isi-yalitimi.html",
    "https://antalyadiscephe.com/lara-mantolama.html",
    "https://antalyadiscephe.com/dosemealti-mantolama.html",
    "https://antalyadiscephe.com/aksu-mantolama.html",
    "https://antalyadiscephe.com/serik-isi-yalitimi.html",
    "https://antalyadiscephe.com/hizmetler/dis-cephe-isi-yalitimi",
    "https://antalyadiscephe.com/hizmetler/mineral-siva",
    "https://antalyadiscephe.com/hizmetler/su-yalitimi-termal",
    "https://antalyadiscephe.com/hizmetler/ic-dis-cephe-boyasi",
    "https://antalyadiscephe.com/hizmetler/alci-kartonpiyer",
    "https://antalyadiscephe.com/hizmetler/cati-onarim",
    "https://antalyadiscephe.com/hizmetler/seramik-mermer-doseme",
    "https://antalyadiscephe.com/hizmetler/komple-tadilat",
]

def main():
    print("Google Indexing API kimlik doğrulaması yapılıyor...")
    creds = service_account.Credentials.from_service_account_file(
        KEY_FILE, scopes=SCOPES
    )
    creds.refresh(Request())
    token = creds.token
    print("Access token alındı!\n")

    endpoint = "https://indexing.googleapis.com/v3/urlNotifications:publish"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    success_count = 0
    fail_count = 0

    for url in urls_to_index:
        content = {
            "url": url,
            "type": "URL_UPDATED"
        }
        response = requests.post(endpoint, data=json.dumps(content), headers=headers)
        if response.status_code == 200:
            print(f"[BAŞARILI] Bildirildi: {url}")
            success_count += 1
        else:
            print(f"[HATA {response.status_code}] {url} -> {response.text}")
            fail_count += 1

    print(f"\n--- İŞLEM TAMAMLANDI ---")
    print(f"Başarılı: {success_count} / {len(urls_to_index)}")
    print(f"Başarısız: {fail_count} / {len(urls_to_index)}")

if __name__ == "__main__":
    main()
