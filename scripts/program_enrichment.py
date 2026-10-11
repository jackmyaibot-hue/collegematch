"""Fill conference, mascot, colors, Instagram, and missing athletics pages.

Every value comes from a page this module fetches. Web search only suggests
URLs. An Instagram handle is kept only when an official school or athletics
page links it, or the profile bio names the program and links the athletics
site. Team accounts win. If none is confirmed, the athletics-department
account is used, then the university's main account.
"""

from __future__ import annotations

import json
import re
import urllib.parse

GENERIC_MASCOT = {
    "athletics",
    "soccer",
    "roster",
    "college",
    "university",
    "official",
    "home",
    "page",
    "not",
    "found",
    "women",
    "womens",
    "sports",
    "team",
    "the",
    "of",
    "and",
}


def handles_in(text: str, extract_handle) -> list[str]:
    found: list[str] = []
    decoded = urllib.parse.unquote(text)
    for match in re.finditer(r"instagram\.com/([A-Za-z0-9._]{2,30})", decoded, flags=re.I):
        handle = extract_handle("https://instagram.com/" + match.group(1))
        if handle:
            found.append(handle)
    return list(dict.fromkeys(found))


def soccer_url(url: str) -> bool:
    return bool(re.search(r"womens?-soccer|women-s-soccer|w-soccer|/wsoc(?:/|$)", url or "", flags=re.I))


def promo_handles(html: str, extract_handle) -> list[str]:
    """Team social icons, including Sidearm links that redirect through /api/."""
    decoded = urllib.parse.unquote(html)
    found: list[str] = []
    for match in re.finditer(r"<a\b[^>]*icons-ad__link[\s\S]{0,700}?</a>", decoded, flags=re.I):
        chunk = match.group(0)
        if "instagram" not in chunk.lower():
            continue
        found.extend(handles_in(chunk, extract_handle))
    return list(dict.fromkeys(found))


def sitewide_handles(html: str, extract_handle) -> list[str]:
    decoded = urllib.parse.unquote(html)
    cleaned = re.sub(r"<li\b[^>]*roster-player[\s\S]*?</li>", " ", decoded, flags=re.I)
    return handles_in(cleaned, extract_handle)


def outbound_social(html: str) -> list[str]:
    """X and Facebook links that sit in the team's social menu, not player bios."""
    decoded = urllib.parse.unquote(html)
    links: list[str] = []
    for match in re.finditer(r'href=["\'](https?://[^"\']+)["\']', decoded, flags=re.I):
        href = match.group(1)
        lowered = href.lower()
        if not re.search(r"(facebook\.com|twitter\.com|x\.com)/", lowered):
            continue
        if any(part in lowered for part in ("sharer", "/intent", "/share", "share?")):
            continue
        before = decoded[max(0, match.start() - 500) : match.start()]
        if "icons-ad" not in before and "social-menu" not in before and "sport-menu__social" not in before:
            continue
        links.append(href.split("?")[0])
    return list(dict.fromkeys(links))[:2]


def chromatic(color: str) -> bool:
    raw = color.strip().lstrip("#")
    if len(raw) == 3:
        raw = "".join(ch * 2 for ch in raw)
    if len(raw) != 6 or re.fullmatch(r"[0-9A-Fa-f]{6}", raw) is None:
        return False
    red, green, blue = int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16)
    spread = max(red, green, blue) - min(red, green, blue)
    if max(red, green, blue) < 30:
        return False
    if min(red, green, blue) > 225 and spread < 20:
        return False
    return spread >= 18


def normalize_hex(color: str | None) -> str | None:
    if not color:
        return None
    raw = color.strip()
    match = re.fullmatch(r"#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})", raw)
    if not match:
        return None
    digits = match.group(1)
    if len(digits) == 3:
        digits = "".join(ch * 2 for ch in digits)
    return "#" + digits.upper()


def colors_from_html(html: str) -> tuple[list[str] | None, str | None]:
    match = re.search(r"window\.site_colors\s*=\s*(\{.*?\});", html)
    if match:
        try:
            data = json.loads(match.group(1))
        except json.JSONDecodeError:
            data = {}
        primary = normalize_hex(data.get("primary_background"))
        secondary = normalize_hex(data.get("secondary_background"))
        if primary and chromatic(primary):
            pair = [primary, secondary or primary]
            if secondary and not chromatic(secondary) and secondary not in {"#FFFFFF", "#000000"}:
                pair[1] = primary
            return pair, "athletics-css"
    primary_match = re.search(r"--bs-primary\s*:\s*(#[0-9A-Fa-f]{6})", html, flags=re.I)
    secondary_match = re.search(r"--bs-secondary\s*:\s*(#[0-9A-Fa-f]{6})", html, flags=re.I)
    primary = normalize_hex(primary_match.group(1)) if primary_match else None
    secondary = normalize_hex(secondary_match.group(1)) if secondary_match else None
    if primary and chromatic(primary):
        if not secondary or not chromatic(secondary):
            secondary = primary
        return [primary, secondary], "athletics-css"
    return None, None


def brand_colors(html: str) -> tuple[list[str] | None, list[str] | None]:
    """Named hex pairs from an official brand or identity page."""
    pairs: list[tuple[str, str]] = []
    for match in re.finditer(
        r"\b(primary|secondary|navy|blue|red|green|gold|orange|purple|maroon|crimson|cardinal|teal|garnet|yellow|black|white)\b[^#]{0,48}(#[0-9A-Fa-f]{6})",
        html,
        flags=re.I,
    ):
        name = match.group(1).title()
        color = normalize_hex(match.group(2))
        if not color:
            continue
        if name.lower() in {"white", "black"} or chromatic(color):
            pairs.append((name, color))
    if len(pairs) < 1:
        return None, None
    if not any(name.lower() == "primary" for name, _color in pairs) and len({color for _name, color in pairs}) < 2:
        return None, None
    primary = next((color for name, color in pairs if chromatic(color)), None)
    if not primary:
        return None, None
    secondary = next((color for _name, color in pairs if color != primary), primary)
    names = list(dict.fromkeys(name for name, _color in pairs))[:4]
    return [primary, secondary], names


def conference_from_html(html: str) -> str | None:
    """Use the athletics site's own conference field, not a mention in a story."""
    match = re.search(r'school_conference"\s*:\s*"([^"]+)"', html)
    if not match:
        match = re.search(r'"Conference"\s*:\s*"([^"]+)"', html)
    if match:
        short = match.group(1).strip()
        if short and re.search(rf"\b{re.escape(short)} Conference\b", html):
            return short if short.lower().endswith("conference") else f"{short} Conference"
        return short or None
    names = re.findall(r">([A-Z][A-Za-z0-9.&'’\- ]{2,40} Conference)</a>", html)
    names = [name.strip() for name in names if not re.search(r"\b(in|to|of|the)\b", name, flags=re.I)]
    if not names:
        return None
    counts: dict[str, int] = {}
    for name in names:
        counts[name] = counts.get(name, 0) + 1
    return max(counts, key=lambda name: counts[name])


def mascot_from_html(html: str, school_name: str) -> str | None:
    text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    match = re.search(r"Home of the ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})", text)
    if match:
        nickname = match.group(1).strip()
        if nickname.lower() not in GENERIC_MASCOT and len(nickname) >= 3:
            return nickname
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.I | re.S)
    if not title_match:
        return None
    title = re.sub(r"<[^>]+>", " ", title_match.group(1))
    title = re.sub(r"\s+", " ", title)
    title = re.sub(r"page not found|\(404\)|women'?s soccer roster|\d{4}[-–]\d{2,4}", " ", title, flags=re.I)
    words = [word for word in re.findall(r"[A-Za-z]+", title)]
    school_words = {word.lower() for word in re.findall(r"[A-Za-z]+", school_name)}
    leftover = [word for word in words if word.lower() not in school_words and word.lower() not in GENERIC_MASCOT]
    if 1 <= len(leftover) <= 3 and all(len(word) >= 3 for word in leftover):
        return " ".join(leftover)
    return None


def definition(html: str, label: str) -> str | None:
    match = re.search(rf"<dt>\s*{label}\s*</dt>\s*<dd>(.*?)</dd>", html, flags=re.I | re.S)
    if not match:
        return None
    text = re.sub(r"<[^>]+>", " ", match.group(1))
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def search_links(query: str, fetch) -> list[str]:
    url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(query)
    status, _final, body = fetch(url)
    if status != 200:
        return []
    links: list[str] = []
    for match in re.finditer(r"uddg=([^&\"']+)", body):
        link = urllib.parse.unquote(match.group(1))
        if link.startswith("http") and link not in links:
            links.append(link.split("#")[0])
    return links[:8]


def ncaa_profile(seed: dict, fetch) -> dict | None:
    if not str(seed.get("division", "")).startswith("NCAA"):
        return None
    for link in search_links(f"site:ncaa.com/schools {seed['name']}", fetch):
        if "ncaa.com/schools/" not in link:
            continue
        status, final, body = fetch(link)
        if status != 200 or "ncaa.com/schools/" not in final:
            continue
        title = definition(body, "Nickname")
        conference = definition(body, "Conference")
        colors = definition(body, "Colors")
        if not title and not conference:
            continue
        page_title = re.search(r"<title[^>]*>(.*?)</title>", body, flags=re.I | re.S)
        title_text = page_title.group(1) if page_title else ""
        hay = re.sub(r"\s+", " ", f"{title_text} {title or ''} {conference or ''}").lower()
        skip = {"university", "college", "institute", "school", "the", "of", "and", "at"}
        tokens = [token for token in re.findall(r"[A-Za-z0-9]+", seed["name"]) if token.lower() not in skip and len(token) > 3]
        if not tokens:
            tokens = re.findall(r"[A-Za-z0-9]+", seed["name"])
        if not tokens or not all(token.lower() in hay for token in tokens):
            continue
        athletics = []
        for href in re.findall(r'class="school-links"[\s\S]{0,2500}?href="(https?://[^"]+)"', body, flags=re.I):
            if "ncaa.com" in href:
                continue
            athletics.append(href)
        return {
            "url": final.split("?")[0],
            "nickname": title,
            "conference": conference,
            "colorNames": colors,
            "athletics": athletics[:2],
        }
    return None


def origin(url: str) -> str | None:
    parts = urllib.parse.urlparse(url)
    if not parts.scheme or not parts.netloc:
        return None
    return f"{parts.scheme}://{parts.netloc}"


def same_school_host(url: str, *bases: str | None) -> bool:
    host = urllib.parse.urlparse(url).netloc.lower().removeprefix("www.")
    if not host:
        return False
    for base in bases:
        if not base:
            continue
        other = urllib.parse.urlparse(base).netloc.lower().removeprefix("www.")
        if other and (host == other or host.endswith("." + other) or other.endswith("." + host)):
            return True
    return host.endswith(".edu")


def confirm_instagram(handle: str, athletics_url: str | None, fetch, extract_handle) -> dict | None:
    """Accept a bio only when it names soccer and links the athletics host."""
    if not athletics_url:
        return None
    status, final, body = fetch(f"https://www.instagram.com/{handle}/")
    if status != 200:
        return None
    description = ""
    for pattern in (
        r'property=["\']og:description["\'][^>]*content=["\']([^"\']+)',
        r'name=["\']description["\'][^>]*content=["\']([^"\']+)',
    ):
        match = re.search(pattern, body, flags=re.I)
        if match:
            description = urllib.parse.unquote(match.group(1))
            break
    athletics_host = urllib.parse.urlparse(athletics_url).netloc.lower().removeprefix("www.")
    linked = athletics_host and athletics_host in description.lower()
    named = bool(re.search(r"women'?s soccer|wsoc", description, flags=re.I))
    if named and linked:
        return {
            "method": "profile-bio",
            "url": final if "instagram.com" in final else f"https://www.instagram.com/{handle}/",
            "note": "The profile bio names women's soccer and links the athletics site.",
        }
    found = handles_in(description, extract_handle)
    if handle in found and named and linked:
        return {
            "method": "profile-bio",
            "url": f"https://www.instagram.com/{handle}/",
            "note": "The profile bio names women's soccer and links the athletics site.",
        }
    return None


def resolve_instagram(seed, athletics_url, html, school_home, fetch, instagram_handle, extract_handle, page_matches) -> dict | None:
    def pack(handle: str, kind: str, method: str, url: str, note: str) -> dict:
        return {
            "instagramHandle": handle,
            "instagramKind": kind,
            "instagramConfirmation": {"method": method, "kind": kind, "url": url, "note": note},
        }

    if html and athletics_url:
        strict = instagram_handle(html, athletics_url)
        if strict:
            return pack(
                strict,
                "team",
                "athletics-page",
                athletics_url,
                "The women's soccer page links this Instagram in the team social menu.",
            )
        if soccer_url(athletics_url):
            promo = promo_handles(html, extract_handle)
            if len(promo) == 1:
                return pack(
                    promo[0],
                    "team",
                    "athletics-page",
                    athletics_url,
                    "The women's soccer page links this Instagram from its social icons.",
                )
        for social in outbound_social(html):
            status, final, social_html = fetch(social)
            if status != 200:
                continue
            found = handles_in(social_html, extract_handle)
            if len(found) == 1:
                return pack(
                    found[0],
                    "team",
                    "official-social",
                    final.split("?")[0],
                    "The X or Facebook page linked from the women's soccer site links this Instagram.",
                )

    fetched = 0
    for link in search_links(f"{seed['name']} women's soccer instagram", fetch):
        if "instagram.com" in link:
            candidate = handles_in(link, extract_handle)
            if len(candidate) == 1:
                bio = confirm_instagram(candidate[0], athletics_url, fetch, extract_handle)
                if bio:
                    return pack(candidate[0], "team", bio["method"], bio["url"], bio["note"])
            continue
        if not same_school_host(link, athletics_url, school_home):
            continue
        if fetched >= 3:
            break
        fetched += 1
        status, final, body = fetch(link)
        if status != 200 or not page_matches(seed, final, body):
            continue
        if not soccer_url(final):
            continue
        strict = instagram_handle(body, final)
        promo = promo_handles(body, extract_handle)
        chosen = strict or (promo[0] if len(promo) == 1 else None)
        if chosen:
            return pack(
                chosen,
                "team",
                "web-search-official-page",
                final.split("?")[0],
                f"A web search for {seed['name']} women's soccer Instagram found this official page, which links the handle.",
            )

    athletics_home = origin(athletics_url) if athletics_url else None
    if athletics_home:
        status, final, body = fetch(athletics_home + "/")
        if status == 200 and page_matches(seed, final, body):
            found = sitewide_handles(body, extract_handle)
            if len(found) == 1:
                return pack(
                    found[0],
                    "athletics",
                    "athletics-page",
                    final.split("?")[0],
                    "No team Instagram was confirmed. The athletics homepage links this account.",
                )

    fetched = 0
    for link in search_links(f"{seed['name']} athletics instagram", fetch):
        if "instagram.com" in link or not same_school_host(link, athletics_url, school_home):
            continue
        if fetched >= 2:
            break
        fetched += 1
        status, final, body = fetch(link)
        if status != 200 or not page_matches(seed, final, body) or soccer_url(final):
            continue
        found = sitewide_handles(body, extract_handle)
        if len(found) == 1:
            return pack(
                found[0],
                "athletics",
                "web-search-official-page",
                final.split("?")[0],
                f"A web search for {seed['name']} athletics Instagram found this official page, which links the handle.",
            )

    if school_home and school_home.startswith("http"):
        status, final, body = fetch(school_home)
        if status == 200 and page_matches(seed, final, body):
            found = sitewide_handles(body, extract_handle)
            if len(found) == 1:
                return pack(
                    found[0],
                    "school",
                    "school-homepage",
                    final.split("?")[0],
                    "No team or athletics Instagram was confirmed. The university homepage links this account.",
                )

    fetched = 0
    for link in search_links(f"{seed['name']} official instagram", fetch):
        if "instagram.com" in link or not same_school_host(link, school_home):
            continue
        if fetched >= 2:
            break
        fetched += 1
        status, final, body = fetch(link)
        if status != 200 or not page_matches(seed, final, body):
            continue
        if athletics_url and urllib.parse.urlparse(final).netloc == urllib.parse.urlparse(athletics_url).netloc:
            continue
        found = sitewide_handles(body, extract_handle)
        if len(found) == 1:
            return pack(
                found[0],
                "school",
                "web-search-official-page",
                final.split("?")[0],
                f"A web search for {seed['name']} official Instagram found this university page, which links the handle.",
            )
    return None


def discover_roster(seed, school_home, fetch, try_roster, roster_paths):
    queries = [f"{seed['name']} women's soccer roster", f"{seed['name']} athletics women's soccer"]
    for query in queries:
        for link in search_links(query, fetch):
            if any(part in link.lower() for part in ("wikipedia.org", "espn.com", "instagram.com", "facebook.com", "ncaa.com")):
                continue
            if not re.search(r"roster|womens?-soccer|wsoc|w-soccer", link, flags=re.I):
                continue
            found, body = try_roster(seed, link)
            if found:
                return found, body
    ncaa = ncaa_profile(seed, fetch)
    if ncaa:
        for link in ncaa.get("athletics") or []:
            base = origin(link)
            if not base:
                continue
            for path in roster_paths:
                found, body = try_roster(seed, base + path)
                if found:
                    return found, body
            found, body = try_roster(seed, link)
            if found:
                return found, body
    if school_home:
        return None, ""
    return None, ""


def ncaa_slugs(seed: dict) -> list[str]:
    slugs = [seed["id"]]
    name = seed["name"].lower().replace("&", " and ")
    slug = re.sub(r"[^a-z0-9]+", "-", name).strip("-")
    slugs.append(slug)
    for drop in ("-university", "-college", "-institute", "-school"):
        if drop in slug:
            slugs.append(slug.replace(drop, ""))
    if slug.endswith("-state"):
        slugs.append(slug[: -len("state")] + "st")
    extra = {
        "uccs": ["colorado-colorado-springs", "uc-colorado-springs"],
        "pomona-pitzer": ["pomona-pitzer", "pomona"],
        "tcu": ["tcu", "texas-christian"],
        "lsu": ["lsu", "louisiana-st"],
        "byu": ["brigham-young", "byu"],
        "mit": ["massachusetts-institute-technology", "mit"],
        "umsl": ["missouri-st-louis", "missouri-st"],
    }
    slugs.extend(extra.get(seed["id"], []))
    unique: list[str] = []
    for slug in slugs:
        slug = slug.strip("-")
        if slug and slug not in unique:
            unique.append(slug)
    return unique


def ncaa_by_slug(seed: dict, fetch) -> dict | None:
    if not str(seed.get("division", "")).startswith("NCAA"):
        return None
    skip = {"university", "college", "institute", "school", "the", "of", "and", "at"}
    tokens = [token for token in re.findall(r"[A-Za-z0-9]+", seed["name"]) if token.lower() not in skip and len(token) > 2]
    if not tokens:
        tokens = re.findall(r"[A-Za-z0-9]+", seed["name"])
    for slug in ncaa_slugs(seed):
        status, final, body = fetch(f"https://www.ncaa.com/schools/{slug}")
        if status != 200 or "/schools/" not in final:
            continue
        nickname = definition(body, "Nickname")
        conference = definition(body, "Conference")
        colors = definition(body, "Colors")
        title_match = re.search(r"<title[^>]*>(.*?)</title>", body, flags=re.I | re.S)
        hay = re.sub(r"\s+", " ", f"{title_match.group(1) if title_match else ''} {nickname or ''}").lower()
        if not all(token.lower() in hay for token in tokens):
            continue
        athletics = []
        for href in re.findall(r'href="(https?://[^"]+)"', body, flags=re.I):
            if "school-links" in body[max(0, body.find(href) - 400) : body.find(href)]:
                if "ncaa.com" not in href:
                    athletics.append(href)
        if not athletics:
            athletics = [
                href
                for href in re.findall(r'class="school-links"[\s\S]{0,1800}?href="(https?://[^"]+)"', body, flags=re.I)
                if "ncaa.com" not in href
            ]
        return {
            "url": final.split("?")[0],
            "nickname": nickname,
            "conference": conference,
            "colorNames": colors,
            "athletics": athletics[:2],
        }
    return None


def remember(program: dict, field: str, label: str, url: str) -> None:
    sources = program.setdefault("sources", [])
    if any(item.get("field") == field and item.get("url") == url for item in sources):
        return
    sources.append({"field": field, "label": label, "url": url})


def fill_gaps(programs: list[dict], seeds: dict[str, dict], fetch, helpers) -> None:
    """Second pass for schools still missing an NCAA directory fact or athletics page."""
    roster_paths = helpers["roster_paths"]
    try_roster = helpers["try_roster"]
    for program in programs:
        seed = seeds.get(program["id"])
        if not seed:
            continue
        ncaa = None
        needs_directory = str(seed.get("division", "")).startswith("NCAA") and (
            not program.get("mascot") or not program.get("conference") or not program.get("athleticsUrl")
        )
        if needs_directory:
            ncaa = ncaa_by_slug(seed, fetch)
        if ncaa:
            if ncaa.get("nickname") and not program.get("mascot"):
                program["mascot"] = ncaa["nickname"]
                remember(program, "mascot", "NCAA.com school directory", ncaa["url"])
            if ncaa.get("conference") and not program.get("conference"):
                program["conference"] = ncaa["conference"]
                remember(program, "conference", "NCAA.com school directory", ncaa["url"])
            if ncaa.get("colorNames") and not program.get("colorNames"):
                program["colorNames"] = ncaa["colorNames"]
                remember(program, "colorNames", "NCAA.com school directory", ncaa["url"])
            if not program.get("athleticsUrl"):
                for link in ncaa.get("athletics") or []:
                    base = origin(link)
                    if not base:
                        continue
                    for path in roster_paths:
                        found, body = try_roster(seed, base + path)
                        if not found:
                            continue
                        parsed = helpers["parse_athletics"](found, body)
                        program["athleticsUrl"] = parsed["athleticsUrl"]
                        if parsed.get("coaches"):
                            program["coaches"] = parsed["coaches"]
                        if parsed.get("roster"):
                            program["roster"] = parsed["roster"]
                        if parsed.get("questionnaireUrl") and not program.get("questionnaireUrl"):
                            program["questionnaireUrl"] = parsed["questionnaireUrl"]
                        remember(program, "athletics", "Official athletics page", parsed["athleticsUrl"])
                        colors, source = colors_from_html(body)
                        if colors and not program.get("colors"):
                            program["colors"] = colors
                            program["colorSource"] = source
                            remember(program, "colors", "Athletics site theme colors", parsed["athleticsUrl"])
                        conference = conference_from_html(body)
                        if conference and not program.get("conference"):
                            program["conference"] = conference
                            remember(program, "conference", "Official athletics page", parsed["athleticsUrl"])
                        if not program.get("instagramHandle"):
                            instagram = resolve_instagram(
                                seed,
                                parsed["athleticsUrl"],
                                body,
                                program.get("admissionsUrl"),
                                fetch,
                                helpers["instagram_handle"],
                                helpers["extract_handle"],
                                helpers["page_matches"],
                            )
                            if instagram:
                                program["instagramHandle"] = instagram["instagramHandle"]
                                program["instagramKind"] = instagram["instagramKind"]
                                program["instagramConfirmation"] = instagram["instagramConfirmation"]
                                remember(program, "instagram", "Official Instagram", instagram["instagramConfirmation"]["url"])
                        break
                    if program.get("athleticsUrl"):
                        break
        if program.get("athleticsUrl") and not program.get("colors"):
            status, final, body = fetch(program["athleticsUrl"])
            colors, source = (None, None)
            if status == 200:
                colors, source = colors_from_html(body)
            if not colors:
                home = origin(program["athleticsUrl"])
                if home:
                    status, final, body = fetch(home + "/")
                    if status == 200:
                        colors, source = colors_from_html(body)
                        final = home + "/"
            if colors and source:
                program["colors"] = colors
                program["colorSource"] = source
                remember(program, "colors", "Athletics site theme colors", final.split("?")[0])


def apply_enrichment(seed, facts, athletics, html, fetch, helpers) -> dict:
    """Return extra program fields. helpers provides parsers from the collector."""
    extra: dict = {
        "conference": None,
        "mascot": None,
        "colors": None,
        "colorNames": None,
        "colorSource": None,
        "instagramKind": None,
        "instagramConfirmation": None,
    }
    sources: list[dict] = []
    notes: list[str] = []
    page_url = athletics.get("athleticsUrl")
    if not page_url:
        found, found_html = discover_roster(
            seed,
            facts.get("admissionsUrl"),
            fetch,
            helpers["try_roster"],
            helpers["roster_paths"],
        )
        if found:
            parsed = helpers["parse_athletics"](found, found_html)
            athletics.update(parsed)
            html = found_html
            page_url = athletics.get("athleticsUrl")
            notes.append("Athletics page found from a web search or the NCAA school directory.")

    if page_url and html and not athletics.get("coaches"):
        coaches_page = None
        if page_url.rstrip("/").endswith("/roster"):
            coaches_page = page_url.rstrip("/")[: -len("roster")] + "coaches"
        if coaches_page:
            status, final, coaches_html = fetch(coaches_page)
            if status == 200 and helpers["page_matches"](seed, final, coaches_html):
                parsed = helpers["parse_athletics"](final, coaches_html)
                if parsed.get("coaches"):
                    athletics["coaches"] = parsed["coaches"]
                    notes.append("Coach names were read from the coaching staff page.")

    if html and page_url:
        conference = conference_from_html(html)
        if conference:
            extra["conference"] = conference
            sources.append({"field": "conference", "label": "Official athletics page", "url": page_url})
        colors, source = colors_from_html(html)
        if colors and source:
            extra["colors"] = colors
            extra["colorSource"] = source
            sources.append({"field": "colors", "label": "Athletics site theme colors", "url": page_url})
        nickname = mascot_from_html(html, seed["name"])
        if nickname:
            extra["mascot"] = nickname
            sources.append({"field": "mascot", "label": "Official athletics page", "url": page_url})

    if str(seed.get("division", "")).startswith("NCAA"):
        ncaa = ncaa_profile(seed, fetch)
        if ncaa:
            if ncaa.get("conference") and not extra["conference"]:
                extra["conference"] = ncaa["conference"]
                sources.append({"field": "conference", "label": "NCAA.com school directory", "url": ncaa["url"]})
            elif ncaa.get("conference") and extra["conference"] and ncaa["conference"].lower() in extra["conference"].lower():
                sources.append({"field": "conference", "label": "NCAA.com school directory", "url": ncaa["url"]})
            if ncaa.get("nickname"):
                extra["mascot"] = ncaa["nickname"]
                sources.append({"field": "mascot", "label": "NCAA.com school directory", "url": ncaa["url"]})
            if ncaa.get("colorNames"):
                extra["colorNames"] = ncaa["colorNames"]
                sources.append({"field": "colorNames", "label": "NCAA.com school directory", "url": ncaa["url"]})

    if not extra["colors"] and facts.get("admissionsUrl"):
        status, final, home = fetch(facts["admissionsUrl"])
        if status == 200:
            for href in re.findall(r'href=["\']([^"\']+)["\']', home, flags=re.I):
                if not re.search(r"brand|visual-identity|identity-guide|style-guide", href, flags=re.I):
                    continue
                brand_url = urllib.parse.urljoin(final, href)
                if not brand_url.startswith("http"):
                    continue
                brand_status, brand_final, brand_html = fetch(brand_url)
                if brand_status != 200 or "pdf" in brand_final.lower():
                    continue
                colors, names = brand_colors(brand_html)
                if colors:
                    extra["colors"] = colors
                    extra["colorSource"] = "brand-guide"
                    if names and not extra["colorNames"]:
                        extra["colorNames"] = ", ".join(names)
                    sources.append({"field": "colors", "label": "Official brand or identity page", "url": brand_final.split("?")[0]})
                    break

    instagram = resolve_instagram(
        seed,
        page_url,
        html,
        facts.get("admissionsUrl"),
        fetch,
        helpers["instagram_handle"],
        helpers["extract_handle"],
        helpers["page_matches"],
    )
    if instagram:
        extra.update(instagram)
        kind = instagram["instagramKind"]
        label = {"team": "Official team Instagram", "athletics": "Official athletics Instagram", "school": "Official university Instagram"}[kind]
        sources.append({"field": "instagram", "label": label, "url": instagram["instagramConfirmation"]["url"]})
        athletics["instagramHandle"] = instagram["instagramHandle"]

    extra["sources"] = sources
    extra["notes"] = notes
    extra["athletics"] = athletics
    extra["html"] = html
    return extra
