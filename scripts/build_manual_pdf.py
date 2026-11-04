#!/usr/bin/env python3
"""Create a print-ready manual from an already-generated MkDocs site.

The nav in mkdocs.yml defines chapter order. Interactive calculators are
linked to their web pages; a static PDF cannot perform dose calculations.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from urllib.parse import urljoin, urlsplit

import yaml
from bs4 import BeautifulSoup
from weasyprint import HTML

PUBLIC_URL = "https://gonzaloares.github.io/urgencias-pediatricas/"

PRINT_CSS = """
@page {
  size: A4;
  margin: 19mm 17mm 18mm;
  @bottom-left { content: 'Manual de Urgencias Pediátricas'; font: 8pt 'DejaVu Sans', sans-serif; color: #718096; }
  @bottom-right { content: counter(page); font: 8pt 'DejaVu Sans', sans-serif; color: #718096; }
}
@page :first { @bottom-left { content: none; } @bottom-right { content: none; } }
* { box-sizing: border-box; }
html { font-family: 'DejaVu Sans', sans-serif; color: #24343b; font-size: 9.2pt; }
body { line-height: 1.48; }
h1, h2, h3, h4 { color: #0c625f; line-height: 1.25; break-after: avoid; }
h1 { font-size: 17pt; margin: 0 0 12pt; }
h2 { font-size: 12.5pt; padding-bottom: 4pt; border-bottom: 1px solid #cbdeda; margin: 17pt 0 8pt; }
h3 { font-size: 10.5pt; margin: 12pt 0 5pt; }
p { margin: 5pt 0 8pt; orphans: 2; widows: 2; }
li { margin: 2pt 0; }
ul, ol { padding-left: 17pt; margin: 5pt 0 8pt; }
a { color: #116b77; text-decoration: none; overflow-wrap: anywhere; }
strong, b { font-weight: 700; }
table { border-collapse: collapse; width: 100%; max-width: 100%; font-size: 7.6pt; table-layout: auto; margin: 9pt 0 12pt; }
th, td { border: 0.5pt solid #b9cecb; padding: 3pt 4pt; vertical-align: top; overflow-wrap: normal; word-break: normal; hyphens: manual; }
th a, td a { overflow-wrap: normal; word-break: normal; }
th { background: #e7f2f0; color: #155f5d; }
table.print-score-table th:first-child, table.print-score-table td:first-child { width: 31%; }
table.print-score-table th:nth-child(2), table.print-score-table td:nth-child(2) { width: 13%; white-space: nowrap; }
table.print-score-table th:last-child, table.print-score-table td:last-child { width: 56%; }
tr { break-inside: avoid; }
thead { display: table-header-group; }
img, svg { max-width: 100%; height: auto; }
pre, code { font-family: 'DejaVu Sans Mono', monospace; overflow-wrap: anywhere; }
pre { white-space: pre-wrap; font-size: 7.5pt; background: #f1f5f5; padding: 7pt; }
.chapter { break-before: page; }
.chapter .section-name { color: #6b8380; font-weight: bold; font-size: 9pt; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 8pt; }
.chapter .md-content__inner > h1:first-child { margin-top: 0; }
.cover { break-after: page; padding-top: 60mm; }
.cover-kicker { color: #268e8a; font-size: 12pt; letter-spacing: .15em; }
.cover h1 { font-size: 36pt; line-height: 1.14; margin: 13mm 0 7mm; }
.cover-subtitle { font-size: 13pt; color: #516569; }
.cover-rule { width: 38mm; height: 3pt; background: #1e8883; margin: 15mm 0; }
.cover-meta { color: #5f7777; margin-top: 20mm; font-size: 9pt; }
.contents { break-after: page; }
.contents h1 { font-size: 22pt; }
.contents-group { margin: 12pt 0 7pt; break-inside: avoid; }
.contents-group h2 { font-size: 10.5pt; border: none; margin: 0 0 4pt; }
.contents-item { margin: 3pt 0 3pt 11pt; font-size: 8.6pt; }
.protocol-intro, .clinical-card, .dose-card, .calculator-note {
  display: block; border-left: 3pt solid #248783; background: #f0f8f6;
  padding: 7pt 9pt; margin: 10pt 0; break-inside: avoid;
}
.clinical-card-warning { border-left-color: #bf8a20; background: #fff8e9; }
.clinical-card-danger { border-left-color: #b84545; background: #fff1f1; }
.dose-card > * { display: block; margin: 2pt 0; }
.md-typeset__scrollwrap, .md-typeset__table, .dose-table-wrap { display: block; width: 100%; overflow: visible; }
.headerlink, .protocol-shortcuts, .md-content__button, .md-source-file, .md-clipboard { display: none !important; }
"""

def chapters_from_navigation(nav: list, doc_root: Path):
    """Yield (section title, label, Markdown file) in navigation order."""
    seen = set()
    for section in nav:
        for group, children in section.items():
            if not isinstance(children, list):
                continue
            for child in children:
                if isinstance(child, str):
                    path = child
                    label = Path(path).stem.replace('-', ' ').title()
                elif isinstance(child, dict):
                    label, path = next(iter(child.items()))
                else:
                    continue
                if not path.endswith('.md') or Path(path).name == 'index.md' or path in seen:
                    continue
                seen.add(path)
                yield group, str(label), path
    for file in sorted(doc_root.rglob('*.md')):
        if file.name == 'index.md':
            continue
        path = file.relative_to(doc_root).as_posix()
        if path not in seen:
            yield 'Otros protocolos', file.stem.replace('-', ' ').title(), path

def site_html_path(site: Path, doc_path: str) -> Path:
    return site / Path(doc_path[:-3]) / 'index.html'

def reflow_numeric_score_tables(article, soup):
    """Print wide numerical score matrices as 3-column tables, without losing scores.

    In A4, seven-column scales such as Westley have tiny cells that may
    split even short words. The public website keeps the original matrix.
    """
    for table in article.select('table'):
        rows = table.find_all('tr')
        if len(rows) < 2:
            continue
        headers = [cell.get_text(' ', strip=True) for cell in rows[0].find_all(['th', 'td'], recursive=False)]
        if (len(headers) < 5 or headers[0].casefold() not in ('parámetro', 'parametro')
                or not all(label.isdecimal() for label in headers[1:])):
            continue

        entries = []
        for row in rows[1:]:
            cells = row.find_all(['th', 'td'], recursive=False)
            if len(cells) != len(headers):
                entries = []
                break
            parameter = cells[0].get_text(' ', strip=True)
            for score, cell in zip(headers[1:], cells[1:]):
                finding = cell.get_text(' ', strip=True)
                if finding and finding not in ('—', '–', '-'):
                    entries.append((parameter, score, finding))
        if not entries:
            continue

        new_table = soup.new_tag('table', attrs={'class': 'print-score-table'})
        new_head = soup.new_tag('thead')
        header_row = soup.new_tag('tr')
        for title in ('Parámetro', 'Puntos', 'Hallazgo'):
            th = soup.new_tag('th')
            th.string = title
            header_row.append(th)
        new_head.append(header_row)
        new_table.append(new_head)
        body = soup.new_tag('tbody')
        for parameter, score, finding in entries:
            tr = soup.new_tag('tr')
            for value in (parameter, score, finding):
                td = soup.new_tag('td')
                td.string = value
                tr.append(td)
            body.append(tr)
        new_table.append(body)
        table.replace_with(new_table)


def printable_content(source: Path, chapter_id: str, chapter_urls: dict[str, str], current_url: str):
    soup = BeautifulSoup(source.read_text(encoding='utf-8'), 'html.parser')
    article = soup.select_one('.md-content__inner')
    if article is None:
        raise ValueError(f'Missing MkDocs article in {source}')
    for node in article.select('script, style, nav.protocol-shortcuts, .md-content__button, .md-clipboard, .headerlink'):
        node.decompose()
    for widget in article.select('input, button, select, textarea, .dose-calculator, .infusion-calculator'):
        widget.decompose()

    reflow_numeric_score_tables(article, soup)

    if 'calculadora' in source.as_posix() or 'perfusiones/index.html' in source.as_posix():
        note = soup.new_tag('p', attrs={'class': 'calculator-note'})
        link = soup.new_tag('a', href=current_url)
        link.string = 'Abrir la versión interactiva y sus calculadoras en la web.'
        note.append(link)
        article.insert(0, note)

    for node in article.select('[id]'):
        node['id'] = f'{chapter_id}--{node["id"]}'

    for link in article.select('a[href]'):
        href = link.get('href', '')
        if not href or href.startswith(('mailto:', 'tel:', 'javascript:')):
            continue
        absolute = urljoin(current_url, href)
        parsed = urlsplit(absolute)
        target_page = absolute.split('#')[0]
        if target_page in chapter_urls:
            target = chapter_urls[target_page]
            link['href'] = f'#{target}--{parsed.fragment}' if parsed.fragment else f'#{target}'
        elif href.startswith('#'):
            link['href'] = f'#{chapter_id}--{href[1:]}'
        else:
            link['href'] = absolute

    for img in article.select('img[src]'):
        src = img['src']
        if not src.startswith(('https://', 'http://', 'data:', 'file:')):
            img['src'] = (source.parent / src).resolve().as_uri()
    return str(article)

def build(site: Path, config: Path, output: Path, public_url: str):
    config_data = yaml.safe_load(config.read_text(encoding='utf-8'))
    docs = config.parent / 'docs'
    chapters = list(chapters_from_navigation(config_data['nav'], docs))
    if not chapters:
        raise RuntimeError('No chapters found in mkdocs.yml')

    chapter_urls = {}
    for i, (_, _, path) in enumerate(chapters, 1):
        chapter_urls[urljoin(public_url, path[:-3] + '/')] = f'chapter-{i}'

    sections, rendered = [], []
    current_section = None
    for i, (section, label, path) in enumerate(chapters, 1):
        source = site_html_path(site, path)
        if not source.is_file():
            raise FileNotFoundError(f'Chapter missing from generated site: {source}')
        chapter_id = f'chapter-{i}'
        page_url = urljoin(public_url, path[:-3] + '/')
        if section != current_section:
            sections.append([section, []])
            current_section = section
        sections[-1][1].append((label, chapter_id))
        content = printable_content(source, chapter_id, chapter_urls, page_url)
        rendered.append(f'<section class="chapter" id="{chapter_id}"><div class="section-name">{escape(section)}</div>{content}</section>')

    toc = []
    for group, items in sections:
        links = ''.join(f'<div class="contents-item"><a href="#{ref}">{escape(label)}</a></div>' for label, ref in items)
        toc.append(f'<section class="contents-group"><h2>{escape(group)}</h2>{links}</section>')

    today = datetime.now(timezone.utc).strftime('%d/%m/%Y')
    html = f'''<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Manual de Urgencias Pediátricas</title><style>{PRINT_CSS}</style></head><body>
      <section class="cover"><div class="cover-kicker">PROTOCOLOS CLÍNICOS</div><h1>Manual de<br>Urgencias Pediátricas</h1>
      <div class="cover-rule"></div><p class="cover-subtitle">Edición digital compilada de los protocolos del repositorio</p>
      <p class="cover-meta">Actualizado: {today} · {len(chapters)} capítulos<br>Fuente: <a href="{escape(public_url)}">{escape(public_url)}</a></p></section>
      <section class="contents"><h1>Índice de contenidos</h1>{''.join(toc)}</section>
      {''.join(rendered)}
    </body></html>'''
    output.parent.mkdir(parents=True, exist_ok=True)
    HTML(string=html, base_url=site.resolve().as_uri() + '/').write_pdf(output)
    if output.stat().st_size < 8_000 or output.read_bytes()[:5] != b'%PDF-':
        raise RuntimeError('PDF generation failed integrity checks')
    print(f'Generated {output} ({len(chapters)} chapters, {output.stat().st_size:,} bytes)')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, default=Path('site'))
    parser.add_argument('--config', type=Path, default=Path('mkdocs.yml'))
    parser.add_argument('--output', type=Path, default=Path('site/manual-urgencias-pediatricas.pdf'))
    parser.add_argument('--public-url', default=PUBLIC_URL)
    args = parser.parse_args()
    build(args.site.resolve(), args.config.resolve(), args.output.resolve(), args.public_url)

if __name__ == '__main__':
    main()
