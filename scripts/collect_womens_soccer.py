#!/usr/bin/env python3
"""Collect verified women's soccer programs for CollegeMatch.

Reads the final-poll seed list in scripts/data/womens-soccer-seeds.json.
For each school it:

1. Matches College Scorecard's most recent institution file (enrollment,
   acceptance rate, average net price, locale, SAT/ACT, city, state).
2. Finds the women's soccer page from the school's Wikipedia article, then
   fetches that official athletics page.
3. Reads coaches, emails, the roster, Instagram, and a recruiting
   questionnaire only from that fetched page.

Anything it cannot verify is left null. Re-run after each season:

    python3 scripts/collect_womens_soccer.py

The Scorecard zip is cached under scripts/cache/, which is gitignored.
Pass --only id,id to retry a few schools.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import ssl
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEEDS_PATH = ROOT / "scripts" / "data" / "womens-soccer-seeds.json"
CACHE = ROOT / "scripts" / "cache"
SCORECARD_ZIP_URL = (
    "https://ed-public-download.scorecard.network/downloads/"
    "Most-Recent-Cohorts-Institution_06102026.zip"
)
SCORECARD_PAGE = "https://collegescorecard.ed.gov/data/"
OUT_PATH = ROOT / "mobile" / "src" / "data" / "real" / "programs.json"
REPORT_PATH = ROOT / "scripts" / "data" / "collect-report.json"
LAST_VERIFIED = "2026-10-10"
# Some public athletics sites answer 403 unless the client looks like a browser.
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)
FETCH_LOCK = threading.Lock()

POSITIONS = ("GK", "CB", "FB", "DM", "CM", "W", "ST")
REVIVERS = {
    "Reactive",
    "ShallowReactive",
    "Ref",
    "ShallowRef",
    "EmptyRef",
    "EmptyShallowRef",
    "Set",
    "Map",
    "Date",
    "NuxtError",
}
COACH_TITLE = re.compile(r"coach|recruiting coordinator", re.I)
COACH_SKIP = re.compile(
    r"volunteer|intern|student manager|director of operations|video|trainer|"
    r"strength|academic|equipment|marketing|communications|compliance|"
    r"athletic trainer|operations intern",
    re.I,
)
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
INSTAGRAM_SKIP = {
    "p",
    "reel",
    "reels",
    "explore",
    "stories",
    "accounts",
    "about",
    "legal",
    "share",
    "tv",
    "directory",
    "prestosports",
    "sidearmsports",
}


def fetch(url: str, timeout: int = 25) -> tuple[int, str, str]:
    """Return status, final URL, and body. Caches successful HTML/JSON bodies."""
    key = hashlib.sha256(url.encode()).hexdigest()[:24]
    cache_path = CACHE / "http" / f"{key}.txt"
    meta_path = CACHE / "http" / f"{key}.meta"
    with FETCH_LOCK:
        if cache_path.exists() and meta_path.exists():
            meta = json.loads(meta_path.read_text())
            return int(meta["status"]), meta["url"], cache_path.read_text(errors="replace")
    request = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/json;q=0.9,*/*;q=0.8"},
    )
    context = ssl.create_default_context()
    try:
        with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
            status = getattr(response, "status", 200)
            final = response.geturl()
            raw = response.read()
            charset = response.headers.get_content_charset() or "utf-8"
            body = raw.decode(charset, errors="replace")
    except urllib.error.HTTPError as error:
        status = error.code
        final = url
        body = error.read().decode("utf-8", errors="replace")
    except Exception as error:  # noqa: BLE001 - keep collecting the rest of the list
        return 0, url, f"ERROR {error}"
    if status in {200, 404, 410} and not body.startswith("ERROR"):
        with FETCH_LOCK:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_text(body)
            meta_path.write_text(json.dumps({"status": status, "url": final}))
    return status, final, body


def ensure_scorecard() -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    zip_path = CACHE / "Most-Recent-Cohorts-Institution_06102026.zip"
    csv_path = CACHE / "Most-Recent-Cohorts-Institution.csv"
    if csv_path.exists():
        return csv_path
    if not zip_path.exists():
        print("Downloading College Scorecard institution file...")
        request = urllib.request.Request(SCORECARD_ZIP_URL, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=120) as response:
            zip_path.write_bytes(response.read())
    with zipfile.ZipFile(zip_path) as archive:
        name = next(item for item in archive.namelist() if item.endswith(".csv") and not item.startswith("__"))
        csv_path.write_bytes(archive.read(name))
    return csv_path


def load_scorecard(path: Path) -> list[dict[str, str]]:
    fields = [
        "UNITID",
        "INSTNM",
        "CITY",
        "STABBR",
        "INSTURL",
        "NPCURL",
        "UGDS",
        "ADM_RATE",
        "NPT4_PUB",
        "NPT4_PRIV",
        "LOCALE",
        "SAT_AVG",
        "ACTCMMID",
        "CONTROL",
    ]
    rows: list[dict[str, str]] = []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append({field: (row.get(field) or "").strip() for field in fields})
    return rows


def norm(value: str) -> str:
    value = value.lower().replace("&", " and ")
    value = value.replace("st.", "saint").replace("st ", "saint ")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def number(value: str) -> float | None:
    if not value or value.upper() in {"NULL", "PRIVACYSUPPRESSED", "NA", "N/A"}:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def match_scorecard(seed: dict, rows: list[dict[str, str]]) -> tuple[dict | None, str]:
    target_name = seed.get("scorecardName")
    if not target_name:
        return None, seed.get("gap") or "No Scorecard match requested."
    target = norm(target_name)
    state = seed.get("state")
    city = norm(seed.get("cityHint") or "")
    exact = [row for row in rows if norm(row["INSTNM"]) == target]
    hits = exact or [row for row in rows if target in norm(row["INSTNM"])]
    if state:
        in_state = [row for row in hits if row["STABBR"] == state]
        if in_state:
            hits = in_state
    if city and len(hits) > 1:
        in_city = [row for row in hits if norm(row["CITY"]) == city or city in norm(row["CITY"])]
        if in_city:
            hits = in_city
    if len(hits) == 1:
        return hits[0], ""
    if not hits:
        return None, f"No Scorecard row for {target_name}."
    names = ", ".join(f"{row['INSTNM']} ({row['CITY']}, {row['STABBR']})" for row in hits[:6])
    return None, f"Ambiguous Scorecard match for {target_name}: {names}."


def scorecard_facts(row: dict[str, str]) -> dict:
    control = row.get("CONTROL")
    public_price = number(row.get("NPT4_PUB", ""))
    private_price = number(row.get("NPT4_PRIV", ""))
    if control == "1":
        net = public_price if public_price is not None else private_price
    else:
        net = private_price if private_price is not None else public_price
    locale = number(row.get("LOCALE", ""))
    campus: list[str] = []
    if locale is not None and int(locale) in {11, 12, 13}:
        campus.append("city")
    unit = row["UNITID"]
    inst_url = row.get("INSTURL") or ""
    if inst_url and not inst_url.startswith("http"):
        inst_url = "https://" + inst_url
    return {
        "unitid": unit,
        "city": row["CITY"],
        "state": row["STABBR"],
        "enrollment": int(number(row["UGDS"])) if number(row["UGDS"]) is not None else None,
        "acceptanceRate": number(row["ADM_RATE"]),
        "estimatedNetCost": int(round(net)) if net is not None else None,
        "sat": int(number(row["SAT_AVG"])) if number(row["SAT_AVG"]) is not None else None,
        "act": int(number(row["ACTCMMID"])) if number(row["ACTCMMID"]) is not None else None,
        "campusLife": campus,
        "admissionsUrl": inst_url or None,
        "costUrl": f"https://collegescorecard.ed.gov/school/?{unit}",
        "locale": int(locale) if locale is not None else None,
    }


def revive_nuxt(payload: list) -> object:
    refs: list = [None] * len(payload)
    seen = [False] * len(payload)

    def revive(index: int):
        if not isinstance(index, int) or index < 0 or index >= len(payload):
            return None
        if seen[index]:
            return refs[index]
        seen[index] = True
        value = payload[index]
        if value is None or not isinstance(value, (dict, list)):
            refs[index] = value
            return value
        if isinstance(value, list):
            if value and isinstance(value[0], str) and value[0] in REVIVERS:
                data = revive(value[1]) if len(value) > 1 and isinstance(value[1], int) else None
                refs[index] = data
                return data
            arr: list = []
            refs[index] = arr
            for item in value:
                arr.append(revive(item) if isinstance(item, int) else item)
            return arr
        obj: dict = {}
        refs[index] = obj
        for key, item in value.items():
            obj[key] = revive(item) if isinstance(item, int) else item
        return obj

    return revive(0)


def find_roster_block(node: object) -> dict | None:
    if not isinstance(node, dict):
        return None
    pinia = node.get("pinia") if isinstance(node.get("pinia"), dict) else None
    roster = pinia.get("roster") if pinia else None
    book = roster.get("roster") if isinstance(roster, dict) else None
    if isinstance(book, dict):
        for value in book.values():
            if isinstance(value, dict) and isinstance(value.get("players"), list):
                return value
    return None


def map_position(short: str | None, long: str | None) -> str | None:
    text = (long or "").split("/")[0].strip().lower()
    code = (short or "").split("/")[0].strip().upper()
    if "goalkeeper" in text or code in {"GK", "G"}:
        return "GK"
    if "center back" in text or "centre back" in text or code == "CB":
        return "CB"
    if any(word in text for word in ("fullback", "outside back", "wing back", "wingback")) or code in {"FB", "WB", "OB"}:
        return "FB"
    if "defensive mid" in text or code in {"DM", "CDM"}:
        return "DM"
    if "winger" in text or text == "wing" or code == "W":
        return "W"
    if "striker" in text or "forward" in text or code in {"F", "FW", "ST"}:
        return "ST"
    if "midfielder" in text or text == "midfield" or code in {"MF", "M", "CM", "AM"}:
        return "CM"
    return None


def is_graduating(short: str | None, long: str | None) -> bool:
    text = f"{short or ''} {long or ''}".lower()
    # "4th year" is the class label some NAIA sites print instead of senior.
    return bool(re.search(r"senior|graduate|fifth|5th|\b4th\b|fourth|\bgr\b|\bsr\b", text))


def roster_counts(players: list[dict]) -> tuple[list[dict], str | None]:
    buckets = {position: {"count": 0, "graduating": 0} for position in POSITIONS}
    mapped = 0
    for player in players:
        if not isinstance(player, dict):
            continue
        position = map_position(player.get("positionShort"), player.get("positionLong"))
        if position is None:
            continue
        mapped += 1
        buckets[position]["count"] += 1
        if is_graduating(player.get("academicYearShort"), player.get("academicYearLong")):
            buckets[position]["graduating"] += 1
    rows = [
        {"position": position, "count": buckets[position]["count"], "graduating": buckets[position]["graduating"]}
        for position in POSITIONS
        if buckets[position]["count"] > 0
    ]
    note = None
    numbered = any(
        re.search(
            r"\b4th\b",
            f"{player.get('academicYearShort') or ''} {player.get('academicYearLong') or ''}",
            flags=re.I,
        )
        for player in players
        if isinstance(player, dict)
    )
    if players and mapped < len(players):
        note = (
            f"Roster positions on the athletics site are broader than the app's spots. "
            f"{mapped} of {len(players)} players mapped; generic defenders were left off the meter."
        )
    if numbered:
        extra = " Numbered class years treat 4th year as graduating."
        note = (note or "") + extra
    if not rows:
        return [], "Roster page did not include position and class-year counts."
    if len(players) < 8 or len(players) > 50:
        return [], f"Roster parse looked wrong ({len(players)} players), so counts were left empty."
    return rows, note


def coaches_from_block(block: dict) -> list[dict]:
    people = []
    for key in ("coaches", "support"):
        for person in block.get(key) or []:
            if isinstance(person, dict):
                people.append(person)
    kept: list[dict] = []
    seen: set[str] = set()
    for person in people:
        title = (person.get("title") or "").strip()
        if not title or not COACH_TITLE.search(title) or COACH_SKIP.search(title):
            continue
        first = (person.get("firstName") or "").strip()
        last = (person.get("lastName") or "").strip()
        name = " ".join(part for part in (first, last) if part)
        if len(name.split()) < 2:
            continue
        email = (person.get("email") or "").strip()
        if not EMAIL_RE.match(email) or email.lower().endswith(".example.com"):
            email = ""
        identity = name.lower()
        if identity in seen:
            continue
        seen.add(identity)
        kept.append({"name": name, "title": title, "email": email or None})
    head = [coach for coach in kept if re.search(r"head coach", coach["title"], re.I)]
    rest = [coach for coach in kept if coach not in head]
    return (head + rest)[:6]


def extract_handle(raw: str) -> str | None:
    raw = raw.strip()
    if raw.startswith("//"):
        raw = "https:" + raw
    path = urllib.parse.urlparse(raw).path
    parts = [part for part in path.split("/") if part]
    if not parts:
        return None
    handle = parts[0].strip().lstrip("@")
    if handle.lower() in INSTAGRAM_SKIP or "instagram" in handle.lower():
        return None
    if not re.fullmatch(r"[A-Za-z0-9._]{2,30}", handle):
        return None
    return handle


def only_handle(handles: list[str]) -> str | None:
    unique = list(dict.fromkeys(handles))
    if len(unique) == 1:
        return unique[0]
    return None


def instagram_handle(html: str, page_url: str = "") -> str | None:
    import html as html_lib

    associated: list[str] = []
    for blob in re.findall(r"window\.associated_sport\s*=\s*(\{.*?\});", html):
        try:
            sport = json.loads(blob)
        except json.JSONDecodeError:
            continue
        title = str(sport.get("title") or "")
        if not re.search(r"women.?s soccer", title, flags=re.I):
            continue
        handle = extract_handle("https://instagram.com/" + str(sport.get("instagram") or ""))
        if handle:
            associated.append(handle)
    if associated:
        return only_handle(associated)

    labeled: list[str] = []
    for tag in re.findall(r"<a\b[^>]*>", html, flags=re.I):
        href = re.search(r'href=["\']([^"\']+)["\']', tag, flags=re.I)
        aria = re.search(r'aria-label=["\']([^"\']+)["\']', tag, flags=re.I)
        if not href or "instagram.com" not in href.group(1).lower():
            continue
        label = html_lib.unescape(aria.group(1)) if aria else ""
        if not re.search(r"women.?s soccer", label, flags=re.I):
            continue
        handle = extract_handle(href.group(1))
        if handle:
            labeled.append(handle)
    if labeled:
        return only_handle(labeled)

    menu: list[str] = []
    for match in re.finditer(r'<a\b[^>]*href=["\']([^"\']*instagram\.com[^"\']*)["\']', html, flags=re.I):
        before = html[max(0, match.start() - 800) : match.start()]
        if "social-menu" not in before and "sport-menu__social" not in before:
            continue
        sports = re.findall(r"/sports/([a-z0-9-]+)", before, flags=re.I)
        if not sports or not re.fullmatch(r"womens?-soccer|women-s-soccer|w-soccer|wsoc", sports[-1], flags=re.I):
            continue
        handle = extract_handle(match.group(1))
        if handle:
            menu.append(handle)
    if menu:
        return only_handle(menu)

    listed: list[str] = []
    sport_href = re.compile(r"/sports/(?:womens?-soccer|women-s-soccer|w-soccer|wsoc)(?:/|$)", re.I)
    for block_match in re.finditer(r"<ul\b[\s\S]*?</ul>", html, flags=re.I):
        hrefs = re.findall(r'href=["\']\s*([^"\']+)["\']', block_match.group(0), flags=re.I)
        if not any(sport_href.search(href) for href in hrefs):
            continue
        found = []
        for href in hrefs:
            if "instagram.com" not in href.lower():
                continue
            handle = extract_handle(href)
            if handle:
                found.append(handle)
        unique = list(dict.fromkeys(found))
        if len(unique) == 1:
            listed.append(unique[0])
    return only_handle(listed)


def questionnaire_url(html: str, page_url: str) -> str | None:
    match = re.search(
        r'href=["\']([^"\']*(?:questionnaire|armssoftware\.com|rc\.prepsports)[^"\']*)["\']',
        html,
        flags=re.I,
    )
    if not match:
        return None
    href = urllib.parse.urljoin(page_url, match.group(1).replace("&amp;", "&").strip())
    if href.startswith("https://"):
        return href
    return None


def wiki_candidates(title: str) -> list[str]:
    quoted = urllib.parse.quote(title)
    status, _, body = fetch(
        "https://en.wikipedia.org/w/api.php?action=parse&page="
        + quoted
        + "&prop=wikitext|externallinks&format=json&redirects=1"
    )
    if status != 200:
        return []
    try:
        parsed = json.loads(body)["parse"]
    except (KeyError, json.JSONDecodeError):
        return []
    links: list[str] = []
    wikitext = parsed.get("wikitext", {}).get("*", "")
    links.extend(re.findall(r"https?://[^\s\]|<>\"{}]+", wikitext))
    for item in parsed.get("externallinks") or []:
        if isinstance(item, str):
            links.append(item)
    cleaned = []
    for link in links:
        link = link.rstrip(").,;}")
        if any(host in link for host in ("wikipedia.org", "web.archive.org", "doi.org", "creativecommons.org")):
            continue
        cleaned.append(link)
    return list(dict.fromkeys(cleaned))


def address_from_html(html: str) -> tuple[str | None, str | None]:
    locality = re.search(r'"addressLocality"\s*:\s*"([^"]+)"', html)
    region = re.search(r'"addressRegion"\s*:\s*"([A-Z]{2})"', html)
    city = locality.group(1).strip() if locality else None
    state = region.group(1) if region else None
    if city and state and re.fullmatch(r"[A-Za-z .'-]{2,40}", city):
        return city, state
    return None, None


BLOCKED_HOST_MARKERS = (
    "wikipedia.org",
    "wikimedia.org",
    "web.archive.org",
    "espn.com",
    "ncaa.com",
    "ncaa.org",
    "latimes.com",
    "nytimes.com",
    "usatoday.com",
    "twitter.com",
    "x.com",
    "facebook.com",
    "instagram.com",
    "youtube.com",
    "tiktok.com",
    "nces.ed.gov",
    "fldoe.org",
    "doi.org",
    "news-journalonline.com",
    "palmbeachpost.com",
    "bizjournals.com",
)


def blocked_host(host: str) -> bool:
    lowered = host.lower()
    return any(marker in lowered for marker in BLOCKED_HOST_MARKERS)


ROSTER_PATHS = (
    "/sports/womens-soccer/roster",
    "/sports/wsoc/roster",
    "/sports/w-soccer/roster",
    "/sports/womens-soccer/roster/season/2026",
    "/sports/womens-soccer/roster/season/2025",
    "/sports/womens-soccer/roster/2026-27",
    "/sports/womens-soccer/roster/2025-26",
    "/sports/womens-soccer/roster/2026",
    "/sports/womens-soccer/roster/2025",
    "/sports/wsoc/2026-27/roster",
    "/sports/wsoc/2025-26/roster",
    "/sports/w-soccer/2026-27/roster",
    "/sports/w-soccer/2025-26/roster",
)


def page_links(html: str, base: str) -> list[str]:
    import html as html_lib

    found: list[str] = []
    for href in re.findall(r'href=["\']([^"\']+)["\']', html, flags=re.I):
        if href.startswith(("mailto:", "javascript:", "#", "tel:")):
            continue
        absolute = urllib.parse.urljoin(base, html_lib.unescape(href)).split("#")[0]
        if absolute.startswith("http"):
            found.append(absolute)
    return found


def wiki_title(query: str) -> str | None:
    time.sleep(0.15)
    url = (
        "https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=5&format=json&srsearch="
        + urllib.parse.quote(query)
    )
    status, _, body = fetch(url)
    if status != 200:
        return None
    try:
        hits = json.loads(body)["query"]["search"]
    except (KeyError, json.JSONDecodeError):
        return None
    wanted = [
        token
        for token in norm(query).split()
        if token not in GENERIC_NAME_TOKENS | {"women", "womens", "soccer", "athletics", "team"} and len(token) > 2
    ]

    def fits(title: str) -> bool:
        if not wanted:
            return False
        hay = norm(title)
        return all(token in hay for token in wanted)

    for hit in hits:
        title = hit.get("title") or ""
        if re.search(r"\([^)]*soccer[^)]*\)\s*$", title, flags=re.I):
            continue
        if re.search(r"women", title, re.I) and re.search(r"soccer", title, re.I) and fits(title):
            return title
    for hit in hits:
        title = hit.get("title") or ""
        if fits(title) and re.search(r"athletic|soccer", title, re.I):
            return title
    return None


GENERIC_NAME_TOKENS = {
    "university",
    "college",
    "school",
    "institute",
    "the",
    "of",
    "and",
    "at",
    "main",
    "campus",
}
# A title that only shares one of these still needs the campus city.
AMBIGUOUS_NAME_TOKENS = {
    "washington",
    "colorado",
    "florida",
    "carolina",
    "georgia",
    "texas",
    "california",
    "missouri",
    "minnesota",
    "illinois",
    "indiana",
    "ohio",
    "michigan",
    "alabama",
    "oregon",
    "kansas",
    "kentucky",
    "virginia",
    "arizona",
    "iowa",
    "utah",
    "massachusetts",
    "pennsylvania",
    "york",
    "jersey",
}


def school_tokens(name: str) -> list[str]:
    tokens = [token for token in norm(name).split() if token not in GENERIC_NAME_TOKENS and len(token) > 3]
    if tokens:
        return tokens
    return [token for token in norm(name).split() if token not in {"of", "the", "and", "at"} and len(token) >= 2]


def city_on_page(city: str, html: str, title_hay: str) -> bool:
    if not city:
        return False
    if city in title_hay:
        return True
    address_city, _address_state = address_from_html(html)
    if address_city and (city in norm(address_city) or norm(address_city) in city):
        return True
    return city in norm(html)


def clean_title_token(token: str, words: list[str], seed_name: str) -> bool:
    """True when the school token is a word in the title and not the tail of another name."""
    generic = GENERIC_NAME_TOKENS | {
        "women",
        "womens",
        "soccer",
        "roster",
        "athletics",
        "coach",
        "head",
        "season",
        "sports",
    }
    seed_words = set(norm(seed_name).split())
    seen = False
    for index, word in enumerate(words):
        if word != token:
            continue
        seen = True
        previous = words[index - 1] if index else ""
        if not previous or previous in generic or previous in seed_words or len(previous) <= 3:
            return True
    return seen and False


def page_matches_school(seed: dict, url: str, html: str) -> bool:
    """Reject a roster page that belongs to a different school."""
    import html as html_lib

    title_match = re.search(r"<title>(.*?)</title>", html, flags=re.I | re.S)
    title = html_lib.unescape(plain_text(title_match.group(1))) if title_match else ""
    host = urllib.parse.urlparse(url).netloc
    words = norm(f"{title} {host}").split()
    host_flat = re.sub(r"[^a-z0-9]", "", host.lower())
    tokens = school_tokens(seed["name"])
    city = norm(seed.get("cityHint") or "")
    city_words = set(city.split())
    required = [token for token in tokens if token not in city_words] or tokens

    def token_ok(token: str) -> bool:
        if token not in AMBIGUOUS_NAME_TOKENS and len(token) > 4 and token in host_flat:
            return True
        return clean_title_token(token, words, seed["name"])

    if not required or not all(token_ok(token) for token in required):
        return False
    if len(required) >= 2 and any(token not in AMBIGUOUS_NAME_TOKENS for token in required):
        return True
    if len(required) == 1 and required[0] not in AMBIGUOUS_NAME_TOKENS:
        return True
    return city_on_page(city, html, " ".join(words))


def roster_link(url: str) -> bool:
    lowered = url.lower()
    if any(part in lowered for part in ("/news/", "/boxscore/", "/stats/", "/story/", "/article/", "/releases/")):
        return False
    if score_url(url) < 5:
        return False
    return bool(re.search(r"/roster|womens?-soccer|women-s-soccer|/wsoc|w-soccer", lowered))


def score_url(url: str) -> int:
    lowered = url.lower()
    score = 0
    if re.search(r"womens?-soccer|w-soccer|/wsoc|women-s-soccer", lowered):
        score += 5
    if "/roster" in lowered:
        score += 2
    if "/sports/" in lowered:
        score += 2
    if any(bad in lowered for bad in ("facebook.", "instagram.", "twitter.", "x.com", "youtube.", "nwsl")):
        score -= 5
    return score


def candidate_origins(links: list[str]) -> list[str]:
    best: dict[str, int] = {}
    for link in links:
        if link.startswith("//"):
            link = "https:" + link
        parts = urllib.parse.urlparse(link)
        if not parts.netloc or blocked_host(parts.netloc):
            continue
        origin = f"{parts.scheme or 'https'}://{parts.netloc}"
        score = 0
        host = parts.netloc.lower()
        if "athletic" in host or host.startswith("go"):
            score += 4
        path = parts.path.rstrip("/")
        if "/sports/" in path.lower():
            score += 4
        if path in ("", "/index.aspx", "/index.html"):
            score += 3
        if re.search(r"womens?-soccer|w-soccer|/wsoc", link, re.I):
            score += 6
        best[origin] = max(best.get(origin, 0), score)
    ranked = sorted(best.items(), key=lambda item: -item[1])
    return [origin for origin, score in ranked if score >= 3][:6]


def team_page(url: str) -> bool:
    path = urllib.parse.urlparse(url).path.lower()
    if "/coaches/" in path or "/bios/" in path:
        return False
    # /roster/ryan-williams/4212 is a person, not the team list.
    if re.search(r"/roster/[a-z0-9_.-]+/\d+/?$", path):
        return False
    return True


def try_roster_page(seed: dict, url: str) -> tuple[str | None, str]:
    if not team_page(url):
        return None, ""
    parts = urllib.parse.urlparse(url)
    if not parts.netloc or blocked_host(parts.netloc):
        return None, ""
    status, final, body = fetch(url)
    if status != 200:
        return None, ""
    parsed = parse_athletics(final, body)
    if (parsed["coaches"] or parsed["roster"]) and page_matches_school(seed, final, body):
        return final, body
    return None, ""


def athletics_hubs(links: list[str]) -> list[str]:
    hubs: list[str] = []
    for link in links:
        lowered = link.lower()
        if "athletic" not in lowered:
            continue
        if any(part in lowered for part in ("instagram.", "facebook.", "twitter.", "youtube.", "/news/")):
            continue
        if roster_link(link):
            continue
        hubs.append(link)
        if len(hubs) == 3:
            break
    return hubs


def athletics_pages(seed: dict, school_home: str | None = None) -> tuple[str | None, str]:
    links: list[str] = []
    if seed.get("wiki"):
        links.extend(wiki_candidates(seed["wiki"]))
    for query in (seed.get("wiki") or "", f"{seed['name']} women's soccer", f"{seed['name']} athletics"):
        if not query:
            continue
        title = wiki_title(query)
        if not title:
            continue
        links.extend(wiki_candidates(title))
    if school_home and school_home.startswith("http"):
        status, final, body = fetch(school_home)
        if status == 200:
            links.extend(page_links(body, final))
            for hub in athletics_hubs(links):
                hub_status, hub_final, hub_body = fetch(hub)
                if hub_status == 200:
                    links.extend(page_links(hub_body, hub_final))
    def roster_rank(url: str) -> int:
        score = score_url(url)
        if re.search(r"2026|2027", url):
            score += 3
        if re.search(r"2022|2023|2024|2025", url):
            score -= 4
        return score

    ranked = sorted(dict.fromkeys(links), key=roster_rank, reverse=True)
    roster_urls = [link for link in ranked if "/roster" in link.lower() and roster_link(link)]
    other_urls = [link for link in ranked if link not in roster_urls and roster_link(link)]
    for origin in candidate_origins(links):
        for path in ROSTER_PATHS:
            found, body = try_roster_page(seed, origin + path)
            if found:
                return found, body
    for link in roster_urls:
        found, body = try_roster_page(seed, link)
        if found:
            return found, body
    for link in other_urls:
        found, body = try_roster_page(seed, link)
        if found:
            return found, body
    return None, ""


def normalize_oas_player(player: dict) -> dict | None:
    if player.get("positionLong") or player.get("positionShort"):
        return player
    position = player.get("player_position") if isinstance(player.get("player_position"), dict) else {}
    level = player.get("class_level") if isinstance(player.get("class_level"), dict) else {}
    if not position and not level:
        return None
    return {
        "positionShort": position.get("abbreviation"),
        "positionLong": position.get("name"),
        "academicYearShort": level.get("abbreviation"),
        "academicYearLong": level.get("name"),
    }


def oas_lists(root: dict) -> tuple[list[dict], list[dict]]:
    data = root.get("data")
    if not isinstance(data, dict):
        return [], []
    players: list[dict] = []
    staff: list[dict] = []
    for value in data.values():
        if not isinstance(value, list) or not value or not isinstance(value[0], dict):
            continue
        row = value[0]
        if "player_position" in row or "class_level" in row:
            if len(value) > len(players):
                players = value
        if row.get("type") in {"coach", "support_staff"} and len(value) > len(staff):
            staff = value
    return players, staff


def coaches_from_oas(staff: list[dict]) -> list[dict]:
    kept: list[dict] = []
    seen: set[str] = set()
    for person in staff:
        if person.get("type") != "coach":
            continue
        title = (person.get("position") or "").strip()
        if not title or COACH_SKIP.search(title):
            continue
        first = (person.get("first_name") or "").strip()
        last = (person.get("last_name") or "").strip()
        name = " ".join(part for part in (first, last) if part)
        if len(name.split()) < 2 or name.lower() in seen:
            continue
        seen.add(name.lower())
        email = (person.get("email") or "").strip()
        if not EMAIL_RE.match(email) or email.lower().endswith(".example.com"):
            email = ""
        kept.append({"name": name, "title": title, "email": email or None})

    def rank(coach: dict) -> int:
        title = coach["title"].lower()
        if "head coach" in title:
            return 0
        if "director" in title and "operations" not in title:
            return 1
        if "associate" in title:
            return 2
        return 3

    kept.sort(key=rank)
    return kept[:6]


def plain_text(fragment: str) -> str:
    text = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", text).strip()


def sidearm_players(html: str) -> list[dict]:
    players: list[dict] = []
    seen: set[str] = set()
    for chunk in re.split(r'<li class="sidearm-roster-player"', html)[1:]:
        pid_match = re.search(r'data-player-id="(\d+)"', chunk[:800])
        player_id = pid_match.group(1) if pid_match else ""
        if player_id and player_id in seen:
            continue
        if player_id:
            seen.add(player_id)
        long_match = re.search(
            r'class="sidearm-roster-player-position-long-short[^"]*">\s*([^<]+)',
            chunk,
        )
        short_match = re.search(
            r'class="sidearm-roster-player-position-short[^"]*">\s*([^<]+)',
            chunk,
        )
        bold_match = re.search(r'class="text-bold">\s*([^<\s][^<]*)', chunk)
        short = re.sub(r"\s+", " ", (short_match or bold_match).group(1)).strip() if (short_match or bold_match) else ""
        long = re.sub(r"\s+", " ", long_match.group(1)).strip() if long_match else ""
        if not short and not long:
            continue
        year_match = re.search(
            r'class="sidearm-roster-player-academic-year[^"]*"[^>]*>\s*(?:<span[^>]*>\s*)?([^<]+)',
            chunk,
        )
        players.append(
            {
                "positionShort": short or None,
                "positionLong": long or None,
                "academicYearShort": re.sub(r"\s+", " ", year_match.group(1)).strip() if year_match else None,
                "academicYearLong": None,
            }
        )
    return players


def sidearm_coaches(html: str) -> list[dict]:
    kept: list[dict] = []
    seen: set[str] = set()
    for chunk in re.split(r'<li class="sidearm-roster-coach[\s"]', html)[1:]:
        title_match = re.search(r'class="sidearm-roster-coach-title"[\s\S]{0,240}?<span>\s*([^<]+)', chunk)
        name_match = re.search(r'class="sidearm-roster-coach-name"[\s\S]{0,240}?<p>\s*([^<]+)', chunk)
        if not title_match or not name_match:
            continue
        title = re.sub(r"\s+", " ", title_match.group(1)).strip()
        name = re.sub(r"\s+", " ", name_match.group(1)).strip()
        if not title or not COACH_TITLE.search(title) or COACH_SKIP.search(title):
            continue
        if len(name.split()) < 2 or name.lower() in seen:
            continue
        seen.add(name.lower())
        email_match = re.search(r"mailto:([^\"'?\s>]+)", chunk, flags=re.I)
        email = urllib.parse.unquote(email_match.group(1)).strip() if email_match else ""
        if not EMAIL_RE.match(email):
            email = ""
        bio_match = re.search(r'href="([^"]*coaches/[^"]+)"', chunk, flags=re.I)
        kept.append(
            {
                "name": name,
                "title": title,
                "email": email or None,
                "bioUrl": bio_match.group(1) if bio_match else None,
            }
        )
    head = [coach for coach in kept if re.search(r"head coach", coach["title"], re.I)]
    rest = [coach for coach in kept if coach not in head]
    return (head + rest)[:6]


def presto_players(html: str) -> list[dict]:
    players: list[dict] = []
    for row in re.split(r"<tr\b", html, flags=re.I)[1:]:
        position_match = re.search(r'data-field="position"[\s\S]*?</td>', row, flags=re.I)
        year_match = re.search(r'data-field="year"[\s\S]*?</td>', row, flags=re.I)
        if not position_match or not year_match:
            continue
        position = plain_text(position_match.group(0))
        year = plain_text(year_match.group(0))
        position = re.sub(r"^Pos\.:?\s*", "", position, flags=re.I).strip()
        year = re.sub(r"^Cl\.:?\s*", "", year, flags=re.I).strip()
        if not position or position.lower() in {"pos.", "pos", "position"}:
            continue
        players.append(
            {
                "positionShort": None,
                "positionLong": position,
                "academicYearShort": None,
                "academicYearLong": year,
            }
        )
    return players


def presto_coaches(html: str) -> list[dict]:
    section = re.search(r'id="coaching-staff"([\s\S]{0,40000})', html)
    if not section:
        return []
    kept: list[dict] = []
    seen: set[str] = set()
    for item in re.split(r"<li\b", section.group(1))[1:]:
        label_match = re.search(r'aria-label="([^"]*Full Bio)"', item)
        href_match = re.search(r'href="([^"]*coaches/[^"]+)"', item, flags=re.I)
        title_match = re.search(r'<p class="card-text[^"]*"[^>]*>\s*([^<]+)', item)
        if not label_match or not title_match:
            continue
        name_match = re.match(r"(.+?):\s*Position\s+", label_match.group(1))
        name = name_match.group(1).strip() if name_match else ""
        title = re.sub(r"\s+", " ", title_match.group(1)).strip()
        if len(name.split()) < 2 or not COACH_TITLE.search(title) or COACH_SKIP.search(title):
            continue
        if name.lower() in seen:
            continue
        seen.add(name.lower())
        kept.append(
            {
                "name": name,
                "title": title,
                "email": None,
                "bioUrl": href_match.group(1).strip() if href_match else None,
            }
        )
    head = [coach for coach in kept if re.search(r"head", coach["title"], re.I)]
    rest = [coach for coach in kept if coach not in head]
    return (head + rest)[:6]


def sole_staff_email(html: str, coach_name: str) -> str | None:
    last = coach_name.split()[-1].lower()
    visible = plain_text(html).lower()
    if last not in visible:
        return None
    found: list[str] = []
    for raw in re.findall(r"mailto:([^\"'?\s>]+)", html, flags=re.I):
        email = urllib.parse.unquote(raw).strip()
        if EMAIL_RE.match(email) and not email.lower().endswith(".example.com"):
            found.append(email)
    unique = list(dict.fromkeys(found))
    if len(unique) == 1:
        return unique[0]
    return None


def enrich_emails(page_url: str, coaches: list[dict]) -> list[dict]:
    page_host = urllib.parse.urlparse(page_url).netloc
    for coach in coaches:
        bio = coach.get("bioUrl")
        if coach.get("email") or not bio:
            continue
        absolute = urllib.parse.urljoin(page_url, bio)
        parts = urllib.parse.urlparse(absolute)
        if parts.netloc != page_host or parts.scheme not in {"http", "https"}:
            continue
        if parts.scheme == "http":
            absolute = "https://" + absolute[len("http://") :]
        status, _final, body = fetch(absolute)
        if status != 200:
            continue
        email = sole_staff_email(body, coach["name"])
        if email:
            coach["email"] = email
    return coaches


def parse_athletics(url: str, html: str) -> dict:
    coaches: list[dict] = []
    roster: list[dict] = []
    roster_note = None
    match = re.search(
        r'<script type="application/json" data-nuxt-data[\s\S]*?>([\s\S]*?)</script>',
        html,
    )
    if match:
        try:
            payload = json.loads(match.group(1))
            revived = revive_nuxt(payload)
            block = find_roster_block(revived) if isinstance(revived, dict) else None
            if block:
                players = [player for player in block.get("players") or [] if isinstance(player, dict)]
                roster, roster_note = roster_counts(players)
                coaches = coaches_from_block(block)
            if isinstance(revived, dict) and (not roster or not coaches):
                oas_players, oas_staff = oas_lists(revived)
                if not roster and oas_players:
                    normalized = [item for item in (normalize_oas_player(player) for player in oas_players) if item]
                    roster, roster_note = roster_counts(normalized)
                if not coaches and oas_staff:
                    coaches = coaches_from_oas(oas_staff)
        except json.JSONDecodeError:
            roster_note = "Roster payload could not be read."
    if not roster:
        html_players = sidearm_players(html) or presto_players(html)
        if html_players:
            roster, roster_note = roster_counts(html_players)
    if not coaches:
        coaches = sidearm_coaches(html) or presto_coaches(html) or coaches_from_html(html)
    if coaches:
        coaches = enrich_emails(url, coaches)
    for coach in coaches:
        coach.pop("bioUrl", None)
    return {
        "athleticsUrl": url.split("?")[0],
        "coaches": coaches,
        "roster": roster,
        "rosterNote": roster_note,
        "instagramHandle": instagram_handle(html, url),
        "questionnaireUrl": questionnaire_url(html, url),
    }


def coaches_from_html(html: str) -> list[dict]:
    """Fallback for staff tables that are not a Sidearm Nuxt payload."""
    text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    rows = re.split(r"<tr\b", text, flags=re.I)
    kept: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        if "mailto:" not in row.lower():
            continue
        plain = re.sub(r"<[^>]+>", " ", row)
        plain = re.sub(r"\s+", " ", plain).strip()
        email_match = re.search(r"mailto:([^\"'\s>]+)", row, flags=re.I)
        email = urllib.parse.unquote((email_match.group(1) if email_match else "").strip())
        if not EMAIL_RE.match(email):
            email = ""
        title_match = re.search(
            r"(Head Coach|Associate Head Coach|Assistant Coach|Recruiting Coordinator|Goalkeeper Coach)",
            plain,
            flags=re.I,
        )
        if not title_match:
            continue
        title = title_match.group(1)
        before = plain[: title_match.start()].strip(" -|")
        name = " ".join(before.split()[-4:])
        name = re.sub(r"\b(Coach|Staff|Women's Soccer)\b", "", name, flags=re.I).strip()
        if len(name.split()) < 2 or len(name) > 60:
            continue
        if name.lower() in seen:
            continue
        seen.add(name.lower())
        kept.append({"name": name, "title": title, "email": email or None})
    return kept[:6]


def parse_record(value: str) -> dict | None:
    match = re.fullmatch(r"(\d+)-(\d+)-(\d+)", value.strip())
    if not match:
        return None
    return {"wins": int(match.group(1)), "losses": int(match.group(2)), "ties": int(match.group(3))}


def build_program(seed: dict, rows: list[dict[str, str]]) -> dict:
    gaps: list[str] = []
    if seed.get("gap"):
        gaps.append(seed["gap"])
    score_row, score_note = match_scorecard(seed, rows)
    if score_note:
        gaps.append(score_note)
    facts = scorecard_facts(score_row) if score_row else {
        "unitid": None,
        "city": None,
        "state": None,
        "enrollment": None,
        "acceptanceRate": None,
        "estimatedNetCost": None,
        "sat": None,
        "act": None,
        "campusLife": [],
        "admissionsUrl": None,
        "costUrl": None,
        "locale": None,
    }
    page_url, html = athletics_pages(seed, facts.get("admissionsUrl"))
    athletics = {
        "athleticsUrl": None,
        "coaches": [],
        "roster": [],
        "rosterNote": "Official athletics page was not found.",
        "instagramHandle": None,
        "questionnaireUrl": None,
    }
    if page_url:
        athletics = parse_athletics(page_url, html)
        if not facts["city"] or not facts["state"]:
            city, state = address_from_html(html)
            if city and state:
                facts["city"] = city
                facts["state"] = state
                gaps.append("City and state came from the athletics page address, not College Scorecard.")
        if athletics["rosterNote"]:
            gaps.append(athletics["rosterNote"])
        if not athletics["coaches"]:
            gaps.append("No coach names were published on the fetched staff or roster page.")
        elif not any(coach.get("email") for coach in athletics["coaches"]):
            gaps.append("Coaches are named on the athletics site, but no staff email was published.")
        if not athletics["instagramHandle"]:
            gaps.append("No women's soccer Instagram link was labeled on the athletics page.")
    else:
        gaps.append(athletics["rosterNote"])
    sources = [
        {
            "field": "ranking",
            "label": "National poll",
            "url": seed.get("recordUrl") or poll_url(seed),
        }
    ]
    if score_row:
        sources.append(
            {
                "field": "scorecard",
                "label": "College Scorecard institution file, updated June 10, 2026",
                "url": facts["costUrl"],
            }
        )
    if athletics["athleticsUrl"]:
        sources.append(
            {
                "field": "athletics",
                "label": "Official athletics page",
                "url": athletics["athleticsUrl"],
            }
        )
    record = parse_record(seed["record"])
    return {
        "id": seed["id"],
        "schoolName": seed["name"],
        "division": seed["division"],
        "jucoDivision": seed.get("jucoDivision"),
        "nationalRank": seed["rank"],
        "city": facts["city"],
        "state": facts["state"],
        "conference": None,
        "mascot": None,
        "enrollment": facts["enrollment"],
        "acceptanceRate": facts["acceptanceRate"],
        "estimatedNetCost": facts["estimatedNetCost"],
        "sat": facts["sat"],
        "act": facts["act"],
        "campusLife": facts["campusLife"],
        "record": record,
        "roster": athletics["roster"],
        "coaches": athletics["coaches"],
        "questionnaireUrl": athletics["questionnaireUrl"],
        "admissionsUrl": facts["admissionsUrl"],
        "costUrl": facts["costUrl"],
        "athleticsUrl": athletics["athleticsUrl"],
        "instagramHandle": athletics["instagramHandle"],
        "externalIds": {"scorecard": facts["unitid"]} if facts["unitid"] else {},
        "sources": sources,
        "lastVerified": LAST_VERIFIED,
        "gaps": gaps,
    }


def poll_url(seed: dict) -> str:
    seeds = json.loads(SEEDS_PATH.read_text())
    return seeds["polls"][seed["division"]]["url"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="Comma-separated school ids")
    parser.add_argument("--match-only", action="store_true")
    args = parser.parse_args()
    document = json.loads(SEEDS_PATH.read_text())
    schools = document["schools"]
    if args.only:
        wanted = {item.strip() for item in args.only.split(",")}
        schools = [school for school in schools if school["id"] in wanted]
    csv_path = ensure_scorecard()
    print(f"Reading {csv_path.name}...")
    rows = load_scorecard(csv_path)
    if args.match_only:
        for school in schools:
            match, note = match_scorecard(school, rows)
            if match:
                print(f"OK  {school['id']}: {match['INSTNM']} | {match['CITY']}, {match['STABBR']} | {match['UNITID']}")
            else:
                print(f"MISS {school['id']}: {note}")
        return
    programs: list[dict] = []
    # Wikipedia is happier with a small pool than a burst of 100.
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(build_program, school, rows): school["id"] for school in schools}
        for future in as_completed(futures):
            school_id = futures[future]
            try:
                program = future.result()
            except Exception as error:  # noqa: BLE001
                print(f"FAIL {school_id}: {error}")
                continue
            programs.append(program)
            emails = sum(1 for coach in program["coaches"] if coach.get("email"))
            print(
                f"{program['id']}: coaches={len(program['coaches'])} emails={emails} "
                f"ig={program['instagramHandle'] or '-'} roster={sum(row['count'] for row in program['roster'])} "
                f"city={program['city']} url={program['athleticsUrl'] or '-'}"
            )
    programs.sort(key=lambda item: (item["division"], item["nationalRank"], item["schoolName"]))
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "lastVerified": LAST_VERIFIED,
        "scorecardFile": SCORECARD_ZIP_URL,
        "scorecardPage": SCORECARD_PAGE,
        "polls": document["polls"],
        "programs": programs,
    }
    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n")
    REPORT_PATH.write_text(json.dumps(summarize(programs, document["polls"]), indent=2) + "\n")
    print(f"Wrote {len(programs)} programs to {OUT_PATH}")


def summarize(programs: list[dict], polls: dict) -> dict:
    by_division = Counter(program["division"] for program in programs)
    return {
        "programs": len(programs),
        "byDivision": dict(by_division),
        "withCoachEmail": sum(1 for program in programs if any(coach.get("email") for coach in program["coaches"])),
        "withAnyCoach": sum(1 for program in programs if program["coaches"]),
        "withInstagram": sum(1 for program in programs if program["instagramHandle"]),
        "withAthletics": sum(1 for program in programs if program["athleticsUrl"]),
        "withRoster": sum(1 for program in programs if program["roster"]),
        "withEnrollment": sum(1 for program in programs if program["enrollment"] is not None),
        "withAcceptance": sum(1 for program in programs if program["acceptanceRate"] is not None),
        "withNetPrice": sum(1 for program in programs if program["estimatedNetCost"] is not None),
        "missingLocation": [program["id"] for program in programs if not program["city"] or not program["state"]],
        "missingAthletics": [program["id"] for program in programs if not program["athleticsUrl"]],
        "missingCoachEmail": [
            program["id"] for program in programs if not any(coach.get("email") for coach in program["coaches"])
        ],
        "missingInstagram": [program["id"] for program in programs if not program["instagramHandle"]],
        "missingRoster": [program["id"] for program in programs if not program["roster"]],
        "polls": polls,
    }


if __name__ == "__main__":
    main()
