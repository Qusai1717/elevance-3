/* ==========================================================================
   ElevanceYVR — shared site behaviour
   Sticky nav, mobile menu, promo banner, config injection, scroll reveal,
   review carousel, FAQ accordion, before/after slider, contact form.
   No dependencies. Progressive enhancement — site works without JS.
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.ELEVANCE_CONFIG || {};

  /* ---------- Config injection ----------
     <a data-config="tel">        -> href=tel:, text=phone
     <a data-config="sms">        -> href=sms:
     <a data-config="mailto">     -> href=mailto:, text=email
     <a data-config="review">     -> Google review link
     <a data-config="directions"> -> Google Maps directions
     <a data-config="maps">       -> Google Maps profile
  */
  var linkMap = {
    tel: { href: "tel:+1" + String(CFG.phonePrimary || "").replace(/\D/g, ""), text: CFG.phonePrimary },
    tel2: { href: "tel:+1" + String(CFG.phoneSecondary || "").replace(/\D/g, ""), text: CFG.phoneSecondary },
    sms: { href: "sms:+1" + String(CFG.phonePrimary || "").replace(/\D/g, ""), text: CFG.phonePrimary },
    mailto: { href: "mailto:" + (CFG.email || ""), text: CFG.email },
    review: { href: CFG.googleReviewUrl },
    directions: { href: CFG.directionsUrl },
    maps: { href: CFG.googleMapsUrl },
  };
  document.querySelectorAll("[data-config]").forEach(function (el) {
    var m = linkMap[el.getAttribute("data-config")];
    if (!m) return;
    if (m.href && el.tagName === "A") el.href = m.href;
    if (el.hasAttribute("data-config-text") && m.text) el.textContent = m.text;
  });

  // Hours tables: <tbody data-hours></tbody>
  document.querySelectorAll("[data-hours]").forEach(function (tbody) {
    tbody.innerHTML = (CFG.hours || [])
      .map(function (h) { return "<tr><td>" + h[0] + "</td><td>" + h[1] + "</td></tr>"; })
      .join("");
  });

  /* ---------- Promo banner ---------- */
  if (CFG.promo && CFG.promo.enabled && !sessionStorage.getItem("promoDismissed")) {
    var banner = document.createElement("div");
    banner.className = "promo-banner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Promotion");
    banner.innerHTML =
      CFG.promo.text +
      (CFG.promo.link ? ' <a href="' + CFG.promo.link + '">' + CFG.promo.linkText + " →</a>" : "") +
      '<button class="promo-close" aria-label="Dismiss promotion">✕</button>';
    document.body.prepend(banner);
    document.body.classList.add("has-promo");
    banner.querySelector(".promo-close").addEventListener("click", function () {
      banner.remove();
      document.body.classList.remove("has-promo");
      sessionStorage.setItem("promoDismissed", "1");
    });
  }

  /* ---------- Sticky header ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
      document.body.style.overflow = open ? "hidden" : "";
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      }
    });
  }

  /* ---------- Scroll reveal ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("visible");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------- Review carousel ---------- */
  document.querySelectorAll(".carousel").forEach(function (carousel) {
    var track = carousel.querySelector(".carousel-track");
    var slides = carousel.querySelectorAll(".review-slide");
    var prev = carousel.parentElement.querySelector(".carousel-prev");
    var next = carousel.parentElement.querySelector(".carousel-next");
    var dotsWrap = carousel.parentElement.querySelector(".carousel-dots");
    if (!track || !slides.length) return;
    var i = 0, timer;

    if (dotsWrap) {
      slides.forEach(function (_, idx) {
        var b = document.createElement("button");
        b.setAttribute("aria-label", "Go to review " + (idx + 1));
        b.addEventListener("click", function () { go(idx); restart(); });
        dotsWrap.appendChild(b);
      });
    }
    function go(n) {
      i = (n + slides.length) % slides.length;
      track.style.transform = "translateX(-" + i * 100 + "%)";
      if (dotsWrap) {
        dotsWrap.querySelectorAll("button").forEach(function (d, idx) {
          d.setAttribute("aria-selected", idx === i);
        });
      }
    }
    function restart() {
      clearInterval(timer);
      timer = setInterval(function () { go(i + 1); }, 6500);
    }
    if (prev) prev.addEventListener("click", function () { go(i - 1); restart(); });
    if (next) next.addEventListener("click", function () { go(i + 1); restart(); });
    carousel.addEventListener("mouseenter", function () { clearInterval(timer); });
    carousel.addEventListener("mouseleave", restart);
    // Touch swipe
    var startX = null;
    carousel.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { go(dx < 0 ? i + 1 : i - 1); restart(); }
      startX = null;
    }, { passive: true });
    go(0);
    restart();
  });

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      btn.setAttribute("aria-expanded", !expanded);
      if (panel) panel.style.maxHeight = expanded ? "0" : panel.scrollHeight + "px";
    });
  });

  /* ---------- Before / After slider ---------- */
  document.querySelectorAll(".ba-slider").forEach(function (slider) {
    function setPos(clientX) {
      var r = slider.getBoundingClientRect();
      var pct = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
      slider.style.setProperty("--pos", pct + "%");
    }
    var dragging = false;
    slider.addEventListener("pointerdown", function (e) {
      dragging = true;
      slider.setPointerCapture(e.pointerId);
      setPos(e.clientX);
    });
    slider.addEventListener("pointermove", function (e) { if (dragging) setPos(e.clientX); });
    slider.addEventListener("pointerup", function () { dragging = false; });
    // Keyboard access
    var handle = slider.querySelector(".ba-handle");
    if (handle) {
      handle.setAttribute("tabindex", "0");
      handle.setAttribute("role", "slider");
      handle.setAttribute("aria-label", "Before and after comparison");
      handle.addEventListener("keydown", function (e) {
        var cur = parseFloat(slider.style.getPropertyValue("--pos")) || 50;
        if (e.key === "ArrowLeft") slider.style.setProperty("--pos", Math.max(0, cur - 5) + "%");
        if (e.key === "ArrowRight") slider.style.setProperty("--pos", Math.min(100, cur + 5) + "%");
      });
    }
  });

  /* ---------- Contact form (front-end only) ----------
     Wire the action to Formspree / Cloudflare Worker later — see README. */
  var contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!contactForm.checkValidity()) { contactForm.reportValidity(); return; }
      var status = document.getElementById("contact-status");
      // TODO: replace with a real endpoint (see README → "Connecting forms")
      contactForm.hidden = true;
      if (status) {
        status.hidden = false;
        status.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
