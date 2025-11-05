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

// === Cinema (модальный плеер) ===
(function () {
  const openBtn = document.querySelector("[data-open-cinema]");
  const cinema = document.getElementById("cinema");
  const video = document.getElementById("cinemaVideo");

  if (!openBtn || !cinema || !video) return;

  const open = async () => {
    cinema.hidden = false;
    document.documentElement.style.overflow = "hidden"; // стоп скролла позади
    try {
      // Автовоспроизведение со звуком: в десктоп-браузерах может требовать жеста — он уже есть (клик по кнопке)
      await video.play();
      // На мобильных отдаём fullscreen по желанию
      if (window.innerWidth < 768 && video.requestFullscreen) {
        video.requestFullscreen().catch(() => {});
      }
    } catch (e) {
      /* игнор, пользователь сам нажмёт play */
    }
  };

  const close = () => {
    cinema.hidden = true;
    document.documentElement.style.overflow = "";
    try {
      video.pause();
    } catch (e) {}
    // прячем end-slate
    cinema.querySelector(".cinema__end")?.setAttribute("hidden", "");
  };

  openBtn.addEventListener("click", open);
  cinema.addEventListener("click", (e) => {
    if (e.target.closest("[data-cinema-close]")) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !cinema.hidden) close();
  });

  // Главы (чипы) — seek
  cinema.querySelectorAll("[data-seek]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = Number(btn.getAttribute("data-seek") || "0");
      try {
        video.currentTime = t;
        video.play();
      } catch (e) {}
    });
  });
  // Дубли чипов на секции: открываем и затем прыгаем
  document.querySelectorAll(".film [data-seek]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await open();
      const t = Number(btn.getAttribute("data-seek") || "0");
      try {
        video.currentTime = t;
        video.play();
      } catch (e) {}
    });
  });

  // End slate по окончании
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
