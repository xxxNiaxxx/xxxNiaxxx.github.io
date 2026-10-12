// Generated from property-manager/lib/aade-autofill.ts by `npm run build:extension`. Do not edit.
window.__vrachyAutofill = function (values) {
  window.__AADE_AUTOFILL__ = values;
  (async function () {
  var PREFIX = "AADE-AUTOFILL:";
  var VERSION = "2026-10-12.10";
  var APP = "https://aivrachychronia.vercel.app";
  var $ = window.jQuery;
  var norm = function (s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^0-9a-zα-ω]+/g, " ").trim();
  };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  // In the mobile app the values are handed over directly and the result goes back to the app.
  var app = window.ReactNativeWebView;
  var d = window.__AADE_AUTOFILL__;
  var missingInApp = [];
  /** Values copied with «Αυτόματη συμπλήρωση» in the app, if the clipboard holds them. */
  async function fromClipboard(ask) {
    var text = "";
    try { text = (await navigator.clipboard.readText()) || ""; } catch (e) {}
    if (text.indexOf(PREFIX) !== 0 && ask) {
      text = prompt("Επικολλήστε τα στοιχεία που αντιγράψατε από το Βραχυχρόνια.ai με το κουμπί «Αυτόματη συμπλήρωση»:") || "";
    }
    if (text.indexOf(PREFIX) !== 0) return null;
    try { return JSON.parse(text.slice(PREFIX.length)); } catch (e) { return null; }
  }
  var dm = function (iso) { return iso.slice(8, 10) + "/" + iso.slice(5, 7); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); };
  /** Lets the host pick a stay; resolves to the stay, "clipboard", or null (closed). */
  function pickStay(stays) {
    return new Promise(function (resolve) {
      var veil = document.createElement("div");
      veil.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px;font:16px/1.35 sans-serif";
      var card = document.createElement("div");
      card.style.cssText = "background:#fff;color:#1f2937;border-radius:16px;max-width:460px;width:100%;padding:18px;box-shadow:0 10px 40px rgba(0,0,0,.3)";
      card.innerHTML = '<div style="font-weight:700;font-size:18px;margin-bottom:4px">Ποια κράτηση δηλώνετε;</div><div style="color:#6b7280;font-size:14px;margin-bottom:12px">Βραχυχρόνια.ai · κρατήσεις που δεν έχουν δηλωθεί</div>';
      var add = function (html, value, plain) {
        var b = document.createElement("button");
        b.type = "button";
        b.innerHTML = html;
        b.style.cssText = "display:block;width:100%;text-align:left;margin:8px 0 0;padding:12px 14px;border-radius:12px;font:inherit;cursor:pointer;" +
          (plain ? "border:none;background:none;color:#0f766e;font-weight:600" : "border:1px solid #d1d5db;background:#f9fafb;color:#1f2937");
        b.onclick = function (e) { e.preventDefault(); veil.remove(); resolve(value); };
        card.appendChild(b);
      };
      stays.forEach(function (s) {
        add("<b>" + esc(s.guestName) + "</b>" + (s.cancelled ? " · ακύρωση" : "") + '<br><span style="color:#4b5563;font-size:14px">' +
          dm(s.checkIn) + " – " + dm(s.checkOut) + " · " + esc(s.values.platform || "Απευθείας") + " · " + esc(s.propertyName) + "</span>" +
          (s.missing.length ? '<br><span style="color:#b45309;font-size:13px">Λείπει: ' + esc(s.missing.join(", ")) + "</span>" : ""), s);
      });
      add("Άλλη κράτηση (από το πρόχειρο)", "clipboard", true);
      add("Άκυρο", null, true);
      veil.appendChild(card);
      document.body.appendChild(veil);
    });
  }
  // With a key (bookmarks copied after 12/10/2026) the stays come straight from the app.
  if (!d && window.__AADE_KEY__) {
    var stays = null;
    try {
      var res = await fetch(APP + "/api/aade/pending", { headers: { "x-autofill-key": window.__AADE_KEY__ }, cache: "no-store" });
      var body = await res.json().catch(function () { return null; });
      if (res.ok && body) stays = body.data;
      else if (body && body.error) alert(body.error.message);
    } catch (e) {}
    if (stays && stays.length) {
      var pick = stays.length === 1 ? stays[0] : await pickStay(stays);
      if (pick === null) return;
      if (pick === "clipboard") d = await fromClipboard(true);
      else { d = pick.values; missingInApp = pick.missing; }
      if (!d) { alert("Δεν βρέθηκαν στοιχεία δήλωσης στο πρόχειρο. Στο Βραχυχρόνια.ai πατήστε «Αυτόματη συμπλήρωση» στην κράτηση."); return; }
    } else if (stays) {
      d = await fromClipboard(false);
      if (!d) { alert("Δεν υπάρχει κράτηση που περιμένει δήλωση στο Βραχυχρόνια.ai. Για άλλη κράτηση, πατήστε «Αυτόματη συμπλήρωση» σε αυτή και ξαναπατήστε τον σελιδοδείκτη."); return; }
    }
  }
  if (!d) {
    d = await fromClipboard(true);
    if (!d) { alert("Δεν βρέθηκαν στοιχεία δήλωσης. Στο Βραχυχρόνια.ai πατήστε πρώτα «Αυτόματη συμπλήρωση» στην κράτηση."); return; }
  }

  var labelOf = function (c) { return (c.id && /_input$/.test(c.id) && document.getElementById(c.id.replace(/_input$/, "_label"))) || null; };
  var hiddenOf = function (c) { return (c.id && /_input$/.test(c.id) && document.getElementById(c.id.replace(/_input$/, "_hinput"))) || null; };
  var isControl = function (c) { return !/^(hidden|button|submit|reset|image)$/i.test(c.type || ""); };
  // PrimeFaces lists keep the real <select> next to a hidden «_focus» field, and
  // number fields a hidden «_hinput»: those are helpers, not the field.
  function real(cs) {
    var sel = cs.filter(function (c) { return c.tagName === "SELECT"; });
    if (sel.length === 1) return sel;
    return cs.filter(function (c) { return !/_(focus|hinput)$/.test(c.id || ""); });
  }
  /** The PrimeFaces widget (list, number field…) a field belongs to, when the page uses PrimeFaces. */
  function widgetFor(c) {
    var ws = window.PrimeFaces && window.PrimeFaces.widgets;
    if (!ws) return null;
    // The field's own widget has the field's id without «_input»; failing that, the innermost
    // widget around it (not a panel or fieldset that holds the whole section).
    var base = String(c.id || "").replace(/_(input|hinput|focus)$/, ""), best = null, bestEl = null;
    for (var k in ws) {
      var w = ws[k], el = w && w.jq && w.jq[0];
      if (!el || !(el === c || (el.contains && el.contains(c)))) continue;
      if (base && (w.id === base || el.id === base)) return w;
      if (!bestEl || bestEl.contains(el)) { best = w; bestEl = el; }
    }
    return best && bestEl.querySelectorAll("input,select,textarea").length <= 3 ? best : null;
  }
  // Amounts always come with decimals («425,53»), unlike ΑΦΜ and passport numbers.
  var isAmount = function (v) { return /^\d+[.,]\d{1,2}$/.test(String(v)); };
  var toNumber = function (v) { return parseFloat(String(v).replace(",", ".")); };
  function controlFor(label) {
    var want = norm(label);
    var cands = Array.prototype.filter.call(document.querySelectorAll("td,th,label,legend,span,div,p,dt"), function (el) {
      var t = norm(el.textContent);
      return t && t.length <= 160 && t.indexOf(want) === 0;
    });
    cands.sort(function (a, b) { return norm(a.textContent).length - norm(b.textContent).length; });
    for (var i = 0; i < cands.length; i++) {
      var el = cands[i];
      if (el.tagName === "LABEL" && el.htmlFor && document.getElementById(el.htmlFor)) return document.getElementById(el.htmlFor);
      for (var node = el, up = 0; node && up < 5; node = node.parentElement, up++) {
        var cs = real(Array.prototype.filter.call(node.querySelectorAll("input,select,textarea"), isControl));
        if (cs.length === 1) return cs[0];
        if (cs.length > 1) break;
      }
    }
    return null;
  }
  function fire(c) {
    ["input", "keyup", "change"].forEach(function (t) { c.dispatchEvent(new Event(t, { bubbles: true })); });
    if ($) try { $(c).trigger("change"); } catch (e) {}
  }
  /** Types the value one key at a time, for fields that only accept what is typed. */
  function typeText(c, v) {
    c.focus();
    var desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(c), "value");
    var put = function (x) { if (desc && desc.set) desc.set.call(c, x); else c.value = x; };
    put("");
    String(v).split("").forEach(function (ch) {
      var o = { key: ch, char: ch, charCode: ch.charCodeAt(0), keyCode: ch.charCodeAt(0), which: ch.charCodeAt(0), bubbles: true, cancelable: true };
      var before = c.value;
      var go = c.dispatchEvent(new KeyboardEvent("keydown", o)) && c.dispatchEvent(new KeyboardEvent("keypress", o));
      if (go && c.value === before) put(before + ch);
      c.dispatchEvent(new Event("input", { bubbles: true }));
      c.dispatchEvent(new KeyboardEvent("keyup", o));
    });
    c.dispatchEvent(new Event("change", { bubbles: true }));
    c.blur();
    return true;
  }
  /*
   * Number fields (PrimeFaces inputNumber / AutoNumeric) throw away values not
   * set through them, so each pass tries another way, and notes what happened
   * (lengths and errors only, never the amount) for the diagnostics.
   */
  var amountLog = [];
  var digitless = function (t) { return String(t).replace(/\d/g, "#").slice(0, 120); };
  function setAmount(c, v, attempt) {
    var n = toNumber(v), w = widgetFor(c), h = hiddenOf(c), how = "", err = "";
    var an = null;
    try { an = (w && w.autonumeric) || (window.AutoNumeric && window.AutoNumeric.getAutoNumericElement && window.AutoNumeric.getAutoNumericElement(c)) || null; } catch (e) {}
    var plugin = !!($ && $.fn && $.fn.autoNumeric);
    var step = attempt % 4;
    try {
      if (step === 0 && w && typeof w.setValue === "function") { how = "widget"; w.setValue(n); }
      else if (step === 1 && an) { how = "autonumeric"; an.set(n); if (h) h.value = String(n); }
      else if (step === 1 && plugin) { how = "plugin"; $(c).autoNumeric("set", n); if (h) h.value = String(n); }
      else if (step === 3 && w && typeof w.setValue === "function") { how = "widget"; w.setValue(n); }
      else { how = "type"; typeText(c, v); }
    } catch (e) { err = digitless(e && e.message || e); }
    if (how !== "type") { try { if ($) $(c).trigger("change"); else c.dispatchEvent(new Event("change", { bubbles: true })); } catch (e) { err = err || digitless(e && e.message || e); } }
    amountLog.push("#" + attempt + " " + how + (err ? " err=" + err : "") + " shown=" + String(c.value || "").length + " sent=" + (h ? String(h.value || "").length : "-"));
    return !err;
  }
  function setText(c, v, attempt) {
    var widget = $ && ($(c).data("kendoDatePicker") || $(c).data("kendoNumericTextBox"));
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
    if (widget && m && $(c).data("kendoDatePicker")) { widget.value(new Date(+m[3], +m[2] - 1, +m[1])); widget.trigger("change"); return true; }
    if (isAmount(v)) return setAmount(c, v, attempt);
    c.focus();
    var desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(c), "value");
    if (desc && desc.set) desc.set.call(c, v); else c.value = v;
    fire(c);
    c.blur();
    return true;
  }
  function optionFor(c, v) {
    var want = norm(v);
    var opts = Array.prototype.slice.call(c.options);
    return opts.filter(function (o) { return norm(o.text) === want; })[0] ||
      opts.filter(function (o) { var t = norm(o.text); return t && (t.indexOf(want) >= 0 || want.indexOf(t) >= 0); })[0];
  }
  function click(el) {
    ["mousedown", "mouseup", "click"].forEach(function (t) { el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })); });
  }
  /** A visible entry of an open drop-down list with this text. */
  function listItem(v) {
    var want = norm(v);
    return Array.prototype.filter.call(document.querySelectorAll("li,[role=option]"), function (el) {
      return el.offsetParent !== null && norm(el.getAttribute("data-label") || el.textContent) === want;
    })[0];
  }
  var selectLog = [];
  async function setSelect(label, c, v) {
    var w = widgetFor(c);
    var opt = optionFor(c, v);
    var note = function (how) {
      var lab = labelOf(c);
      selectLog.push(label.slice(0, 12) + ":" + how + " w=" + !!w + " items=" + (w && w.items ? w.items.length : "-") + " dyn=" + !!(w && w.cfg && w.cfg.dynamic) +
        " opt=" + !!opt + " sel=" + (opt ? c.value === opt.value : "-") + " label=" + (lab ? norm(lab.textContent).length : "none"));
    };
    if (!opt) {
      // Some lists load their options only when opened: open the list, wait, look again.
      if (w && typeof w.show === "function") { try { w.show(); } catch (e) {} }
      else {
        ["focus", "mousedown", "mouseup", "click"].forEach(function (t) { c.dispatchEvent(new MouseEvent(t, { bubbles: true })); });
        try { c.focus(); } catch (e) {}
        if (c.offsetParent === null || c.offsetWidth < 2) { var box = c.parentElement; while (box && box.offsetWidth < 2) box = box.parentElement; if (box) click(box); }
      }
      await settle();
      c = controlFor(label) || c;
      w = widgetFor(c);
      opt = optionFor(c, v);
    }
    if (opt && w && w.items && w.items.length) {
      // PrimeFaces: click the entry in the list, as a person would, so the form tells the server.
      var entry = Array.prototype.filter.call(w.items, function (li) { return norm(li.getAttribute("data-label") || li.textContent) === norm(opt.text); })[0];
      if (entry) {
        // Already chosen underneath but not shown: clear first, so the click counts as a change.
        if (c.value === opt.value) { try { c.value = ""; } catch (e) {} }
        try { if (typeof w.show === "function") w.show(); } catch (e) {}
        // Only the click: an extra mousedown makes older PrimeFaces close the list and blank its label.
        entry.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        try { if (typeof w.hide === "function") w.hide(); } catch (e) {}
        var now = controlFor(label) || c;
        note("click");
        if (now.value === opt.value) return true;
      }
    }
    if (opt && w && typeof w.selectValue === "function") {
      // PrimeFaces: choose through the list itself, so its label shows it; the change
      // event afterwards is what tells the server (newer PrimeFaces chooses silently).
      try {
        w.selectValue(opt.value);
        if (c.value !== opt.value && typeof w.show === "function") {
          // The list's entries weren't loaded yet: open it, wait, choose again.
          w.show();
          await settle();
          c = controlFor(label) || c;
          w = widgetFor(c) || w;
          w.selectValue(opt.value);
        }
        if (typeof w.hide === "function") w.hide();
        note("selectValue");
        if (c.value === opt.value) { if ($) $(c).trigger("change"); else c.dispatchEvent(new Event("change", { bubbles: true })); return true; }
      } catch (e) {}
    }
    var item = listItem(opt ? opt.text : v);
    if (item) { click(item); note("visible-item"); return true; }
    if (!opt) { note("no-option"); return false; }
    note("plain");
    var widget = $ && ($(c).data("kendoDropDownList") || $(c).data("kendoComboBox"));
    if (widget) { widget.value(opt.value); widget.trigger("change"); }
    c.value = opt.value;
    opt.selected = true;
    fire(c);
    return true;
  }
  function sameText(a, b) { var t = norm(a), w = norm(b); return !!t && (t === w || t.indexOf(w) >= 0 || w.indexOf(t) >= 0); }
  function wanted(c, v) {
    if (c.tagName === "SELECT") {
      var o = c.options[c.selectedIndex];
      if (!o || !sameText(o.text, v)) return false;
      // PrimeFaces lists show their choice in a separate label: it has to show it too.
      var lab = labelOf(c);
      return !lab || sameText(lab.textContent, v);
    }
    if (c.type === "checkbox") return c.checked === (v === true || v === "Ναι");
    if (isAmount(v)) {
      // Checked on the number the form sends (PrimeFaces keeps it in «_hinput»), not only on the text shown.
      var h = hiddenOf(c);
      if (!c.value) return false;
      if (h) return h.value !== "" && Number(h.value) === toNumber(v);
      return toNumber(String(c.value).replace(/[^0-9,.]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "")) === toNumber(v);
    }
    return norm(c.value) === norm(v);
  }
  /** A value and the other ways the form may want it (amounts: «425,53» or «425.53»). */
  function variants(v) {
    return /^\d+,\d{1,2}$/.test(v) ? [v, v.replace(",", ".")] : [v];
  }
  async function set(label, v, attempt) {
    var c = controlFor(label);
    if (!c || c.disabled || c.readOnly) return false;
    if (wanted(c, v)) return true;
    if (c.tagName === "SELECT") return setSelect(label, c, v);
    if (c.type === "checkbox") { c.click(); return true; }
    var vs = variants(v);
    return setText(c, vs[attempt % vs.length], attempt);
  }
  function isSet(label, v) {
    var c = controlFor(label);
    return !!c && variants(v).some(function (x) { return wanted(c, x); });
  }
  /*
   * The AADE form reloads parts of itself from the server when some fields
   * change (e.g. the dates or «Αλλοδαπός"), which wipes values written in the
   * meantime. So: one field at a time, wait until the page has stopped
   * changing, and at the end go over everything again and re-fill what was lost.
   */
  function settle() {
    return new Promise(function (resolve) {
      var quiet, start = Date.now(), over = false;
      var obs = new MutationObserver(function () { clearTimeout(quiet); quiet = setTimeout(finish, 600); });
      // Also wait for the form's requests to the server (PrimeFaces ajax / jQuery) to come back.
      function busy() {
        try { var q = window.PrimeFaces && window.PrimeFaces.ajax && window.PrimeFaces.ajax.Queue; if (q && q.isEmpty && !q.isEmpty()) return true; } catch (e) {}
        return !!($ && $.active);
      }
      function finish() {
        if (over) return;
        if (busy() && Date.now() - start < 10000) { quiet = setTimeout(finish, 300); return; }
        over = true; obs.disconnect(); resolve();
      }
      obs.observe(document.body, { childList: true, subtree: true, attributes: true });
      quiet = setTimeout(finish, 600);
      setTimeout(function () { busy = function () { return false; }; finish(); }, 10000);
    });
  }

  var steps = [
    ["Άφιξη", d.checkIn],
    ["Αναχώρηση", d.checkOut],
    ["Συνολικό συμφωνηθέν μίσθωμα", d.amount],
    ["Τρόπος πληρωμής μισθώματος", d.paymentMethod],
    ["Ηλεκτρονική πλατφόρμα", d.platform],
    ["Αλλοδαπός", d.foreigner],
  ].concat(d.foreigner === "Ναι"
    ? [["Ονοματεπώνυμο μισθωτή", d.guestName], ["Αρ. Διαβατηρίου", d.idNumber]]
    : [["ΑΦΜ", d.taxId]]
  ).concat([
    ["Συνολικό εισπραχθέν ποσό", d.cancelAmount],
    ["Ημερομηνία ακύρωσης", d.cancelDate],
    ["Σημειώσεις", d.bookingNumber ? "Αρ. κράτησης " + d.bookingNumber : null],
  ]).filter(function (s) { return s[1] != null && s[1] !== ""; });

  // Counts the form's requests to the server during the fill, for the diagnostics.
  var ajax = { sent: 0, done: 0 };
  if (window.__AADE_AUTOFILL_RUNNING__) { alert("Η συμπλήρωση τρέχει ήδη· περιμένετε να τελειώσει."); return; }
  window.__AADE_AUTOFILL_RUNNING__ = true;
  if ($) { try { $(document).on("ajaxSend.aadeAutofill", function () { ajax.sent++; }).on("ajaxComplete.aadeAutofill", function () { ajax.done++; }); } catch (e) {} }
  var badge = document.createElement("div");
  badge.textContent = "Βραχυχρόνια.ai: συμπλήρωση… (" + VERSION + ")";
  badge.style.cssText = "position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483647;background:#0f766e;color:#fff;padding:8px 14px;border-radius:999px;font:600 14px sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25)";
  document.body.appendChild(badge);

  for (var pass = 0; pass < 4; pass++) {
    var missing = steps.filter(function (s) { return !isSet(s[0], s[1]); });
    if (!missing.length) break;
    for (var k = 0; k < missing.length; k++) {
      badge.textContent = "Βραχυχρόνια.ai: " + missing[k][0] + "…";
      if (await set(missing[k][0], missing[k][1], pass)) await settle();
    }
    await settle();
  }
  badge.remove();
  window.__AADE_AUTOFILL_RUNNING__ = false;
  if ($) { try { $(document).off(".aadeAutofill"); } catch (e) {} }
  var done = [], failed = [];
  steps.forEach(function (s) { (isSet(s[0], s[1]) ? done : failed).push(s[0]); });
  // Never leave a wrong amount behind: empty an amount field that didn't take the right number.
  steps.forEach(function (s) {
    if (!isAmount(s[1]) || isSet(s[0], s[1])) return;
    var c = controlFor(s[0]);
    if (!c) return;
    var w = widgetFor(c), h = hiddenOf(c);
    try { if (w && typeof w.setValue === "function") w.setValue(""); } catch (e) {}
    var desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(c), "value");
    try { if (desc && desc.set) desc.set.call(c, ""); else c.value = ""; } catch (e) {}
    if (h) h.value = "";
  });
  // What the script found on the page, without any of the values, to fix it when a field is left empty.
  function diagnostics() {
    var pfw = null;
    steps.forEach(function (s) { if (isAmount(s[1]) && !pfw) { var c = controlFor(s[0]); pfw = c && widgetFor(c); } });
    var cfg = pfw && pfw.cfg ? ["decimalPlaces", "decimalCharacter", "decimalSeparator", "digitGroupSeparator", "thousandSeparator", "minimumValue", "maximumValue", "emptyValue", "modifyValueOnWheel"]
      .filter(function (k) { return pfw.cfg[k] != null; }).map(function (k) { return k + "=" + String(pfw.cfg[k]).slice(0, 20); }).join(",") : "";
    var out = ["v=" + VERSION + " loader=" + (window.__AADE_LOADER__ || (app ? "app" : "-")) + " pf=" + ((window.PrimeFaces && window.PrimeFaces.VERSION) || "-") + " autonumeric=" + !!window.AutoNumeric + " plugin=" + !!($ && $.fn && $.fn.autoNumeric),
      "ajax=" + ajax.sent + "/" + ajax.done + " lists: " + selectLog.join(" ; "),
      "amount: widget=" + (pfw ? (pfw.widgetVar || "?") + " setValue=" + (typeof pfw.setValue) + " an=" + !!pfw.autonumeric : "none") + (cfg ? " cfg=" + cfg : "") + " log=" + amountLog.join(" ; "), "page=" + location.host + location.pathname, "frames=" + window.frames.length + " jquery=" + !!$ + " adf=" + !!window.AdfPage + " primefaces=" + !!window.PrimeFaces];
    steps.forEach(function (s) {
      var c = controlFor(s[0]);
      if (!c) { out.push(s[0] + ": NOT FOUND"); return; }
      var info = s[0] + ": " + c.tagName + "/" + (c.type || "") + " id=" + String(c.id || "").slice(-40) + " name=" + String(c.name || "").slice(-30) +
        " class=" + String(c.className || "").slice(0, 40) + (c.disabled ? " disabled" : "") + (c.readOnly ? " readonly" : "") +
        " hidden=" + (c.offsetParent === null) + " ok=" + isSet(s[0], s[1]);
      if (c.tagName === "SELECT") info += " label=" + (labelOf(c) ? norm(labelOf(c).textContent).length : "none") + " onchange=" + !!c.getAttribute("onchange") + " options=" + Array.prototype.map.call(c.options, function (o) { return o.text; }).slice(0, 12).join("|");
      else if (c.type !== "checkbox") info += " length=" + String(c.value || "").length + " maxlength=" + c.maxLength;
      out.push(info);
    });
    out.push("controls=" + Array.prototype.filter.call(document.querySelectorAll("input,select,textarea"), isControl).slice(0, 40)
      .map(function (c) { return c.tagName.charAt(0) + ":" + (c.type || "") + ":" + String(c.id || c.name || "").slice(-30); }).join(", "));
    return out.join("\n");
  }
  var report = failed.length ? diagnostics() : "";
  if (app) { app.postMessage(JSON.stringify({ type: "aade-autofill", done: done, failed: failed, diagnostics: report })); return; }
  var copied = false;
  if (report) { try { await navigator.clipboard.writeText(report); copied = true; } catch (e) {} }
  alert(
    (done.length ? "Συμπληρώθηκαν: " + done.join(", ") + "." : "Δεν συμπληρώθηκε κανένα πεδίο.") +
    (failed.length ? "\nΣυμπληρώστε με το χέρι: " + failed.join(", ") + "." : "") +
    (missingInApp.length ? "\nΔεν υπάρχουν στο Βραχυχρόνια.ai: " + missingInApp.join(", ") + "." : "") +
    "\n\nΕλέγξτε τα στοιχεία και κάντε εσείς την υποβολή. (έκδοση " + VERSION + ")" +
    (report && copied ? "\n\nΑντιγράφηκαν τεχνικά στοιχεία (χωρίς προσωπικά δεδομένα): στείλτε τα στην υποστήριξη για να διορθωθεί." : "")
  );
  if (report && !copied) prompt("Τεχνικά στοιχεία για την υποστήριξη (αντιγράψτε τα):", report);
})();
};
