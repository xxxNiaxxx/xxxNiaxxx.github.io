// Βραχυχρόνια.ai, AADE autofill: runs on the app's «Αυτόματη συμπλήρωση» page.
// Tells the page the extension is installed, and takes the key the page makes
// when the host presses «Σύνδεση επέκτασης».

const version = chrome.runtime.getManifest().version;
document.documentElement.dataset.vrachyExtension = version;

async function announce() {
  const { connected } = await chrome.runtime.sendMessage({ type: "status" });
  window.postMessage({ source: "vrachy-ext", type: "ready", version, connected }, location.origin);
}

window.addEventListener("message", async (e) => {
  if (e.source !== window || e.origin !== location.origin) return;
  const msg = e.data;
  if (msg?.source !== "vrachy-app") return;
  if (msg.type === "hello") announce();
  if (msg.type === "connect" && typeof msg.key === "string") {
    const res = await chrome.runtime.sendMessage({ type: "connect", key: msg.key });
    window.postMessage({ source: "vrachy-ext", type: "connected", ok: !!res?.ok }, location.origin);
  }
});

announce();
