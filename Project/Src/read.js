/* ========= Config geral ========= */
const API_CHAPTER = "http://localhost:5000/api/manga"; // GET /:id/chapters/:cap -> { title, pages: [...] }

// base = caminho da pasta
// count = número de páginas
// ext = extensão do arquivo (default "jpg")
function genSeq(base, count, ext = "jpg") {
  const list = [];
  for (let i = 1; i <= count; i++) {
    const n = String(i).padStart(3, "0"); // 001, 002...
    list.push(`${base}/${n}.${ext}`);
  }
  return list;
}

/* ========= Catálogo local (fallback) – ajuste caminhos ========= */
const LOCAL = {
  "bluelock": {
    title: "Blue Lock",
    chapters: {
      1: { pages: genSeq("Assets/MANGAS/BLUE LOCK CAP1", 35, "png") },
    }
  },
  
  "senselife": {
    title: "Sense Life",
    chapters: {
      1: { pages: genSeq("Assets/MANGAS/SENSE LIFE CAP1", 7, "webp") }
    }
  },

  "jujutsukaisen": {
    title: "Jujutsu Kaisen",
    chapters: {
      1: { pages: genSeq("Assets/MANGAS/JUJUTSU CAP1", 7, "webp") }
    }
  }
};

/* ========= Estado ========= */
const qs = new URLSearchParams(location.search);
const state = {
  manga: qs.get("manga") || "bluelock",
  cap: parseInt(qs.get("cap") || "1", 10),
  pages: [],
  idx: 0,        // página atual (0-based)
  zoom: 1,
  fit: "width",  // "width" | "height"
  snap: false
};

/* ========= Elementos ========= */
const header = document.getElementById("header");
const titleEl = document.getElementById("mangaTitle");
const capChip = document.getElementById("capChip");
const capSelect = document.getElementById("capSelect");
const pageWrap = document.getElementById("pageWrap");
const reader = document.getElementById("reader");
const skeleton = document.getElementById("skeleton");
const progressBar = document.getElementById("progressBar");
const fabs = document.getElementById("fabs");

const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const prevCapBtn = document.getElementById("prevCapBtn");
const nextCapBtn = document.getElementById("nextCapBtn");
const fitWidthBtn = document.getElementById("fitWidthBtn");
const fitHeightBtn = document.getElementById("fitHeightBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const snapToggle = document.getElementById("snapToggle");

/* ========= Zoom & Fit ========= */
function setZoom(z) {
  state.zoom = Math.min(3, Math.max(0.5, z));
  document.documentElement.style.setProperty("--zoom", state.zoom);
}

function applyFit() {
  // OBS: no CSS original não existe .fit-height.
  // Mantive a lógica, mas se você quiser comportamento "fit height"
  // me diga como quer (ex.: largura menor fixa, limitar altura, etc).
  if (state.fit === "height") pageWrap.classList.add("fit-height");
  else pageWrap.classList.remove("fit-height");
}

fitWidthBtn.onclick = () => { state.fit = "width"; applyFit(); };
fitHeightBtn.onclick = () => { state.fit = "height"; applyFit(); };
zoomInBtn.onclick = () => setZoom(state.zoom + 0.1);
zoomOutBtn.onclick = () => setZoom(state.zoom - 0.1);

/* ========= Render ========= */
function renderPages() {
  pageWrap.innerHTML = "";

  state.pages.forEach((src, i) => {
    const holder = document.createElement("div");
    holder.className = "page";
    holder.dataset.index = i;

    const img = new Image();
    img.src = src;
    img.alt = `Página ${i + 1}`;
    img.decoding = "async";
    img.loading = i < 3 ? "eager" : "lazy";
    img.onerror = () => {
      holder.classList.add("page--error");
      holder.innerHTML = `<span>Falha ao carregar a página ${i + 1}</span>`;
    };

    holder.appendChild(img);

    const chip = document.createElement("div");
    chip.className = "page__chip";
    chip.textContent = `${i + 1} / ${state.pages.length}`;
    holder.appendChild(chip);

    // Duplo clique / toque para zoom
    let lastTap = 0;
    holder.addEventListener("click", () => {
      const now = Date.now();
      if (now - lastTap < 300) {
        const next = (state.zoom < 1.8) ? state.zoom + 0.25 : 1;
        setZoom(next);
        holder.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      lastTap = now;
    });

    pageWrap.appendChild(holder);
  });

  updateProgress();
}

function updateProgress() {
  const pct = ((state.idx + 1) / Math.max(1, state.pages.length)) * 100;
  progressBar.style.width = `${pct}%`;
  capChip.textContent = `Cap ${state.cap} — ${state.idx + 1}/${state.pages.length}`;
}

function prefetchAround() {
  [state.idx + 1, state.idx + 2].forEach(k => {
    if (k >= 0 && k < state.pages.length) {
      const img = new Image();
      img.src = state.pages[k];
    }
  });
}

function goToIndex(i) {
  if (!state.pages.length) return;
  state.idx = Math.max(0, Math.min(state.pages.length - 1, i));
  const node = pageWrap.children[state.idx];
  if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
  updateProgress();
  prefetchAround();
}

/* ========= Interseção (página atual) ========= */
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = parseInt(entry.target.dataset.index, 10);
      state.idx = idx;
      updateProgress();
    }
  });
}, { root: reader, threshold: 0.6 });

function observePages() {
  io.disconnect();
  pageWrap.querySelectorAll(".page").forEach(p => io.observe(p));
}

/* ========= Snap Toggle ========= */
function applySnap() {
  if (state.snap) pageWrap.classList.add("snap");
  else pageWrap.classList.remove("snap");
  snapToggle.style.borderColor = state.snap ? "#c79be7" : "#2a2a2a";
}

snapToggle.onclick = () => { state.snap = !state.snap; applySnap(); };

/* ========= Carregar capítulo (API -> local) ========= */
async function loadChapter(mangaId, cap) {
  skeleton.style.display = "block";
  pageWrap.innerHTML = "";
  pageWrap.appendChild(skeleton);

  // tenta backend
  let okFromApi = false;
  try {
    const res = await fetch(`${API_CHAPTER}/${encodeURIComponent(mangaId)}/chapters/${cap}`);
    if (res.ok) {
      const json = await res.json();
      titleEl.textContent = json.title || (LOCAL[mangaId]?.title ?? "Mangá");
      state.pages = Array.isArray(json.pages) ? json.pages : [];
      okFromApi = true;
    }
  } catch (_) { /* fallback */ }

  if (!okFromApi) {
    const meta = LOCAL[mangaId];
    titleEl.textContent = meta?.title ?? "Mangá";
    state.pages = meta?.chapters?.[cap]?.pages ?? [];
  }

  capChip.textContent = `Cap ${cap}`;
  skeleton.style.display = "none";

  if (!state.pages.length) {
    pageWrap.innerHTML = `<div class="page page--error"><span>Nenhuma página encontrada.</span></div>`;
    progressBar.style.width = "0%";
    return;
  }

  renderPages();
  observePages();
  state.idx = 0;
  updateProgress();
  prefetchAround();
  reader.scrollTo({ top: 0, behavior: "smooth" });
}

/* ========= Capítulos (select e mudança) ========= */
function populateCapSelect(mangaId) {
  capSelect.innerHTML = "";
  const caps = LOCAL[mangaId]?.chapters
    ? Object.keys(LOCAL[mangaId].chapters).map(n => parseInt(n, 10)).sort((a, b) => a - b)
    : [state.cap];

  caps.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = `Cap ${c}`;
    if (c === state.cap) opt.selected = true;
    capSelect.appendChild(opt);
  });
}

function changeCap(newCap) {
  if (newCap <= 0) return;
  state.cap = newCap;

  const params = new URLSearchParams(location.search);
  params.set("cap", String(newCap));
  history.replaceState(null, "", `?${params.toString()}`);

  populateCapSelect(state.manga);
  loadChapter(state.manga, state.cap);
}

/* ========= Controles ========= */
prevPageBtn.onclick = () => goToIndex(state.idx - 1);
nextPageBtn.onclick = () => goToIndex(state.idx + 1);
prevCapBtn.onclick = () => changeCap(state.cap - 1);
nextCapBtn.onclick = () => changeCap(state.cap + 1);
capSelect.onchange = () => changeCap(parseInt(capSelect.value, 10));

// teclado
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") nextPageBtn.click();
  else if (e.key === "ArrowLeft") prevPageBtn.click();
  else if (e.key === "+") setZoom(state.zoom + 0.1);
  else if (e.key === "-") setZoom(state.zoom - 0.1);
  else if (e.key.toLowerCase() === "w") { state.fit = "width"; applyFit(); }
  else if (e.key.toLowerCase() === "h") { state.fit = "height"; applyFit(); }
});

// esconder header/FABs durante inatividade para leitura “foco”
let idleTimer;
function showUI() { header.classList.remove("header--hidden"); fabs.classList.remove("nav-fab--hidden"); }
function hideUI() { header.classList.add("header--hidden"); fabs.classList.add("nav-fab--hidden"); }
function poke() {
  showUI();
  clearTimeout(idleTimer);
  idleTimer = setTimeout(hideUI, 1800);
}
reader.addEventListener("scroll", poke, { passive: true });
document.addEventListener("mousemove", poke);
document.addEventListener("keydown", poke);

/* ========= Boot ========= */
(async function init() {
  titleEl.textContent = LOCAL[state.manga]?.title ?? "Mangá";
  populateCapSelect(state.manga);
  applyFit();
  applySnap();
  setZoom(state.zoom);
  poke(); // inicia timer
  await loadChapter(state.manga, state.cap);
})();
