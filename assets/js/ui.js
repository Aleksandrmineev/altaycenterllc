// theme toggle + persist
(function () {
  const root = document.documentElement;
  const btn = document.getElementById("themeToggle");
  const saved = localStorage.getItem("theme");
  if (saved) root.setAttribute("data-theme", saved);
  if (btn)
    btn.addEventListener("click", () => {
      const next =
        root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
      btn.textContent = next === "dark" ? "🌙" : "☀️";
    });
})();

// popup loader (loads popup.html once)
(async function loadPopup() {
  const root = document.getElementById("popup-root");
  if (!root) return;
  try {
    const res = await fetch("popup.html", { cache: "reload" });
    root.innerHTML = await res.text();
    bindPopup();
  } catch (e) {
    console.warn("Popup load failed", e);
  }
})();

function bindPopup() {
  const openers = document.querySelectorAll("[data-open-popup]");
  openers.forEach((el) =>
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-open-popup");
      const p = document.querySelector(`.popup[data-popup="${id}"]`);
      if (p) p.hidden = false;
    })
  );
  document.addEventListener("click", (e) => {
    const close = e.target.closest("[data-close-popup]");
    if (close) {
      const p = close.closest(".popup");
      if (p) p.hidden = true;
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".popup").forEach((p) => (p.hidden = true));
    }
  });
  // simple submit
  document.getElementById("bookingForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    console.log("Booking form:", Object.fromEntries(fd.entries()));
    alert("Заявка отправлена! Мы свяжемся с вами.");
    e.currentTarget.closest(".popup").hidden = true;
  });
}

// === Cinema (модальный плеер) — iOS-safe ===
(function () {
  const openBtn = document.querySelector("[data-open-cinema]");
  const cinema = document.getElementById("cinema");
  const video = document.getElementById("cinemaVideo");
  if (!openBtn || !cinema || !video) return;

  const open = (e) => {
    e.preventDefault();
    cinema.hidden = false;
    document.documentElement.style.overflow = "hidden";

    // Критично: play() вызываем в ЭТОМ ЖЕ обработчике клика
    const p = video.play();
    if (p && typeof p.then === "function") {
      p.catch(() => {
        // iOS/Safari всё ещё может потребовать явный tap → показываем controls
        video.controls = true;
      });
    }

    // Можно просить fullscreen ЧУТЬ позже — звук уже «разрешён» кликом
    if (window.innerWidth < 768 && video.requestFullscreen) {
      setTimeout(() => video.requestFullscreen().catch(() => {}), 80);
    }
  };

  const close = () => {
    cinema.hidden = true;
    document.documentElement.style.overflow = "";
    try {
      video.pause();
    } catch {}
    cinema.querySelector(".cinema__end")?.setAttribute("hidden", "");
  };

  openBtn.addEventListener("click", open);
  cinema.addEventListener("click", (e) => {
    if (e.target.closest("[data-cinema-close]")) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !cinema.hidden) close();
  });

  // Глава-чипы внутри модалки (jump-to) — тоже в прямом обработчике
  cinema.querySelectorAll("[data-seek]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = +btn.getAttribute("data-seek") || 0;
      try {
        video.currentTime = t;
        video.play();
      } catch {}
    });
  });

  // Чипы на секции: сначала открываем, потом прыгаем
  document.querySelectorAll(".film [data-seek]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      open(e); // откроет и попытается play() в том же клике
      const t = +btn.getAttribute("data-seek") || 0;
      setTimeout(() => {
        try {
          video.currentTime = t;
          video.play();
        } catch {}
      }, 120);
    });
  });

  // End-slate после окончания
  const endSlate = cinema.querySelector(".cinema__end");
  video.addEventListener("ended", () => {
    if (endSlate) endSlate.hidden = false;
  });
})();

// закрыть кинотеатр перед открытием попапа
(function () {
  const cinema = document.getElementById("cinema");
  if (!cinema) return;

  cinema.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open-popup]");
    const closeBtn = e.target.closest("[data-cinema-close]");
    if (!openBtn && !closeBtn) return;

    e.preventDefault();

    // ссылка на сам плеер
    const video = cinema.querySelector("video");
    if (video) video.pause();

    // закрываем кинотеатр
    cinema.hidden = true;
    document.documentElement.style.overflow = "";

    // если нажали на "Забронировать тур" → после закрытия открыть попап
    if (openBtn) {
      const target = openBtn.getAttribute("data-open-popup");
      setTimeout(() => {
        const popupTrigger = document.querySelector(
          `[data-open-popup='${target}']`
        );
        if (popupTrigger) popupTrigger.click();
      }, 150);
    }
  });
})();

// === Route timeline ===
(function () {
  const list = document.querySelector(".route__list");
  const glow = document.querySelector(".route__glow");
  if (!list || !glow) return;

  list.addEventListener("click", (e) => {
    const header = e.target.closest(".route__header");
    if (!header) return;
    const item = header.closest(".route__item");
    const open = !item.classList.contains("active");

    // закрыть все
    list
      .querySelectorAll(".route__item.active")
      .forEach((i) => i.classList.remove("active"));
    if (open) item.classList.add("active");

    // переместить огонёк
    const rect = item.getBoundingClientRect();
    const parentRect = list.getBoundingClientRect();
    const offset = rect.top - parentRect.top + rect.height / 2;
    glow.style.transform = `translate(-50%, ${offset}px)`;
  });

  // стартовая позиция
  const first = list.querySelector(".route__item");
  if (first) {
    const rect = first.getBoundingClientRect();
    const parentRect = list.getBoundingClientRect();
    const offset = rect.top - parentRect.top + rect.height / 2;
    glow.style.transform = `translate(-50%, ${offset}px)`;
  }
})();

// апдейт для маркера
(function () {
  const list = document.querySelector(".route__list");
  const comet = document.querySelector(".route__comet");
  if (!list || !comet) return;

  function moveTo(item) {
    const rItem = item.getBoundingClientRect();
    const rList = list.getBoundingClientRect();
    const y = rItem.top - rList.top + rItem.height / 2;
    // легкий «догоняющий» рывок
    comet.style.transitionTimingFunction = "cubic-bezier(.17,.84,.44,1)";
    comet.style.transform = `translate(-50%, ${y}px)`;
  }

  // старт — к первому
  const first = list.querySelector(".route__item");
  if (first) moveTo(first);

  list.addEventListener("click", (e) => {
    const header = e.target.closest(".route__header");
    if (!header) return;
    const item = header.closest(".route__item");
    const already = item.classList.contains("active");

    list
      .querySelectorAll(".route__item.active")
      .forEach((i) => i.classList.remove("active"));
    if (!already) item.classList.add("active");
    moveTo(item);
  });
})();
