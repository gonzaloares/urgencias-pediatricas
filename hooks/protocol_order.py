"""Coloca el algoritmo inmediatamente antes de la bibliografía al compilar MkDocs.

La transformación es común a todos los protocolos: no altera el contenido clínico
ni las anclas de navegación y se aplica también a las páginas del manual PDF.
"""

from __future__ import annotations

import re

# Secciones de nivel 2; la etiqueta <a id="..."> forma parte de la sección.
# Se admite una línea vacía entre el ancla y el encabezado.
_SECTION = re.compile(
    r"(?m)^(?:<a\s+id=[\"'](?P<anchor>[^\"']+)[\"']\s*></a>[ \t]*\n(?:[ \t]*\n)?)?"
    r"##[ \t]+(?P<title>[^\n]+)$"
)
_SHORTCUTS = re.compile(
    r'<nav\b[^>]*\bprotocol-shortcuts\b[^>]*>.*?</nav>', re.I | re.S
)
_ALGO_LINK = re.compile(r'<a\b[^>]*\bhref=[\"\']#algoritmo[\"\'][^>]*>.*?</a>', re.I | re.S)
_BIB_LINK = re.compile(r'<a\b[^>]*\bhref=[\"\']#bibliografia[\"\'][^>]*>.*?</a>', re.I | re.S)


def _section_kind(match: re.Match[str]) -> str | None:
    anchor = (match.group('anchor') or '').casefold()
    title = re.sub(r'^\d+\.\s*', '', match.group('title')).strip().casefold()
    if anchor == 'algoritmo' or title.startswith('algoritmo'):
        return 'algorithm'
    if anchor == 'bibliografia' or title.startswith(('bibliografía', 'bibliografia')):
        return 'bibliography'
    return None


def _order_shortcuts(markdown: str) -> str:
    """Mantiene el menú de accesos rápidos en el mismo orden que los apartados."""
    nav_match = _SHORTCUTS.search(markdown)
    if nav_match is None:
        return markdown
    nav = nav_match.group()
    algorithm = _ALGO_LINK.search(nav)
    bibliography = _BIB_LINK.search(nav)
    if algorithm is None or bibliography is None:
        return markdown
    # Si ya es el último enlace antes de bibliografía, no hacer nada.
    between = nav[algorithm.end():bibliography.start()] if algorithm.end() <= bibliography.start() else None
    if between is not None and not between.strip():
        return markdown

    link = algorithm.group()
    nav = nav[:algorithm.start()] + nav[algorithm.end():]
    bibliography = _BIB_LINK.search(nav)
    if bibliography is None:
        return markdown
    # Conservar la sangría de los enlaces en líneas independientes.
    preceding = nav[:bibliography.start()].rsplit('\n', 1)[-1]
    separator = '\n' + preceding if preceding.isspace() else ' '
    nav = nav[:bibliography.start()] + link + separator + nav[bibliography.start():]
    return markdown[:nav_match.start()] + nav + markdown[nav_match.end():]


def move_algorithm(markdown: str) -> str:
    """Desplaza solo el apartado Algoritmo, conservando las secciones restantes."""
    sections = list(_SECTION.finditer(markdown))
    algorithms = [(i, m) for i, m in enumerate(sections) if _section_kind(m) == 'algorithm']
    bibliographies = [m for m in sections if _section_kind(m) == 'bibliography']
    if len(algorithms) != 1 or len(bibliographies) != 1:
        return markdown

    algorithm_index, algorithm = algorithms[0]
    bibliography = bibliographies[0]
    # Posición válida: el algoritmo es ya la sección inmediatamente anterior.
    if algorithm_index + 1 < len(sections) and sections[algorithm_index + 1] == bibliography:
        return _order_shortcuts(markdown)

    start = algorithm.start()
    end = sections[algorithm_index + 1].start() if algorithm_index + 1 < len(sections) else len(markdown)
    chunk = markdown[start:end].strip('\n')
    without = markdown[:start] + markdown[end:]
    bibliographies_after = [m for m in _SECTION.finditer(without) if _section_kind(m) == 'bibliography']
    if len(bibliographies_after) != 1:
        return markdown
    insert_at = bibliographies_after[0].start()
    result = without[:insert_at].rstrip('\n') + '\n\n' + chunk + '\n\n' + without[insert_at:]

    # Renumerar exclusivamente protocolos con todos los H2 numerados.
    headings = re.findall(r'(?m)^##[ \t]+([^\n]+)$', result)
    if headings and all(re.match(r'^\d+\.\s+', heading) for heading in headings):
        number = 0

        def replace_heading(match: re.Match[str]) -> str:
            nonlocal number
            number += 1
            return f'{match.group(1)}{number}{match.group(2)}'

        result = re.sub(r'(?m)^(##[ \t]+)\d+(\.\s+)', replace_heading, result)

    return _order_shortcuts(result)


def on_page_markdown(markdown: str, page, config, files) -> str:
    """MkDocs hook: ajusta la posición al generar cada protocolo."""
    return move_algorithm(markdown)
