const ENDPOINT = "https://csseimpjrurrvhaogzuo.supabase.co/functions/v1/extension-assistant";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzc2VpbXBqcnVycnZoYW9nenVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDA4MDMsImV4cCI6MjA4OTk3NjgwM30.XrIGXWvHjlw9gPF7Ys96wzLlhsJFPXV6VqN1D93cOuY";
const KEY_PAGE = "https://ascended.lovable.app/extension";

const setup = document.getElementById("setup");
const main = document.getElementById("main");
const keyInput = document.getElementById("keyInput");
const saveKey = document.getElementById("saveKey");
const getKeyLink = document.getElementById("getKeyLink");
const changeKey = document.getElementById("changeKey");
const promptEl = document.getElementById("prompt");
const runBtn = document.getElementById("run");
const useScreenshot = document.getElementById("useScreenshot");
const output = document.getElementById("output");

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function showSetup() { setup.style.display = "block"; main.style.display = "none"; }
function showMain() { setup.style.display = "none"; main.style.display = "block"; }

chrome.storage.local.get(["extKey"], ({ extKey }) => {
  if (extKey) showMain(); else showSetup();
});

saveKey.addEventListener("click", async () => {
  const v = keyInput.value.trim();
  if (!v.startsWith("omf_")) return alert("Key should start with omf_");
  await chrome.storage.local.set({ extKey: v });
  showMain();
});

getKeyLink.addEventListener("click", (e) => { e.preventDefault(); chrome.tabs.create({ url: KEY_PAGE }); });
changeKey.addEventListener("click", (e) => { e.preventDefault(); chrome.storage.local.remove(["extKey"], showSetup); });

document.querySelectorAll(".quick button").forEach((btn) => {
  btn.addEventListener("click", () => { promptEl.value = btn.dataset.q; promptEl.focus(); });
});

promptEl.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
});
runBtn.addEventListener("click", run);

async function run() {
  const prompt = promptEl.value.trim();
  if (!prompt) return;
  const { extKey } = await chrome.storage.local.get(["extKey"]);
  if (!extKey || typeof extKey !== "string" || !extKey.startsWith("omf_")) {
    showSetup();
    return;
  }

  runBtn.disabled = true;
  output.innerHTML = '<div class="loading"><div class="spinner"></div> Analyzing...</div>';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let screenshot = null;
    if (useScreenshot.checked && tab) {
      try { screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 70 }); }
      catch (e) { console.warn("Screenshot failed:", e); }
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
        "x-extension-key": extKey,
      },
      body: JSON.stringify({ prompt, screenshot, pageUrl: tab?.url, pageTitle: tab?.title }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.code === "ACCESS_REQUIRED") {
        output.innerHTML = `<div class="error">🔒 Daily access not unlocked. <a href="${KEY_PAGE}" target="_blank">Unlock today (10 credits or Pro)</a></div>`;
        return;
      }
      throw new Error(data.error || `Error ${res.status}`);
    }
    render(data);
  } catch (err) {
    output.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  } finally {
    runBtn.disabled = false;
  }
}

function render(data) {
  let html = `<div class="result">`;
  if (data.title) html += `<div class="result-title">${escapeHtml(data.title)}</div>`;
  if (data.content) html += `<div class="result-content">${escapeHtml(data.content)}</div>`;
  if (data.table?.columns?.length) {
    html += `<table><thead><tr>${data.table.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>`;
    html += (data.table.rows || []).map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");
    html += `</tbody></table>`;
  }
  if (data.items?.length) html += `<ul>${data.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
  html += `<button class="copy-btn" id="copyBtn">Copy</button></div>`;
  output.innerHTML = html;

  document.getElementById("copyBtn")?.addEventListener("click", () => {
    let text = data.content || "";
    if (data.table?.columns) {
      text += "\n\n" + data.table.columns.join("\t") + "\n";
      text += (data.table.rows || []).map((r) => r.join("\t")).join("\n");
    }
    if (data.items?.length) text += "\n\n" + data.items.map((i) => "• " + i).join("\n");
    navigator.clipboard.writeText(text.trim());
    const btn = document.getElementById("copyBtn");
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = "Copy"), 1500);
  });
}
