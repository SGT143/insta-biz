(function () {
  "use strict";

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderLinks(links) {
    if (!links) return "";
    var items = [
      ["website", "Visit website"],
      ["playStore", "Google Play"],
      ["appStore", "App Store"]
    ]
      .filter(function (pair) { return links[pair[0]]; })
      .map(function (pair) {
        return '<a class="btn btn-small" href="' + escapeHtml(links[pair[0]]) +
          '" target="_blank" rel="noopener">' + pair[1] + "</a>";
      });

    if (items.length === 0) {
      return '<span class="badge">Coming soon</span>';
    }
    return items.join("");
  }

  function renderProduct(p) {
    var features = (p.features || [])
      .map(function (f) { return "<li>" + escapeHtml(f) + "</li>"; })
      .join("");

    return (
      '<article class="product-card" id="' + escapeHtml(p.id || "") + '" style="--accent:' +
        escapeHtml(p.accent || "var(--primary)") + '">' +
        '<div class="product-icon" aria-hidden="true">' + escapeHtml(p.icon || "") + "</div>" +
        "<h3>" + escapeHtml(p.name) + "</h3>" +
        (p.tagline ? '<p class="tagline">' + escapeHtml(p.tagline) + "</p>" : "") +
        "<p>" + escapeHtml(p.description) + "</p>" +
        (features ? '<ul class="features">' + features + "</ul>" : "") +
        '<div class="product-actions">' + renderLinks(p.links) + "</div>" +
      "</article>"
    );
  }

  // Render product list
  var list = document.getElementById("product-list");
  if (list && typeof PRODUCTS !== "undefined") {
    list.innerHTML = PRODUCTS.map(renderProduct).join("");
  }

  // Footer year
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Mobile nav toggle
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav-links");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }
})();
