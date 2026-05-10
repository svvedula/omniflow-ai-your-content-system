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
const refineBox = document.getElementById("refineBox");
const refineEl = document.getElementById("refine");
const refineBtn = document.getElementById("refineBtn");
const refineScreenshot = document.getElementById("refineScreenshot");
const newBtn = document.getElementById("newBtn");
const historyView = document.getElementById("historyView");
const tabTag = document.getElementById("tabTag");
const maxBtn = document.getElementById("maxBtn");
const closeBtn = document.getElementById("closeBtn");

// Detect maximized (detached window) mode via URL hash
const params = new URLSearchParams(location.hash.slice(1));
const isMaximized = params.get("max") === "1";
const forcedTabId = params.get("tabId") ? parseInt(params.get("tabId"), 10) : null;
if (isMaximized) {
  document.body.classList.add("maximized");
  maxBtn.style.display = "none";
}

let history = [];
let lastResult = null;
let currentTabKey = null; // origin+pathname used as memory bucket
let currentTabId = null;

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function showSetup() { setup.style.display = "block"; main.style.display = "none"; }
function showMain() { setup.style.display = "none"; main.style.display = "flex"; }

function tabKeyFromUrl(url) {
  try { const u = new URL(url); return `${u.origin}${u.pathname}`; }
  catch { return url || "unknown"; }
}

async function getActiveTab() {
  if (forcedTabId) {
    try { return await chrome.tabs.get(forcedTabId); } catch { /* fall through */ }
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadTabMemory() {
  const tab = await getActiveTab();
  if (!tab) return;
  currentTabId = tab.id;
  currentTabKey = tabKeyFromUrl(tab.url);
  tabTag.textContent = `💬 Memory for: ${currentTabKey}`;
  const storeKey = `mem:${currentTabKey}`;
  const data = await chrome.storage.local.get([storeKey]);
  const saved = data[storeKey];
  if (saved && Array.isArray(saved.history)) {
    history = saved.history;
    lastResult = saved.lastResult || null;
    if (saved.draftPrompt) promptEl.value = saved.draftPrompt;
    renderHistory();
    if (lastResult) {
      render(lastResult);
      refineBox.style.display = "block";
    }
  }
}

async function saveTabMemory() {
  if (!currentTabKey) return;
  const storeKey = `mem:${currentTabKey}`;
  await chrome.storage.local.set({
    [storeKey]: {
      history,
      lastResult,
      draftPrompt: promptEl.value,
      updatedAt: Date.now(),
    },
  });
}

function renderHistory() {
  if (!history.length) { historyView.innerHTML = ""; return; }
  // Show prior user prompts as compact list (excluding the current rendered result)
  const userTurns = history.filter((m) => m.role === "user");
  if (userTurns.length <= 1) { historyView.innerHTML = ""; return; }
  historyView.innerHTML = `<div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Earlier on this tab</div>` +
    userTurns.slice(0, -1).map((m) => `<div class="history-item"><span class="who">You</span>${escapeHtml(m.content.slice(0, 120))}</div>`).join("");
}

chrome.storage.local.get(["extKey"], async ({ extKey }) => {
  if (extKey) { showMain(); await loadTabMemory(); } else showSetup();
});

saveKey.addEventListener("click", async () => {
  const v = keyInput.value.trim();
  if (!v.startsWith("omf_")) return alert("Key should start with omf_");
  await chrome.storage.local.set({ extKey: v });
  showMain();
  await loadTabMemory();
});

getKeyLink.addEventListener("click", (e) => { e.preventDefault(); chrome.tabs.create({ url: KEY_PAGE }); });
changeKey.addEventListener("click", (e) => { e.preventDefault(); chrome.storage.local.remove(["extKey"], showSetup); });

document.querySelectorAll(".quick button").forEach((btn) => {
  btn.addEventListener("click", () => { promptEl.value = btn.dataset.q; promptEl.focus(); saveTabMemory(); });
});

promptEl.addEventListener("input", () => saveTabMemory());
promptEl.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(false);
});
refineEl?.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(true);
});
runBtn.addEventListener("click", () => run(false));
refineBtn.addEventListener("click", () => run(true));
newBtn.addEventListener("click", async () => {
  history = []; lastResult = null;
  output.innerHTML = ""; historyView.innerHTML = "";
  refineBox.style.display = "none";
  promptEl.value = ""; refineEl.value = "";
  await saveTabMemory();
  promptEl.focus();
});

closeBtn.addEventListener("click", () => {
  if (isMaximized) {
    chrome.windows.getCurrent((w) => chrome.windows.remove(w.id));
  } else {
    window.close();
  }
});

maxBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  const url = chrome.runtime.getURL("popup.html") + `#max=1&tabId=${tab?.id ?? ""}`;
  await chrome.windows.create({ url, type: "popup", width: 520, height: 720, focused: true });
  window.close();
});

async function run(isRefine) {
  const prompt = isRefine ? refineEl.value.trim() : promptEl.value.trim();
  if (!prompt) return;
  const { extKey } = await chrome.storage.local.get(["extKey"]);
  if (!extKey || typeof extKey !== "string" || !extKey.startsWith("omf_")) {
    showSetup();
    return;
  }

  const btn = isRefine ? refineBtn : runBtn;
  btn.disabled = true;
  output.innerHTML = '<div class="loading"><div class="spinner"></div> ' + (isRefine ? "Refining..." : "Analyzing...") + '</div>';

  try {
    const tab = await getActiveTab();
    let screenshot = null;
    const wantShot = isRefine ? refineScreenshot.checked : useScreenshot.checked;
    if (wantShot && tab) {
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
      body: JSON.stringify({
        prompt,
        screenshot,
        pageUrl: tab?.url,
        pageTitle: tab?.title,
        history: history.slice(-8),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401 || /x-extension-key/i.test(data.error || "")) {
        await chrome.storage.local.remove(["extKey"]);
        output.innerHTML = `<div class="error">🔑 Your access key is missing or invalid. <a href="#" id="reKey">Re-enter key</a></div>`;
        document.getElementById("reKey")?.addEventListener("click", (e) => { e.preventDefault(); showSetup(); });
        return;
      }
      if (data.code === "ACCESS_REQUIRED") {
        output.innerHTML = `<div class="error">🔒 Daily access not unlocked. <a href="${KEY_PAGE}" target="_blank">Unlock today (10 credits or Pro)</a></div>`;
        return;
      }
      throw new Error(data.error || `Error ${res.status}`);
    }

    history.push({ role: "user", content: prompt });
    history.push({ role: "assistant", content: JSON.stringify(data) });
    lastResult = data;
    if (!isRefine) promptEl.value = "";
    refineEl.value = "";

    render(data);
    renderHistory();
    refineBox.style.display = "block";
    refineEl.focus();
    await saveTabMemory();
  } catch (err) {
    output.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
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
