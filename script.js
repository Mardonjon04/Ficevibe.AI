const els = {
  fileInput: document.getElementById("fileInput"),
  uploadBtn: document.getElementById("uploadBtn"),
  demoBtn: document.getElementById("demoBtn"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  resetBtn: document.getElementById("resetBtn"),
  previewImg: document.getElementById("previewImg"),
  preview: document.getElementById("preview"),
  steps: document.getElementById("steps"),
  step1: document.getElementById("step1"),
  step2: document.getElementById("step2"),
  step3: document.getElementById("step3"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  results: document.getElementById("results"),
  resultCards: document.getElementById("resultCards"),
  resultSub: document.getElementById("resultSub"),
  resultTitle: document.getElementById("resultTitle"),
  resultBadge: document.getElementById("resultBadge"),
  shareTelegram: document.getElementById("shareTelegram"),
  shareWhatsapp: document.getElementById("shareWhatsapp"),
  shareInstagram: document.getElementById("shareInstagram"),
  copyLink: document.getElementById("copyLink"),
  tryAgainBtn: document.getElementById("tryAgainBtn"),
  themeBtn: document.getElementById("themeBtn"),
  installBtn: document.getElementById("installBtn"),
  toast: document.getElementById("toast"),
  adModal: document.getElementById("adModal"),
  continueToResults: document.getElementById("continueToResults"),
  offline: document.getElementById("offline"),
  offlineRetry: document.getElementById("offlineRetry"),
  openPrivacy: document.getElementById("openPrivacy"),
  openPolicy: document.getElementById("openPolicy"),
  infoModal: document.getElementById("infoModal"),
  infoTitle: document.getElementById("infoTitle"),
  infoText: document.getElementById("infoText"),
  year: document.getElementById("year"),
};

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

const CELEBS = [
  { name: "Zendaya", vibe: "Neon cool" },
  { name: "Tom Holland", vibe: "Friendly energy" },
  { name: "Rihanna", vibe: "Icon aura" },
  { name: "The Weeknd", vibe: "Midnight vibe" },
  { name: "Taylor Swift", vibe: "Pop glow" },
  { name: "Billie Eilish", vibe: "Alt mood" },
  { name: "Dwayne Johnson", vibe: "Power mode" },
  { name: "Scarlett Johansson", vibe: "Cinema spark" },
  { name: "Keanu Reeves", vibe: "Calm legend" },
  { name: "Chris Hemsworth", vibe: "Hero energy" },
  { name: "Gal Gadot", vibe: "Bold vibe" },
  { name: "Selena Gomez", vibe: "Soft glow" },
  { name: "Ariana Grande", vibe: "Sweet neon" },
  { name: "Robert Downey Jr.", vibe: "Genius vibe" },
  { name: "Margot Robbie", vibe: "Bright star" },
  { name: "Jason Momoa", vibe: "Ocean energy" },
  { name: "Timothée Chalamet", vibe: "Indie charm" },
  { name: "Emma Watson", vibe: "Smart glow" },
];

let selectedFile = null;
let selectedObjectUrl = null;
let pendingBeforeInstallPrompt = null;
let pendingResult = null;

function setTheme(next) {
  const theme = next === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("fva_theme", theme);
  els.themeBtn.textContent = theme === "dark" ? "Dark" : "Light";
  els.themeBtn.setAttribute("aria-pressed", String(theme === "light"));
}

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    els.toast.hidden = true;
  }, 2200);
}

function setStatus(state, text) {
  els.statusText.textContent = text;
  els.statusDot.classList.remove("dot--idle", "dot--work", "dot--ok", "dot--bad");
  els.statusDot.classList.add(
    state === "work" ? "dot--work" : state === "ok" ? "dot--ok" : state === "bad" ? "dot--bad" : "dot--idle",
  );
}

function clearSteps() {
  for (const el of [els.step1, els.step2, els.step3]) el.removeAttribute("data-done");
}

function showInfo(title, text) {
  els.infoTitle.textContent = title;
  els.infoText.textContent = text;
  openModal(els.infoModal);
}

function openModal(modalEl) {
  modalEl.hidden = false;
  modalEl.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(modalEl) {
  modalEl.hidden = true;
  modalEl.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function closeAllModals() {
  for (const modal of [els.adModal, els.infoModal]) closeModal(modal);
}

function safeCleanupObjectUrl() {
  if (!selectedObjectUrl) return;
  URL.revokeObjectURL(selectedObjectUrl);
  selectedObjectUrl = null;
}

function resetAll() {
  safeCleanupObjectUrl();
  selectedFile = null;
  els.fileInput.value = "";
  els.previewImg.hidden = true;
  els.previewImg.removeAttribute("src");
  els.results.hidden = true;
  els.resultCards.innerHTML = "";
  els.resultSub.textContent = "";
  setStatus("idle", "Tayyor");
  els.steps.hidden = true;
  clearSteps();
  els.analyzeBtn.disabled = true;
  els.resetBtn.disabled = true;
  pendingResult = null;
  history.replaceState(null, "", location.pathname);
}

function validateFile(file) {
  if (!file) return { ok: false, reason: "Fayl topilmadi." };
  if (!ACCEPTED.has(file.type)) return { ok: false, reason: "Faqat JPG/PNG/WebP formatlari tavsiya qilinadi." };
  if (file.size > MAX_BYTES) return { ok: false, reason: "Fayl juda katta. 5MB dan kichik rasm tanlang." };
  return { ok: true };
}

function pickCelebs(rng) {
  const pool = [...CELEBS];
  const pickOne = () => pool.splice(Math.floor(rng() * pool.length), 1)[0];
  return [pickOne(), pickOne(), pickOne()];
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function seedFromString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

async function simulateAnalysis(file) {
  setStatus("work", "AI analiz qilmoqda…");
  els.steps.hidden = false;
  clearSteps();

  const seedBase = file ? `${file.name}:${file.size}:${file.lastModified}:${Date.now()}` : `demo:${Date.now()}`;
  const rng = mulberry32(seedFromString(seedBase));

  await wait(550 + Math.floor(rng() * 380));
  els.step1.dataset.done = "true";
  await wait(520 + Math.floor(rng() * 420));
  els.step2.dataset.done = "true";
  await wait(520 + Math.floor(rng() * 420));
  els.step3.dataset.done = "true";

  const [c1, c2, c3] = pickCelebs(rng);
  const top = Math.floor(70 + rng() * 23);
  const second = clamp(Math.floor(top - (14 + rng() * 14)), 52, 69);
  const third = clamp(Math.floor(second - (12 + rng() * 14)), 35, 55);
  const results = [
    { ...c1, pct: top },
    { ...c2, pct: second },
    { ...c3, pct: third },
  ].sort((a, b) => b.pct - a.pct);

  const vibeLabel = results[0].pct >= 86 ? "Ultra vibe" : results[0].pct >= 78 ? "High vibe" : "Good vibe";
  return { results, vibeLabel };
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildResultCards(list) {
  els.resultCards.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (const item of list) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card__name">${escapeHtml(item.name)}</div>
      <div class="card__row">
        <div class="meter"><span></span></div>
        <div class="pct">${item.pct}%</div>
      </div>
      <div class="tag">${escapeHtml(item.vibe)}</div>
    `;
    frag.appendChild(card);
    requestAnimationFrame(() => {
      const bar = card.querySelector(".meter > span");
      if (bar) bar.style.width = `${item.pct}%`;
    });
  }
  els.resultCards.appendChild(frag);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function encodeShareData(list) {
  const payload = list.map((x) => `${x.name}|${x.pct}`).join("~");
  return btoa(unescape(encodeURIComponent(payload))).replaceAll("=", "");
}

function decodeShareData(s) {
  try {
    const padded = s + "===".slice(0, (4 - (s.length % 4)) % 4);
    const raw = decodeURIComponent(escape(atob(padded)));
    const parts = raw.split("~").slice(0, 3);
    const parsed = parts
      .map((p) => {
        const [name, pctStr] = p.split("|");
        const pct = Number(pctStr);
        if (!name || !Number.isFinite(pct)) return null;
        const found = CELEBS.find((c) => c.name === name);
        return { name, pct: clamp(Math.round(pct), 1, 99), vibe: found?.vibe ?? "Vibe" };
      })
      .filter(Boolean);
    if (parsed.length < 1) return null;
    while (parsed.length < 3) parsed.push(parsed[0]);
    parsed.sort((a, b) => b.pct - a.pct);
    return parsed.slice(0, 3);
  } catch {
    return null;
  }
}

function buildShareUrls(list) {
  const token = encodeShareData(list);
  const url = new URL(location.href);
  url.searchParams.set("r", token);
  const shareUrl = url.toString();

  const title = "Face Vibes AI";
  const text = `You look like ${list[0].name} (${list[0].pct}%). Try yours:`;
  const encodedText = encodeURIComponent(`${text} ${shareUrl}`);

  els.shareTelegram.href = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
  els.shareWhatsapp.href = `https://wa.me/?text=${encodedText}`;

  return { shareUrl, text, title };
}

function showResults(list, vibeLabel, sourceLabel) {
  pendingResult = { list, vibeLabel };
  els.resultTitle.textContent = `You look like ${list[0].name}…`;
  els.resultSub.textContent = sourceLabel
    ? `${sourceLabel} • Natija har safar biroz farq qilishi mumkin.`
    : "Natija har safar biroz farq qilishi mumkin.";
  els.resultBadge.textContent = vibeLabel;
  buildResultCards(list);
  buildShareUrls(list);
  els.results.hidden = false;
  els.results.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function runFlow(fileOrNull) {
  els.analyzeBtn.disabled = true;
  els.resetBtn.disabled = true;
  els.demoBtn.disabled = true;
  els.uploadBtn.disabled = true;

  clearSteps();
  els.steps.hidden = false;

  let analysis;
  try {
    analysis = await simulateAnalysis(fileOrNull);
  } catch {
    setStatus("bad", "Xatolik yuz berdi");
    els.demoBtn.disabled = false;
    els.uploadBtn.disabled = false;
    els.resetBtn.disabled = false;
    return;
  }

  setStatus("ok", "Tayyor. Natijani ko‘ring");
  els.demoBtn.disabled = false;
  els.uploadBtn.disabled = false;
  els.resetBtn.disabled = false;

  openInterstitialThenShowResults(analysis.results, analysis.vibeLabel, fileOrNull ? "Uploaded photo" : "Demo");
}

function openInterstitialThenShowResults(list, vibeLabel, sourceLabel) {
  pendingResult = { list, vibeLabel, sourceLabel };
  openModal(els.adModal);
  els.continueToResults.focus();
}

function applyPendingResults() {
  if (!pendingResult) return;
  const { list, vibeLabel, sourceLabel } = pendingResult;
  closeModal(els.adModal);
  showResults(list, vibeLabel, sourceLabel);
}

function updateOfflineUI() {
  const isOffline = !navigator.onLine;
  els.offline.hidden = !isOffline;
  if (isOffline) toast("Offline: cached rejim");
}

function handleFile(file) {
  const v = validateFile(file);
  if (!v.ok) {
    setStatus("bad", "Noto‘g‘ri fayl");
    showInfo("Fayl qabul qilinmadi", v.reason);
    return;
  }

  resetAll();

  selectedFile = file;
  selectedObjectUrl = URL.createObjectURL(file);
  els.previewImg.src = selectedObjectUrl;
  els.previewImg.hidden = false;
  setStatus("idle", "Rasm tayyor. Analyze bosing");
  els.analyzeBtn.disabled = false;
  els.resetBtn.disabled = false;
}

function tryNativeShare(list) {
  const { shareUrl, text, title } = buildShareUrls(list);
  if (!navigator.share) return false;
  navigator
    .share({ title, text, url: shareUrl })
    .then(() => toast("Ulashildi"))
    .catch(() => { });
  return true;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Link nusxalandi");
    return true;
  } catch {
    return false;
  }
}

function initFromUrl() {
  const url = new URL(location.href);
  const token = url.searchParams.get("r");
  if (!token) return;
  const decoded = decodeShareData(token);
  if (!decoded) return;
  setStatus("ok", "Ulashilgan natija");
  els.steps.hidden = true;
  showResults(decoded, decoded[0].pct >= 86 ? "Ultra vibe" : decoded[0].pct >= 78 ? "High vibe" : "Good vibe", "Shared");
}

function initInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pendingBeforeInstallPrompt = e;
    els.installBtn.hidden = false;
  });

  els.installBtn.addEventListener("click", async () => {
    if (!pendingBeforeInstallPrompt) return;
    pendingBeforeInstallPrompt.prompt();
    try {
      await pendingBeforeInstallPrompt.userChoice;
    } finally {
      pendingBeforeInstallPrompt = null;
      els.installBtn.hidden = true;
    }
  });
}

function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => { });
  });
}

function initModalEvents() {
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.close === "true") closeAllModals();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });
}

function init() {
  els.year.textContent = String(new Date().getFullYear());

  const savedTheme = localStorage.getItem("fva_theme");
  if (savedTheme) setTheme(savedTheme);
  else setTheme(window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

  initServiceWorker();
  initInstallPrompt();
  initModalEvents();

  updateOfflineUI();
  window.addEventListener("online", updateOfflineUI);
  window.addEventListener("offline", updateOfflineUI);
  els.offlineRetry.addEventListener("click", () => location.reload());

  els.themeBtn.addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || "dark";
    setTheme(cur === "dark" ? "light" : "dark");
  });

  els.uploadBtn.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", () => handleFile(els.fileInput.files?.[0] ?? null));

  els.demoBtn.addEventListener("click", async () => {
    resetAll();
    setStatus("idle", "Demo tayyor. Analyze bosing");
    els.analyzeBtn.disabled = false;
    els.resetBtn.disabled = false;
    selectedFile = null;
  });

  els.analyzeBtn.addEventListener("click", async () => {
    if (!selectedFile && els.previewImg.hidden) {
      toast("Avval rasm tanlang");
      return;
    }
    await runFlow(selectedFile);
  });

  els.resetBtn.addEventListener("click", () => resetAll());

  els.continueToResults.addEventListener("click", () => applyPendingResults());

  els.tryAgainBtn.addEventListener("click", () => {
    resetAll();
    toast("Yangi rasm yuklang");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  els.copyLink.addEventListener("click", async () => {
    if (!pendingResult?.list) return;
    const { shareUrl } = buildShareUrls(pendingResult.list);
    const ok = await copyToClipboard(shareUrl);
    if (!ok) showInfo("Clipboard", "Linkni nusxalab bo‘lmadi. Brauzer ruxsatini tekshiring.");
  });

  els.shareInstagram.addEventListener("click", async () => {
    if (!pendingResult?.list) return;
    const { shareUrl } = buildShareUrls(pendingResult.list);
    const ok = await copyToClipboard(shareUrl);
    if (ok) showInfo("Instagram", "Link nusxalandi. Instagram story/postga joylang.");
    else showInfo("Instagram", "Linkni nusxalab bo‘lmadi. Copy link tugmasini sinang.");
  });

  els.resultCards.addEventListener("click", () => {
    if (!pendingResult?.list) return;
    tryNativeShare(pendingResult.list);
  });

  els.openPrivacy.addEventListener("click", (e) => {
    e.preventDefault();
    showInfo("Privacy", "Rasm serverga yuklanmaydi. Analiz brauzeringizda simulyatsiya qilinadi va saqlanmaydi.");
  });
  els.openPolicy.addEventListener("click", (e) => {
    e.preventDefault();
    showInfo(
      "Ads Policy",
      "Reklama joylari 'Advertisement' deb belgilangan. Interstitial faqat foydalanuvchi harakati (Continue) bilan natijaga o‘tadi. AdSense kodini joylashtirganda, majburlovchi yoki chalg‘ituvchi UI ishlatmang.",
    );
  });

  initFromUrl();
}

init();

