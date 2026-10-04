(() => {
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (!manifestLink) return;

  const manifestUrl = new URL(manifestLink.href, window.location.href);
  const appRoot = new URL("./", manifestUrl);
  const serviceWorkerUrl = new URL("service-worker.js", appRoot);

  let deferredInstallPrompt = null;

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

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    renderInstallPanel();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    removeInstallPanel();
  });

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register(
        serviceWorkerUrl.href,
        { scope: appRoot.pathname }
      );

      registration.update().catch(() => {});

      const readyRegistration = await navigator.serviceWorker.ready;
      const urls = [
        appRoot.href,
        window.location.href,
        manifestUrl.href,
        ...Array.from(
          document.querySelectorAll('link[rel="stylesheet"][href], script[src]')
        ).map((el) => new URL(el.href || el.src, window.location.href).href),
      ];

      readyRegistration.active?.postMessage({
        type: "CACHE_URLS",
        urls: [...new Set(urls)],
      });
    } catch (error) {
      console.warn("No se pudo registrar el service worker:", error);
    }
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(() => renderInstallPanel());
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderInstallPanel);
  } else {
    renderInstallPanel();
  }

  window.addEventListener("load", registerServiceWorker, { once: true });
})();
