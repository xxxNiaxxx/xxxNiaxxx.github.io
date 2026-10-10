/**
 * Autofill for the AADE stay declaration form, as a bookmarklet.
 *
 * The declaration card copies the values (`autofillPayload`); on the AADE
 * form the host clicks the bookmark, which reads them from the clipboard (or
 * asks for them to be pasted), finds each field by its label and fills it in.
 * It never submits and never sends anything anywhere: the host checks the
 * form and submits it. The TAXISnet login stays between the host and AADE.
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
  var text = "";
  try { text = (await navigator.clipboard.readText()) || ""; } catch (e) {}
  if (text.indexOf(PREFIX) !== 0) {
    text = prompt("Επικολλήστε τα στοιχεία που αντιγράψατε από το Βραχυχρόνια.ai με το κουμπί «Αυτόματη συμπλήρωση»:") || "";
  }
  if (text.indexOf(PREFIX) !== 0) {
    alert("Δεν βρέθηκαν στοιχεία δήλωσης. Στο Βραχυχρόνια.ai πατήστε πρώτα «Αυτόματη συμπλήρωση» στην κράτηση.");
    return;
  }
  var d;
  try { d = JSON.parse(text.slice(PREFIX.length)); } catch (e) { alert("Τα στοιχεία δεν διαβάστηκαν. Αντιγράψτε τα ξανά από την κράτηση."); return; }

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
  function set(label, v) {
    if (v == null || v === "") return null;
    var c = controlFor(label);
    if (!c) return false;
    if (c.disabled || c.readOnly) return false;
    if (c.tagName === "SELECT") return setSelect(c, v);
    if (c.type === "checkbox") { var on = v === true || v === "Ναι"; if (c.checked !== on) c.click(); return true; }
    return setText(c, v);
  }

  var steps = [
    ["Άφιξη", d.checkIn],
    ["Αναχώρηση", d.checkOut],
    ["Συνολικό συμφωνηθέν μίσθωμα", d.amount],
    ["Τρόπος πληρωμής μισθώματος", d.paymentMethod],
    ["Ηλεκτρονική πλατφόρμα", d.platform],
    ["Αλλοδαπός", d.foreigner],
  ];
  var done = [], failed = [];
  var run = function (list) {
    list.forEach(function (s) {
      var r = set(s[0], s[1]);
      if (r === true) done.push(s[0]); else if (r === false) failed.push(s[0]);
    });
  };
  run(steps);
  await sleep(400);
  run(d.foreigner === "Ναι"
    ? [["Ονοματεπώνυμο μισθωτή", d.guestName], ["Αρ. Διαβατηρίου", d.idNumber]]
    : [["ΑΦΜ", d.taxId]]);
  run([
    ["Συνολικό εισπραχθέν ποσό", d.cancelAmount],
    ["Ημερομηνία ακύρωσης", d.cancelDate],
    ["Σημειώσεις", d.bookingNumber ? "Αρ. κράτησης " + d.bookingNumber : null],
  ]);
  alert(
    (done.length ? "Συμπληρώθηκαν: " + done.join(", ") + "." : "Δεν συμπληρώθηκε κανένα πεδίο.") +
    (failed.length ? "\nΣυμπληρώστε με το χέρι: " + failed.join(", ") + "." : "") +
    "\n\nΕλέγξτε τα στοιχεία και κάντε εσείς την υποβολή."
  );
})();`;

/** The bookmark's address. */
export const AUTOFILL_BOOKMARKLET = `javascript:${encodeURIComponent(AUTOFILL_SOURCE)}`;
