// js/nav-views.js
import { renderMyList } from "./mylist.js";

function showSection(idToShow) {
  const homeSections = [
    "sec-recomendados",
    // depois você adiciona mais: "sec-toprated", "sec-continue", "sec-genres" etc
  ];

  const myList = document.getElementById("sec-mylist");

  // mostra home
  if (idToShow === "home") {
    homeSections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = false;
    });
    if (myList) myList.hidden = true;
    return;
  }

  // mostra minha lista
  if (idToShow === "mylist") {
    homeSections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
    if (myList) myList.hidden = false;
    renderMyList();
    return;
  }
}

export function initNavViews() {
  document.querySelectorAll(".nav a[data-action]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const action = a.getAttribute("data-action");

      if (action === "mylist") showSection("mylist");
      else if (action === "conta") {
        // você já tem isso no auth-ui.js provavelmente
      }
    });
  });

  // Se clicar no "Início", volta pra home
  const homeLink = document.querySelector('.nav a[href="#"]');
  homeLink?.addEventListener("click", (e) => {
    e.preventDefault();
    showSection("home");
  });
}