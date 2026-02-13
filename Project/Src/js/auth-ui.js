// ===== Ajuste aqui conforme seu backend =====
// Se seus endpoints forem diferentes, altere apenas essas 3 linhas.
const ENDPOINT_LOGIN = "/auth/login";
const ENDPOINT_REGISTER = "/auth/register";
const ENDPOINT_ME = "/auth/me"; // ou "/users/me", etc.

// Estado simples
let loggedIn = false;
let currentUser = null;

// Elementos
const accountOverlay = document.getElementById("accountOverlay");
const registerOverlay = document.getElementById("registerOverlay");
const profileOverlay = document.getElementById("profileOverlay");

const profileNameEl = document.getElementById("profileName");
const profileEmailEl = document.getElementById("profileEmail");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const logoutBtn = document.getElementById("logoutBtn");

const contaLink = document.querySelector('a[data-action="conta"]');

// Overlays helpers
function abrirConta() { accountOverlay.classList.add("active"); accountOverlay.setAttribute("aria-hidden", "false"); }
function fecharConta() { accountOverlay.classList.remove("active"); accountOverlay.setAttribute("aria-hidden", "true"); }
function abrirCadastro() { registerOverlay.classList.add("active"); registerOverlay.setAttribute("aria-hidden", "false"); }
function fecharCadastro() { registerOverlay.classList.remove("active"); registerOverlay.setAttribute("aria-hidden", "true"); }
function abrirPerfil() { profileOverlay.classList.add("active"); profileOverlay.setAttribute("aria-hidden", "false"); }
function fecharPerfil() { profileOverlay.classList.remove("active"); profileOverlay.setAttribute("aria-hidden", "true"); }

// UI: preencher perfil
function renderProfile(user) {
  const name = user?.name || user?.nome || user?.username || "Usuário";
  const email = user?.email || "—";
  profileNameEl.textContent = name;
  profileEmailEl.textContent = email;
}

// Backend: login
async function doLogin(email, password) {
  const data = await apiFetch(ENDPOINT_LOGIN, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  // Suporte a respostas comuns:
  // { token, user }  |  { access_token }  |  { jwt }
  const token = data.token || data.access_token || data.jwt || data?.data?.token;
  const user = data.user || data.usuario || data?.data?.user;

  if (!token) throw new Error("Resposta do login sem token. Ajuste o parse do retorno.");

  setToken(token);

  // se backend não mandar user no login, buscamos no /me
  if (user) {
    currentUser = user;
  } else {
    currentUser = await fetchMe();
  }

  loggedIn = true;
  renderProfile(currentUser);
  return currentUser;
}

// Backend: register
async function doRegister(name, email, password) {
  const data = await apiFetch(ENDPOINT_REGISTER, {
    method: "POST",
    body: JSON.stringify({ name, email, password })
  });

  // Alguns backends já retornam token no register
  const token = data.token || data.access_token || data.jwt || data?.data?.token;
  if (token) setToken(token);

  return data;
}

// Backend: /me
async function fetchMe() {
  const me = await apiFetch(ENDPOINT_ME, { method: "GET" });
  // pode vir { user: {...} } ou direto {...}
  return me.user || me.usuario || me;
}

// Sessão: tentar restaurar ao abrir
async function restoreSession() {
  if (!getToken()) {
    loggedIn = false;
    currentUser = null;
    return;
  }
  try {
    currentUser = await fetchMe();
    loggedIn = true;
    renderProfile(currentUser);
  } catch (e) {
    // token inválido/expirado
    clearToken();
    loggedIn = false;
    currentUser = null;
  }
}

// Eventos: menu Conta
contaLink.addEventListener("click", async (e) => {
  e.preventDefault();
  if (loggedIn) abrirPerfil();
  else abrirConta();
});

// Eventos: trocar login/cadastro (seu HTML já tem data-switch)
document.querySelector('[data-switch="toRegister"]').addEventListener("click", (e) => {
  e.preventDefault();
  fecharConta();
  abrirCadastro();
});
document.querySelector('[data-switch="toLogin"]').addEventListener("click", (e) => {
  e.preventDefault();
  fecharCadastro();
  abrirConta();
});

// Submit: login real
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const btn = document.getElementById("loginBtn");
  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Entrando...";

  try {
    await doLogin(email, password);
    fecharConta();
    abrirPerfil();
  } catch (err) {
    alert(err.message || "Falha no login");
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
});

// Submit: cadastro real + (opcional) login automático
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const pass = document.getElementById("regPassword").value;
  const conf = document.getElementById("regConfirm").value;

  if (pass !== conf) return alert("As senhas não coincidem!");

  const btn = registerForm.querySelector('button[type="submit"]');
  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Cadastrando...";

  try {
    await doRegister(name, email, pass);

    // Se register não retorna token, faz login automático:
    if (!getToken()) {
      await doLogin(email, pass);
    } else {
      // se retornou token, buscamos /me
      currentUser = await fetchMe();
      loggedIn = true;
      renderProfile(currentUser);
    }

    fecharCadastro();
    abrirPerfil();
  } catch (err) {
    alert(err.message || "Falha no cadastro");
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
});

// Logout real
logoutBtn.addEventListener("click", () => {
  clearToken();
  loggedIn = false;
  currentUser = null;
  fecharPerfil();
  alert("Você saiu da sua conta!");
});

// Inicialização
document.addEventListener("DOMContentLoaded", restoreSession);
