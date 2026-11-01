"""Permite buscar con y sin tildes en el índice de Material for MkDocs.

La información visible (títulos y textos) no se modifica: se incorporan
únicamente formas alternativas al texto que consume el buscador.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

_WORDS = re.compile(r"[^\W_]+", re.UNICODE)


def without_accents(text: str) -> str:
    """Elimina acentos diacríticos, pero no confunde «ñ» y «n»."""
    chars = []
    for char in unicodedata.normalize("NFC", text):
        if char in "ñÑ":
            chars.append(char)
        else:
            chars.extend(
                c for c in unicodedata.normalize("NFD", char)
                if unicodedata.category(c) != "Mn"
            )
    return "".join(chars)


def augment_search_docs(data: dict) -> dict:
    """Añade una vez las variantes sin tilde de títulos y términos indexados."""
    for doc in data.get("docs", []):
        title = doc.get("title", "")
        content = doc.get("text", "")
        aliases = []
        seen = set()

        # Incluimos el título completo: búsquedas compuestas como
        # «sindrome nefrotico» encontrarán el protocolo correspondiente.
        folded_title = without_accents(title)
        if folded_title != title:
            aliases.append(folded_title)

        # Las variantes se deduplican para mantener reducido el índice offline.
        for word in _WORDS.findall(f"{title} {content}"):
            folded_word = without_accents(word)
            if folded_word != word:
                key = folded_word.casefold()
                if key not in seen:
                    aliases.append(folded_word)
                    seen.add(key)

        if aliases:
            doc["text"] = f"{content}\n\n{' '.join(aliases)}"

    return data


def on_post_build(config, **kwargs) -> None:
    """Actualiza el índice cuando MkDocs ha terminado de generarlo."""
    index_path = Path(config["site_dir"]) / "search" / "search_index.json"
    with index_path.open(encoding="utf-8") as file:
        index_data = json.load(file)
    augment_search_docs(index_data)
    with index_path.open("w", encoding="utf-8") as file:
        json.dump(index_data, file, ensure_ascii=False, separators=(",", ":"))
