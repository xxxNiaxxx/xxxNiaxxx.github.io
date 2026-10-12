/**
 * Autofill for the AADE stay declaration form, as a bookmarklet.
 *
 * The declaration card copies the values (`autofillPayload`); on the AADE
 * form the host clicks the bookmark, which reads them from the clipboard (or
 * asks for them to be pasted), finds each field by its label and fills it in.
 * It never submits and never sends anything anywhere: the host checks the
 * form and submits it. The TAXISnet login stays between the host and AADE.
 * The mobile app loads the same script from /api/aade/autofill-script and runs
 * it in its in-app browser with the values set in window.__AADE_AUTOFILL__.
 */

export const AUTOFILL_PREFIX = "AADE-AUTOFILL:";

/** Declaration fields the bookmarklet knows how to fill. */
const AUTOFILL_KEYS = ["checkIn", "checkOut", "amount", "paymentMethod", "platform", "foreigner", "taxId", "guestName", "idNumber", "cancelAmount", "cancelDate", "bookingNumber"];

/** The text the declaration card copies for the bookmarklet. */
export function autofillPayload(fields: { key: string; value: string | null }[]) {
  const values: Record<string, string> = {};
  for (const f of fields) if (f.value && AUTOFILL_KEYS.includes(f.key)) values[f.key] = f.value;
  return AUTOFILL_PREFIX + JSON.stringify(values);
}

/**
 * Plain JavaScript (kept as text so the bundler leaves it alone). Fields are
 * found by the start of their Greek label, as on the AADE form, and filled in
 * the form's order; «Αλλοδαπός» is ticked before the passport field it enables.
 */
export const AUTOFILL_SOURCE = String.raw`(async function () {
  var PREFIX = ${JSON.stringify(AUTOFILL_PREFIX)};
  var $ = window.jQuery;
  var norm = function (s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^0-9a-zα-ω]+/g, " ").trim();
  };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  // In the mobile app the values are handed over directly and the result goes back to the app.
  var app = window.ReactNativeWebView;
  var d = window.__AADE_AUTOFILL__;
  if (!d) {
    var text = "";
    try { text = (await navigator.clipboard.readText()) || ""; } catch (e) {}
    if (text.indexOf(PREFIX) !== 0) {
      text = prompt("Επικολλήστε τα στοιχεία που αντιγράψατε από το Βραχυχρόνια.ai με το κουμπί «Αυτόματη συμπλήρωση»:") || "";
    }
    if (text.indexOf(PREFIX) !== 0) {
      alert("Δεν βρέθηκαν στοιχεία δήλωσης. Στο Βραχυχρόνια.ai πατήστε πρώτα «Αυτόματη συμπλήρωση» στην κράτηση.");
      return;
    }
    try { d = JSON.parse(text.slice(PREFIX.length)); } catch (e) { alert("Τα στοιχεία δεν διαβάστηκαν. Αντιγράψτε τα ξανά από την κράτηση."); return; }
  }

  var isControl = function (c) { return !/^(hidden|button|submit|reset|image)$/i.test(c.type || ""); };
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
        var cs = Array.prototype.filter.call(node.querySelectorAll("input,select,textarea"), isControl);
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
  function setText(c, v) {
    var widget = $ && ($(c).data("kendoDatePicker") || $(c).data("kendoNumericTextBox"));
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
    if (widget && m && $(c).data("kendoDatePicker")) { widget.value(new Date(+m[3], +m[2] - 1, +m[1])); widget.trigger("change"); return true; }
    c.focus();
    var desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(c), "value");
    if (desc && desc.set) desc.set.call(c, v); else c.value = v;
    fire(c);
    c.blur();
    return true;
  }
  function setSelect(c, v) {
    var want = norm(v);
    var opts = Array.prototype.slice.call(c.options);
    var opt = opts.filter(function (o) { return norm(o.text) === want; })[0] ||
      opts.filter(function (o) { var t = norm(o.text); return t && (t.indexOf(want) >= 0 || want.indexOf(t) >= 0); })[0];
    if (!opt) return false;
    var widget = $ && ($(c).data("kendoDropDownList") || $(c).data("kendoComboBox"));
    if (widget) { widget.value(opt.value); widget.trigger("change"); }
    c.value = opt.value;
    fire(c);
    return true;
  }
  function wanted(c, v) {
    if (c.tagName === "SELECT") { var o = c.options[c.selectedIndex]; var t = o ? norm(o.text) : ""; var w = norm(v); return !!t && (t === w || t.indexOf(w) >= 0 || w.indexOf(t) >= 0); }
    if (c.type === "checkbox") return c.checked === (v === true || v === "Ναι");
    return norm(c.value) === norm(v);
  }
  function set(label, v) {
    var c = controlFor(label);
    if (!c || c.disabled || c.readOnly) return false;
    if (wanted(c, v)) return true;
    if (c.tagName === "SELECT") return setSelect(c, v);
    if (c.type === "checkbox") { c.click(); return true; }
    return setText(c, v);
  }
  function isSet(label, v) {
    var c = controlFor(label);
    return !!c && wanted(c, v);
  }
  /*
   * The AADE form reloads parts of itself from the server when some fields
   * change (e.g. the dates or «Αλλοδαπός"), which wipes values written in the
   * meantime. So: one field at a time, wait until the page has stopped
   * changing, and at the end go over everything again and re-fill what was lost.
   */
  function settle() {
    return new Promise(function (resolve) {
      var quiet, start = Date.now();
      var obs = new MutationObserver(function () { clearTimeout(quiet); quiet = setTimeout(finish, 600); });
      function finish() { obs.disconnect(); resolve(); }
      obs.observe(document.body, { childList: true, subtree: true, attributes: true });
      quiet = setTimeout(finish, 600);
      setTimeout(function () { if (Date.now() - start >= 6000) finish(); }, 6000);
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

  var badge = document.createElement("div");
  badge.textContent = "Βραχυχρόνια.ai: συμπλήρωση…";
  badge.style.cssText = "position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483647;background:#0f766e;color:#fff;padding:8px 14px;border-radius:999px;font:600 14px sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25)";
  document.body.appendChild(badge);

  for (var pass = 0; pass < 3; pass++) {
    var missing = steps.filter(function (s) { return !isSet(s[0], s[1]); });
    if (!missing.length) break;
    for (var k = 0; k < missing.length; k++) {
      badge.textContent = "Βραχυχρόνια.ai: " + missing[k][0] + "…";
      if (set(missing[k][0], missing[k][1])) await settle();
    }
    await settle();
  }
  badge.remove();
  var done = [], failed = [];
  steps.forEach(function (s) { (isSet(s[0], s[1]) ? done : failed).push(s[0]); });
  if (app) { app.postMessage(JSON.stringify({ type: "aade-autofill", done: done, failed: failed })); return; }
  alert(
    (done.length ? "Συμπληρώθηκαν: " + done.join(", ") + "." : "Δεν συμπληρώθηκε κανένα πεδίο.") +
    (failed.length ? "\nΣυμπληρώστε με το χέρι: " + failed.join(", ") + "." : "") +
    "\n\nΕλέγξτε τα στοιχεία και κάντε εσείς την υποβολή."
  );
})();`;

/** The bookmark's address. */
export const AUTOFILL_BOOKMARKLET = `javascript:${encodeURIComponent(AUTOFILL_SOURCE)}`;
