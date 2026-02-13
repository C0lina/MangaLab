/* ===== Configuração da API ===== */
const isLocal =
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.hostname === "";

const API_URL = isLocal
  ? "http://localhost:5000/api"
  : "https://animplay-api.onrender.com/api";

/* ===== Token helpers ===== */
const TOKEN_KEY = "mangalab_token";

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
}

function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}

function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

/* ===== Fetch helper centralizado ===== */
async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...(options.headers || {})
      },
      ...options
    });

    const contentType = res.headers.get("content-type") || "";
    let data = {};

    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { raw: text };
    }

    if (!res.ok) {
      throw new Error(data.msg || data.error || "Erro na requisição");
    }

    return data;
  } catch (err) {
    if (err.name === "TypeError") {
      throw new Error("Backend offline ou inacessível");
    }
    throw err;
  }
}

/* Expondo para outros scripts (se necessário) */
window.API_URL = API_URL;
window.apiFetch = apiFetch;
window.getToken = getToken;
window.setToken = setToken;
window.clearToken = clearToken;
