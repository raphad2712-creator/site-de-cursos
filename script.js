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
const search = document.querySelector("#course-search");
const filters = [...document.querySelectorAll(".filter")];
const empty = document.querySelector("#empty-state");
let cards = [];
let activeFilter = "todos";

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[character]));

function renderCourses(courses) {
  courseGrid.innerHTML = courses.map((course) => {
    const [name, category, image] = Array.isArray(course) ? course : [course.name, course.category, course.image];
    const safeName = escapeHtml(name);
    const safeCategory = escapeHtml(category);
    const safeImage = escapeHtml(image);
    const key = categoryKey(category);
    return `
  <a class="course-card" data-category="${key}" data-search="${escapeHtml(name.toLocaleLowerCase("pt-BR"))}" href="${LOGIN_URL}" target="_blank" rel="noopener noreferrer external" aria-label="${safeName} — entrar para acessar">
    <div class="course-photo">
      <img src="${safeImage}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">
      <span class="course-photo-badge">${key === "seguranca" ? "SEGURANÇA" : escapeHtml(category.split(" - ")[0])}</span>
    </div>
    <div class="course-body">
      <div class="course-meta"><span>${safeCategory}</span><span>Curso EaD</span></div>
      <h3>${safeName}</h3>
      <span class="course-cta">Entrar para acessar</span>
    </div>
  </a>
  `;
  }).join("");
  cards = [...document.querySelectorAll(".course-card")];
  const allFilter = document.querySelector('[data-filter="todos"]');
  if (allFilter) allFilter.textContent = `Todos (${courses.length})`;
  updateCourses();
}

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

async function loadCourses() {
  let savedCourses = null;
  try {
    savedCourses = JSON.parse(localStorage.getItem("gambeti-courses") || "null");
  } catch {
    savedCourses = null;
  }
  const fallback = Array.isArray(savedCourses) ? savedCourses : (window.GAMBETI_COURSES || []);
  const apiBase = String(window.GAMBETI_API_BASE || "").replace(/\/$/, "");
  const apiUrl = apiBase ? `${apiBase}/api/courses.php` : "api/courses.php";
  try {
    const response = await fetch(apiUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Catálogo indisponível");
    const data = await response.json();
    renderCourses(Array.isArray(data.courses) && data.courses.length ? data.courses : fallback);
  } catch {
    renderCourses(fallback);
  }
}

void loadCourses();

document.querySelector("#year").textContent = new Date().getFullYear();
