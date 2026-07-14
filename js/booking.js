/* ==========================================================================
   ElevanceYVR — booking wizard + Square integration
   --------------------------------------------------------------------------
   EVERYTHING configurable lives in js/config.js → the `square` section.
   You should never need to edit this file to change payment behaviour.

   How it works:
   • bookingMode "square"  → hides the wizard, shows your Square Appointments
     booking page/widget (Square handles calendar, reminders, payments).
   • bookingMode "custom"  → 7-step wizard below. At the payment step:
       - enableOnlinePayments true  → Square Web Payments SDK card form,
         charging a deposit or the full amount (paymentMode in config).
         The card token is sent to /api/create-payment (Cloudflare Pages
         Function in /functions) which calls Square's Payments API with
         your SECRET token stored safely as a Cloudflare env variable.
       - enableOnlinePayments false → pay-after-service (cash / e-transfer).
   • Bookings are also POSTed to /api/bookings for storage/notifications;
     if no backend exists yet the site still shows the confirmation screen.

   Future features (promo codes, gift cards, memberships, reminders…) plug
   in at the marked EXTENSION POINTS below.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.ELEVANCE_CONFIG || {};
  var SQ = CFG.square || {};

  /* ---------- Catalog ----------
     Packages & add-ons come from js/config.js → catalog (single source of
     truth). The fallback below only applies if config.js fails to load. */
  var CAT = CFG.catalog || {};
  var PACKAGES = CAT.packages || {
    interior: { label: "Interior Detailing", price: 189 },
    exterior: { label: "Exterior Detailing", price: 149 },
    full:     { label: "Full Detail",        price: 299 },
  };
  var ADDONS = CAT.addons || {
    seatshampoo:   { label: "Seat Shampoo",         price: 49 },
    carpetshampoo: { label: "Carpet Shampoo",       price: 49 },
    leather:       { label: "Leather Conditioning", price: 45 },
    odor:          { label: "Odor Treatment",       price: 69 },
  };

  var form = document.getElementById("booking-form");
  if (!form) return;

  /* ========================================================================
     MODE 1 — SQUARE APPOINTMENTS
     Active when config: bookingMode "square" + a booking link/widget URL.
     ======================================================================== */
  var squarePanel = document.getElementById("square-booking-panel");
  var wizardSection = document.getElementById("booking-wizard");
  if (SQ.bookingMode === "square" && (SQ.squareBookingLink || SQ.squareWidgetScriptUrl)) {
    if (wizardSection) wizardSection.hidden = true;
    if (squarePanel) {
      squarePanel.hidden = false;
      var linkBtn = document.getElementById("square-booking-link");
      if (SQ.squareBookingLink && linkBtn) linkBtn.href = SQ.squareBookingLink;
      else if (linkBtn) linkBtn.hidden = true;
      if (SQ.squareWidgetScriptUrl) {
        // Inline embed: Square's official widget script renders into the page
        var s = document.createElement("script");
        s.src = SQ.squareWidgetScriptUrl;
        s.async = true;
        document.getElementById("square-widget-mount").appendChild(s);
        if (linkBtn) linkBtn.classList.replace("btn-gold", "btn-outline");
      }
    }
    return; // wizard not needed
  }

  /* ========================================================================
     MODE 2 — CUSTOM WIZARD
     ======================================================================== */

  /* ---------- Payment mode resolution (from config) ---------- */
  var onlinePay = !!SQ.enableOnlinePayments && !!SQ.squareApplicationID && !!SQ.squareLocationID;
  var payMode = SQ.paymentMode || "payAfterService";
  if (payMode === "deposit" && SQ.enableDeposits === false) payMode = "payAfterService";
  if (!onlinePay) payMode = "payAfterService";
  var deposit = Math.max(0, Number(SQ.depositAmount) || 0);

  /* ---------- Elements ---------- */
  var steps = Array.prototype.slice.call(form.querySelectorAll(".wizard-step"));
  var TOTAL = steps.length; // 7
  var current = 1;
  var btnBack = document.getElementById("wiz-back");
  var btnNext = document.getElementById("wiz-next");
  var btnSubmit = document.getElementById("wiz-submit");

  /* ---------- Pre-select package from URL (?package=full) ---------- */
  var pkgParam = new URLSearchParams(location.search).get("package");
  if (pkgParam && PACKAGES[pkgParam]) {
    var radio = form.querySelector('input[name="package"][value="' + pkgParam + '"]');
    if (radio) radio.checked = true;
  }

  /* ---------- Date input: today or later ---------- */
  var dateInput = document.getElementById("bk-date");
  if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];

  /* ---------- State helpers ---------- */
  function money(n) { return "$" + n; }
  function readState() {
    var data = new FormData(form);
    var pkg = PACKAGES[data.get("package")] || PACKAGES.full;
    var addons = data.getAll("addons").map(function (k) { return ADDONS[k]; }).filter(Boolean);
    var total = pkg.price + addons.reduce(function (s, a) { return s + a.price; }, 0);
    return {
      package: pkg, addonKeys: data.getAll("addons"), addons: addons, total: total,
      date: data.get("date"), time: data.get("time"),
      vehicle: {
        make: (data.get("vehicleMake") || "").trim(),
        model: (data.get("vehicleModel") || "").trim(),
        year: (data.get("vehicleYear") || "").trim(),
        colour: (data.get("vehicleColour") || "").trim(),
      },
      address: (data.get("address") || "").trim(),
      phone: (data.get("phone") || "").trim(),
      email: (data.get("email") || "").trim(),
      notes: (data.get("notes") || "").trim(),
      payment: data.get("payment") || (payMode === "full" ? "Card (paid online)" : payMode === "deposit" ? "Card deposit + balance on completion" : "Cash"),
    };
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-CA", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  }
  function amountDueNow(total) {
    if (payMode === "full") return total;
    if (payMode === "deposit") return Math.min(deposit, total);
    return 0;
  }
  function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

  /* ---------- Live summary ---------- */
  function updateSummary() {
    var s = readState();
    set("sum-package", s.package.label);
    set("sum-addons", s.addons.length ? s.addons.map(function (a) { return a.label; }).join(", ") : "None");
    set("sum-date", fmtDate(s.date));
    set("sum-time", s.time || "—");
    var veh = [s.vehicle.year, s.vehicle.make, s.vehicle.model].filter(Boolean).join(" ");
    set("sum-vehicle", veh || "—");
    set("sum-total", money(s.total));
    var depRow = document.getElementById("sum-deposit-row");
    if (depRow) {
      var due = amountDueNow(s.total);
      depRow.hidden = !(onlinePay && due > 0 && due < s.total);
      set("sum-deposit", money(due));
    }
  }
  form.addEventListener("input", updateSummary);
  form.addEventListener("change", updateSummary);

  /* ---------- Progress indicator ---------- */
  function paintProgress() {
    set("progress-current", current);
    set("progress-total", TOTAL);
    var fill = document.getElementById("progress-fill");
    if (fill) fill.style.width = ((current - 1) / (TOTAL - 1)) * 100 + "%";
    document.querySelectorAll(".progress-step").forEach(function (el) {
      var n = Number(el.getAttribute("data-step"));
      el.classList.toggle("done", n < current);
      el.classList.toggle("current", n === current);
    });
  }

  /* ---------- Step navigation ---------- */
  function validateStep(n) {
    var panel = steps[n - 1];
    var ok = true;
    panel.querySelectorAll(".field").forEach(function (f) { f.classList.remove("invalid"); });
    panel.querySelectorAll("input[required], select[required]").forEach(function (input) {
      if (!input.checkValidity()) {
        var field = input.closest(".field");
        if (field) field.classList.add("invalid");
        if (ok) input.focus();
        ok = false;
      }
    });
    return ok;
  }
  function show(n) {
    current = Math.min(Math.max(1, n), TOTAL);
    steps.forEach(function (s, i) { s.hidden = i !== current - 1; });
    btnBack.hidden = current === 1;
    btnNext.hidden = current === TOTAL;
    btnSubmit.hidden = current !== TOTAL;
    paintProgress();
    if (current === 6) renderReview();
    if (current === 7) setupPaymentStep();
    // Scroll wizard into view for a smooth step change
    document.querySelector(".progress").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  btnNext.addEventListener("click", function () {
    if (!validateStep(current)) return;
    show(current + 1);
  });
  btnBack.addEventListener("click", function () { show(current - 1); });

  /* ---------- Review step ---------- */
  function esc(t) { var d = document.createElement("div"); d.textContent = t; return d.innerHTML; }
  function renderReview() {
    var s = readState();
    var due = amountDueNow(s.total);
    var rows = [
      ["Package", s.package.label + " — " + money(s.package.price)],
      ["Add-ons", s.addons.length ? s.addons.map(function (a) { return a.label + " (+" + money(a.price) + ")"; }).join(", ") : "None"],
      ["Date", fmtDate(s.date)],
      ["Time", s.time || "—"],
      ["Vehicle", [s.vehicle.year, s.vehicle.make, s.vehicle.model, s.vehicle.colour].filter(Boolean).join(" ")],
      ["Address", s.address],
      ["Phone", s.phone],
      ["Email", s.email],
    ];
    if (s.notes) rows.push(["Instructions", s.notes]);
    var html = rows.map(function (r) {
      return '<div class="summary-row"><span>' + r[0] + "</span><strong>" + esc(r[1]) + "</strong></div>";
    }).join("");
    html += '<div class="summary-total"><span>Estimated total</span><span>' + money(s.total) + "</span></div>";
    if (onlinePay && due > 0) {
      html += '<div class="summary-row"><span>' + (payMode === "deposit" ? "Deposit due at next step" : "Due at next step") + "</span><strong>" + money(due) + "</strong></div>";
    }
    document.getElementById("review-card").innerHTML = html;
  }

  /* ========================================================================
     SQUARE WEB PAYMENTS SDK (payment step)
     Card details are entered into Square's secure iframe fields — they never
     touch this website or its hosting. We only receive a one-time token.
     ======================================================================== */
  var card = null, sdkLoading = null;
  function loadSquareSdk() {
    if (sdkLoading) return sdkLoading;
    sdkLoading = new Promise(function (resolve, reject) {
      if (window.Square) return resolve(window.Square);
      var s = document.createElement("script");
      s.src = SQ.squareEnvironment === "production"
        ? "https://web.squarecdn.com/v1/square.js"
        : "https://sandbox.web.squarecdn.com/v1/square.js";
      s.onload = function () { resolve(window.Square); };
      s.onerror = function () { reject(new Error("Could not load Square payments")); };
      document.head.appendChild(s);
    });
    return sdkLoading;
  }
  function setupPaymentStep() {
    var s = readState();
    var due = amountDueNow(s.total);
    var online = document.getElementById("payment-online");
    var offline = document.getElementById("payment-offline");
    var title = document.getElementById("payment-title");

    if (!onlinePay || due === 0) {
      // Pay after service
      online.hidden = true;
      offline.hidden = false;
      title.textContent = "Preferred Payment";
      btnSubmit.textContent = "Confirm Booking →";
      return;
    }

    online.hidden = false;
    offline.hidden = true;
    title.textContent = payMode === "deposit" ? "Secure Deposit" : "Secure Payment";
    set("pay-label", payMode === "deposit" ? "Deposit due now" : "Total due now");
    set("pay-amount", money(due));
    var remRow = document.getElementById("pay-remainder-row");
    remRow.hidden = due >= s.total;
    set("pay-remainder", money(s.total - due));
    btnSubmit.textContent = "Pay " + money(due) + " & Confirm →";

    // Mount the card form once
    if (!card) {
      loadSquareSdk().then(function (Square) {
        return Square.payments(SQ.squareApplicationID, SQ.squareLocationID).card({
          style: { // match the site's dark luxury theme
            input: { color: "#f5f5f2", backgroundColor: "#1a1a1e", fontSize: "15px" },
            ".input-container": { borderColor: "#3a3a3e", borderRadius: "8px" },
            ".input-container.is-focus": { borderColor: "#d4af37" },
            ".message-text": { color: "#a6a6a3" },
            ".message-text.is-error": { color: "#e26d6d" },
          },
        });
      }).then(function (c) {
        card = c;
        return card.attach("#card-container");
      }).catch(function (err) {
        console.error(err);
        showCardError("Payment form couldn't load. You can still book — choose pay after service below, or call us.");
        online.hidden = true;
        offline.hidden = false;
        onlinePay = false;
        btnSubmit.textContent = "Confirm Booking →";
      });
    }
  }
  function showCardError(msg) {
    var el = document.getElementById("card-error");
    if (el) { el.textContent = msg; el.style.display = "block"; }
  }

  /* ========================================================================
     BACKEND CALLS — Cloudflare Pages Functions (see /functions folder)
     These endpoints exist as soon as you deploy with the /functions folder
     and set your Cloudflare environment variables (see README).
     ======================================================================== */
  function apiCreatePayment(token, amountDollars, s) {
    return fetch("/api/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceId: token,
        amountCents: Math.round(amountDollars * 100),
        currency: (SQ.currency || "CAD"),
        note: "ElevanceYVR " + s.package.label + " — " + fmtDate(s.date) + " " + (s.time || ""),
        buyerEmail: s.email,
      }),
    }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (b) {
        throw new Error(b.error || "Payment failed (" + r.status + ")");
      });
      return r.json();
    });
  }
  function apiSaveBooking(payload) {
    // Best-effort: if the backend isn't deployed yet, don't block the customer.
    return fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(function (err) {
      console.info("[ElevanceYVR] Booking backend not reachable (front-end-only mode). Payload:", payload, err);
      return { ok: false, offline: true };
    });
  }

  /* ---------- EXTENSION POINTS (future features) ----------
     promoCode / giftCard / referral: add fields in step 2 or 6, adjust
       amountDueNow() and include the codes in the payload below.
     memberships / fleet / recurring plans: add a "plan" choice in step 1
       and branch on it in the payload.
     reminders / Google Calendar sync / dashboards: implement server-side in
       functions/api/bookings.js — the payload already has all data needed. */

  /* ---------- Submit ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    // Re-validate everything (steps 1–5)
    for (var i = 1; i <= 5; i++) {
      if (!validateStep(i)) { show(i); return; }
    }
    var s = readState();
    var due = amountDueNow(s.total);
    btnSubmit.disabled = true;
    var origLabel = btnSubmit.textContent;
    btnSubmit.textContent = "Processing…";

    var payFlow;
    if (onlinePay && due > 0 && card) {
      payFlow = card.tokenize().then(function (result) {
        if (result.status !== "OK") {
          throw new Error((result.errors && result.errors[0] && result.errors[0].message) || "Card was not accepted.");
        }
        return apiCreatePayment(result.token, due, s);
      });
    } else {
      payFlow = Promise.resolve({ ok: true, offline: true });
    }

    payFlow
      .then(function (payResult) {
        var payload = {
          package: s.package.label.toLowerCase(),
          addons: s.addonKeys,
          total: s.total,
          amountPaid: (onlinePay && due > 0 && !payResult.offline) ? due : 0,
          paymentMode: payMode,
          paymentId: payResult && payResult.paymentId ? payResult.paymentId : null,
          date: s.date, time: s.time,
          vehicle: s.vehicle,
          customer: { address: s.address, phone: s.phone, email: s.email },
          notes: s.notes,
          payment: s.payment,
          source: "website",
          createdAt: new Date().toISOString(),
        };
        return apiSaveBooking(payload).then(function () { return payload; });
      })
      .then(function (payload) { showConfirmation(s, payload); })
      .catch(function (err) {
        console.error(err);
        showCardError(err.message || "Something went wrong.");
        alert("Payment didn't go through: " + (err.message || "unknown error") +
          "\n\nNo charge was made. Please try again, or call/text us at " +
          (CFG.phonePrimary || "825-733-4385") + " and we'll book you in right away.");
      })
      .finally(function () {
        btnSubmit.disabled = false;
        btnSubmit.textContent = origLabel;
      });
  });

  /* ---------- Confirmation ---------- */
  function showConfirmation(s, payload) {
    var rows = [
      ["Package", s.package.label + " — " + money(s.package.price)],
      ["Add-ons", s.addons.length ? s.addons.map(function (a) { return a.label; }).join(", ") : "None"],
      ["Date", fmtDate(s.date)],
      ["Time", s.time],
      ["Vehicle", [s.vehicle.year, s.vehicle.make, s.vehicle.model, s.vehicle.colour].filter(Boolean).join(" ")],
      ["Address", s.address],
      ["Estimated total", money(s.total)],
    ];
    if (payload.amountPaid > 0) {
      rows.push([payMode === "deposit" ? "Deposit paid" : "Paid online", money(payload.amountPaid) + " ✓"]);
      if (payload.amountPaid < s.total) rows.push(["Balance on completion", money(s.total - payload.amountPaid)]);
      set("confirm-title", "Booking Confirmed!");
      set("confirm-sub", "Payment received — a receipt is on its way to " + s.email + ". We'll text you to confirm your time slot.");
    } else {
      rows.push(["Payment", s.payment]);
    }
    document.getElementById("confirm-details").innerHTML = rows.map(function (r) {
      return '<div class="summary-row"><span>' + r[0] + "</span><strong>" + esc(r[1]) + "</strong></div>";
    }).join("");
    document.querySelector(".booking-layout").hidden = true;
    document.querySelector(".progress").hidden = true;
    var wrap = document.getElementById("booking-confirm");
    wrap.hidden = false;
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- Init ---------- */
  updateSummary();
  show(1);
})();
