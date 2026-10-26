// Βραχυχρόνια.ai, AADE autofill: runs on the AADE short-term rental pages.
// When the new declaration form opens empty, it fetches the stays waiting for
// a declaration from the app and fills the form: right away when there is
// one, after the host picks when there are more. The host checks the form and
// submits it on the AADE page; when AADE confirms the submission, the stay is
// marked declared in the app and «Επόμενη δήλωση» fills the next one.

const APP = "https://aivrachychronia.vercel.app";
const arrival = () => document.getElementById("appForm:rentalFrom_input");

let panel = null;
function ui() {
  if (panel) return panel;
  panel = document.createElement("div");
  panel.id = "vrachy-panel";
  panel.style.cssText =
    "position:fixed;right:12px;bottom:12px;left:auto;z-index:2147483646;max-width:360px;width:calc(100% - 24px);background:#fff;color:#1f2937;" +
    "border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.25);padding:14px;font:15px/1.35 system-ui,sans-serif;border-top:4px solid #b87050";
  document.body.appendChild(panel);
  return panel;
}
function el(tag, text, css) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  if (css) e.style.cssText = css;
  return e;
}
function button(text, onClick, primary) {
  const b = el("button", text,
    "display:block;width:100%;text-align:left;margin-top:8px;padding:10px 12px;border-radius:10px;font:inherit;cursor:pointer;" +
    (primary ? "border:none;background:#b87050;color:#fff;font-weight:600" : "border:1px solid #d1d5db;background:#f9fafb;color:#1f2937"));
  b.type = "button";
  b.addEventListener("click", (e) => { e.preventDefault(); onClick(); });
  return b;
}
function show(title, nodes) {
  const p = ui();
  p.replaceChildren();
  const head = el("div", "", "display:flex;align-items:center;gap:8px;margin-bottom:6px");
  const logo = el("img");
  logo.src = chrome.runtime.getURL("icons/icon32.png");
  logo.style.cssText = "width:22px;height:22px";
  head.append(logo, el("b", "Βραχυχρόνια.ai", "flex:1"));
  const close = el("button", "✕", "border:none;background:none;font:inherit;cursor:pointer;color:#6b7280");
  close.addEventListener("click", () => { panel.remove(); panel = null; });
  head.append(close);
  p.append(head);
  if (title) p.append(el("div", title, "font-weight:600;margin-bottom:2px"));
  nodes.forEach((n) => p.append(typeof n === "string" ? el("div", n, "color:#4b5563;font-size:14px") : n));
}
const dm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const describe = (s) => `${dm(s.checkIn)} – ${dm(s.checkOut)} · ${s.values.platform || "Απευθείας"} · ${s.propertyName}`;

// The stay filled in this tab, kept across the page reloads AADE does on submit.
const STAY = "vrachy-stay";
const NEXT = "vrachy-next";
const store = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k) || "null"); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k) { try { sessionStorage.removeItem(k); } catch { /* private mode */ } },
};
const norm = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const visible = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) && !!norm(e.textContent).trim();
const texts = (sel) => [...document.querySelectorAll(sel)].filter(visible).map((e) => norm(e.textContent).trim()).join("|");
// AADE's pages show their messages with these widgets.
const SUCCESS = ".ui-messages-info, .ui-growl-message-info, .ui-message-info, .alert-success";
const ERROR = ".ui-messages-error, .ui-growl-message-error, .ui-message-error, .ui-messages-fatal, .alert-danger";
const SUCCESS_TEXT = /(υποβληθηκε|καταχωρηθηκε|ολοκληρωθηκε) επιτυχως|επιτυχης (υποβολη|καταχωρηση)/;
const successText = () => texts(SUCCESS) + (SUCCESS_TEXT.test(norm(document.body.innerText)) ? "|ok" : "");

let stopWatching = () => {};
/**
 * After «Υποβολή» (or on the page AADE reloads to): marks the stay when AADE
 * shows a new confirmation, else asks the host. A message already on the page
 * before the click doesn't count.
 */
function awaitConfirmation(stay, reloaded) {
  const okBefore = reloaded ? "" : successText();
  const errBefore = reloaded ? "" : texts(ERROR);
  stopWatching();
  const check = () => {
    const ok = successText();
    const err = texts(ERROR);
    if (ok && ok !== okBefore && !(err && err !== errBefore)) { stop(); markDeclared(stay); }
    else if (err && err !== errBefore) {
      stop();
      store.set(STAY, stay);
      show("Η ΑΑΔΕ δεν δέχτηκε την υποβολή", ["Διορθώστε ό,τι δείχνει η ΑΑΔΕ και πατήστε ξανά «Υποβολή».", button("Ξανά συμπλήρωση", () => fill(stay))]);
    }
  };
  const stop = () => { watching.disconnect(); clearTimeout(asking); clearTimeout(giveUp); };
  const watching = new MutationObserver(check);
  stopWatching = stop;
  watching.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
  // No answer from AADE on the page yet: the host knows whether it went through (we keep watching a while).
  const asking = setTimeout(() => ask(stay), 20000);
  const giveUp = setTimeout(stop, 5 * 60000);
  show(`Υποβολή: ${stay.guestName}…`, ["Περιμένουμε την επιβεβαίωση της ΑΑΔΕ.", button("Υποβλήθηκε · σημείωση «Δηλώθηκε»", () => { stop(); markDeclared(stay); })]);
  check();
}

function ask(stay) {
  show(`Υποβλήθηκε η δήλωση: ${stay.guestName};`, [
    describe(stay),
    button("Ναι · σημείωση «Δηλώθηκε»", () => markDeclared(stay), true),
    button("Όχι ακόμα", () => { stopWatching(); store.set(STAY, stay); show("", [button("✨ Συμπλήρωση από Βραχυχρόνια.ai", () => start(true), true)]); }),
  ]);
}

async function markDeclared(stay) {
  stopWatching();
  store.del(STAY);
  show(`Σημείωση: ${stay.guestName}…`, []);
  const res = await chrome.runtime.sendMessage({ type: "declared", id: stay.reservationId });
  if (res?.error) {
    show("Δεν σημειώθηκε ως δηλωμένη", [
      res.message || "Ελέγξτε τη σύνδεση στο internet.",
      button("Ξαναδοκιμάστε", () => markDeclared(stay), true),
    ]);
    return;
  }
  show(`Δηλώθηκε ✓ ${stay.guestName}`, [
    "Σημειώθηκε στο Βραχυχρόνια.ai.",
    button("Επόμενη δήλωση →", next, true),
  ]);
}

/** «Επόμενη δήλωση»: on a new declaration form, fill it now; else open one, which fills itself. */
async function next() {
  const a = arrival();
  if (a && !a.disabled && !a.readOnly) return start(false, true);
  store.set(NEXT, Date.now());
  const link = [...document.querySelectorAll("a, button, input[type=button], input[type=submit]")]
    .find((e) => NEW_FORM.test(norm(e.textContent || e.value)) && !!e.getClientRects().length);
  if (link) { link.click(); return; }
  show("Ανοίξτε νέα δήλωση", ["Στην ΑΑΔΕ πατήστε «Υποβολή Νέας Δήλωσης»: θα συμπληρωθεί αμέσως με την επόμενη κράτηση."]);
}

// The menu link «Υποβολή Νέας Δήλωσης» opens a form, it doesn't submit one.
const NEW_FORM = /νεας? (δηλωσ|καταχωρησ)/;

/** Notices «Υποβολή» on the filled form. */
document.addEventListener("click", (e) => {
  const stay = store.get(STAY);
  if (!stay) return;
  const b = e.target.closest?.("button, input[type=submit], input[type=button], a");
  const label = norm(b?.textContent || b?.value);
  if (b && !b.closest("#vrachy-panel") && /υποβολ/.test(label) && !NEW_FORM.test(label)) {
    const { submittedAt: _, ...filled } = stay;
    store.set(STAY, { ...filled, submittedAt: Date.now() });
    awaitConfirmation(filled, false);
  }
}, true);

async function fill(stay) {
  show(`Συμπλήρωση: ${stay.guestName}…`, [describe(stay)]);
  const res = await chrome.runtime.sendMessage({ type: "fill", values: stay.values });
  if (res?.error) {
    show("Η συμπλήρωση δεν έγινε", [res.error, button("Ξαναδοκιμάστε", () => fill(stay), true)]);
    return;
  }
  store.set(STAY, stay);
  show(`Συμπληρώθηκε: ${stay.guestName}`, [
    describe(stay),
    ...(stay.missing.length ? [el("div", `Λείπει από το Βραχυχρόνια.ai: ${stay.missing.join(", ")}`, "color:#b45309;font-size:13px;margin-top:4px")] : []),
    "Ελέγξτε τα στοιχεία και πατήστε εσείς την υποβολή.",
    button("Ξανά συμπλήρωση", () => fill(stay)),
    button("Άλλη κράτηση", () => start(true)),
  ]);
}

async function start(choose, nextOne) {
  show("Φόρτωση κρατήσεων…", []);
  const res = await chrome.runtime.sendMessage({ type: "pending" });
  if (res?.error === "not-connected") {
    show("Συνδέστε την επέκταση", [
      res.message || "Στο Βραχυχρόνια.ai ανοίξτε Φορολογικά → Αυτόματη συμπλήρωση και πατήστε «Σύνδεση επέκτασης».",
      button("Άνοιγμα Βραχυχρόνια.ai", () => window.open(`${APP}/tax/autofill`, "_blank"), true),
      button("Ξαναδοκιμάστε", () => start(choose)),
    ]);
    return;
  }
  if (res?.error) {
    show("Δεν φορτώθηκαν οι κρατήσεις", [res.message || "Ελέγξτε τη σύνδεση στο internet.", button("Ξαναδοκιμάστε", () => start(choose), true)]);
    return;
  }
  const stays = res.stays || [];
  if (!stays.length) {
    show(nextOne ? "Όλες οι δηλώσεις έγιναν ✓" : "Καμία κράτηση δεν περιμένει δήλωση", ["Στο Βραχυχρόνια.ai δεν υπάρχει κράτηση που έχει ξεκινήσει και δεν έχει δηλωθεί."]);
    return;
  }
  if ((stays.length === 1 || nextOne) && !choose) return fill(stays[0]);
  show("Ποια κράτηση δηλώνετε;", stays.map((s) => {
    const b = button("", () => fill(s));
    b.append(el("b", s.guestName), el("div", describe(s), "color:#4b5563;font-size:13px"));
    if (s.missing.length) b.append(el("div", `Λείπει: ${s.missing.join(", ")}`, "color:#b45309;font-size:12px"));
    return b;
  }));
}

/** On the new declaration form: fill it if it is empty, else offer the button. */
function onForm() {
  const a = arrival();
  if (!a || a.disabled || a.readOnly || document.getElementById("vrachy-panel")) return false;
  const nextAt = store.get(NEXT);
  store.del(NEXT);
  if (!a.value) start(false, !!nextAt && Date.now() - nextAt < 10 * 60000);
  else show("", [button("✨ Συμπλήρωση από Βραχυχρόνια.ai", () => start(true), true)]);
  return true;
}

// Submitted and the page reloaded: AADE's answer is on this page.
const submitted = store.get(STAY);
if (submitted?.submittedAt && Date.now() - submitted.submittedAt < 10 * 60000) {
  const { submittedAt: _, ...filled } = submitted;
  awaitConfirmation(filled, true);
}
// The form may appear after the page loads (the AADE pages update parts of themselves).
else if (!onForm()) {
  const obs = new MutationObserver(() => { if (onForm()) obs.disconnect(); });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => obs.disconnect(), 60000);
}
