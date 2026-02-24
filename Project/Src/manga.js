const overlay = document.getElementById("mangaOverlay");
const overlayHeader = document.getElementById("overlayHeader");
const overlayTitle = document.getElementById("overlayTitle");
const chapterList = document.getElementById("chapterList");

function abrirOverlay() { overlay.classList.add("active"); }
function fecharOverlay() { overlay.classList.remove("active"); }

// 🔧 Agora recebo também o mangaId
function renderChapters(chapters, mangaId) {
    chapterList.innerHTML = "";
    if (!chapters || !chapters.length) {
        chapterList.innerHTML = `<div class="chapter empty">Nenhum capítulo disponível.</div>`;
        return;
    }
    const frag = document.createDocumentFragment();
    chapters.forEach((ch) => {
        const div = document.createElement("div");
        div.className = "chapter";
        div.textContent = `Capítulo ${String(ch.num).padStart(2, "0")} - ${ch.name}`;
        div.onclick = () => {
            const params = new URLSearchParams({ manga: mangaId, cap: ch.num });
            window.location.href = `read.html?${params.toString()}`;
        };
        frag.appendChild(div);
    });
    chapterList.appendChild(frag);
}

function setLoading(isLoading) {
    chapterList.classList.toggle("loading", isLoading);
    if (isLoading) {
        chapterList.innerHTML = `
        <div class="chapter skeleton"></div>
        <div class="chapter skeleton"></div>
        <div class="chapter skeleton"></div>`;
    }
}

async function loadMangaData(id, dataFromCard) {
    let data = MANGAS[id] || { title: dataFromCard.title || "Mangá", bg: dataFromCard.bg || "", chapters: [] };
    try {
        setLoading(true);
        const res = await fetch(`${API_MANGA_BASE}/${encodeURIComponent(id)}`);
        if (res.ok) {
            const json = await res.json();
            data = {
                title: json.title || data.title,
                bg: json.bg || data.bg,
                chapters: Array.isArray(json.chapters) ? json.chapters : data.chapters
            };
        }
    } catch (_) {
        // fallback local
    } finally {
        setLoading(false);
    }
    return data;
}

async function onCardClick(e) {
    const card = e.currentTarget;
    const id = card.dataset.id;
    const title = card.dataset.title || "";
    const bg = card.dataset.bg || "";

    // Mostra de imediato info básica
    overlayHeader.style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,.2), rgba(0,0,0,.65)), url('${bg}')`;
    overlayTitle.textContent = title;
    renderChapters([], id);
    abrirOverlay();

    // Carrega capítulos (API → fallback)
    const data = await loadMangaData(id, { title, bg });
    overlayHeader.style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,.2), rgba(0,0,0,.65)), url('${data.bg}')`;
    overlayTitle.textContent = data.title;
    renderChapters(data.chapters, id); 
}

// Liga os cliques nos cards
document.querySelectorAll(".item").forEach((card) => {
    card.addEventListener("click", onCardClick);
});

