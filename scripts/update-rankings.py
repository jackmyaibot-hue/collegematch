#!/usr/bin/env python3
"""Refresh Top 25 badges from the latest official women's soccer polls.

Fetches the current United Soccer Coaches national poll for NCAA D1, D2, D3,
and NJCAA, plus the NAIA coaches Top 25 that United Soccer Coaches links.
Matches each ranked school to one catalog program in that division. Writes
ranking: {rank, poll, date} and mirrors the rank on nationalRank. Schools that
drop out of a refreshed poll lose the badge.

    python3 scripts/update-rankings.py
    python3 scripts/update-rankings.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
import ssl
import urllib.error
import urllib.request
from datetime import datetime
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROGRAMS_PATH = ROOT / "mobile" / "src" / "data" / "real" / "programs.json"
SNAPSHOT_PATH = ROOT / "scripts" / "data" / "womens-soccer-rankings.json"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

POLLS = (
    {
        "division": "NCAA D1",
        "poll": "United Soccer Coaches NCAA Division I Women",
        "url": "https://unitedsoccercoaches.org/rankings/college-rankings/ncaa-di-women/",
        "kind": "usc",
    },
    {
        "division": "NCAA D2",
        "poll": "United Soccer Coaches NCAA Division II Women",
        "url": "https://unitedsoccercoaches.org/rankings/college-rankings/ncaa-dii-women/",
        "kind": "usc",
    },
    {
        "division": "NCAA D3",
        "poll": "United Soccer Coaches NCAA Division III Women",
        "url": "https://unitedsoccercoaches.org/rankings/college-rankings/ncaa-diii-women/",
        "kind": "usc",
    },
    {
        "division": "NAIA",
        "poll": "NAIA Women's Soccer Coaches Top 25",
        "url": "https://www.naia.org/sports/womens-soccer/polls/",
        "kind": "naia",
    },
    {
        "division": "NJCAA",
        "poll": "United Soccer Coaches NJCAA Division I Women",
        "url": "https://unitedsoccercoaches.org/rankings/college-rankings/njcaa-di-women/",
        "kind": "usc",
    },
)

# Poll printing differs from the catalog name, but the school is the same one.
ALIASES = {
    "NCAA D1": {
        "UCLA": "california-los-angeles",
        "Penn State University": "pennsylvania-state",
        "University of South Carolina": "south-carolina-columbia",
    },
    "NCAA D2": {
        "Kutztown University": "kutztown-pennsylvania",
    },
    "NCAA D3": {
        "Washington University (Mo.)": "washu",
        "Pomona-Pitzer Colleges": "pomona-pitzer",
    },
}

STATE_ABBR = {
    "ala": "AL",
    "ariz": "AZ",
    "ark": "AR",
    "calif": "CA",
    "colo": "CO",
    "conn": "CT",
    "del": "DE",
    "fla": "FL",
    "ga": "GA",
    "ill": "IL",
    "ind": "IN",
    "iowa": "IA",
    "kan": "KS",
    "kans": "KS",
    "ky": "KY",
    "la": "LA",
    "mass": "MA",
    "md": "MD",
    "mich": "MI",
    "minn": "MN",
    "miss": "MS",
    "mo": "MO",
    "mont": "MT",
    "neb": "NE",
    "nebr": "NE",
    "okla": "OK",
    "ore": "OR",
    "pa": "PA",
    "tenn": "TN",
    "tex": "TX",
    "texas": "TX",
    "va": "VA",
    "wash": "WA",
    "wis": "WI",
    "wva": "WV",
}


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    context = ssl.create_default_context()
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=40, context=context) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                return response.read().decode(charset, errors="replace")
        except urllib.error.HTTPError as error:
            last_error = error
            if error.code != 429 or attempt == 3:
                raise
            import time

            time.sleep(4 * (attempt + 1))
    raise last_error or RuntimeError(f"Could not fetch {url}")


def clean(text: str) -> str:
    text = unescape(text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def identity_key(name: str) -> str:
    """Punctuation-insensitive name. Keeps University and College so those stay distinct."""
    name = re.sub(r"\([^)]*\)", " ", name)
    name = name.lower().replace("&", " and ").replace("'", "").replace("’", "")
    name = re.sub(r"\bst\.?\b", "saint", name)
    name = re.sub(r"[^a-z0-9]+", " ", name)
    stop = {"the", "of", "at", "and", "in"}
    return " ".join(token for token in name.split() if token not in stop)


def short_tokens(name: str) -> tuple[str, ...]:
    """Name tokens with institution words removed, for short poll labels like Grace (Ind.)."""
    generic = {"university", "college", "colleges", "aeronautical"}
    return tuple(token for token in identity_key(name).split() if token not in generic)


def parse_usc(html: str) -> tuple[str, list[tuple[int, str]]]:
    match = re.search(
        r'<div class="poll_table active"[^>]*>.*?<h2>(.*?)</h2>.*?<tbody>(.*?)</tbody>',
        html,
        flags=re.S,
    )
    if not match:
        raise SystemExit("Could not find the active United Soccer Coaches poll table.")
    title = clean(re.sub(r"<[^>]+>", " ", match.group(1)))
    date_match = re.search(r"([A-Z][a-z]+ \d{1,2}, \d{4})", title)
    if not date_match:
        raise SystemExit(f"Could not read a poll date from {title!r}.")
    date = datetime.strptime(date_match.group(1), "%B %d, %Y").date().isoformat()
    rows: list[tuple[int, str]] = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", match.group(2), flags=re.S):
        rank = re.search(r'class="tdRank">\s*(\d+)', row)
        school = re.search(r'class="tdSchool">\s*([^<]+)', row)
        if rank and school:
            rows.append((int(rank.group(1)), clean(school.group(1))))
    if not rows:
        raise SystemExit(f"Active poll {title!r} had no schools.")
    return date, rows


def parse_naia(html: str) -> tuple[str, list[tuple[int, str]]]:
    heading = re.search(r"Latest NAIA Women.s Soccer Top 25 Poll \| ([A-Z][a-z]{2}\. \d{1,2}, \d{4})", html)
    if not heading:
        raise SystemExit("Could not find the latest NAIA Top 25 heading.")
    date = datetime.strptime(heading.group(1).replace(".", ""), "%b %d, %Y").date().isoformat()
    table = re.search(r"Latest NAIA.*?<tbody>(.*?)</tbody>", html, flags=re.S)
    if not table:
        raise SystemExit("Could not find the NAIA Top 25 table.")
    cells = [clean(cell) for cell in re.findall(r"<td[^>]*>(.*?)</td>", table.group(1), flags=re.S)]
    rows: list[tuple[int, str]] = []
    for index in range(0, len(cells) - 3, 5):
        rank_text, school = cells[index + 1], cells[index + 3]
        if not rank_text.isdigit() or not school:
            continue
        rows.append((int(rank_text), school))
    if len(rows) < 25:
        raise SystemExit(f"NAIA poll parsed {len(rows)} schools, expected 25.")
    return date, rows[:25]


def parenthetical_state(name: str) -> tuple[str, str | None]:
    match = re.fullmatch(r"(.*?)\s*\(([^)]+)\)\s*", name)
    if not match:
        return name, None
    raw = match.group(2).strip().rstrip(".").lower()
    return match.group(1).strip(), STATE_ABBR.get(raw)


def match_school(division: str, poll_name: str, programs: list[dict]) -> tuple[dict | None, str]:
    pool = [program for program in programs if program.get("division") == division]
    wanted = identity_key(poll_name)
    exact = [program for program in pool if identity_key(program.get("schoolName") or "") == wanted]
    if len(exact) == 1:
        return exact[0], "exact name"
    if len(exact) > 1:
        return None, "ambiguous exact name"

    alias = ALIASES.get(division, {}).get(poll_name)
    if alias:
        found = next((program for program in pool if program.get("id") == alias), None)
        if found:
            return found, "same school, poll prints a shorter name"
        return None, "alias id is not in this division"

    base, state = parenthetical_state(poll_name)
    tokens = short_tokens(base)
    if not tokens:
        return None, "no name to match"
    # "Indiana Wesleyan" or "Grace (Ind.)" is the catalog school without University or College.
    hits = []
    for program in pool:
        if state and program.get("state") != state:
            continue
        if short_tokens(program.get("schoolName") or "") == tokens:
            hits.append(program)
    if len(hits) == 1:
        return hits[0], "short poll name plus state" if state else "same school, shorter poll name"
    if len(hits) > 1:
        return None, "ambiguous short name"
    return None, "no exact catalog school"


def apply(document: dict, assignments: dict[str, dict], refreshed: set[str]) -> None:
    for program in document["programs"]:
        division = program.get("division")
        if division not in refreshed:
            continue
        current = assignments.get(program["id"])
        sources = [source for source in program.get("sources") or [] if source.get("field") != "ranking"]
        if current:
            program["nationalRank"] = current["rank"]
            program["ranking"] = {
                "rank": current["rank"],
                "poll": current["poll"],
                "date": current["date"],
            }
            sources.append({"field": "ranking", "label": current["poll"], "url": current["url"]})
            program["sources"] = sources
        else:
            if program.get("nationalRank") is not None:
                program["nationalRank"] = None
            program.pop("ranking", None)
            if sources != program.get("sources"):
                program["sources"] = sources


def main() -> None:
    parser = argparse.ArgumentParser(description="Refresh women's soccer Top 25 badges.")
    parser.add_argument("--dry-run", action="store_true", help="Print matches without writing programs.json")
    args = parser.parse_args()
    document = json.loads(PROGRAMS_PATH.read_text())
    programs = document["programs"]
    refreshed: set[str] = set()
    assignments: dict[str, dict] = {}
    report_polls = []
    for poll in POLLS:
        html = fetch(poll["url"])
        date, rows = parse_naia(html) if poll["kind"] == "naia" else parse_usc(html)
        matched = []
        unmatched = []
        used_ids: set[str] = set()
        for rank, school in rows:
            program, how = match_school(poll["division"], school, programs)
            if program and program["id"] not in used_ids:
                used_ids.add(program["id"])
                assignments[program["id"]] = {
                    "rank": rank,
                    "poll": poll["poll"],
                    "date": date,
                    "url": poll["url"],
                }
                matched.append(
                    {
                        "rank": rank,
                        "pollName": school,
                        "id": program["id"],
                        "schoolName": program["schoolName"],
                        "how": how,
                    }
                )
            else:
                reason = "already matched to another poll row" if program else how
                unmatched.append({"rank": rank, "pollName": school, "reason": reason})
        refreshed.add(poll["division"])
        report_polls.append(
            {
                "division": poll["division"],
                "poll": poll["poll"],
                "url": poll["url"],
                "date": date,
                "ranked": len(rows),
                "badged": len(matched),
                "matched": matched,
                "unmatched": unmatched,
            }
        )
        print(f"{poll['division']}: {date}  badged {len(matched)} of {len(rows)}")
        for item in unmatched:
            print(f"  unmatched #{item['rank']} {item['pollName']} ({item['reason']})")

    snapshot = {"updated": datetime.now().date().isoformat(), "polls": report_polls}
    if args.dry_run:
        print(json.dumps(snapshot, indent=2))
        return
    apply(document, assignments, refreshed)
    PROGRAMS_PATH.write_text(json.dumps(document, indent=2) + "\n")
    SNAPSHOT_PATH.write_text(json.dumps(snapshot, indent=2) + "\n")
    print(f"Wrote rankings for {len(assignments)} programs.")


if __name__ == "__main__":
    main()
