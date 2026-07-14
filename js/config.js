/* ==========================================================================
   ElevanceYVR — SITE CONFIG
   Edit business details here. Anything with data-config="..." in the HTML
   is filled in automatically from this file, so most updates only need
   to happen in this one place.
   NOTE: phone/email also appear in each page's <head> (Schema.org JSON-LD)
   for SEO — update those with a quick find & replace (see README).
   ========================================================================== */

window.ELEVANCE_CONFIG = {
  businessName: "ElevanceYVR",
  domain: "https://elevanceyvr.com",

  // --- Contact ---
  phonePrimary: "825-733-4385",       // main line (Call / Text buttons)
  phoneSecondary: "236-866-2347",
  email: "qusaisherif@elevanceyvr.com",

  // --- Links ---
  googleReviewUrl: "https://www.google.com/search?sca_esv=50cabc64150e6c10&rlz=1C1VDKB_enCA1142CA1142&sxsrf=APpeQnvb47dAM5iCR-xT0Sqgc3c73TfTUA:1783406937825&si=APenkKm7iecQ4G6P-TsbSMFKIQtv3EFIqRAFw-i8uEbk55Z-_5XCPr1biMzrH2gniUTJjPK1UYCTQz6QzJ3iTKP0SYg74e-s515ikEfviX-nqVG2TQtrrMeJk3UBi_qeP-TWH54tGNnJoJAISiz3qdOT1JhzqWLJsQ%3D%3D&q=Elevance+ProCare+Reviews&sa=X&ved=2ahUKEwiVhJPI_L-VAxU7MjQIHZ_hOMwQ0bkNegQIHRAD&biw=1440&bih=765&dpr=2",
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Elevance+ProCare+Vancouver+BC",
  directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Elevance+ProCare+Vancouver+BC",

  // --- Hours (also shown in contact page table) ---
  hours: [
    ["Monday",    "8:00 AM – 6:00 PM"],
    ["Tuesday",   "8:00 AM – 6:00 PM"],
    ["Wednesday", "8:00 AM – 6:00 PM"],
    ["Thursday",  "8:00 AM – 6:00 PM"],
    ["Friday",    "8:00 AM – 8:00 PM"],
    ["Saturday",  "8:00 AM – 8:00 PM"],
    ["Sunday",    "8:00 AM – 6:00 PM"],
  ],

  // --- Promotion banner (set enabled:false to hide sitewide) ---
  promo: {
    enabled: false,
    text: "✦ Summer Special — 10% off your first Full Detail. Mention code SHINE10 when booking.",
    link: "booking.html",
    linkText: "Book now",
  },

  serviceAreas: [
    "Vancouver", "Burnaby", "Richmond", "Surrey", "Coquitlam",
    "North Vancouver", "West Vancouver", "New Westminster", "Delta", "Langley",
  ],

  /* ========================================================================
     SERVICE CATALOG — packages & add-ons used by the booking wizard.
     Edit names/prices here. (Prices shown on pricing.html / index.html are
     plain HTML — update those cards too if you change numbers here.)
     ======================================================================== */
  catalog: {
    packages: {
      interior: { label: "Interior Detailing", price: 120 },
      exterior: { label: "Exterior Detailing", price: 60 },
      full:     { label: "Full Detail",        price: 160 }, // interior + exterior
    },
    addons: {
      seatshampoo:   { label: "Seat Shampoo",         price: 49 },
      carpetshampoo: { label: "Carpet Shampoo",       price: 49 },
      leather:       { label: "Leather Conditioning", price: 45 },
      odor:          { label: "Odor Treatment",       price: 69 },
    },
  },

  /* ========================================================================
     SQUARE INTEGRATION — the ONLY place you need to edit for Square.
     ========================================================================

     ┌─ HOW TO CONNECT SQUARE APPOINTMENTS (no coding needed) ─────────────┐
     │ 1. In Square Dashboard → Appointments → Online Booking → Channels,  │
     │    copy your booking page link (looks like                          │
     │    https://book.squareup.com/appointments/XXXX/location/YYYY).      │
     │ 2. Paste it below as squareBookingLink (inside the quotes).         │
     │ 3. Set bookingMode to "square".                                     │
     │ That's it — the Book Now page will send customers to your Square    │
     │ booking flow (availability, reminders and payments handled by       │
     │ Square). Add custom intake questions (vehicle make/model/year/      │
     │ colour, address) in Square Dashboard → Appointments → Settings →    │
     │ Contact info & intake questions, so you still collect them.         │
     └─────────────────────────────────────────────────────────────────────┘

     ┌─ HOW TO ENABLE ONLINE CARD PAYMENTS (custom booking flow) ──────────┐
     │ 1. Go to https://developer.squareup.com → create an application.    │
     │ 2. Copy the Application ID → paste as squareApplicationID.          │
     │ 3. Copy your Location ID (Square Dashboard → Locations) →           │
     │    squareLocationID.                                                │
     │ 4. In Cloudflare Pages → your project → Settings → Environment      │
     │    variables, add SQUARE_ACCESS_TOKEN (secret!), SQUARE_LOCATION_ID │
     │    and SQUARE_ENVIRONMENT. (The secret token NEVER goes in this     │
     │    file — the included /functions backend reads it securely.)       │
     │ 5. Set enableOnlinePayments to true below.                          │
     │ 6. Test first with squareEnvironment: "sandbox" and sandbox         │
     │    credentials; switch to "production" when ready.                  │
     └─────────────────────────────────────────────────────────────────────┘

     ┌─ DEPOSITS vs FULL PAYMENT vs PAY AFTER ─────────────────────────────┐
     │ paymentMode: "deposit"          → card charged depositAmount now,   │
     │                                   remainder collected in person.    │
     │ paymentMode: "full"             → card charged the full estimate.   │
     │ paymentMode: "payAfterService"  → no card online; customer pays     │
     │                                   cash/e-transfer after the detail. │
     │ To change the deposit: edit depositAmount (whole CAD dollars).      │
     │ To turn card payments OFF: enableOnlinePayments: false (the site    │
     │ automatically falls back to pay-after-service).                     │
     └─────────────────────────────────────────────────────────────────────┘ */
  square: {
    // ---- Booking ----
    bookingMode: "square",        // "custom" = this site's booking wizard
                                  // "square" = send customers to Square Appointments
    squareBookingLink: " https://elevance-procare.square.site",        // ← paste your Square booking page URL here
    squareWidgetScriptUrl: "",    // optional: Square's embed widget <script> URL
                                  // (Dashboard → Online Booking → Channels → Embed)
                                  // if set, the widget shows inline on booking.html

    // ---- Payments (used by the custom booking wizard) ----
    enableOnlinePayments: false,  // true = show secure card step at checkout
    squareApplicationID: "",      // ← from developer.squareup.com (starts sq0idp-/sandbox-sq0idb-)
    squareLocationID: "",         // ← Square Dashboard → Locations
    squareEnvironment: "sandbox", // "sandbox" for testing | "production" for real cards

    // ---- Payment behaviour ----
    paymentMode: "payAfterService", // "deposit" | "full" | "payAfterService"
    enableDeposits: false,         // false = "deposit" mode acts like "payAfterService"
    depositAmount: 50,            // CAD, whole dollars — charged when paymentMode is "deposit"
    currency: "CAD",
  },
};
