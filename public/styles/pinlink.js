/* ============================================================================
   FIGUREHUB · shared runtime — icons, brand mark, theme, data
   ========================================================================== */
(function () {
  "use strict";

  /* ---- ICON SET (16px grid, stroke = currentColor) ---------------------- */
  const I = {
    dashboard: '<rect x="2" y="2" width="5.5" height="5.5" rx="1"/><rect x="8.5" y="2" width="5.5" height="5.5" rx="1"/><rect x="2" y="8.5" width="5.5" height="5.5" rx="1"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1"/>',
    assets: '<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><path d="M11.5 9.5v4M9.5 11.5h4"/>',
    categories: '<path d="M3 4l4 4-4 4M8 4l4 4-4 4"/>',
    stake: '<path d="M8 2l6 3v6l-6 3-6-3V5l6-3z"/><path d="M2 5l6 3 6-3M8 8v6"/>',
    marketplace: '<path d="M2 2h5l7 7-5 5-7-7V2z"/><circle cx="5.5" cy="5.5" r="1.1"/>',
    contact: '<circle cx="8" cy="8" r="6"/><path d="M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM10.5 8v1.5a1.5 1.5 0 003 0V8"/>',
    overview: '<path d="M2 8h2.5l1.5 4 2.5-9 1.5 5h2.5"/>',
    search: '<circle cx="6.8" cy="6.8" r="4.2"/><path d="M11 11l3 3"/>',
    filter: '<path d="M2 4h12M4 8h8M6 12h4"/>',
    gridview: '<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>',
    listview: '<path d="M2 3.5h2M6 3.5h8M2 8h2M6 8h8M2 12.5h2M6 12.5h8"/>',
    plus: '<path d="M8 3v10M3 8h10"/>',
    check: '<path d="M3 8.2l3.2 3.2L13 4.5"/>',
    close: '<path d="M4 4l8 8M12 4l-8 8"/>',
    edit: '<path d="M11 2l3 3-8 8H3v-3l8-8z"/>',
    trash: '<path d="M3 5h10M6 5V3h4v2M5 5l.8 9h4.4L11 5"/>',
    arrowup: '<path d="M4 12L12 4M6 4h6v6"/>',
    chevdown: '<path d="M4 6l4 4 4-4"/>',
    calendar: '<rect x="2.5" y="3" width="11" height="11" rx="1.5"/><path d="M2.5 6.5h11M5.5 1.8v2.4M10.5 1.8v2.4"/>',
    box: '<path d="M8 2l6 3v6l-6 3-6-3V5l6-3z"/><path d="M2 5l6 3 6-3M8 8v6"/>',
    info: '<circle cx="8" cy="8" r="6.2"/><path d="M8 7.2v3.6M8 5.1v.2"/>',
    external: '<path d="M6 3H3v10h10v-3M9 3h4v4M13 3L7 9"/>',
    star: '<path d="M8 2l1.7 3.9 4.3.4-3.2 2.8 1 4.2L8 11.1 4.2 13.3l1-4.2L2 6.3l4.3-.4L8 2z"/>',
    sun: '<circle cx="8" cy="8" r="3.2"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/>',
    moon: '<path d="M13 9.5A5.5 5.5 0 016.5 3a5.5 5.5 0 102.8 10.3A5.5 5.5 0 0013 9.5z"/>',
    eye: '<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>',
    wallet: '<rect x="2" y="4" width="12" height="9" rx="1.5"/><path d="M2 6.5h12M11 9.5h1.5"/>',
    tag: '<path d="M2 2h5l7 7-5 5-7-7V2z"/><circle cx="5.5" cy="5.5" r="1.1"/>',
    hashlink: '<rect x="2.2" y="2.2" width="3" height="3" rx="1"/><rect x="10.8" y="2.2" width="3" height="3" rx="1"/><rect x="2.2" y="10.8" width="3" height="3" rx="1"/><rect x="10.8" y="10.8" width="3" height="3" rx="1"/><path d="M6.3 4h3.4M6.3 12h3.4M4 6.3v3.4M12 6.3v3.4"/>',
    sort: '<path d="M4 6l-2 2 2 2M2 8h5M12 4l2 2-2 2M14 6H9"/>',
    download: '<path d="M8 2v8M5 7l3 3 3-3M3 13h10"/>',
    sliders: '<path d="M2 4.5h6M11 4.5h3M2 11.5h3M8 11.5h6"/><circle cx="9.5" cy="4.5" r="1.6"/><circle cx="5.5" cy="11.5" r="1.6"/>',
    clock: '<circle cx="8" cy="8" r="6.2"/><path d="M8 4.6V8l2.4 1.6"/>',
    heart: '<path d="M8 13.3S2.3 9.7 2.3 5.9C2.3 4 3.8 2.7 5.4 2.7c1.1 0 2 .6 2.6 1.5.6-.9 1.5-1.5 2.6-1.5 1.6 0 3.1 1.3 3.1 3.2 0 3.8-5.7 7.4-5.7 7.4z"/>',
    spark: '<path d="M8 1.5l1.6 4.3 4.4 1.2-3.4 2.6.4 4.6L8 11.7 4.6 14.2l.4-4.6L1.6 7l4.4-1.2L8 1.5z"/>',
  };

  function icon(name, size, sw) {
    const body = I[name] || "";
    size = size || 16;
    sw = sw || 1.4;
    return '<svg viewBox="0 0 16 16" width="' + size + '" height="' + size +
      '" fill="none" stroke="currentColor" stroke-width="' + sw +
      '" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }
  // some icons are filled glyphs
  function iconFill(name, size) {
    const body = I[name] || "";
    size = size || 16;
    return '<svg viewBox="0 0 16 16" width="' + size + '" height="' + size +
      '" fill="currentColor" stroke="none">' + body + '</svg>';
  }

  const LOGO_SVG =
    '<svg viewBox="0 0 24 24" fill="none">' +
    '<circle cx="12" cy="12" r="3.1" fill="currentColor"/>' +
    '<circle cx="12" cy="3.4" r="2.1" fill="currentColor"/>' +
    '<circle cx="12" cy="20.6" r="2.1" fill="currentColor"/>' +
    '<circle cx="3.4" cy="12" r="2.1" fill="currentColor"/>' +
    '<circle cx="20.6" cy="12" r="2.1" fill="currentColor"/>' +
    '<path d="M12 5.6v3.3M12 15.1v3.3M5.6 12h3.3M15.1 12h3.3" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>' +
    '</svg>';

  /* ---- THEME ------------------------------------------------------------- */
  const THEME_KEY = "fh-theme";
  function getTheme() {
    try {
      var p = new URLSearchParams(location.search).get("theme");
      if (p === "light" || p === "dark") return p;
    } catch (e) {}
    return localStorage.getItem(THEME_KEY) || "dark";
  }
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(THEME_KEY, t);
    document.querySelectorAll("[data-theme-toggle]").forEach(function (el) {
      el.classList.toggle("is-on", t === "dark");
    });
    document.querySelectorAll("[data-theme-icon]").forEach(function (el) {
      el.innerHTML = icon(t === "dark" ? "moon" : "sun", 16);
    });
  }
  function toggleTheme() { applyTheme(getTheme() === "dark" ? "light" : "dark"); }
  // apply ASAP to avoid flash
  document.documentElement.setAttribute("data-theme", getTheme());

  /* ---- DATA — action-figure inventory ----------------------------------- */
  // priced in ₹ (INR). edition = limited-run fractions (owned/total).
  const CAT = {
    hot_toys:    { label: "Hot Toys",     color: "#e8742c" },
    sh_figuarts: { label: "SH Figuarts",  color: "#5b8def" },
    neca:        { label: "NECA",         color: "#e8513a" },
    mezco:       { label: "Mezco",        color: "#b6f24d" },
    banpresto:   { label: "Banpresto",    color: "#e8a23c" },
    resin_statue:{ label: "Resin Statue", color: "#c061e8" },
    funko:       { label: "Funko Pop",    color: "#3fc4a6" },
  };
  const COND = {
    new_sealed: "New · Sealed", new_opened: "New · Opened",
    used_like_new: "Used · Like New", used_good: "Used · Good",
    used_fair: "Used · Fair", damaged: "Damaged",
  };

  const FIGURES = [
    { id: "FH-IM85", title: "Hot Toys Iron Man Mark 85", cat: "hot_toys", brand: "Hot Toys", franchise: "Marvel", price: 42000, mrp: 48000, owned: 2, total: 50, cond: "new_sealed", status: "available", featured: true, negotiable: true, preorder: false, sku: "HT-IM85-001", seller: "ARC_TOYS", verified: true, views: 342 },
    { id: "FH-SMINT", title: "Spider-Man Integrated Suit", cat: "hot_toys", brand: "Hot Toys", franchise: "Marvel", price: 35000, mrp: 38000, owned: 1, total: 30, cond: "new_sealed", status: "available", featured: true, negotiable: false, preorder: false, sku: "HT-SM-INT", seller: "ARC_TOYS", verified: true, views: 287 },
    { id: "FH-GOKUUI", title: "SH Figuarts Goku Ultra Instinct", cat: "sh_figuarts", brand: "Bandai", franchise: "Dragon Ball Z", price: 4500, mrp: 5200, owned: 5, total: 5, cond: "new_sealed", status: "available", featured: false, negotiable: true, preorder: false, sku: "SHF-GKU-UI", seller: "BANDAI_HUB", verified: true, views: 198 },
    { id: "FH-VGTSSB", title: "Vegeta SSB Evolution", cat: "sh_figuarts", brand: "Bandai", franchise: "Dragon Ball Z", price: 3800, mrp: null, owned: 3, total: 6, cond: "new_sealed", status: "available", featured: false, negotiable: true, preorder: false, sku: "SHF-VGT-SSB", seller: "BANDAI_HUB", verified: true, views: 156 },
    { id: "FH-JHP", title: "NECA Jungle Hunter Predator", cat: "neca", brand: "NECA", franchise: "Predator", price: 2800, mrp: null, owned: 0, total: 8, cond: "new_sealed", status: "sold", featured: false, negotiable: false, preorder: false, sku: "NECA-JHP", seller: "GRID_RELICS", verified: true, views: 89 },
    { id: "FH-BATAK", title: "Mezco One:12 Batman Ascending Knight", cat: "mezco", brand: "Mezco", franchise: "DC", price: 9500, mrp: 10500, owned: 2, total: 12, cond: "new_sealed", status: "available", featured: false, negotiable: true, preorder: false, sku: "MZ-BAT-AK", seller: "GRID_RELICS", verified: true, views: 224 },
    { id: "FH-LUFG4", title: "Banpresto Grandista Luffy G4", cat: "banpresto", brand: "Banpresto", franchise: "One Piece", price: 1800, mrp: null, owned: 8, total: 8, cond: "new_sealed", status: "available", featured: false, negotiable: false, preorder: false, sku: "BP-LUF-G4", seller: "EAST_BLUE", verified: false, views: 145 },
    { id: "FH-NARSM", title: "Resin Statue — Naruto Sage Mode 1/6", cat: "resin_statue", brand: "Custom Studio", franchise: "Naruto", price: 12500, mrp: null, owned: 3, total: 100, cond: "new_sealed", status: "available", featured: true, negotiable: true, preorder: true, sku: "RS-NAR-SM", seller: "SHINOBI_LAB", verified: true, views: 412 },
    { id: "FH-GKUEXC", title: "Resin Statue — Goku UI Exclusive", cat: "resin_statue", brand: "Custom Studio", franchise: "Dragon Ball Z", price: 18500, mrp: null, owned: 1, total: 75, cond: "new_sealed", status: "available", featured: true, negotiable: true, preorder: true, sku: "RS-GKU-UI", seller: "SHINOBI_LAB", verified: true, views: 567 },
    { id: "FH-SMNWH", title: "Funko Pop Spider-Man NWH (Chase)", cat: "funko", brand: "Funko", franchise: "Marvel", price: 1200, mrp: null, owned: 6, total: 6, cond: "new_sealed", status: "available", featured: false, negotiable: false, preorder: false, sku: "FP-SM-NWH", seller: "POP_VAULT", verified: false, views: 78 },
    { id: "FH-THNEG", title: "Hot Toys Thanos (Endgame)", cat: "hot_toys", brand: "Hot Toys", franchise: "Marvel", price: 38000, mrp: null, owned: 0, total: 40, cond: "used_like_new", status: "reserved", featured: false, negotiable: true, preorder: false, sku: "HT-THN-EG", seller: "ARC_TOYS", verified: true, views: 198 },
    { id: "FH-BRLFP", title: "SH Figuarts Broly Full Power", cat: "sh_figuarts", brand: "Bandai", franchise: "Dragon Ball Z", price: 5200, mrp: null, owned: 0, total: 2, cond: "new_sealed", status: "unlisted", featured: false, negotiable: false, preorder: false, sku: "SHF-BRL-FP", seller: "BANDAI_HUB", verified: true, views: 45 },
  ];

  const STATS = {
    totalGenerated: 18452000,
    totalItems: FIGURES.length,
    listed: FIGURES.filter(f => f.status === "available").length,
    reserved: FIGURES.filter(f => f.status === "reserved").length,
    stockOut: FIGURES.filter(f => f.owned === 0).length,
    stockValue: FIGURES.reduce((s, f) => s + f.price * f.owned, 0),
    followers: 487,
    totalUsers: 3450,
    totalViews: FIGURES.reduce((s, f) => s + f.views, 0),
  };

  function inr(n) { return "₹" + Number(n).toLocaleString("en-IN"); }

  /* ---- expose ----------------------------------------------------------- */
  window.FH = {
    icon: icon, iconFill: iconFill, LOGO_SVG: LOGO_SVG,
    getTheme: getTheme, applyTheme: applyTheme, toggleTheme: toggleTheme,
    CAT: CAT, COND: COND, FIGURES: FIGURES, STATS: STATS, inr: inr,
  };

  // re-sync toggles once DOM is ready
  document.addEventListener("DOMContentLoaded", function () { applyTheme(getTheme()); });
})();
