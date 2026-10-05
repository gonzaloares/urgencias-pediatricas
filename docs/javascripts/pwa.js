(() => {
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (!manifestLink) return;

  const manifestUrl = new URL(manifestLink.href, window.location.href);
  const appRoot = new URL("./", manifestUrl);
  const serviceWorkerUrl = new URL("service-worker.js", appRoot);
  const buildInfoUrl = new URL("build-info.json", appRoot);

  const STORAGE_VERSION = "urgencias-pediatricas-pwa-version";
  const STORAGE_SYNCED_AT = "urgencias-pediatricas-pwa-synced-at";

  let deferredInstallPrompt = null;
  let swRegistration = null;
  let waitingWorker = null;
  let activeStatus = null;
  let checkingUpdate = false;
  let applyingUpdate = false;

  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isHome = () => {
    const path = window.location.pathname;
    const root = appRoot.pathname.endsWith("/")
      ? appRoot.pathname
      : appRoot.pathname + "/";
    return path === root || path === root + "index.html";
  };

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  };

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      // La PWA sigue funcionando si localStorage está bloqueado.
    }
  }

  function rememberActiveVersion(status) {
    if (!status?.version || !status.offlineReady) return;

    const previous = safeGet(STORAGE_VERSION);
    if (previous !== status.version) {
      safeSet(STORAGE_VERSION, status.version);
      safeSet(STORAGE_SYNCED_AT, new Date().toISOString());
    }
  }

  function removeInstallPanel() {
    document.querySelector(".pwa-install-panel")?.remove();
  }

  function renderInstallPanel() {
    removeInstallPanel();

    if (!isHome() || isStandalone()) return;

    const content = document.querySelector(".md-content__inner");
    const areaGrid = content?.querySelector(".area-grid");
    if (!content || !areaGrid) return;

    const panel = document.createElement("div");
    panel.className = "pwa-install-panel";

    if (deferredInstallPrompt) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pwa-install-button";
      button.textContent = "Instalar aplicación";
      button.addEventListener("click", async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        renderInstallPanel();
      });

      const text = document.createElement("span");
      text.textContent =
        "Instala Urgencias Pediátricas en el móvil para abrirla como una app.";

      panel.append(button, text);
    } else if (isIOS()) {
      panel.classList.add("pwa-install-panel-ios");
      panel.textContent =
        "En iPhone/iPad: Compartir → Añadir a pantalla de inicio para instalar la aplicación.";
    } else {
      return;
    }

    areaGrid.parentNode.insertBefore(panel, areaGrid);
  }

  function connectionLabel() {
    return navigator.onLine ? "Con conexión" : "Sin conexión";
  }

  function offlineLabel() {
    if (!("serviceWorker" in navigator)) {
      return "Este navegador no admite modo offline.";
    }
    if (!activeStatus) {
      return "Preparando información del modo offline…";
    }
    if (activeStatus.offlineReady) {
      return "Protocolos, calculadoras y búsqueda disponibles sin conexión.";
    }

    const protocolText =
      activeStatus.protocols?.total > 0
        ? `${activeStatus.protocols.cached}/${activeStatus.protocols.total} protocolos`
        : "protocolos pendientes";
    const staticText =
      activeStatus.staticAssets?.total > 0
        ? `${activeStatus.staticAssets.cached}/${activeStatus.staticAssets.total} recursos de búsqueda/interfaz`
        : "recursos offline pendientes";
    return `Precarga incompleta: ${protocolText} · ${staticText}.`;
  }

  function versionLabel() {
    if (!activeStatus) return "Versión: comprobando…";
    const info = activeStatus.buildInfo || {};
    const short = info.short_version || activeStatus.version?.slice(0, 8) || "—";
    const built = formatDate(info.built_at);
    return built ? `Versión ${short} · publicada ${built}` : `Versión ${short}`;
  }

  function updateButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = waitingWorker
      ? "pwa-status-button pwa-status-button-update"
      : "pwa-status-button";

    if (waitingWorker) {
      button.textContent = "Actualizar ahora";
      button.addEventListener("click", applyWaitingUpdate);
    } else {
      button.textContent = checkingUpdate
        ? "Comprobando…"
        : "Comprobar actualización";
      button.disabled = checkingUpdate || !navigator.onLine || !swRegistration;
      button.addEventListener("click", checkForUpdates);
    }
    return button;
  }

  function renderStatusPanel() {
    document.querySelector(".pwa-status-panel")?.remove();

    if (!isHome()) return;
    const content = document.querySelector(".md-content__inner");
    const areaGrid = content?.querySelector(".area-grid");
    if (!content || !areaGrid) return;

    const panel = document.createElement("section");
    panel.className = "pwa-status-panel";
    panel.setAttribute("aria-label", "Estado de la aplicación");

    const header = document.createElement("div");
    header.className = "pwa-status-header";

    const title = document.createElement("strong");
    title.textContent = "Estado de la aplicación";

    const badge = document.createElement("span");
    badge.className = navigator.onLine
      ? "pwa-status-badge pwa-status-online"
      : "pwa-status-badge pwa-status-offline";
    badge.textContent = connectionLabel();

    header.append(title, badge);

    const version = document.createElement("div");
    version.className = "pwa-status-version";
    version.textContent = versionLabel();

    const offline = document.createElement("div");
    offline.className = activeStatus?.offlineReady
      ? "pwa-status-offline-ready"
      : "pwa-status-offline-pending";
    offline.textContent = offlineLabel();

    const syncedAt = safeGet(STORAGE_SYNCED_AT);
    const sync = document.createElement("div");
    sync.className = "pwa-status-sync";
    sync.textContent = syncedAt
      ? `Actualizada en este dispositivo: ${formatDate(syncedAt)}`
      : "Todavía no se ha confirmado una versión offline completa en este dispositivo.";

    const actions = document.createElement("div");
    actions.className = "pwa-status-actions";

    if (waitingWorker) {
      const notice = document.createElement("span");
      notice.className = "pwa-status-update-notice";
      notice.textContent = "Hay una nueva versión preparada.";
      actions.append(notice);
    }

    actions.append(updateButton());
    panel.append(header, version, offline, sync, actions);
    areaGrid.parentNode.insertBefore(panel, areaGrid);
  }

  function renderUpdateBanner() {
    document.querySelector(".pwa-update-banner")?.remove();
    if (!waitingWorker || isHome()) return;

    const banner = document.createElement("div");
    banner.className = "pwa-update-banner";
    banner.setAttribute("role", "status");

    const text = document.createElement("span");
    text.textContent = "Nueva versión de Urgencias Pediátricas disponible.";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Actualizar ahora";
    button.addEventListener("click", applyWaitingUpdate);

    banner.append(text, button);
    document.body.append(banner);
  }

  function renderPwaUi() {
    renderInstallPanel();
    renderStatusPanel();
    renderUpdateBanner();
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    renderPwaUi();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    removeInstallPanel();
    renderPwaUi();
  });

  function requestWorkerStatus(timeoutMs = 4000) {
    const controller = navigator.serviceWorker?.controller;
    if (!controller) return Promise.resolve(null);

    const requestId = `status-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return new Promise((resolve) => {
      let timer = null;

      const handler = (event) => {
        if (
          event.data?.type !== "PWA_STATUS" ||
          event.data?.requestId !== requestId
        ) {
          return;
        }
        navigator.serviceWorker.removeEventListener("message", handler);
        if (timer) clearTimeout(timer);
        resolve(event.data);
      };

      navigator.serviceWorker.addEventListener("message", handler);
      timer = window.setTimeout(() => {
        navigator.serviceWorker.removeEventListener("message", handler);
        resolve(null);
      }, timeoutMs);

      controller.postMessage({ type: "GET_STATUS", requestId });
    });
  }

  async function refreshStatus() {
    const status = await requestWorkerStatus();
    if (status) {
      activeStatus = status;
      rememberActiveVersion(status);
      renderPwaUi();
      return;
    }

    if (!navigator.onLine) {
      renderPwaUi();
      return;
    }

    try {
      const response = await fetch(buildInfoUrl.href, { cache: "no-store" });
      if (response.ok) {
        const buildInfo = await response.json();
        activeStatus = {
          version: buildInfo.version,
          buildInfo,
          offlineReady: false,
        };
      }
    } catch (_) {
      // El panel seguirá mostrando que la comprobación está pendiente.
    }
    renderPwaUi();
  }

  function watchRegistration(registration) {
    swRegistration = registration;
    waitingWorker = registration.waiting || null;
    renderPwaUi();

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;

      worker.addEventListener("statechange", () => {
        if (
          worker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          waitingWorker = registration.waiting || worker;
          checkingUpdate = false;
          renderPwaUi();
        }
      });
    });
  }

  async function checkForUpdates() {
    if (!swRegistration || !navigator.onLine) return;
    checkingUpdate = true;
    renderPwaUi();

    try {
      await swRegistration.update();
      waitingWorker = swRegistration.waiting || waitingWorker;
    } catch (error) {
      console.warn("No se pudo comprobar la actualización:", error);
    } finally {
      checkingUpdate = false;
      renderPwaUi();
    }
  }

  function applyWaitingUpdate() {
    if (!waitingWorker) return;
    applyingUpdate = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  async function cacheCurrentResources(registration) {
    const readyRegistration = await navigator.serviceWorker.ready;
    const urls = [
      appRoot.href,
      window.location.href,
      manifestUrl.href,
      buildInfoUrl.href,
      ...Array.from(
        document.querySelectorAll('link[rel="stylesheet"][href], script[src]')
      ).map((el) => new URL(el.href || el.src, window.location.href).href),
    ];

    readyRegistration.active?.postMessage({
      type: "CACHE_URLS",
      urls: [...new Set(urls)],
    });

    if (registration.active) {
      window.setTimeout(refreshStatus, 250);
    }
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      renderPwaUi();
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register(
        serviceWorkerUrl.href,
        { scope: appRoot.pathname }
      );

      watchRegistration(registration);
      await cacheCurrentResources(registration);
      refreshStatus();

      if (navigator.onLine) {
        registration.update().catch(() => {});
      }
    } catch (error) {
      console.warn("No se pudo registrar el service worker:", error);
      renderPwaUi();
    }
  }

  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    if (applyingUpdate) {
      window.location.reload();
      return;
    }
    window.setTimeout(refreshStatus, 150);
  });

  window.addEventListener("online", () => {
    renderPwaUi();
    checkForUpdates();
    refreshStatus();
  });

  window.addEventListener("offline", renderPwaUi);

  if (typeof document$ !== "undefined") {
    document$.subscribe(() => renderPwaUi());
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderPwaUi);
  } else {
    renderPwaUi();
  }

  window.addEventListener("load", registerServiceWorker, { once: true });
})();
