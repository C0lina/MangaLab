// js/catalog.js
const JSON_URL = './data/mangas.json';

function createCard(m) {
  const card = document.createElement('div');
  card.className = 'item';

  // data-* (usados por busca, overlay, favoritos etc.)
  card.dataset.id = m.id;
  card.dataset.title = m.title || '';
  card.dataset.authors = (m.authors || []).join(', ');
  card.dataset.year = m.year || '';
  card.dataset.status = m.status || '';
  card.dataset.genres = (m.genres || []).join(', ');
  card.dataset.synopsis = m.synopsis || '';
  card.dataset.cover = m.cover || '';
  card.dataset.firstcap = m.firstChapter || 1;
  card.dataset.bg = m.cover || '';

  // conteúdo visual (capa)
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = m.title || 'Capa';
  img.src = m.cover || 'Assets/Capas/placeholder.jpg';
  img.onerror = () => { img.src = 'Assets/Capas/placeholder.jpg'; };
  card.title = m.title || '';
  card.appendChild(img);

  return card;
}

function renderList(list, track) {
  if (!track) return;
  const frag = document.createDocumentFragment();
  list.forEach(m => frag.appendChild(createCard(m)));
  track.innerHTML = '';
  track.appendChild(frag);
}

const filters = {
  recommended: (m) => !!m.recommended,
  popular: (m) => !!m.popular,
  byGenre: (g) => (m) => (m.genres || []).map(x => x.toLowerCase()).includes(String(g).toLowerCase()),
  all: () => true,
};

async function loadCatalog() {
  const res = await fetch(JSON_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('Não foi possível carregar mangas.json');
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('mangas.json deve ser um array');
  window.MANGAS = data; // útil para outros módulos
  return data;
}

(async function boot() {
  try {
    const list = await loadCatalog();

    // Recomendados (seção existente)
    const recomendados = list.filter(filters.recommended);
    renderList(recomendados, document.getElementById('track-recomendados'));

    // Inicializa prateleiras (setas/drag), se existir
    if (typeof window.initShelves === 'function') window.initShelves();

    // 🔔 Avise outros módulos que os cards foram renderizados
    window.dispatchEvent(new CustomEvent('catalog:rendered'));

  } catch (err) {
    console.error('[catalog]', err);
    const t = document.getElementById('track-recomendados');
    if (t) t.innerHTML = `<div style="color:#bbb;padding:12px;">Falha ao carregar catálogo.</div>`;
  }
})();
