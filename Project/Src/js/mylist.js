

const KEY_FAVS = "animplay_favs";

function loadFavs() {
  try { return JSON.parse(localStorage.getItem(KEY_FAVS)) || {}; }
  catch { return {}; }
}
function saveFavs(favs) {
  localStorage.setItem(KEY_FAVS, JSON.stringify(favs));
}

function getFavArraySorted() {
  const favs = loadFavs();
  return Object.values(favs).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

// Card simples (abre overlay no clique, remove no botão)
function favCardHTML(f) {
  const cover = f.cover || "";
  const title = f.title || "—";
  const lastCap = f.lastCap || 1;

  return `
    <article class="item mylist-item" data-id="${f.id}" data-title="${title}" data-bg="${cover}">
      <div class="thumb" style="background-image:url('${cover}')"></div>
      <div class="meta">
        <h3 class="title">${title}</h3>
        <p class="sub">Último cap salvo: ${lastCap}</p>

        <div class="actions">
          <button class="btn-open" type="button">Abrir</button>
          <button class="btn-remove" type="button" aria-label="Remover dos favoritos">Remover</button>
        </div>
      </div>
    </article>
  `;
}

export function renderMyList() {
  const grid = document.getElementById("myListGrid");
  const empty = document.getElementById("myListEmpty");

  if (!grid || !empty) return;

  const list = getFavArraySorted();

  if (!list.length) {
    grid.innerHTML = "";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  grid.innerHTML = list.map(favCardHTML).join("");

  // Delegação de eventos na grid
  grid.onclick = (e) => {
    const card = e.target.closest(".mylist-item");
    if (!card) return;

    const id = card.dataset.id;

    // remover
    if (e.target.classList.contains("btn-remove")) {
      const favs = loadFavs();
      delete favs[id];
      saveFavs(favs);

      // se o overlay estiver mostrando esse mangá, atualiza o botão estrela também
      if (window.updateFavButton) window.updateFavButton(id);
      renderMyList();
      return;
    }

    // abrir (botão ou clique no card)
    if (e.target.classList.contains("btn-open") || card.contains(e.target)) {
      if (window.abrirOverlay) window.abrirOverlay(id);
      else {

        console.log("abrirOverlay não encontrado, id:", id);
      }
    }
  };
}