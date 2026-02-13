// ========= Favoritos (Local) =========
const favBtn = document.getElementById("favBtn");

function loadFavs() {
    try { return JSON.parse(localStorage.getItem("animplay_favs")) || {}; }
    catch { return {}; }
}
function saveFavs(favs) {
    localStorage.setItem("animplay_favs", JSON.stringify(favs));
}
function isFav(mangaId) {
    const favs = loadFavs();
    return Boolean(favs[mangaId]);
}
function updateFavButton(mangaId) {
    const fav = isFav(mangaId);
    favBtn.classList.toggle("active", fav);
    favBtn.setAttribute("aria-pressed", fav ? "true" : "false");
    favBtn.title = fav ? "Remover dos favoritos" : "Adicionar aos favoritos";
}
function toggleFav(mangaId, meta) {
    const favs = loadFavs();
    if (favs[mangaId]) {
        delete favs[mangaId];
    } else {
        // meta pode conter cover/bg e o capítulo atual básico
        favs[mangaId] = {
            id: mangaId,
            title: meta.title,
            cover: meta.cover || meta.bg || "",
            addedAt: Date.now(),
            lastCap: meta.lastCap || 1
        };
    }
    saveFavs(favs);
    updateFavButton(mangaId);
}

// ========= Integração com seu overlay existente =========
// (supondo que você já tenha MANGAS, onCardClick, loadMangaData, etc.)
const overlay = document.getElementById("mangaOverlay");
const overlayHeader = document.getElementById("overlayHeader");
const overlayTitle = document.getElementById("overlayTitle");
const chapterList = document.getElementById("chapterList");

function abrirOverlay() { overlay.classList.add("active"); }
function fecharOverlay() { overlay.classList.remove("active"); }

// Ajuste no handler do card para controlar o fav
async function onCardClick(e) {
    const card = e.currentTarget;
    const id = card.dataset.id;
    const title = card.dataset.title || "";
    const bg = card.dataset.bg || "";

    // mostra info básica imediatamente
    overlayHeader.style.backgroundImage =
        `linear-gradient(to bottom, rgba(0,0,0,.2), rgba(0,0,0,.65)), url('${bg}')`;
    overlayTitle.textContent = title;

    // ⭐ inicializa botão de favorito para este mangá
    updateFavButton(id);

    // vincula o clique da estrela a este mangá (e meta)
    favBtn.onclick = () => toggleFav(id, { title, cover: bg, lastCap: 1 });

    // abrir overlay
    abrirOverlay();
}

// Ligue os eventos nos cards (se ainda não fez)
document.querySelectorAll(".item").forEach(card => {
    card.addEventListener("click", onCardClick);
});


/* ========= Buscas recentes ========= */
const KEY_RECENT = "animplay_recent_searches";

export function loadRecentSearches() {
    try { return JSON.parse(localStorage.getItem(KEY_RECENT)) || []; }
    catch { return []; }
}

export function saveRecentSearches(list) {
    localStorage.setItem(KEY_RECENT, JSON.stringify(list));
}

/** Registra/atualiza uma busca recente.
 *  Mantém no topo, sem duplicadas, tamanho máximo (default 8). */
export function registerRecentSearch(query, max = 8) {
    const q = String(query || "").trim();
    if (!q) return;
    const list = loadRecentSearches().filter(x => x.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    saveRecentSearches(list.slice(0, max));
}
