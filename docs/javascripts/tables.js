function enhanceClinicalTables(root = document) {
  root.querySelectorAll(".md-typeset table:not([class])").forEach((table) => {
    if (table.closest(".clinical-table-scroll")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "clinical-table-scroll";
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "Tabla desplazable");

    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => enhanceClinicalTables());
} else {
  enhanceClinicalTables();
}
