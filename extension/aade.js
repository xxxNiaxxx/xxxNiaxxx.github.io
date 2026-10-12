// Βραχυχρόνια.ai, AADE autofill: runs on the AADE short-term rental pages.
// When the new declaration form opens empty, it fetches the stays waiting for
// a declaration from the app and fills the form: right away when there is
// one, after the host picks when there are more. The host checks the form and
// submits it on the AADE page.

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

async function fill(stay) {
  show(`Συμπλήρωση: ${stay.guestName}…`, [describe(stay)]);
  const res = await chrome.runtime.sendMessage({ type: "fill", values: stay.values });
  if (res?.error) {
    show("Η συμπλήρωση δεν έγινε", [res.error, button("Ξαναδοκιμάστε", () => fill(stay), true)]);
    return;
  }
  show(`Συμπληρώθηκε: ${stay.guestName}`, [
    describe(stay),
    ...(stay.missing.length ? [el("div", `Λείπει από το Βραχυχρόνια.ai: ${stay.missing.join(", ")}`, "color:#b45309;font-size:13px;margin-top:4px")] : []),
    "Ελέγξτε τα στοιχεία και πατήστε εσείς την υποβολή.",
    button("Ξανά συμπλήρωση", () => fill(stay)),
    button("Άλλη κράτηση", () => start(true)),
  ]);
}

async function start(choose) {
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
    show("Καμία κράτηση δεν περιμένει δήλωση", ["Στο Βραχυχρόνια.ai δεν υπάρχει κράτηση που έχει ξεκινήσει και δεν έχει δηλωθεί."]);
    return;
  }
  if (stays.length === 1 && !choose) return fill(stays[0]);
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
  if (!a.value) start(false);
  else show("", [button("✨ Συμπλήρωση από Βραχυχρόνια.ai", () => start(true), true)]);
  return true;
}

// The form may appear after the page loads (the AADE pages update parts of themselves).
if (!onForm()) {
  const obs = new MutationObserver(() => { if (onForm()) obs.disconnect(); });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => obs.disconnect(), 60000);
}
