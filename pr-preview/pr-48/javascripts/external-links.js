function setExternalLinksToNewTab() {
  document.querySelectorAll("a[href]").forEach((link) => {
    let url;

    try {
      url = new URL(link.getAttribute("href"), window.location.href);
    } catch {
      return;
    }

    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.origin !== window.location.origin
    ) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  });
}

if (typeof document$ !== "undefined") {
  document$.subscribe(() => setExternalLinksToNewTab());
} else if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setExternalLinksToNewTab);
} else {
  setExternalLinksToNewTab();
}
