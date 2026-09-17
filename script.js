const LOGIN_URL = "https://ead.gambeti.com.br/login/index.php";

const menuButton = document.querySelector(".menu-toggle");
const menu = document.querySelector(".main-nav");
menuButton.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  document.body.classList.toggle("menu-open", open);
});
menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  menu.classList.remove("open");
  document.body.classList.remove("menu-open");
  menuButton.setAttribute("aria-expanded", "false");
}));

const categoryKey = (category) => {
  if (category.startsWith("NR 12")) return "nr12";
  if (category.startsWith("NR 10")) return "nr10";
  if (category.startsWith("NR 33")) return "nr33";
  return "seguranca";
};

const courseGrid = document.querySelector("#course-grid");
courseGrid.innerHTML = window.GAMBETI_COURSES.map(([name, category, image]) => `
  <a class="course-card" data-category="${categoryKey(category)}" data-search="${name.toLocaleLowerCase("pt-BR")}" href="${LOGIN_URL}" target="_blank" rel="noopener noreferrer external" aria-label="${name} — entrar para acessar">
    <div class="course-photo">
      <img src="${image}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">
      <span class="course-photo-badge">${categoryKey(category) === "seguranca" ? "SEGURANÇA" : category.split(" - ")[0]}</span>
    </div>
    <div class="course-body">
      <div class="course-meta"><span>${category}</span><span>Curso EaD</span></div>
      <h3>${name}</h3>
      <span class="course-cta">Entrar para acessar</span>
    </div>
  </a>
`).join("");

const search = document.querySelector("#course-search");
const filters = [...document.querySelectorAll(".filter")];
const cards = [...document.querySelectorAll(".course-card")];
const empty = document.querySelector("#empty-state");
let activeFilter = "todos";

function updateCourses() {
  const term = search.value.trim().toLocaleLowerCase("pt-BR");
  let visible = 0;
  cards.forEach((card) => {
    const categoryMatch = activeFilter === "todos" || card.dataset.category === activeFilter;
    const textMatch = !term || card.dataset.search.includes(term) || card.innerText.toLocaleLowerCase("pt-BR").includes(term);
    card.hidden = !(categoryMatch && textMatch);
    if (!card.hidden) visible += 1;
  });
  empty.hidden = visible !== 0;
}

search.addEventListener("input", updateCourses);
filters.forEach((filter) => filter.addEventListener("click", () => {
  activeFilter = filter.dataset.filter;
  filters.forEach((item) => {
    const active = item === filter;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  updateCourses();
}));

document.querySelector("#year").textContent = new Date().getFullYear();
