"""Monitor diário de índices oficiais. Não interpreta textos como autorização/cronograma."""
import concurrent.futures
import hashlib
import html
import json
import re
import time
import unicodedata
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets/news/concurso.json'
MAX_BYTES = 8_000_000


def normalize(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text.lower()) if unicodedata.category(c) != 'Mn')


class TextParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.ignore = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'): self.ignore += 1
        if not self.ignore: self.parts.append(' ')

    def handle_endtag(self, tag):
        if tag in ('script', 'style'): self.ignore = max(0, self.ignore - 1)
        if not self.ignore: self.parts.append(' ')

    def handle_data(self, data):
        if not self.ignore: self.parts.append(data)


def plain(text):
    p = TextParser(); p.feed(text)
    return ' '.join(''.join(p.parts).split())


def official_url(url):
    u = urlsplit(url)
    return u.scheme == 'https' and (u.hostname == 'mt.gov.br' or (u.hostname or '').endswith('.mt.gov.br')) and not u.username and not u.password


def canonical(url):
    u = urlsplit(html.unescape(url))
    return urlunsplit((u.scheme, u.netloc.lower(), u.path, '', ''))


def relevant(text):
    t = normalize(text)
    career = re.search(r'polici(?:a|ais|al) pena(?:l|is)|agentes? penitenciari|sistema (?:penitenciario|prisional)', t)
    event = re.search(r'concurs|edital|convoca|nomea|banca|inscri|comissao|prova|selecao', t)
    return bool(career and event)


def kind(text):
    t = normalize(text)
    if re.search(r'novo concurso|concurso novo|concurso.*(?:autoriz|anunci)|(?:autoriz|anunci).*concurso', t): return 'novo-concurso'
    if re.search(r'vigilantes? prisionais?|temporari|processo seletivo simplificado', t): return 'seletivo'
    if re.search(r'convoca|nomea|posse|aprovados', t): return 'convocacao'
    return 'publicacao'


def publication_date(text):
    m = re.search(r'\b(\d{1,2})/(\d{1,2})/(20\d{2})\b', text)
    if not m: return None
    try: return datetime(int(m[3]), int(m[2]), int(m[1])).date().isoformat()
    except ValueError: return None


def confirmed_events(text, url):
    patterns = [('Início das inscrições', r'in[ií]cio (?:das )?inscri[çc][õo]es'),
                ('Fim das inscrições', r'(?:fim|encerramento) (?:das )?inscri[çc][õo]es'),
                ('Pagamento da taxa', r'pagamento (?:da )?taxa'),
                ('Prova objetiva', r'prova objetiva')]
    events = []
    for label, pattern in patterns:
        for match in re.finditer(pattern + r'[^.;!?]{0,90}?\b(\d{1,2}/\d{1,2}/20\d{2})\b', text, re.I):
            context = match.group(0)
            if re.search(r'previst|estimad|poder|nao|não|confirmar', context, re.I): continue
            date = publication_date(match.group(1))
            if date: events.append({'label':label, 'date':date, 'context':context[:150], 'url':url})
    return events


def make_item(title, excerpt, url, source, published=None):
    url = canonical(url)
    if not official_url(url) or not relevant(title + ' ' + excerpt): return None
    # Exact short excerpts are identified as such in the UI; no generated claims.
    return {'id': hashlib.sha256(url.encode()).hexdigest()[:20], 'title': title[:250],
            'excerpt': excerpt[:360], 'url': url, 'sourceId': source['id'], 'source': source['name'],
            'publishedAt': published, 'kind': kind(title + ' ' + excerpt),
            'events': confirmed_events(excerpt, url) if kind(title + ' ' + excerpt) not in ('convocacao','seletivo') else []}


def parse_iomat(body, source):
    if not re.search(r'class=["\'][^"\']*resultados', body): raise ValueError('Índice oficial não reconhecido')
    items = []
    for block in re.findall(r'<li\b[^>]*class=["\'][^"\']*item-li[^"\']*["\'][^>]*>(.*?)</li>', body, re.S | re.I):
        heading = re.search(r'<h4[^>]*>(.*?)</h4>', block, re.S | re.I)
        link = re.search(r'href=["\']([^"\']*/detalhes/\d+)["\']', block)
        if not heading or not link: continue
        title = plain(heading[1]); snippet = re.search(r'<div[^>]*class=["\']content-result["\'][^>]*>(.*?)</div>', block, re.S | re.I)
        excerpt = plain(snippet[1]) if snippet else ''
        item = make_item(title, excerpt, urljoin(source['url'], link[1]), source, publication_date(title))
        if item: items.append(item)
    return items


def parse_liferay(body, source):
    if 'journal-content-article' not in body and 'asset-publisher' not in body and 'AssetPublisher' not in body:
        raise ValueError('Página oficial não reconhecida')
    items = []
    # Document links inside editorial paragraphs, never global navigation text.
    for block in re.findall(r'<p\b[^>]*>(.*?)</p>', body, re.S | re.I):
        for href, inner in re.findall(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', block, re.S | re.I):
            if '/documents/' not in href and '/w/' not in href: continue
            title, excerpt = plain(inner), plain(block)
            if len(title) < 12: continue
            item = make_item(title, excerpt, urljoin(source['url'], href), source)
            if item: items.append(item)
    # Headline links on official news indexes; exclude adjacent navigation / other news.
    for href, inner in re.findall(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', body, re.S | re.I):
        if '/w/' not in href and '/-/' not in href: continue
        title = plain(inner)
        if len(title) < 18 or len(title) > 300: continue
        item = make_item(title, '', urljoin(source['url'], href), source)
        if item: items.append(item)
    return items


def sources_for(now):
    current = now.astimezone(__import__('zoneinfo').ZoneInfo('America/Cuiaba'))
    year, month = current.year, current.month
    previous = (year, month - 1) if month > 1 else (year - 1, 12)
    sources = [
        {'id': 'sejus-editais', 'name': 'SEJUS · editais', 'url': 'https://www.sejus.mt.gov.br/editais', 'parser': 'liferay'},
        {'id': 'sejus-noticias', 'name': 'SEJUS · notícias', 'url': 'https://www.sejus.mt.gov.br/noticias', 'parser': 'liferay'},
        {'id': 'seplag-noticias', 'name': 'SEPLAG · notícias', 'url': 'https://www.seplag.mt.gov.br/noticias', 'parser': 'liferay'},
    ]
    for label, code in [('SEPLAG · concursos', '2499'), ('SEJUS · editais', '4255'), ('SEJUS · portarias', '4239')]:
        for y, m in [(year, month), previous]:
            sources.append({'id': f'iomat-{code}-{y}-{m}', 'name': f'Diário Oficial · {label} · {m:02}/{y}',
                            'url': f'https://iomat.mt.gov.br/legislacao/diario_oficial/{code}/{y}/{m}', 'parser': 'iomat'})
    return sources


def fetch_source(source):
    error = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(source['url'], headers={'User-Agent': 'PPMT-ConcursoMonitor/1.0 (+https://github.com/luandersonjesussantos063-eng/PP-MT)', 'Accept': 'text/html'})
            with urllib.request.urlopen(req, timeout=18) as r:
                if not official_url(r.url): raise ValueError('Redirecionamento fora da fonte oficial')
                if 'html' not in r.headers.get('Content-Type', ''): raise ValueError('Formato de fonte inesperado')
                data = r.read(MAX_BYTES + 1)
                if len(data) > MAX_BYTES: raise ValueError('Página excede limite de coleta')
                body = data.decode(r.headers.get_content_charset() or 'utf-8', errors='replace')
            parser = parse_iomat if source['parser'] == 'iomat' else parse_liferay
            return source, parser(body, source), None
        except Exception as e:
            error = type(e).__name__
            if attempt < 2: time.sleep(attempt + 1)
    return source, [], error


def merge(previous, results, checked):
    articles = {a['id']: dict(a) for a in previous.get('items', []) if official_url(a.get('url', ''))}
    old_sources = {s['id']: s for s in previous.get('sources', [])}
    successful, source_states, new_count = 0, [], 0
    for source, found, error in results:
        old = old_sources.get(source['id'], {})
        success = error is None
        successful += int(success)
        source_states.append({'id': source['id'], 'name': source['name'], 'url': source['url'],
                              'status': 'ok' if success else 'error', 'lastAttemptAt': checked,
                              'lastSuccessAt': checked if success else old.get('lastSuccessAt'),
                              'error': error, 'found': len(found) if success else None})
        for item in found:
            old_item = articles.get(item['id'])
            if not old_item: new_count += 1
            articles[item['id']] = {**item, 'firstSeenAt': old_item.get('firstSeenAt', checked) if old_item else checked,
                                    'lastSeenAt': checked, 'publishedAt': item.get('publishedAt') or (old_item or {}).get('publishedAt')}
    # Failed / removed sources never delete existing news or advance a full-success check.
    full = successful == len(results) and bool(results)
    return {**previous, 'schemaVersion': 1, 'checkedAt': checked,
            'lastSuccessAt': checked if full else previous.get('lastSuccessAt'),
            'lastPartialSuccessAt': checked if successful else previous.get('lastPartialSuccessAt'),
            'checkStatus': 'ok' if full else 'partial' if successful else 'error',
            'newCount': new_count, 'sources': source_states,
            'items': sorted(articles.values(), key=lambda a: a.get('publishedAt') or a.get('firstSeenAt', ''), reverse=True)[:100]}


def main():
    now = datetime.now(timezone.utc); checked = now.isoformat(timespec='seconds')
    previous = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {'items': [], 'sources': [], 'milestones': [], 'events': []}
    sources = sources_for(now)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: results = list(pool.map(fetch_source, sources))
    updated = merge(previous, results, checked)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUTPUT.with_suffix('.tmp'); tmp.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + '\n'); tmp.replace(OUTPUT)
    print(json.dumps({'status': updated['checkStatus'], 'sourcesOk': sum(e[2] is None for e in results),
                      'sourcesTotal': len(sources), 'news': len(updated['items']), 'new': updated['newCount']}, ensure_ascii=False))


if __name__ == '__main__': main()
