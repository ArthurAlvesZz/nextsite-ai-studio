"""
Shopify Lead Scraper
Encontra e qualifica leads em lojas Shopify usando endpoints públicos.
"""

import asyncio
import json
import csv
import re
import sys
import logging
import argparse
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse

import aiohttp
import pandas as pd
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
class SimpleLogger:
    def _ts(self):
        return datetime.utcnow().strftime("%H:%M:%S")
    def info(self, msg, *args):
        m = msg % args if args else msg
        print(f"[{self._ts()}] [INFO] {m}", flush=True)
    def warning(self, msg, *args):
        m = msg % args if args else msg
        print(f"[{self._ts()}] [WARN] {m}", flush=True)
    def error(self, msg, *args):
        m = msg % args if args else msg
        print(f"[{self._ts()}] [ERRO] {m}", flush=True)

log = SimpleLogger()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
RATE_LIMIT_SECONDS = 2.0          # pause between requests per store
REQUEST_TIMEOUT    = 15           # seconds
MAX_PRODUCTS_PAGE  = 250          # Shopify max per page
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
}

# Regexes
EMAIL_RE     = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
WHATSAPP_RE  = re.compile(
    r"(?:whatsapp|whats|wpp|wa\.me)[^\d]{0,10}(\d[\d\s\-().]{7,20}\d)",
    re.IGNORECASE,
)
PHONE_RE     = re.compile(r"(?<!\d)(\+?55[\s\-]?)?(\(?\d{2}\)?)[\s\-]?(\d{4,5}[\s\-]?\d{4})(?!\d)")
INSTAGRAM_RE = re.compile(
    r"(?:instagram\.com/|@)([\w.]{1,30})", re.IGNORECASE
)
FB_PIXEL_RE  = re.compile(
    r"fbq\s*\(|facebook\.com/tr|connect\.facebook\.net", re.IGNORECASE
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def normalise_url(url: str) -> str:
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


def load_store_urls(path: str) -> list[str]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {path}")

    urls: list[str] = []
    if p.suffix.lower() == ".csv":
        df = pd.read_csv(p, header=None)
        # tenta encontrar coluna com 'url' no nome, senão usa a primeira
        col = next(
            (c for c in df.columns if "url" in str(c).lower()), df.columns[0]
        )
        urls = df[col].dropna().astype(str).tolist()
    else:
        urls = [l.strip() for l in p.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")]

    return [normalise_url(u) for u in urls if u]


# ---------------------------------------------------------------------------
# Core scraping functions
# ---------------------------------------------------------------------------

async def fetch(session: aiohttp.ClientSession, url: str) -> tuple[int, str | None]:
    """Retorna (status_code, body_text | None)."""
    try:
        async with session.get(url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)) as resp:
            if resp.status == 200:
                text = await resp.text(errors="replace")
                return resp.status, text
            return resp.status, None
    except asyncio.TimeoutError:
        log.warning("Timeout: %s", url)
        return 0, None
    except aiohttp.ClientError as exc:
        log.warning("Erro de conexão em %s: %s", url, exc)
        return 0, None
    except Exception as exc:
        log.warning("Erro inesperado em %s: %s", url, exc)
        return 0, None


async def get_products(session: aiohttp.ClientSession, base_url: str) -> dict:
    """
    Busca /products.json (paginado).
    Retorna {'total': int, 'has_video': bool, 'max_price': float, 'products_ok': bool}
    """
    products = []
    page = 1
    while True:
        url = f"{base_url}/products.json?limit={MAX_PRODUCTS_PAGE}&page={page}"
        status, body = await fetch(session, url)
        if status != 200 or not body:
            if page == 1:
                return {"total": 0, "has_video": False, "max_price": 0.0, "products_ok": False}
            break
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            break

        batch = data.get("products", [])
        if not batch:
            break
        products.extend(batch)
        if len(batch) < MAX_PRODUCTS_PAGE:
            break
        page += 1
        await asyncio.sleep(RATE_LIMIT_SECONDS)

    has_video = _check_video(products)
    max_price  = _max_price(products)
    return {
        "total": len(products),
        "has_video": has_video,
        "max_price": max_price,
        "products_ok": True,
    }


def _check_video(products: list) -> bool:
    for p in products:
        # campo 'media' (Shopify 2.0+)
        for m in p.get("media", []):
            if m.get("media_type") in ("video", "external_video"):
                return True
        # campo legado
        if p.get("video"):
            return True
        # verifica nas variantes / imagens com extensão de vídeo
        for img in p.get("images", []):
            src = img.get("src", "")
            if any(src.lower().endswith(ext) for ext in (".mp4", ".mov", ".webm")):
                return True
    return False


def _max_price(products: list) -> float:
    max_p = 0.0
    for p in products:
        for v in p.get("variants", []):
            try:
                price = float(v.get("price", 0) or 0)
                if price > max_p:
                    max_p = price
            except (ValueError, TypeError):
                pass
    return max_p


async def get_contact_info(session: aiohttp.ClientSession, base_url: str) -> dict:
    """
    Raspa homepage + /pages/contato (e variações) em busca de email,
    Instagram, WhatsApp e Facebook Pixel.
    """
    result = {
        "email": None,
        "instagram": None,
        "whatsapp": None,
        "pixel_facebook": False,
        "store_name": None,
    }

    pages_to_check = [
        base_url,
        f"{base_url}/pages/contato",
        f"{base_url}/pages/contact",
        f"{base_url}/pages/sobre",
        f"{base_url}/pages/about",
    ]

    found_emails: set[str] = set()
    found_ig: set[str]     = set()
    found_wa: set[str]     = set()

    for url in pages_to_check:
        status, body = await fetch(session, url)
        if status != 200 or not body:
            await asyncio.sleep(RATE_LIMIT_SECONDS)
            continue

        soup = BeautifulSoup(body, "html.parser")

        # Store name from <title>
        if result["store_name"] is None:
            title_tag = soup.find("title")
            if title_tag:
                result["store_name"] = title_tag.get_text(strip=True).split("|")[0].strip()

        # Facebook Pixel
        if not result["pixel_facebook"] and FB_PIXEL_RE.search(body):
            result["pixel_facebook"] = True

        # Email – prioriza links mailto, depois texto livre
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("mailto:"):
                email = href.replace("mailto:", "").split("?")[0].strip().lower()
                if email:
                    found_emails.add(email)

        for m in EMAIL_RE.finditer(body):
            e = m.group().lower()
            if not any(skip in e for skip in ("example.", "sentry.", ".png", ".jpg", ".gif", "noreply", "no-reply")):
                found_emails.add(e)

        # Instagram
        for m in INSTAGRAM_RE.finditer(body):
            handle = m.group(1).lower()
            if len(handle) > 1 and handle not in ("p", "reel", "stories", "explore"):
                found_ig.add(handle)

        # WhatsApp – links wa.me ou texto
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "wa.me" in href or "api.whatsapp.com" in href:
                digits = re.sub(r"\D", "", href)
                if 8 <= len(digits) <= 15:
                    found_wa.add(digits)

        for m in WHATSAPP_RE.finditer(body):
            digits = re.sub(r"\D", "", m.group(1))
            if 8 <= len(digits) <= 15:
                found_wa.add(digits)

        await asyncio.sleep(RATE_LIMIT_SECONDS)

    if found_emails:
        result["email"] = sorted(found_emails)[0]
    if found_ig:
        handle = sorted(found_ig, key=len)[0]
        result["instagram"] = f"https://instagram.com/{handle}"
    if found_wa:
        result["whatsapp"] = sorted(found_wa, key=len)[-1]

    return result


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def calculate_score(data: dict) -> int:
    score = 0
    if not data.get("has_video"):
        score += 25                              # sem vídeo → oportunidade
    if data.get("total_produtos", 0) > 20:
        score += 15                              # loja ativa
    if data.get("instagram"):
        score += 10
    if data.get("email"):
        score += 10
    if data.get("pixel_facebook"):
        score += 30                              # roda ads
    if data.get("max_price", 0) > 100:
        score += 10                              # ticket alto
    return min(score, 100)


# ---------------------------------------------------------------------------
# Main scraper orchestrator
# ---------------------------------------------------------------------------

async def scrape_store(session: aiohttp.ClientSession, store_url: str) -> dict:
    log.info("Processando: %s", store_url)

    products_data = await get_products(session, store_url)
    await asyncio.sleep(RATE_LIMIT_SECONDS)
    contact_data  = await get_contact_info(session, store_url)

    row = {
        "loja_url":       store_url,
        "nome_loja":      contact_data.get("store_name") or urlparse(store_url).netloc,
        "total_produtos": products_data["total"],
        "tem_video":      products_data["has_video"],
        "max_price":      products_data["max_price"],
        "products_ok":    products_data["products_ok"],
        "email":          contact_data.get("email"),
        "instagram":      contact_data.get("instagram"),
        "whatsapp":       contact_data.get("whatsapp"),
        "pixel_facebook": contact_data.get("pixel_facebook", False),
        "data_coleta":    datetime.utcnow().isoformat(timespec="seconds") + "Z",
    }
    row["score"] = calculate_score(row)

    log.info(
        "  → %s | produtos=%d | vídeo=%s | pixel=%s | score=%d",
        row["nome_loja"],
        row["total_produtos"],
        row["tem_video"],
        row["pixel_facebook"],
        row["score"],
    )
    return row


async def run_scraper(urls: list[str], output_dir: Path) -> list[dict]:
    results: list[dict] = []

    connector = aiohttp.TCPConnector(limit=5, ssl=False)
    async with aiohttp.ClientSession(connector=connector) as session:
        for url in urls:
            try:
                row = await scrape_store(session, url)
            except Exception as exc:
                log.error("Falha crítica em %s: %s", url, exc)
                row = {
                    "loja_url": url, "nome_loja": None, "total_produtos": 0,
                    "tem_video": False, "max_price": 0, "products_ok": False,
                    "email": None, "instagram": None, "whatsapp": None,
                    "pixel_facebook": False, "score": 0,
                    "data_coleta": datetime.utcnow().isoformat(timespec="seconds") + "Z",
                    "erro": str(exc),
                }
            results.append(row)
            # Rate limiting entre lojas
            await asyncio.sleep(RATE_LIMIT_SECONDS)

    return results


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

CSV_COLUMNS = [
    "loja_url", "nome_loja", "total_produtos", "tem_video",
    "email", "instagram", "whatsapp", "pixel_facebook",
    "score", "data_coleta",
]


def save_results(results: list[dict], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    # JSON (dados completos)
    json_path = output_dir / f"leads_{ts}.json"
    json_path.write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log.info("JSON salvo: %s", json_path)

    # CSV (colunas padronizadas)
    csv_path = output_dir / f"leads_{ts}.csv"
    with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)
    log.info("CSV salvo: %s", csv_path)

    # Resumo no terminal
    df = pd.DataFrame(results)
    print("\n" + "=" * 60)
    print(f"  RESUMO — {len(results)} lojas analisadas")
    print("=" * 60)
    if not df.empty:
        print(f"  Score médio        : {df['score'].mean():.1f}")
        print(f"  Sem vídeo          : {(~df['tem_video']).sum()}")
        print(f"  Com pixel Facebook : {df['pixel_facebook'].sum()}")
        print(f"  Com email          : {df['email'].notna().sum()}")
        print(f"  Com Instagram      : {df['instagram'].notna().sum()}")
        top = df.nlargest(5, "score")[["nome_loja", "score", "email", "instagram"]]
        print("\n  TOP 5 LEADS:")
        print(top.to_string(index=False))
    print("=" * 60 + "\n")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Shopify Lead Scraper – qualifica lojas Shopify como leads."
    )
    p.add_argument(
        "input",
        help="Arquivo .txt ou .csv com URLs das lojas (uma por linha)",
    )
    p.add_argument(
        "-o", "--output",
        default="./output",
        help="Diretório de saída para JSON e CSV (default: ./output)",
    )
    p.add_argument(
        "--rate-limit",
        type=float,
        default=RATE_LIMIT_SECONDS,
        help=f"Segundos entre requests (default: {RATE_LIMIT_SECONDS})",
    )
    return p


def main() -> None:
    parser = build_arg_parser()
    args   = parser.parse_args()

    global RATE_LIMIT_SECONDS
    RATE_LIMIT_SECONDS = args.rate_limit

    try:
        urls = load_store_urls(args.input)
    except FileNotFoundError as exc:
        log.error(exc)
        sys.exit(1)

    if not urls:
        log.error("Nenhuma URL válida encontrada em %s", args.input)
        sys.exit(1)

    log.info("Iniciando scraping de %d lojas...", len(urls))

    results = asyncio.run(run_scraper(urls, Path(args.output)))
    save_results(results, Path(args.output))


if __name__ == "__main__":
    main()
