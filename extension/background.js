// Βραχυχρόνια.ai, AADE autofill: the extension's background worker.
//
// It keeps the key the app gave the extension («Σύνδεση επέκτασης»), asks the
// app for the stays waiting for a declaration, and runs the autofill script
// (autofill.js, bundled) in the AADE page. It never submits anything and never
// sees the TAXISnet login.

const APP = "https://aivrachychronia.vercel.app";

async function pending() {
  const { key } = await chrome.storage.local.get("key");
  if (!key) return { error: "not-connected" };
  try {
    const res = await fetch(`${APP}/api/aade/pending`, { headers: { "x-autofill-key": key }, cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (res.status === 401) {
      await chrome.storage.local.remove("key");
      return { error: "not-connected", message: body?.error?.message };
    }
    if (!res.ok || !body) return { error: "failed", message: body?.error?.message };
    return { stays: body.data };
  } catch {
    return { error: "offline" };
  }
}

async function fill(tabId, frameId, values) {
  const target = { tabId, frameIds: [frameId ?? 0] };
  // In the page itself (not the extension's isolated world): the form's own widgets live there.
  await chrome.scripting.executeScript({ target, world: "MAIN", files: ["autofill.js"] });
  await chrome.scripting.executeScript({ target, world: "MAIN", func: (v) => window.__vrachyAutofill(v), args: [values] });
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === "pending") pending().then(reply);
  else if (msg?.type === "fill" && sender.tab) fill(sender.tab.id, sender.frameId, msg.values).then(reply, (e) => reply({ error: String(e?.message || e) }));
  else if (msg?.type === "connect" && typeof msg.key === "string" && msg.key.startsWith("afk_")) chrome.storage.local.set({ key: msg.key }).then(() => reply({ ok: true }));
  else if (msg?.type === "status") chrome.storage.local.get("key").then(({ key }) => reply({ connected: !!key }));
  else return false;
  return true; // the reply comes later
});
