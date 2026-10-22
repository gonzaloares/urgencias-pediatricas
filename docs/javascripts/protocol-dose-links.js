/* Enlaces clínicos contextuales a calculadoras, sin editar las pautas del protocolo. */
(() => {
  const script = document.currentScript ||
    document.querySelector('script[src*="protocol-dose-links.js"]');
  if (!script?.src) return;

  const rootUrl = new URL("../", script.src);
  let registriesPromise;

  const normalize = (value) =>
    String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es").trim();

  const aliases = {
    "amoxicilina clavulanico": "Amoxicilina-clavulánico",
    "amoxicilina/acido clavulanico": "Amoxicilina-clavulánico",
    "amoxicilina-acido clavulanico": "Amoxicilina-clavulánico",
    "amoxicilina/clavulanico": "Amoxicilina-clavulánico",
    "amoxicilina-clavulanico": "Amoxicilina-clavulánico",
    "valproato": "Ácido valproico",
    "acido valproico": "Ácido valproico",
    "adrenalina nebulizada": "Adrenalina",
    "adrenalina im": "Adrenalina",
    "nacl 3%": "NaCl hipertónico 3%",
    "suero hipertónico 3%": "NaCl hipertónico 3%",
    "metamizol magnésico": "Metamizol",
    "prostaglandina e1": "Alprostadil (prostaglandina E1)",
    "alprostadil": "Alprostadil (prostaglandina E1)",
    "gluconato calcico": "Gluconato cálcico 10%"
  };

  function currentProtocol() {
    const sitePath = rootUrl.pathname;
    if (!location.pathname.startsWith(sitePath)) return "";
    let relative = decodeURIComponent(location.pathname.slice(sitePath.length));
    if (!relative || relative === "calculadora/" || relative === "perfusiones/" ||
        relative === "calculadora" || relative === "perfusiones") return "";
    relative = relative.replace(/\/$/, "");
    if (!relative || relative.endsWith("/index")) return "";
    return relative + ".md";
  }

  function loadRegistries() {
    if (!registriesPromise) {
      registriesPromise = Promise.all([
        fetch(new URL("data/drugs.json", rootUrl)).then((r) => {
          if (!r.ok) throw new Error("drugs.json");
          return r.json();
        }).catch(() => ({ entries: [] })),
        fetch(new URL("data/infusions.json", rootUrl)).then((r) => {
          if (!r.ok) throw new Error("infusions.json");
          return r.json();
        }).catch(() => ({ entries: [] }))
      ]).then(([doses, infusions]) => ({
        doses: doses.entries || [],
        infusions: infusions.entries || []
      }));
    }
    return registriesPromise;
  }

  function catalog(registries) {
    const names = new Map();
    for (const entry of [...registries.doses, ...registries.infusions]) {
      names.set(normalize(entry.drug), entry.drug);
    }
    // Mantener las grafías con y sin tilde como alternativas separadas:
    // normalizar la expresión regular impediría detectar «ácido» y «cálcico».
    const variants = new Map();
    for (const official of names.values()) {
      variants.set(official.toLocaleLowerCase("es"), official);
      variants.set(normalize(official), official);
    }
    for (const [alias, official] of Object.entries(aliases)) {
      const chosen = names.get(normalize(official));
      if (chosen) variants.set(alias.toLocaleLowerCase("es"), chosen);
    }
    return [...variants.entries()]
      .sort((a, b) => b[0].length - a[0].length);
  }

  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const isWord = (value) => Boolean(value && /[\p{L}\p{N}]/u.test(value));

  function createLink(label, canonical, source, registries, context) {
    const key = normalize(canonical);
    const matchingDoses = registries.doses.filter((item) =>
      normalize(item.drug) === key && item.protocol === source
    );
    const matchingInfusions = registries.infusions.filter((item) =>
      normalize(item.drug) === key && item.protocol === source
    );
    const infusionContext = /perfusi[oó]n|infusi[oó]n|bomba de infusi[oó]n|continua|mcg\/kg\/min|µg\/kg\/min/i.test(context);
    const preferInfusion = matchingInfusions.length > 0 &&
      (matchingDoses.length === 0 || infusionContext);
    const existsInDoses = registries.doses.some((item) => normalize(item.drug) === key);
    const destination = preferInfusion || !existsInDoses ? "perfusiones/" : "calculadora/";
    const url = new URL(destination, rootUrl);
    url.searchParams.set("farmaco", canonical);
    url.searchParams.set("origen", source);
    const link = document.createElement("a");
    link.className = "protocol-drug-calculator-link";
    link.href = url.href;
    link.textContent = label;
    link.setAttribute("aria-label",
      `Abrir calculadora para ${label}; confirmar indicación y vía de administración`);
    link.title = "Abrir calculadora · verificar indicación";
    return link;
  }

  function annotate(content, source, registries) {
    const variants = catalog(registries);
    if (!variants.length) return;
    const byName = new Map(variants);
    const expression = new RegExp(variants.map(([key]) => escapeRegex(key)).join("|"), "giu");
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const nodes = [];
    const ignored = 'a, button, input, textarea, select, code, pre, kbd, script, style, ' +
      '.protocol-shortcuts, .headerlink, .dose-calculator, .infusion-calculator, ' +
      '.md-typeset__scrollwrap .highlight, .footnote, .md-content__button';

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.nodeValue.trim() || !node.parentElement || node.parentElement.closest(ignored)) continue;
      nodes.push(node);
    }

    const seenByBlock = new WeakMap();
    let linked = 0;
    for (const node of nodes) {
      if (linked >= 300) break;
      const value = node.nodeValue;
      expression.lastIndex = 0;
      const parts = document.createDocumentFragment();
      let start = 0;
      let changed = false;
      let match;
      const block = node.parentElement.closest("p, li, td, th, h2, h3, h4, .dose-card, .clinical-card") || node.parentElement;
      let seen = seenByBlock.get(block);
      if (!seen) { seen = new Set(); seenByBlock.set(block, seen); }

      while ((match = expression.exec(value)) !== null) {
        const key = normalize(match[0]);
        const canonical = byName.get(key);
        if (!canonical || seen.has(normalize(canonical))) continue;
        // El tratamiento de hidrocortisona en dermatitis atópica es tópico;
        // no enlazarlo a la dosis IV de crisis suprarrenal.
        if (source === "dermatologia/dermatitis-atopica.md" &&
            normalize(canonical) === "hidrocortisona") continue;
        const left = value[match.index - 1] || "";
        const right = value[match.index + match[0].length] || "";
        if (isWord(left) || isWord(right)) continue;

        if (match.index > start) parts.append(document.createTextNode(value.slice(start, match.index)));
        parts.append(createLink(match[0], canonical, source, registries, block.textContent || value));
        start = match.index + match[0].length;
        seen.add(normalize(canonical));
        changed = true;
        linked++;
        if (linked >= 300) break;
      }
      if (changed) {
        if (start < value.length) parts.append(document.createTextNode(value.slice(start)));
        node.replaceWith(parts);
      }
    }
  }

  async function init() {
    const pathname = location.pathname;
    const source = currentProtocol();
    if (!source) return;
    const content = document.querySelector(".md-content__inner");
    if (!content || content.dataset.drugLinksInitialized === "true") return;
    const registries = await loadRegistries();
    if (pathname !== location.pathname || !content.isConnected) return;
    content.dataset.drugLinksInitialized = "true";
    annotate(content, source, registries);
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
