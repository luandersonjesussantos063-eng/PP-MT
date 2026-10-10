#!/usr/bin/env python3
"""Build a sitemap of public, canonical PP-MT pages from actual HTML files.
Excludes checkout/admin/private routes, duplicate URLs, and noindex pages.
Only the canonical HTTPS host is published. Uses the file's last Git edit.
"""
from html.parser import HTMLParser
from pathlib import Path
from datetime import date
from subprocess import run
from urllib.parse import urlparse
from xml.etree.ElementTree import Element, SubElement, tostring
import re

ROOT = Path(__file__).resolve().parent.parent
HOST = "ppmt.novabytesolucoes.com.br"
BASE = f"https://{HOST}"
BLOCKED = {"admin", "supabase", "tests"}
ALLOWED_TAG = re.compile(r"^(?:index|all)(?:,|$)", re.I)

class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = None
        self.robots = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "link" and "canonical" in (a.get("rel") or "").split():
            self.canonical = a.get("href")
        if tag == "meta" and (a.get("name") or "").lower() == "robots":
            self.robots = a.get("content") or ""

def expected_url(path):
    relative = path.relative_to(ROOT).as_posix()
    if relative == "index.html":
        return BASE + "/"
    if relative.endswith("/index.html"):
        return BASE + "/" + relative[:-10]
    return BASE + "/" + relative

def last_change(path):
    result = run(["git", "log", "-1", "--format=%cs", "--", str(path.relative_to(ROOT))],
                 cwd=ROOT, capture_output=True, text=True, check=False)
    stamp = result.stdout.strip()
    return stamp if re.fullmatch(r"\d{4}-\d{2}-\d{2}", stamp) else date.today().isoformat()

def indexable_pages():
    candidates = [ROOT / "index.html", *(ROOT / "planos").rglob("*.html")]
    for path in sorted(set(candidates)):
        if not path.is_file() or any(p in BLOCKED for p in path.parts):
            continue
        data = path.read_text(encoding="utf-8", errors="replace")
        head = Head()
        head.feed(data.split("</head>", 1)[0])
        url = expected_url(path)
        if not head.canonical or head.canonical != url:
            continue
        robots = (head.robots or "").lower()
        if "noindex" in robots:
            continue
        yield url, last_change(path)

def main():
    entries = list(indexable_pages())
    if not any(u == BASE + "/planos/" for u, _ in entries):
        raise SystemExit("Missing indexable PP-MT landing page")
    xmlns = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ElementRoot = Element("urlset", xmlns=xmlns)
    for url, modified in entries:
        node = SubElement(ElementRoot, "url")
        SubElement(node, "loc").text = url
        SubElement(node, "lastmod").text = modified
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + tostring(
        ElementRoot, encoding="unicode") + "\n"
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")
    print(f"Sitemap PP-MT: {len(entries)} URLs indexáveis com canonical verificado")

if __name__ == "__main__":
    main()
