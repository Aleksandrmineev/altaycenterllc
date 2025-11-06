(function () {
  const html = `
    <div class="burger" id="siteBurger" role="dialog" aria-modal="true" aria-labelledby="burgerTitle" hidden>
      <div class="burger__overlay" data-close></div>
      <aside class="burger__panel">
        <header class="burger__head">
          <h3 id="burgerTitle">Меню</h3>
          <button class="burger__close" id="burgerClose" aria-label="Закрыть меню">×</button>
        </header>
  
        <div class="burger__body">
          <a class="btn btn--primary burger__cta" data-open-popup="booking">Забронировать тур</a>
  
          <nav class="burger__nav">
            <h4 class="burger__group">Маршрут</h4>
            <ul>
              <li><a href="index.html#why" data-nav>О туре</a></li>
              <li><a href="index.html#film" data-nav>Фильм</a></li>
              <li><a href="index.html#route" data-nav>Программа по дням</a></li>
              <li><a href="index.html#map" data-nav>Карта маршрута</a></li>
              <li><a href="index.html#housingTitle3" data-nav>Проживание и питание</a></li>
              <li><a href="index.html#pricingTitle" data-nav>Стоимость</a></li>
              <li><a href="index.html#reviews" data-nav>Отзывы</a></li>
            </ul>
  
            <h4 class="burger__group">Документы</h4>
            <ul>
              <li><a href="financial.html" data-nav>Финансовые гарантии и документы</a></li>
              <li><a href="contacts/index.html" data-nav>Контакты</a></li>
            </ul>
          </nav>
  
          <div class="burger__utils">
            <button class="btn btn--ghost" id="burgerTheme">Тема: 🌙/☀️</button>
            <div class="burger__messengers">
  <a class="messenger wa" href="https://wa.me/79619797259" target="_blank" rel="noopener" aria-label="WhatsApp">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-brand-whatsapp"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" /><path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" /></svg>
  </a>

  <a class="messenger tg" href="https://t.me/LLCAltayCenter" target="_blank" rel="noopener" aria-label="Telegram">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-brand-telegram"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4" /></svg>
  </a>
</div>
          </div>
        </div>
      </aside>
    </div>
    `;
  document.body.insertAdjacentHTML("beforeend", html);

  const root = document.documentElement;
  const wrap = document.getElementById("siteBurger");
  const panel = wrap.querySelector(".burger__panel");
  const btnOpen = document.getElementById("burgerOpen");
  const btnClose = document.getElementById("burgerClose");
  const overlay = wrap.querySelector("[data-close]");
  const navLinks = wrap.querySelectorAll("[data-nav]");
  const btnTheme = document.getElementById("burgerTheme");

  let scrollY = 0;

  function openMenu() {
    if (!wrap.hasAttribute("hidden")) return;
    scrollY = window.scrollY || 0;
    wrap.removeAttribute("hidden");
    root.setAttribute("data-menu-open", "true");

    document.documentElement.classList.add("scroll-lock");
    document.body.classList.add("scroll-lock");

    btnOpen?.setAttribute("aria-expanded", "true");
    panel.focus();
  }

  function closeMenu() {
    if (wrap.hasAttribute("hidden")) return;
    root.removeAttribute("data-menu-open");
    wrap.setAttribute("hidden", "");

    document.documentElement.classList.remove("scroll-lock");
    document.body.classList.remove("scroll-lock");

    window.scrollTo(0, scrollY);
    btnOpen?.setAttribute("aria-expanded", "false");
    btnOpen?.focus();
  }

  btnOpen?.addEventListener("click", openMenu);
  btnClose?.addEventListener("click", closeMenu);
  overlay?.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
  navLinks.forEach((a) => a.addEventListener("click", closeMenu));

  // Тема (переключаем data-theme на <html>)
  btnTheme?.addEventListener("click", () => {
    const cur = root.getAttribute("data-theme") || "dark";
    const next = cur === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  });

  // Инициализация темы из localStorage (если у тебя уже где-то есть — можно удалить)
  (function initTheme() {
    try {
      const saved = localStorage.getItem("theme");
      if (saved) root.setAttribute("data-theme", saved);
    } catch {}
  })();
})();
