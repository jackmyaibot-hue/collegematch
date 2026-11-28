#!/usr/bin/env python3
"""Build the women's flag football catalog.

The candidate list is BreakAway's college program file (CC BY 4.0, reviewed
2026-10-16), which records each school's athletics URL. A school is kept only
when that URL is on a school or athletics domain and the page still loads.
Coach names and emails are copied only from a staff row that titles the person
head coach. Missing facts stay blank.

Nothing here is invented. Re-run after the season:

    python3 scripts/collect_flag_football.py
"""

from __future__ import annotations

import json
import re
import ssl
import time
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from html import unescape
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SOCCER_PATH = ROOT / "mobile" / "src" / "data" / "real" / "programs.json"
OUT_PATH = ROOT / "mobile" / "src" / "data" / "real" / "flag-programs.json"
REPORT_PATH = ROOT / "scripts" / "data" / "flag-football-report.json"
CACHE = ROOT / "scripts" / "cache" / "college-flag-programs.json"
SOURCE_URL = "https://www.breakawaydata.com/college-flag-programs.json"
NCAA_EMERGING = "https://www.ncaa.org/championships/emerging-sports-for-women/flag-football/"
NAIA_SPORT = "https://www.naia.org/sports/womens-flag-football/"
NJCAA_NOTE = "https://www.njcaa.org/"
VERIFIED_ON = "2026-11-28"
UA = "CollegeMatchCatalog/1.0 (educational; school athletics pages)"

# Third-party roundups are not a program source.
AGGREGATOR_HOSTS = (
    "collegiateflagfootball.com",
    "breakawaydata.com",
    "rangerreview.com",
    "256today.com",
    "wikipedia.org",
    "nirsa.net",
)

# Official pages confirmed by hand when the compiled URL was a news site.
URL_OVERRIDES = {
    "Northwest-Shoals Community College": "https://nwscc.edu/patriots-announce-andrew-jones-as-new-flag-football-coach/",
}

DIVISION = {
    ("NCAA", "D-I"): "NCAA D1",
    ("NCAA", "D-II"): "NCAA D2",
    ("NCAA", "D-III"): "NCAA D3",
    ("NAIA", "NAIA"): "NAIA",
    ("NJCAA", "NJCAA"): "NJCAA",
}

RESERVED_IG = {
    "p",
    "reel",
    "reels",
    "stories",
    "explore",
    "accounts",
    "about",
    "legal",
    "developer",
    "instagram",
}


def load_candidates() -> dict:
    if CACHE.exists() and CACHE.stat().st_size > 1000:
        return json.loads(CACHE.read_text())
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(SOURCE_URL, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=40) as response:
        raw = response.read()
    CACHE.write_bytes(raw)
    return json.loads(raw)


def host_of(url: str) -> str:
    return urlparse(url).netloc.lower().removeprefix("www.")


def is_aggregator(url: str) -> bool:
    host = host_of(url)
    return any(host == item or host.endswith("." + item) for item in AGGREGATOR_HOSTS)


def fetch(url: str) -> tuple[int, str, str]:
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    context = ssl.create_default_context()
    try:
        with urllib.request.urlopen(request, timeout=18, context=context) as response:
            status = getattr(response, "status", 200)
            final = response.geturl()
            body = response.read(500_000).decode("utf-8", "replace")
            return status, final, body
    except Exception as error:  # noqa: BLE001 - recorded per school, not fatal
        code = getattr(error, "code", 0) or 0
        return int(code), url, f"ERROR {type(error).__name__}: {error}"


def strip_tags(html: str) -> str:
    text = re.sub(r"(?is)<script[\s\S]*?</script>", " ", html)
    text = re.sub(r"(?is)<style[\s\S]*?</style>", " ", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def clean_email(value: str) -> str | None:
    email = unescape(value).strip().strip(".").lower()
    email = email.replace(" ", "")
    if not re.fullmatch(r"[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}", email):
        return None
    local = email.split("@", 1)[0]
    if local in {"tba", "test", "email", "none", "na", "n/a"}:
        return None
    if email.endswith(".example.com") or "example.com" in email:
        return None
    return email


def looks_like_name(value: str) -> bool:
    name = re.sub(r"\s+", " ", unescape(value)).strip(" -|")
    if not (4 <= len(name) <= 60):
        return False
    if any(token in name.lower() for token in ("coach", "staff", "email", "phone", "roster", "menu", "tba")):
        return False
    parts = name.split(" ")
    if len(parts) < 2 or len(parts) > 5:
        return False
    return all(re.fullmatch(r"[A-Za-z][A-Za-z.''\-]*", part) for part in parts)


def is_head_title(title: str) -> bool:
    text = title.lower()
    if any(word in text for word in ("assistant", "associate", "volunteer", "intern", "graduate")):
        return False
    return "head" in text and "coach" in text


def cell_text(html: str) -> str:
    return strip_tags(html)


def coaches_from_html(html: str) -> list[dict]:
    found: list[dict] = []
    rows = re.findall(r"(?is)<tr\b[^>]*>[\s\S]*?</tr>", html)
    for row in rows:
        title_bits = [cell_text(cell) for cell in re.findall(r"(?is)<t[dh]\b[^>]*>([\s\S]*?)</t[dh]>", row)]
        title = next((bit for bit in title_bits if is_head_title(bit)), "")
        if not title:
            continue
        names = []
        for name in re.findall(r"(?is)<a\b[^>]*>([\s\S]*?)</a>", row):
            text = re.sub(r"\s+", " ", strip_tags(name)).strip()
            if looks_like_name(text):
                names.append(text)
        emails = [email for email in (clean_email(item) for item in re.findall(r"(?i)mailto:([^\"'\s>]+)", row)) if email]
        if not names:
            continue
        found.append({"name": names[0], "title": re.sub(r"\s+", " ", title).strip(), "email": emails[0] if emails else None})
    if found:
        return found

    # Official announcement pages: "hired Jane Doe as the new women's flag football coach".
    text = strip_tags(html)
    match = re.search(
        r"(?:named|hired|announced)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s+as\s+(?:the\s+)?(?:new\s+)?(?:women['’]s\s+)?(?:flag\s+football\s+)?(?:head\s+)?coach",
        text,
    )
    if match and looks_like_name(match.group(1)):
        return [{"name": match.group(1), "title": "Head Coach", "email": None}]
    return []


def instagram_from_html(html: str, claimed: str | None) -> str | None:
    handles = []
    for handle in re.findall(r"(?i)instagram\.com/([A-Za-z0-9._]{2,30})", html):
        clean = handle.strip(".").split("?")[0]
        if clean.lower() in RESERVED_IG or clean.endswith("."):
            continue
        if clean not in handles:
            handles.append(clean)
    if claimed and any(handle.lower() == claimed.lower() for handle in handles):
        return next(handle for handle in handles if handle.lower() == claimed.lower())
    flagged = [handle for handle in handles if re.search(r"flag|wff", handle, re.I)]
    if len(flagged) == 1:
        return flagged[0]
    return None


def norm_name(name: str) -> str:
    text = name.lower().replace("&", " and ")
    text = text.replace("'", "")
    text = re.sub(r"\b(the|university|college|of|at|campus)\b", " ", text)
    return re.sub(r"[^a-z0-9]+", "", text)


def soccer_index() -> dict[str, dict]:
    data = json.loads(SOCCER_PATH.read_text())
    index: dict[str, dict] = {}
    for program in data["programs"]:
        index.setdefault(norm_name(program["schoolName"]), program)
        index.setdefault(program["schoolName"].casefold(), program)
    return index


def reuse(school: dict | None) -> dict:
    if not school:
        return {}
    colors = school.get("colors")
    source = school.get("colorSource")
    kept = {}
    if source in {"brand-guide", "athletics-css"} and isinstance(colors, list) and len(colors) == 2:
        kept["colors"] = colors
        kept["colorSource"] = source
        if school.get("colorNames"):
            kept["colorNames"] = school["colorNames"]
    for key in ("campusLife", "enrollment", "acceptanceRate", "acceptanceLabel", "estimatedNetCost", "sat", "act"):
        if school.get(key) not in (None, [], ""):
            kept[key] = school[key]
    scorecard = (school.get("externalIds") or {}).get("scorecard")
    if scorecard:
        kept["externalIds"] = {"scorecard": str(scorecard)}
    if school.get("mascot"):
        kept["mascot"] = school["mascot"]
    return kept


def official_sources(program: dict, program_url: str, coach_url: str | None) -> list[dict]:
    rows = [{"field": "program", "label": "Athletics flag football page", "url": program_url}]
    if coach_url and coach_url != program_url:
        rows.append({"field": "coach", "label": "Athletics coaching staff", "url": coach_url})
    for source in program.get("sources") or []:
        url = source.get("url") or ""
        if not url.startswith("https://") or is_aggregator(url):
            continue
        if any(item["url"] == url for item in rows):
            continue
        if len(rows) >= 4:
            break
        rows.append({"field": "listing", "label": source.get("label") or "School or conference page", "url": url})
    return rows


def build() -> None:
    payload = load_candidates()
    schools = soccer_index()
    chosen = []
    excluded = []
    for program in payload["programs"]:
        association = program.get("association")
        division = program.get("division")
        status = program.get("status")
        if (association, division) not in DIVISION or status not in {"varsity", "announced"}:
            continue
        url = URL_OVERRIDES.get(program["name"], program.get("programUrl") or "")
        if not url.startswith("https://") or is_aggregator(url):
            excluded.append(
                {
                    "name": program["name"],
                    "division": DIVISION[(association, division)],
                    "reason": "No school athletics URL. Third-party list only.",
                }
            )
            continue
        chosen.append({**program, "programUrl": url, "divisionLabel": DIVISION[(association, division)]})

    def load_one(program: dict) -> dict:
        flags: list[str] = []
        status, final, html = fetch(program["programUrl"])
        path_ok = bool(re.search(r"flag|wff", program["programUrl"], re.I))
        body_ok = "ERROR" not in html[:12] and bool(re.search(r"flag", html, re.I))
        if not (status == 200 and (body_ok or path_ok)):
            return {
                "drop": True,
                "name": program["name"],
                "division": program["divisionLabel"],
                "reason": f"Athletics page did not confirm flag football (HTTP {status}).",
                "url": program["programUrl"],
            }
        if not body_ok:
            flags.append("Page returned 200 and the URL names flag football, but the HTML did not include the word flag.")
        coach_url = program.get("coachUrl") if isinstance(program.get("coachUrl"), str) else None
        coach_html = html
        coach_final = final
        if coach_url and coach_url.startswith("https://") and not is_aggregator(coach_url) and coach_url != program["programUrl"]:
            coach_status, coach_final, coach_body = fetch(coach_url)
            if coach_status == 200 and "ERROR" not in coach_body[:12]:
                coach_html = coach_body
            else:
                flags.append("Coaching staff page did not load.")
                coach_url = None
        coaches = coaches_from_html(coach_html)
        head = coaches[0] if coaches else None
        if not head:
            flags.append("Head coach was not on the staff page.")
        elif not head.get("email"):
            flags.append("Head coach email was not published.")
        claimed = program.get("instagram") if isinstance(program.get("instagram"), str) else None
        handle = instagram_from_html(html, claimed) or instagram_from_html(coach_html, claimed)
        ig_kind = "team" if handle and re.search(r"flag|wff", handle, re.I) else "athletics" if handle else None
        if not handle:
            flags.append("Instagram was not linked on the athletics page.")
        conference = (program.get("conference") or "").strip()
        if not conference:
            flags.append("Conference was not in the verified listing.")
        start = program.get("startYear")
        launch = None
        if program.get("status") == "announced" or (isinstance(start, int) and start >= 2027):
            year = start if isinstance(start, int) else 2027
            launch = f"Launching {year}"
        reused = reuse(schools.get(program["name"].casefold()) or schools.get(norm_name(program["name"])))
        if reused:
            flags.append("Colors and campus facts reused from the women's soccer record for this school.")
        else:
            flags.append("School is not in the soccer catalog, so colors and Scorecard fields were left blank.")
        row = {
            "id": "ff-" + re.sub(r"[^a-z0-9-]", "", program["id"].lower()),
            "sport": "flag-football",
            "schoolName": program["name"],
            "division": program["divisionLabel"],
            "jucoDivision": None,
            "city": program.get("city"),
            "state": program.get("state"),
            "conference": conference or None,
            "athleticsUrl": final if final.startswith("https://") else program["programUrl"],
            "coaches": [head] if head else [],
            "instagramHandle": handle,
            "instagramKind": ig_kind,
            "instagramConfirmation": (
                {
                    "method": "athletics-page",
                    "kind": ig_kind,
                    "url": final if final.startswith("https://") else program["programUrl"],
                    "note": "The handle is linked on this athletics page.",
                }
                if handle
                else None
            ),
            "launchLabel": launch,
            "lastVerified": VERIFIED_ON,
            "sources": official_sources(program, program["programUrl"], coach_final if coach_url else None),
            "dataFlags": flags,
            "reused": bool(reused),
        }
        row.update({key: value for key, value in reused.items() if key not in row or row.get(key) in (None, [])})
        # Colors from soccer should win over the empty default. Coaches must not.
        if reused.get("colors"):
            row["colors"] = reused["colors"]
            row["colorSource"] = reused["colorSource"]
            if reused.get("colorNames"):
                row["colorNames"] = reused["colorNames"]
        return row

    rows = []
    started = time.time()
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = [pool.submit(load_one, program) for program in chosen]
        done = 0
        for future in as_completed(futures):
            done += 1
            item = future.result()
            if item.get("drop"):
                excluded.append({key: item[key] for key in ("name", "division", "reason", "url")})
            else:
                rows.append(item)
            if done % 25 == 0:
                print(f"checked {done}/{len(chosen)}", flush=True)
    rows.sort(key=lambda item: (item["division"], item["schoolName"]))
    reused_count = sum(1 for item in rows if item.pop("reused", False))
    catalog = {
        "sport": "flag-football",
        "side": "women",
        "lastVerified": VERIFIED_ON,
        "listReviewed": payload.get("lastReviewed"),
        "listSyncedAt": payload.get("syncedAt"),
        "notes": [
            "Women's flag football for the 2026-27 academic year, plus schools that have announced a later first season.",
            "NCAA flag football is an Emerging Sport for Women. The NCAA says more than 130 schools are expected to compete in 2026-27 and does not publish the 19/47/72 school-by-school projection as a downloadable sponsorship file.",
            "No dated NCAA or NAIA poll was copied. The NAIA Top 10 page does not print a poll date.",
            "Coach names and emails come from the athletics staff page. Blank means the page did not list them.",
        ],
        "catalogSources": [
            {"label": "NCAA Emerging Sports for Women: flag football", "url": NCAA_EMERGING},
            {"label": "NAIA women's flag football", "url": NAIA_SPORT},
            {"label": "BreakAway women's college flag football programs, CC BY 4.0, used as an index of athletics URLs", "url": "https://www.breakawaydata.com/womens-college-flag-football/"},
        ],
        "programs": rows,
    }
    OUT_PATH.write_text(json.dumps(catalog, indent=2) + "\n")
    counts = Counter(item["division"] for item in rows)
    report = {
        "verifiedOn": VERIFIED_ON,
        "seconds": round(time.time() - started, 1),
        "counts": dict(counts),
        "total": len(rows),
        "launching": sum(1 for item in rows if item.get("launchLabel")),
        "coachNamed": sum(1 for item in rows if item["coaches"]),
        "coachEmail": sum(1 for item in rows if item["coaches"] and item["coaches"][0].get("email")),
        "instagram": sum(1 for item in rows if item.get("instagramHandle")),
        "conference": sum(1 for item in rows if item.get("conference")),
        "reusedFromSoccer": reused_count,
        "excluded": excluded,
        "missingCoach": [item["schoolName"] for item in rows if not item["coaches"]],
        "missingEmail": [item["schoolName"] for item in rows if not item["coaches"] or not item["coaches"][0].get("email")],
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: report[key] for key in ("counts", "total", "launching", "coachNamed", "coachEmail", "instagram", "conference", "reusedFromSoccer")}, indent=2))
    print("excluded", len(excluded))


if __name__ == "__main__":
    build()
