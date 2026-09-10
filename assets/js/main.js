/* =========================================================================
   LUMIÈRE — Gut Reset client
   Vanilla IIFE. No modules, no fixtures, no build.
   ========================================================================= */

(function () {
  "use strict";

  /* ---------- Helpers ------------------------------------------------- */

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var kr = new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0
  });

  function money(n) {
    return kr.format(n);
  }

  var store = {
    get: function (k, fallback) {
      try {
        var v = window.localStorage.getItem(k);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set: function (k, v) {
      try {
        window.localStorage.setItem(k, JSON.stringify(v));
      } catch (e) {}
    }
  };

  function onFrame(fn) {
    var queued = false;
    return function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        fn();
      });
    };
  }

  /* ---------- Theme --------------------------------------------------- */

  var THEME_KEY = "lum.theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0f100e" : "#f6f2ea");
    $$(".theme-toggle").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(theme === "dark"));
      btn.setAttribute("aria-label", theme === "dark" ? "Skift til lyst tema" : "Skift til mørkt tema");
    });
  }

  function initTheme() {
    $$(".theme-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        store.set(THEME_KEY, next);
        applyTheme(next);
      });
    });
    applyTheme(document.documentElement.getAttribute("data-theme") || "light");
  }

  /* ---------- Announce bar -------------------------------------------- */

  function initAnnounce() {
    var bar = $("[data-announce]");
    if (!bar) return;
    try {
      if (window.sessionStorage.getItem("lum.announce") === "off") {
        bar.hidden = true;
        return;
      }
    } catch (e) {}
    var close = $("[data-announce-close]", bar);
    if (close) {
      close.addEventListener("click", function () {
        bar.hidden = true;
        try {
          window.sessionStorage.setItem("lum.announce", "off");
        } catch (e) {}
      });
    }
  }

  /* ---------- Header stuck + scroll progress --p ---------------------- */

  function initHeader() {
    var header = $(".header");
    var progress = $(".progress");
    if (!header) return;

    var update = onFrame(function () {
      var y = window.scrollY || window.pageYOffset;
      header.classList.toggle("is-stuck", y > 8);
      if (progress) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var p = max > 0 ? y / max : 0;
        progress.style.setProperty("--p", String(p));
      }
    });

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- lockScroll ---------------------------------------------- */

  function lockScroll(lock) {
    document.documentElement.classList.toggle("is-locked", lock);
    document.body.classList.toggle("is-locked", lock);
    document.body.style.overflow = lock ? "hidden" : "";
  }

  /* ---------- Mobile menu --------------------------------------------- */

  function initMobileMenu() {
    var menu = $("[data-menu]");
    var toggles = $$("[data-menu-toggle]");
    if (!menu || !toggles.length) return;

    function toggle(open) {
      var next = typeof open === "boolean" ? open : !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", next);
      menu.setAttribute("aria-hidden", String(!next));
      toggles.forEach(function (t) {
        t.setAttribute("aria-expanded", String(next));
      });
      lockScroll(next);
    }

    toggles.forEach(function (t) {
      t.addEventListener("click", function () {
        toggle();
      });
    });

    $$(".mobile-menu__link", menu).forEach(function (a) {
      a.addEventListener("click", function () {
        toggle(false);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) toggle(false);
    });
  }

  /* ---------- Reveal -------------------------------------------------- */

  function initReveal() {
    var nodes = $$("[data-reveal]");
    if (!nodes.length) return;

    $$("[data-reveal-group]").forEach(function (group) {
      $$("[data-reveal]", group).forEach(function (el, i) {
        el.style.setProperty("--d", i * 90 + "ms");
      });
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      nodes.forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );

    nodes.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------- Counters data-count ------------------------------------- */

  function initCounters() {
    var nodes = $$("[data-count]");
    if (!nodes.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      if (isNaN(target)) return;
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      var decimals = (el.getAttribute("data-count") || "").indexOf(".") >= 0 ? 1 : 0;

      function paint(n) {
        var formatted = decimals
          ? n.toFixed(decimals).replace(".", ",")
          : Math.round(n).toLocaleString("da-DK");
        el.textContent = prefix + formatted + suffix;
      }

      if (reduceMotion) {
        paint(target);
        return;
      }

      var start = null;
      var dur = 1400;

      function tick(now) {
        if (start === null) start = now;
        var t = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3);
        paint(target * eased);
        if (t < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    }

    if (!("IntersectionObserver" in window)) {
      nodes.forEach(run);
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          run(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );

    nodes.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------- Journey timeline --fill --------------------------------- */

  function initJourney() {
    var roots = $$(".journey");
    if (!roots.length) return;

    roots.forEach(function (el) {
      var steps = $$(".journey__step", el);
      if (!steps.length) return;

      function sync() {
        var on = 0;
        steps.forEach(function (step) {
          if (step.classList.contains("is-on")) on += 1;
        });
        el.style.setProperty("--fill", steps.length ? String(on / steps.length) : "0");
      }

      if (reduceMotion || !("IntersectionObserver" in window)) {
        steps.forEach(function (step) {
          step.classList.add("is-on");
        });
        sync();
        return;
      }

      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-on");
            sync();
          });
        },
        { threshold: 0.45 }
      );

      steps.forEach(function (step) {
        io.observe(step);
      });
      sync();
    });
  }

  /* ---------- Tabs role=tab ------------------------------------------- */

  function initTabs() {
    $$("[role=tablist]").forEach(function (list) {
      var tabs = $$("[role=tab]", list);
      if (!tabs.length) return;

      function activate(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute("aria-selected", String(on));
          t.tabIndex = on ? 0 : -1;
          var panelId = t.getAttribute("aria-controls");
          var panel = panelId ? document.getElementById(panelId) : null;
          if (panel) panel.hidden = !on;
        });
        if (focus) tab.focus();
      }

      tabs.forEach(function (tab, i) {
        tab.addEventListener("click", function () {
          activate(tab, false);
        });
        tab.addEventListener("keydown", function (e) {
          var next = i;
          if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % tabs.length;
          else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + tabs.length) % tabs.length;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = tabs.length - 1;
          else return;
          e.preventDefault();
          activate(tabs[next], true);
        });
      });
    });
  }

  /* ---------- FAQ data-faq / data-faq-single -------------------------- */

  function initFaq() {
    $$("[data-faq]").forEach(function (root) {
      var single = root.hasAttribute("data-faq-single");

      function setOpen(item, open) {
        item.classList.toggle("is-open", open);
        var btn = $(".faq__q", item);
        if (btn) btn.setAttribute("aria-expanded", String(open));
      }

      $$(".faq__q", root).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var item = btn.closest(".faq__item");
          if (!item) return;
          var open = item.classList.contains("is-open");
          if (single) {
            $$(".faq__item", root).forEach(function (it) {
              setOpen(it, false);
            });
          }
          setOpen(item, !open);
        });
      });
    });
  }

  /* ---------- Compare before/after pointer slider --------------------- */

  function initCompare() {
    $$(".compare").forEach(function (root) {
      var range = $(".compare__range", root);

      function setX(pct) {
        pct = Math.max(0, Math.min(100, pct));
        root.style.setProperty("--x", pct + "%");
        if (range) range.value = String(pct);
      }

      function fromPointer(e) {
        var rect = root.getBoundingClientRect();
        var x = e.clientX - rect.left;
        setX((x / rect.width) * 100);
      }

      if (range) {
        range.addEventListener("input", function () {
          setX(Number(range.value));
        });
      }

      var dragging = false;
      root.addEventListener("pointerdown", function (e) {
        if (e.target === range) return;
        dragging = true;
        try {
          root.setPointerCapture(e.pointerId);
        } catch (err) {}
        fromPointer(e);
      });
      root.addEventListener("pointermove", function (e) {
        if (dragging) fromPointer(e);
      });
      root.addEventListener("pointerup", function () {
        dragging = false;
      });
      root.addEventListener("pointercancel", function () {
        dragging = false;
      });
    });
  }

  /* ---------- Rails data-rail ----------------------------------------- */

  function initRails() {
    $$("[data-rail]").forEach(function (rail) {
      var id = rail.getAttribute("data-rail") || "";
      var scope = rail.parentElement;
      var prevs = id ? $$('[data-rail-prev="' + id + '"]') : [];
      var nexts = id ? $$('[data-rail-next="' + id + '"]') : [];
      if (!prevs.length && scope) prevs = $$("[data-rail-prev]", scope);
      if (!nexts.length && scope) nexts = $$("[data-rail-next]", scope);

      function go(dir) {
        var card = rail.firstElementChild;
        var gap = 20;
        var delta = dir * (card ? card.getBoundingClientRect().width + gap : Math.max(260, rail.clientWidth * 0.82));
        rail.scrollBy({
          left: delta,
          behavior: reduceMotion ? "auto" : "smooth"
        });
      }

      prevs.forEach(function (btn) {
        btn.addEventListener("click", function () {
          go(-1);
        });
      });
      nexts.forEach(function (btn) {
        btn.addEventListener("click", function () {
          go(1);
        });
      });
    });
  }

  /* ---------- Marquee clone track ------------------------------------- */

  function initMarquee() {
    $$(".marquee").forEach(function (m) {
      var track = $(".marquee__track", m);
      if (!track || track.dataset.cloned === "1") return;
      var clone = track.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.dataset.cloned = "1";
      m.appendChild(clone);
    });
  }

  /* ---------- Toast --------------------------------------------------- */

  var toastTimer = null;

  function toast(message) {
    var el = $("[data-toast]");
    if (!el) return;
    var text = $("[data-toast-text]", el);
    if (text) text.textContent = message;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("is-on");
    }, 3200);
  }

  /* ---------- Cart CATALOG -------------------------------------------- */

  var FREE_SHIPPING = 399;
  var SCOOP_G = 12;
  var GUARANTEE_WEEKS = 4;
  var CART_KEY = "lum.cart";

  var SOCIAL = {
    rating: "5,0",
    count: 74
  };

  var REVIEWS = window.LUMIERE_REVIEWS || [];

  var PRODUCTS = {
    "gut-reset": {
      id: "gut-reset",
      status: "live",
      name: "Gut Reset",
      kicker: "Tarm–hud aksen",
      title: "Gut Reset — probiotika & præbiotiske fibre | LUMIÈRE",
      subtitle: "Dagligt kosttilskud med præbiotiske fibre og Bacillus coagulans. Ét scoop. Tyve sekunder.",
      href: "produkt.html",
      priceLabel: "Fra 229 kr"
    },
    "clear-complexion": {
      id: "clear-complexion",
      status: "pending",
      name: "Clear Complexion",
      kicker: "Hud, indefra",
      title: "Clear Complexion | LUMIÈRE",
      subtitle: "Næste kapitel. Skriv dig op, så får du besked ved lancering.",
      href: "produkt.html?p=clear-complexion",
      priceLabel: "Copy afventer"
    },
    "kapitel-tre": {
      id: "kapitel-tre",
      status: "pending",
      name: "Kapitel tre",
      kicker: "Næste kapitel",
      title: "Kapitel tre | LUMIÈRE",
      subtitle: "Næste kapitel i linjen. Skriv dig op, så får du besked ved lancering.",
      href: "produkt.html?p=kapitel-tre",
      priceLabel: "Ikke lanceret"
    }
  };

  var CATALOG = {
    starter: {
      title: "Gut Reset 250 g",
      sub: "1 pose · 25 portioner",
      price: 229,
      was: 269,
      servings: 25,
      img: "assets/img/pouch.svg"
    },
    ritual: {
      title: "Gut Reset 500 g",
      sub: "1 pose · 50 portioner",
      price: 366,
      was: 429,
      servings: 50,
      img: "assets/img/pouch-500.svg"
    },
    transform: {
      title: "Gut Reset — 12 ugers forløb",
      sub: "3 × 250 g · 75 portioner",
      price: 579,
      was: 687,
      servings: 75,
      img: "assets/img/pouch.svg"
    }
  };

  var cart = store.get(CART_KEY, {});

  function cartCount() {
    return Object.keys(cart).reduce(function (sum, id) {
      return sum + cart[id];
    }, 0);
  }

  function cartTotal() {
    return Object.keys(cart).reduce(function (sum, id) {
      var item = CATALOG[id];
      return item ? sum + item.price * cart[id] : sum;
    }, 0);
  }

  function saveCart() {
    store.set(CART_KEY, cart);
    renderCart();
  }

  function addToCart(id, qty) {
    var item = CATALOG[id];
    if (!item) return;
    qty = qty || 1;
    cart[id] = (cart[id] || 0) + qty;
    saveCart();
    toast(item.title + " lagt i kurven");
    openDrawer(true);
  }

  function setQty(id, qty) {
    if (qty <= 0) delete cart[id];
    else cart[id] = qty;
    saveCart();
  }

  function selectedVariant() {
    var sel = $('input[name="variant"]:checked');
    return sel && CATALOG[sel.value] ? sel.value : "starter";
  }

  function perServing(item) {
    return Math.round(item.price / item.servings);
  }

  function renderCart() {
    var count = cartCount();
    var total = cartTotal();

    $$("[data-cart-count]").forEach(function (el) {
      el.textContent = String(count);
      el.classList.toggle("is-on", count > 0);
      el.setAttribute("aria-hidden", count === 0 ? "true" : "false");
    });

    $$("[data-cart-trigger]").forEach(function (el) {
      el.setAttribute("aria-label", count === 0 ? "Kurv, tom" : "Kurv, " + count + " varer");
    });

    var body = $("[data-cart-items]");
    var empty = $("[data-cart-empty]");
    var foot = $("[data-cart-foot]");
    if (!body) return;

    var ids = Object.keys(cart);
    if (empty) empty.hidden = ids.length > 0;
    if (foot) foot.hidden = ids.length === 0;
    body.textContent = "";

    ids.forEach(function (id) {
      var p = CATALOG[id];
      if (!p) return;
      var qty = cart[id];

      var row = document.createElement("div");
      row.className = "line-item";

      var thumb = document.createElement("div");
      thumb.className = "line-item__thumb";
      var img = document.createElement("img");
      img.src = p.img;
      img.alt = "";
      img.width = 58;
      img.height = 58;
      img.loading = "lazy";
      thumb.appendChild(img);

      var info = document.createElement("div");
      var title = document.createElement("div");
      title.className = "line-item__title";
      title.textContent = p.title;
      var sub = document.createElement("div");
      sub.className = "line-item__sub";
      sub.textContent = p.sub;

      var stepper = document.createElement("div");
      stepper.className = "stepper";
      var minus = document.createElement("button");
      minus.type = "button";
      minus.setAttribute("data-step", "-1");
      minus.setAttribute("aria-label", "Færre");
      minus.textContent = "−";
      var qtyEl = document.createElement("span");
      qtyEl.textContent = String(qty);
      var plus = document.createElement("button");
      plus.type = "button";
      plus.setAttribute("data-step", "1");
      plus.setAttribute("aria-label", "Flere");
      plus.textContent = "+";
      stepper.appendChild(minus);
      stepper.appendChild(qtyEl);
      stepper.appendChild(plus);

      info.appendChild(title);
      info.appendChild(sub);
      info.appendChild(stepper);

      var side = document.createElement("div");
      var priceEl = document.createElement("div");
      priceEl.className = "line-item__price";
      priceEl.textContent = money(p.price * qty);
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "line-item__remove";
      remove.setAttribute("data-remove", "");
      remove.textContent = "Fjern";
      side.appendChild(priceEl);
      side.appendChild(remove);

      row.appendChild(thumb);
      row.appendChild(info);
      row.appendChild(side);

      minus.addEventListener("click", function () {
        setQty(id, qty - 1);
      });
      plus.addEventListener("click", function () {
        setQty(id, qty + 1);
      });
      remove.addEventListener("click", function () {
        setQty(id, 0);
      });

      body.appendChild(row);
    });

    var sum = $("[data-cart-total]");
    if (sum) sum.textContent = money(total);

    var remain = Math.max(0, FREE_SHIPPING - total);
    var unlocked = total >= FREE_SHIPPING;
    var shipMsg = unlocked
      ? "Fri fragt er låst op"
      : "Køb for " + money(remain) + " mere og få fri fragt";
    var fillPct = Math.min(100, (total / FREE_SHIPPING) * 100) + "%";

    $$("[data-ship-msg], [data-shipping-msg]").forEach(function (el) {
      el.textContent = shipMsg;
    });
    $$("[data-ship-fill], [data-shipping-fill]").forEach(function (el) {
      el.style.width = fillPct;
    });
  }

  /* ---------- Drawer: focus trap, Escape, overlay --------------------- */

  var lastFocus = null;
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusables(root) {
    return $$(FOCUSABLE, root).filter(function (el) {
      return !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true";
    });
  }

  function openDrawer(open) {
    var drawer = $("[data-cart-drawer]");
    var overlay = $("[data-overlay]");
    if (!drawer) return;

    var menu = $("[data-menu]");
    if (open && menu && menu.classList.contains("is-open")) {
      menu.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      $$("[data-menu-toggle]").forEach(function (t) {
        t.setAttribute("aria-expanded", "false");
      });
    }

    if (open) lastFocus = document.activeElement;
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    if (overlay) {
      overlay.classList.toggle("is-open", open);
      overlay.setAttribute("aria-hidden", String(!open));
    }
    lockScroll(open);

    if (open) {
      var closeBtn = $("[data-cart-close]", drawer);
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    } else if (lastFocus && lastFocus.focus) {
      lastFocus.focus({ preventScroll: true });
    }
  }

  function initDrawer() {
    var drawer = $("[data-cart-drawer]");
    if (!drawer) return;

    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-cart-trigger]");
      if (trigger) {
        openDrawer(true);
        return;
      }
      if (e.target.closest("[data-cart-close], [data-overlay]")) {
        openDrawer(false);
      }
    });

    document.addEventListener("keydown", function (e) {
      if (!drawer.classList.contains("is-open")) return;
      if (e.key === "Escape") {
        openDrawer(false);
        return;
      }
      if (e.key !== "Tab") return;
      var nodes = focusables(drawer);
      if (!nodes.length) return;
      var first = nodes[0];
      var last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    var checkout = $("[data-checkout]");
    if (checkout) {
      checkout.addEventListener("click", function () {
        if (!cartCount()) return;
        toast("Tak. Du sendes til betaling.");
      });
    }

    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-add]");
      if (!btn) return;
      e.preventDefault();
      var id = btn.getAttribute("data-add");
      if (id === "selected") id = selectedVariant();
      addToCart(id);
    });

    renderCart();
  }

  /* ---------- Variant price update; sticky-buy per serving only ------- */

  function applyVariant(id) {
    var item = CATALOG[id];
    if (!item) return;
    var per = money(perServing(item)) + " pr. portion";

    $$("[data-price]").forEach(function (el) {
      if (el.closest(".sticky-buy")) return;
      el.textContent = money(item.price);
    });
    $$("[data-was]").forEach(function (el) {
      if (el.closest(".sticky-buy")) return;
      el.textContent = money(item.was);
    });
    $$("[data-per]").forEach(function (el) {
      el.textContent = per;
    });
  }

  function initVariants() {
    $$('input[name="variant"]').forEach(function (input) {
      input.addEventListener("change", function () {
        applyVariant(input.value);
      });
    });
    applyVariant(selectedVariant());
  }

  /* ---------- Sticky buy IntersectionObserver [data-sticky-after] ----- */

  function initStickyBuy() {
    var bar = $(".sticky-buy");
    var after = $("[data-sticky-after]");
    if (!bar || !after) return;

    if (!("IntersectionObserver" in window)) {
      bar.classList.add("is-on");
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        var off = !entries[0].isIntersecting;
        bar.classList.toggle("is-on", off);
        bar.setAttribute("aria-hidden", String(!off));
      },
      { threshold: 0 }
    );
    io.observe(after);
  }

  /* ---------- Subscribe + contact forms ------------------------------- */

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v || "").trim());
  }

  function fieldControl(wrap) {
    return $("input, textarea, select", wrap);
  }

  function setFieldError(wrap, msg) {
    var err = $(".field__error", wrap);
    var ctrl = fieldControl(wrap);
    if (err) err.textContent = msg || "";
    if (ctrl) ctrl.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function formNote(form) {
    return $("[data-form-status]", form) || $("[data-note]", form) || $("[data-note]", form.parentElement);
  }

  function validateRequired(form) {
    var ok = true;
    $$("[data-required]", form).forEach(function (wrap) {
      var ctrl = fieldControl(wrap);
      if (!ctrl) return;
      var value = (ctrl.value || "").trim();
      if (!value) {
        setFieldError(wrap, "Udfyld feltet");
        if (ok && ctrl.focus) ctrl.focus();
        ok = false;
        return;
      }
      if ((ctrl.type === "email" || ctrl.name === "email") && !validEmail(value)) {
        setFieldError(wrap, "Indtast en gyldig mailadresse");
        if (ok && ctrl.focus) ctrl.focus();
        ok = false;
        return;
      }
      setFieldError(wrap, "");
    });
    return ok;
  }

  function initForms() {
    $$("[data-subscribe]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = $('input[type="email"], input[name="email"]', form);
        var note = formNote(form);
        if (!input || !validEmail(input.value)) {
          if (note) note.textContent = "Indtast en gyldig mailadresse";
          if (input) input.focus();
          return;
        }
        var thanks = "Tak — 15 % rabatkode er sendt til din indbakke";
        if (note) note.textContent = thanks;
        form.reset();
        toast(thanks);
      });
    });

    $$("[data-notify]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = $('input[type="email"], input[name="email"]', form);
        var note = formNote(form);
        if (!input || !validEmail(input.value)) {
          if (note) note.textContent = "Indtast en gyldig mailadresse";
          if (input) input.focus();
          return;
        }
        var thanks = "Tak — vi skriver, når kapitlet er klar";
        if (note) note.textContent = thanks;
        form.reset();
        toast(thanks);
      });
    });

    $$("[data-contact]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!validateRequired(form)) return;
        var thanks = "Tak — vi vender tilbage inden for 24 timer";
        var note = formNote(form);
        if (note) note.textContent = thanks;
        form.reset();
        $$("[data-required]", form).forEach(function (wrap) {
          setFieldError(wrap, "");
        });
        toast(thanks);
      });
    });
  }

  /* ---------- data-year ----------------------------------------------- */

  function initYear() {
    var y = String(new Date().getFullYear());
    $$("[data-year]").forEach(function (el) {
      el.textContent = y;
    });
  }

  /* ---------- Active nav ---------------------------------------------- */

  function initActiveNav() {
    var file = (location.pathname.split("/").pop() || "index.html").split("?")[0];
    if (!file) file = "index.html";

    var aliases = {
      "produkt.html": "shop.html",
      "artikel.html": "research.html",
      "standards.html": "om-os.html",
      "kontakt.html": "om-os.html"
    };
    var highlight = aliases[file] || file;

    $$(".nav__link, .mobile-menu__link, [data-nav-link]").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("#")[0].split("/").pop();
      if (!href) href = "index.html";
      var on = href === file || href === highlight;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function initTruth() {
    $$("[data-ship-threshold]").forEach(function (el) {
      el.textContent = String(FREE_SHIPPING);
    });
    $$("[data-scoop]").forEach(function (el) {
      el.textContent = String(SCOOP_G);
    });
    $$("[data-guarantee]").forEach(function (el) {
      el.textContent = String(GUARANTEE_WEEKS);
    });
  }

  function initPdp() {
    var root = $("[data-pdp]");
    if (!root) return;

    var params = new URLSearchParams(location.search);
    var id = params.get("p") || "gut-reset";
    var product = PRODUCTS[id] || PRODUCTS["gut-reset"];
    var live = product.status === "live";

    document.body.setAttribute("data-product", live ? "live" : "pending");

    $$("[data-pdp-name]").forEach(function (el) {
      el.textContent = product.name;
    });
    $$("[data-pdp-kicker]").forEach(function (el) {
      el.textContent = product.kicker;
    });
    $$("[data-pdp-sub]").forEach(function (el) {
      el.textContent = product.subtitle;
    });

    if (product.title) document.title = product.title;

    var crumbs = $("[data-pdp-crumb]");
    if (crumbs) crumbs.textContent = product.name;
  }

  function initSocial() {
    $$("[data-rating]").forEach(function (el) {
      el.textContent = SOCIAL.rating;
    });
    $$("[data-review-count]").forEach(function (el) {
      el.textContent = String(SOCIAL.count);
    });
    var foot = $("[data-cart-foot]");
    if (foot && !$("[data-cart-proof]")) {
      var p = document.createElement("p");
      p.className = "review-origin";
      p.setAttribute("data-cart-proof", "");
      p.style.textAlign = "center";
      p.textContent = SOCIAL.rating + " / 5 · " + SOCIAL.count + " anmeldelser";
      foot.appendChild(p);
    }
  }

  var STAR_SVG =
    "<svg viewBox='0 0 24 24'><path fill='currentColor' d='m12 2 2.9 6.2 6.8.8-5 4.6 1.4 6.7L12 17l-6.1 3.3L7.3 13.6l-5-4.6 6.8-.8L12 2Z'/></svg>";

  function reviewPhotos(r) {
    var p = r && r.photos;
    if (!p) return [];
    return (Array.isArray(p) ? p : [p]).filter(Boolean);
  }

  function reviewMeta(r) {
    if (r.meta) return r.meta;
    var bits = [];
    if (r.verified) bits.push("Verificeret k\u00f8ber");
    else bits.push("Kunde");
    if (r.country) bits.push(r.country);
    if (r.date) bits.push(r.date);
    return bits.join(" \u00b7 ");
  }

  function usableReviews() {
    return REVIEWS.filter(function (r) {
      return String(r.text || "").trim() || reviewPhotos(r).length;
    });
  }

  function renderReviewCard(r) {
    var article = document.createElement("article");
    article.className = "quote";
    var n = Math.max(1, Math.min(5, parseInt(r.star, 10) || 5));
    var stars = document.createElement("div");
    stars.className = "stars";
    stars.setAttribute("aria-label", n + " ud af 5");
    stars.innerHTML = STAR_SVG.repeat(n);

    var photos = reviewPhotos(r);
    if (photos.length) {
      var row = document.createElement("div");
      row.className = "quote__photos";
      photos.forEach(function (src) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quote__photo";
        btn.setAttribute("aria-label", "Vis billede st\u00f8rre");
        var img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        img.setAttribute("data-full", String(src).replace(/style\/trustoo_(?:card_)?small/i, "style/trustoo_big"));
        btn.appendChild(img);
        row.appendChild(btn);
      });
      article.appendChild(row);
    }

    article.appendChild(stars);

    var text = String(r.text || "").trim();
    if (text) {
      var bq = document.createElement("blockquote");
      bq.className = "quote__body";
      bq.textContent = text;
      article.appendChild(bq);
      if (text.length > 220) {
        article.classList.add("is-clamped");
        var more = document.createElement("button");
        more.type = "button";
        more.className = "quote__more";
        more.textContent = "Vis mere";
        more.addEventListener("click", function () {
          var open = article.classList.toggle("is-open");
          article.classList.toggle("is-clamped", !open);
          more.textContent = open ? "Vis mindre" : "Vis mere";
        });
        article.appendChild(more);
      }
    }

    var who = document.createElement("div");
    who.className = "quote__who";
    who.innerHTML = "<i></i><div><b></b><span></span></div>";
    $("i", who).textContent = r.initial || (r.name || "?").charAt(0).toUpperCase();
    $("b", who).textContent = r.name || "Kunde";
    if (r.verified) $("b", who).setAttribute("data-verified", "");
    $("span", who).textContent = reviewMeta(r);
    article.appendChild(who);
    return article;
  }

  function initPhotoZoom() {
    if ($("[data-photo-zoom]")) return;
    var box = document.createElement("div");
    box.className = "photo-zoom";
    box.setAttribute("data-photo-zoom", "");
    box.setAttribute("hidden", "");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Anmeldelse");
    box.innerHTML =
      "<button class='photo-zoom__close icon-btn' type='button' aria-label='Luk'>" +
      "<svg viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-width='1.6' d='M5 5l14 14M19 5 5 19'/></svg>" +
      "</button>" +
      "<div class='photo-zoom__panel'>" +
      "<div class='photo-zoom__media'><img alt=''></div>" +
      "<div class='photo-zoom__copy'>" +
      "<div class='stars' data-zoom-stars></div>" +
      "<blockquote class='photo-zoom__text'></blockquote>" +
      "<div class='quote__who' data-zoom-who><i></i><div><b></b><span></span></div></div>" +
      "</div></div>";
    document.body.appendChild(box);
    var img = $(".photo-zoom__media img", box);
    var textEl = $(".photo-zoom__text", box);
    var starsEl = $("[data-zoom-stars]", box);
    var who = $("[data-zoom-who]", box);
    var closeBtn = $(".photo-zoom__close", box);

    function close() {
      if (box.hidden) return;
      box.hidden = true;
      img.removeAttribute("src");
      textEl.textContent = "";
      lockScroll(false);
    }

    function open(btn) {
      var thumb = $("img", btn);
      var card = btn.closest(".quote");
      if (!thumb || !card) return;
      img.src = thumb.getAttribute("data-full") || thumb.src;
      var body = $(".quote__body", card);
      textEl.textContent = body ? body.textContent : "";
      textEl.hidden = !textEl.textContent;
      var cardStars = $(".stars", card);
      starsEl.innerHTML = cardStars ? cardStars.innerHTML : "";
      var cardWho = $(".quote__who", card);
      if (cardWho) {
        $("i", who).textContent = $("i", cardWho).textContent;
        $("b", who).textContent = $("b", cardWho).textContent;
        if ($("b", cardWho).hasAttribute("data-verified")) $("b", who).setAttribute("data-verified", "");
        else $("b", who).removeAttribute("data-verified");
        $("span", who).textContent = $("span", cardWho).textContent;
      }
      box.hidden = false;
      lockScroll(true);
      closeBtn.focus({ preventScroll: true });
    }

    box.addEventListener("click", function (e) {
      if (e.target === box || e.target.closest(".photo-zoom__close")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || box.hidden) return;
      e.preventDefault();
      close();
    });
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".quote__photo");
      if (!btn) return;
      open(btn);
    });
  }

  function initReviews() {
    var pool = usableReviews();
    $$("[data-reviews]").forEach(function (root) {
      if (root.children.length) return;
      var limit = parseInt(root.getAttribute("data-limit"), 10);
      var pageSize = parseInt(root.getAttribute("data-page-size"), 10);
      var layout = root.getAttribute("data-reviews-layout") || "";
      var list = pool.slice(0, limit > 0 ? limit : pool.length);
      if (layout === "list") root.classList.add("reviews-list");

      var shown = 0;
      var step = pageSize > 0 ? pageSize : list.length;
      var moreBtn = null;

      function paint() {
        list.slice(shown, shown + step).forEach(function (r) {
          root.appendChild(renderReviewCard(r));
        });
        shown = Math.min(list.length, shown + step);
        if (moreBtn) moreBtn.hidden = shown >= list.length;
      }

      if (pageSize > 0 && list.length > pageSize) {
        moreBtn = document.createElement("button");
        moreBtn.type = "button";
        moreBtn.className = "btn btn--ghost reviews-more";
        moreBtn.textContent = "Vis flere anmeldelser";
        moreBtn.addEventListener("click", paint);
        root.insertAdjacentElement("afterend", moreBtn);
      }
      paint();
    });
  }

  function initHeroFilm() {
    var video = $("[data-hero-video]");
    if (!video) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      video.pause();
      video.removeAttribute("autoplay");
      return;
    }
    var play = function () {
      var run = video.play();
      if (run && typeof run.catch === "function") run.catch(function () {});
    };
    play();
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) video.pause();
      else play();
    });
  }

  function initMedia() {
    $$("[data-media]").forEach(function (slot) {
      var btn = $("[data-media-play]", slot);
      var video = $("video", slot);
      if (!btn) return;
      btn.addEventListener("click", function () {
        var src = video && (video.getAttribute("src") || video.getAttribute("data-src"));
        if (video && src) {
          if (!video.getAttribute("src") && video.getAttribute("data-src")) {
            video.src = video.getAttribute("data-src");
          }
          video.play();
          slot.classList.add("is-playing");
          btn.hidden = true;
          return;
        }
        btn.setAttribute("aria-label", "Filmen publiceres her");
      });
    });
  }

  function initDock() {
    if ($("[data-dock]")) return;
    var nav = document.createElement("nav");
    nav.className = "dock";
    nav.setAttribute("data-dock", "");
    nav.setAttribute("aria-label", "Genveje");
    var file = (location.pathname.split("/").pop() || "index.html").split("?")[0];
    var items = [
      ["shop.html", "Butik"],
      ["ritual.html", "Ritualer"],
      ["research.html", "Videnskab"],
      ["cart", "Kurv"]
    ];
    items.forEach(function (item) {
      if (item[0] === "cart") {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("data-cart-trigger", "");
        btn.textContent = "Kurv";
        nav.appendChild(btn);
        return;
      }
      var a = document.createElement("a");
      a.href = item[0];
      a.textContent = item[1];
      if (
        item[0] === file ||
        (file === "produkt.html" && item[0] === "shop.html") ||
        (file === "artikel.html" && item[0] === "research.html")
      ) {
        a.setAttribute("aria-current", "page");
        a.className = "is-active";
      }
      nav.appendChild(a);
    });
    document.body.appendChild(nav);
  }

  /* ---------- Formel-bjælker ----------------------------------------- */

  function initComp() {
    var roots = $$("[data-comp]");
    if (!roots.length) return;

    function fill(root) {
      $$(".comp__row", root).forEach(function (row) {
        row.classList.add("is-in");
      });
    }

    if (reduceMotion || !("IntersectionObserver" in window)) {
      roots.forEach(fill);
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          fill(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.28 }
    );

    roots.forEach(function (root) {
      io.observe(root);
    });
  }

  /* ---------- Start --------------------------------------------------- */

  function boot() {
    initTheme();
    initAnnounce();
    initHeader();
    initMobileMenu();
    initReveal();
    initCounters();
    initJourney();
    initTabs();
    initFaq();
    initCompare();
    initReviews();
    initPhotoZoom();
    initRails();
    initMarquee();
    initDock();
    initDrawer();
    initVariants();
    initStickyBuy();
    initForms();
    initYear();
    initActiveNav();
    initComp();
    initTruth();
    initPdp();
    initSocial();
    initMedia();
    initHeroFilm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
