/**
 * Shared site navbar (issue #35).
 *
 * This file is the single source of truth for the navbar. Every page has an
 * empty placeholder followed immediately by this script:
 *
 *     <nav class="navbar"></nav>
 *     <script src="components/navbar.js"></script>      (homepage)
 *     <script src="../components/navbar.js"></script>   (pages one folder down)
 *
 * Because the script is a plain, synchronous <script> placed right after the
 * <nav>, the links are filled in before the page is first drawn: no flicker,
 * no fetch(), and it works whether the site is opened from a local server,
 * GitHub Pages, or straight from disk (file://).
 *
 * To add, remove, rename, or re-point a link, edit NAV_LINKS below. Nothing
 * in the individual pages needs to change.
 */
(function () {
    "use strict";

    /**
     * Navbar entries, in display order.
     *
     * `href` is written relative to the SITE ROOT (the folder holding the
     * homepage index.html), e.g. "browse/index.html". It is resolved for you,
     * so the same entry works from the homepage and from every subpage.
     * Use "#" for a placeholder link that doesn't go anywhere yet.
     *
     * @type {Array<{label: string, href: string}>}
     */
    var NAV_LINKS = [
        { label: "Home", href: "index.html" },
        { label: "Browse", href: "browse/index.html" },
        { label: "Saved Reports", href: "saved_reports/index.html" }
    ];

    /**
     * The <script> element running this file. It must be a classic,
     * synchronous script (no type="module", async, or defer), otherwise
     * document.currentScript is null and the navbar may not exist yet.
     * @type {HTMLScriptElement|null}
     */
    var script = document.currentScript;
    if (!script) {
        console.error("navbar.js: load this file with a plain <script> tag placed right after <nav class=\"navbar\"></nav>.");
        return;
    }

    /**
     * URL of the site root. This file lives in <root>/components/, so the root
     * is one folder up from the script itself. Deriving it from the script's
     * own URL (instead of assuming "/") keeps links correct when the site is
     * served from a sub-folder, e.g. https://<user>.github.io/<repo>/.
     * @type {URL}
     */
    var siteRoot = new URL("../", script.src);

    /**
     * Turn a root-relative href into one that works from the current page.
     * Placeholder ("#...") and absolute (http:, mailto:, ...) hrefs are
     * returned unchanged.
     * @param {string} href
     * @returns {string}
     */
    function resolveHref(href) {
        if (href.charAt(0) === "#" || /^[a-z][a-z0-9+.-]*:/i.test(href)) {
            return href;
        }
        return new URL(href, siteRoot).href;
    }

    /**
     * Build the navbar's contents. Produces exactly:
     *   <ul class="navbar-links"><li><a href="...">Label</a></li>...</ul>
     * which is what the site-wide .navbar / .navbar-links styles expect.
     * @returns {HTMLUListElement}
     */
    function buildLinks() {
        var list = document.createElement("ul");
        list.className = "navbar-links";

        NAV_LINKS.forEach(function (link) {
            var anchor = document.createElement("a");
            anchor.href = resolveHref(link.href);
            anchor.textContent = link.label;

            var item = document.createElement("li");
            item.appendChild(anchor);
            list.appendChild(item);
        });

        return list;
    }

    var nav = document.querySelector("nav.navbar");
    if (!nav) {
        console.error("navbar.js: no <nav class=\"navbar\"> found. Put the script tag right after it.");
        return;
    }

    nav.replaceChildren(buildLinks());
})();
