import { loadRecentSearches, registerRecentSearch } from "../localStorage.js";

const EL = {};
let catalog = [];      // [{id,title,synopsis,tags[],cover,firstCap}]
let activeIndex = -1;  // índice selecionado com ↑/↓
let lastQuery = "";

/** Inicializa a pesquisa.
 *  getCatalog: função que retorna a lista de itens (ou usa DOM)
 */
export function initSearch({ getCatalog, onOpenItem, filterGrid }) {
  EL.input   = document.getElementById('searchInput');
  EL.panel   = document.getElementById('searchPanel');
  EL.list    = document.getElementById('searchList');
  EL.empty   = document.getElementById('searchEmpty');

  // monta o catálogo
  catalog = typeof getCatalog === 'function' ? getCatalog() : readCatalogFromDOM();

  // eventos
  EL.input.addEventListener('input', debounce(onType, 140));
  EL.input.addEventListener('focus', showRecent);
  EL.input.addEventListener('keydown', onKey);
  document.addEventListener('click', (e) => {
    if (!EL.panel.contains(e.target) && e.target !== EL.input) closePanel();
  });

  // ações de clique no resultado
  EL.list.addEventListener('click', (e) => {
    const li = e.target.closest('.search-item');
    if (!li) return;
    const id = li.dataset.id;
    const item = catalog.find(x => x.id === id);
    if (item) {
      registerRecentSearch(EL.input.value || item.title);
      closePanel();
      onOpenItem?.(item);
      filterGrid?.(""); // limpa filtros visuais
    }
  });

  // filtrar grid em tempo real (opcional)
  function onType() {
    const q = EL.input.value.trim();
    lastQuery = q;
    if (!q) return showRecent();
    const results = search(q, catalog).slice(0, 10);
    renderList(results, q);
    EL.empty.hidden = results.length > 0;
    EL.panel.setAttribute('aria-hidden', 'false');
    filterGrid?.(q);
  }
}

/** Lê o catálogo a partir dos .item no DOM */
export function readCatalogFromDOM() {
  return Array.from(document.querySelectorAll('.item')).map(el => ({
    id: el.dataset.id || "",
    title: el.dataset.title || "",
    synopsis: el.dataset.synopsis || "",
    tags: (el.dataset.tags || "").split(",").map(s=>s.trim()).filter(Boolean),
    cover: el.dataset.cover || el.querySelector('img')?.src || "",
    firstCap: parseInt(el.dataset.firstcap || "1", 10) || 1,
    _el: el // referência para filtro visual
  })).filter(x => x.id && x.title);
}

/** Pesquisa simples (case-insensitive) em título, sinopse e tags */
export function search(q, list) {
  const s = q.toLowerCase();
  return list.filter(item =>
    item.title.toLowerCase().includes(s) ||
    item.synopsis.toLowerCase().includes(s) ||
    item.tags.some(t => t.toLowerCase().includes(s))
  );
}

/** Renderiza a lista de resultados/sugestões */
function renderList(results, q) {
  EL.list.innerHTML = "";
  activeIndex = -1;
  for (const item of results) {
    const li = document.createElement('li');
    li.className = 'search-item';
    li.dataset.id = item.id;
    li.setAttribute('role', 'option');
    li.innerHTML = `
      <img class="search-item-thumb" src="${item.cover}" alt="">
      <div>
        <div class="search-item-title">${highlight(item.title, q)}</div>
        <div class="search-item-desc">${truncate(item.synopsis || "—", 100)}</div>
        ${item.tags?.length ? `<div class="search-tags">${
          item.tags.slice(0,3).map(t=>`<span class="search-tag">${escapeHtml(t)}</span>`).join("")
        }</div>` : ""}
      </div>
      <div>▶</div>
    `;
    EL.list.appendChild(li);
  }
}

/** Mostra buscas recentes como sugestões */
function showRecent() {
  const recents = loadRecentSearches();
  if (!recents.length) {
    EL.panel.setAttribute('aria-hidden', 'true');
    return;
  }
  EL.list.innerHTML = "";
  activeIndex = -1;
  recents.slice(0,8).forEach(q => {
    const li = document.createElement('li');
    li.className = 'search-item';
    li.dataset.id = ""; // não abre direto por id
    li.innerHTML = `
      <div class="search-item-thumb" style="display:grid;place-items:center;background:#1a1a1a;border-radius:8px;">🔎</div>
      <div>
        <div class="search-item-title">${escapeHtml(q)}</div>
        <div class="search-item-desc" style="opacity:.7">Buscar novamente</div>
      </div>
      <div>↵</div>
    `;
    li.addEventListener('click', () => {
      EL.input.value = q;
      const results = search(q, catalog).slice(0,10);
      renderList(results, q);
      EL.panel.setAttribute('aria-hidden', 'false');
      EL.empty.hidden = results.length > 0;
    });
    EL.list.appendChild(li);
  });
  EL.empty.hidden = true;
  EL.panel.setAttribute('aria-hidden', 'false');
}

/** Teclado: ↑/↓ navega, Enter abre, Esc fecha */
function onKey(e) {
  const items = Array.from(EL.list.children);
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex = Math.min(items.length - 1, activeIndex + 1);
    updateActive(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex = Math.max(0, activeIndex - 1);
    updateActive(items);
  } else if (e.key === 'Enter') {
    if (activeIndex >= 0 && items[activeIndex]) {
      items[activeIndex].click();
    } else if (lastQuery) {
      registerRecentSearch(lastQuery);
      // Se não selecionou um item, apenas filtra a grid
      // (o onType já chamou filterGrid via initSearch)
    }
  } else if (e.key === 'Escape') {
    closePanel();
  }
}

function updateActive(items) {
  items.forEach((li, i) => li.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false'));
  if (items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
}

function closePanel() {
  EL.panel.setAttribute('aria-hidden', 'true');
}

/* ==== Utils ==== */
function debounce(fn, ms=150){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
function escapeHtml(s){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function highlight(text, q){
  const s = q.trim();
  if (!s) return escapeHtml(text);
  const re = new RegExp(`(${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
  return escapeHtml(text).replace(re, '<mark>$1</mark>');
}
function truncate(s, n){ return s.length > n ? s.slice(0, n-1) + '…' : s; }
