#!/usr/bin/env python3
"""
Fetch current Premier League club crests from Wikipedia and drop them into
both `public/logos/` (Node server) and `docs/logos/` (GitHub Pages build),
then rewrite `docs/data/logos.json` so the browser can discover the files.

Run this on a machine that has outbound HTTPS to `*.wikimedia.org`
(the Claude Code sandbox does not):

    python3 scripts/fetch-logos.py

Each club is resolved via the MediaWiki `pageimages` API, which returns a
thumbnail URL; we then strip the `/thumb/` segment to get the original
(usually SVG) asset. Pass `--slug arsenal` to refetch a single club, or
`--title "Burnley F.C."` for an ad-hoc Wikipedia page.

Note on rights: club crests are trademarked. Wikipedia hosts them under fair
use; ensure your own distribution meets whatever terms apply to your use.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import urllib.parse
import urllib.request

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT_DIRS = [REPO / "public" / "logos", REPO / "docs" / "logos"]
MANIFEST = REPO / "docs" / "data" / "logos.json"
TEAMS = REPO / "data" / "teams.json"

UA = "hotgames-logo-fetcher/1.0 (https://github.com/goga-jpg/hotgames; contact: admin@example.com)"

# 2025-26 Premier League clubs.
CLUBS = [
    ("arsenal",           "Arsenal F.C."),
    ("aston-villa",       "Aston Villa F.C."),
    ("bournemouth",       "AFC Bournemouth"),
    ("brentford",         "Brentford F.C."),
    ("brighton",          "Brighton & Hove Albion F.C."),
    ("burnley",           "Burnley F.C."),
    ("chelsea",           "Chelsea F.C."),
    ("crystal-palace",    "Crystal Palace F.C."),
    ("everton",           "Everton F.C."),
    ("fulham",            "Fulham F.C."),
    ("leeds",             "Leeds United F.C."),
    ("liverpool",         "Liverpool F.C."),
    ("manchester-city",   "Manchester City F.C."),
    ("manchester-united", "Manchester United F.C."),
    ("newcastle",         "Newcastle United F.C."),
    ("nottingham-forest", "Nottingham Forest F.C."),
    ("sunderland",        "Sunderland A.F.C."),
    ("tottenham",         "Tottenham Hotspur F.C."),
    ("west-ham",          "West Ham United F.C."),
    ("wolves",            "Wolverhampton Wanderers F.C."),
]

def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()

def wiki_pageimage(title: str) -> str | None:
    q = urllib.parse.urlencode({
        "action": "query",
        "prop": "pageimages",
        "format": "json",
        "pithumbsize": 1000,
        "titles": title,
    })
    data = json.loads(_get(f"https://en.wikipedia.org/w/api.php?{q}"))
    for page in data.get("query", {}).get("pages", {}).values():
        thumb = page.get("thumbnail", {}).get("source")
        if thumb:
            return thumb
    return None

def original_from_thumb(thumb_url: str) -> str:
    # /wikipedia/en/thumb/5/53/Arsenal_FC.svg/1000px-Arsenal_FC.svg.png
    #   -> /wikipedia/en/5/53/Arsenal_FC.svg
    m = re.match(
        r"(https?://upload\.wikimedia\.org/wikipedia/[^/]+)/thumb/([^/]+)/([^/]+)/([^/]+)/\d+px-[^/]+$",
        thumb_url,
    )
    if m:
        return f"{m.group(1)}/{m.group(2)}/{m.group(3)}/{m.group(4)}"
    return thumb_url

def fetch_one(slug: str, title: str) -> tuple[bool, str]:
    thumb = wiki_pageimage(title)
    if not thumb:
        return False, f"no pageimage found for {title!r}"
    orig = original_from_thumb(thumb)
    ext = orig.rsplit(".", 1)[-1].lower()
    if ext not in {"svg", "png", "jpg", "jpeg", "webp"}:
        ext = "png"
    body = _get(orig)
    for d in OUT_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        # Remove any stale file for this slug with a different extension.
        for stale in d.glob(f"{slug}.*"):
            if stale.suffix.lower().lstrip(".") != ext:
                stale.unlink()
        (d / f"{slug}.{ext}").write_bytes(body)
    return True, f"{ext} ({len(body):,} bytes) <- {orig}"

def rewrite_manifest() -> None:
    files = sorted(
        p.name for p in OUT_DIRS[1].iterdir()
        if p.suffix.lower() in {".svg", ".png", ".jpg", ".jpeg", ".webp"}
        and not p.name.startswith("_")
    )
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps({"files": files}, indent=2) + "\n")

def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug", help="only fetch this one club (e.g. 'arsenal')")
    ap.add_argument("--title", help="override Wikipedia page title for --slug")
    args = ap.parse_args(argv)

    if args.slug:
        title = args.title or dict(CLUBS).get(args.slug)
        if not title:
            print(f"unknown slug {args.slug!r} and no --title given", file=sys.stderr)
            return 2
        targets = [(args.slug, title)]
    else:
        targets = CLUBS

    ok = 0
    for slug, title in targets:
        try:
            done, note = fetch_one(slug, title)
            prefix = "OK   " if done else "MISS "
            print(f"{prefix} {slug:20s} {note}")
            if done:
                ok += 1
        except Exception as e:
            print(f"FAIL  {slug:20s} {type(e).__name__}: {e}")

    rewrite_manifest()
    print(f"\nFetched {ok}/{len(targets)} clubs. Manifest: {MANIFEST.relative_to(REPO)}")
    return 0 if ok == len(targets) else 1

if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
