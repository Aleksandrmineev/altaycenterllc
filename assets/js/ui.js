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
  document
    .getElementById("bookingForm")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const btn = form.querySelector('[type="submit"]');
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      const prev = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Отправка...";

      try {
        const res = await fetch("sendtg.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name?.trim(),
            contact: data.contact?.trim(),
            dates: data.dates?.trim(),
            message: data.message?.trim(),
            meta: { url: location.href },
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) {
          throw new Error(JSON.stringify(json));
        }
        alert("Заявка отправлена! Спасибо.");
        form.reset();
        form.closest(".popup").hidden = true;
      } catch (err) {
        alert("Ошибка: " + err.message);
        console.warn(err);
      } finally {
        btn.disabled = false;
        btn.textContent = prev;
      }
    });
}

// === Cinema (модальный плеер) — iOS-safe ===
(function () {
  const cinema = document.getElementById("cinema");
  const video = document.getElementById("cinemaVideo");
  if (!cinema || !video) return;

  const openBtns = document.querySelectorAll("[data-open-cinema]");
  const endSlate = cinema.querySelector(".cinema__end");

  // Полезные флаги
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const mp4Src = "assets/video/altai-film.mp4"; // проверь путь/кодеки H.264 + AAC

  // Гарантируем корректный источник для iOS
  function ensureMP4Source() {
    // Если уже прямой src на mp4 — ничего не делаем
    if (video.src && video.src.endsWith(".mp4")) return;
    // Ставим явный src на mp4 (обходит капризы <source> в Safari)
    video.src = mp4Src;
    video.load();
  }

  async function tryPlayFromStart() {
    try {
      if (video.ended || video.currentTime > 0) video.currentTime = 0;
      const p = video.play();
      if (p && typeof p.then === "function") await p;
      return true;
    } catch (err) {
      // В крайнем случае включим controls, чтобы пользователь ткнул ещё раз
      video.controls = true;
      return false;
    }
  }

  async function open(e) {
    e?.preventDefault?.();

    // Сняли hidden синхронно (в рамках клика)
    cinema.hidden = false;
    document.documentElement.style.overflow = "hidden";
    endSlate?.setAttribute("hidden", "");

    // На iOS — форсим mp4 напрямую
    if (isIOS) ensureMP4Source();

    // Пытаемся воспроизвести сразу (в том же клике)
    const ok = await tryPlayFromStart();

    // Только после успешного play — можно просить fullscreen на мобилке
    if (ok && window.innerWidth < 768) {
      const el = video;
      const reqFs =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.msRequestFullscreen;
      if (reqFs) {
        try {
          await reqFs.call(el);
        } catch (_) {}
      }
    }
  }

  function close() {
    cinema.hidden = true;
    document.documentElement.style.overflow = "";
    try {
      video.pause();
    } catch {}
    // Желательно вернуть постер/начало, чтобы при следующем открытии старт был с 0
    // video.currentTime = 0; // по желанию
    endSlate?.setAttribute("hidden", "");
  }

  // Открытие со всех кнопок
  openBtns.forEach((btn) => btn.addEventListener("click", open));

  // Закрытие по подложке/крестику
  cinema.addEventListener("click", (e) => {
    if (e.target.closest("[data-cinema-close]")) close();
  });

  // Esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !cinema.hidden) close();
  });

  // Чипы внутри модалки — прыжок без таймаутов
  cinema.querySelectorAll("[data-seek]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const t = +btn.getAttribute("data-seek") || 0;
      try {
        // Если метаданные ещё не загружены — дождёмся
        if (video.readyState < 1) {
          await new Promise((res) => {
            const onMeta = () => {
              video.removeEventListener("loadedmetadata", onMeta);
              res();
            };
            video.addEventListener("loadedmetadata", onMeta, { once: true });
            video.load();
          });
        }
        video.currentTime = t;
        await video.play().catch(() => {});
      } catch {}
    });
  });

  // Чипы вне модалки (в секции) — открываем и после метаданных прыгаем
  document.querySelectorAll(".film [data-seek]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      await open(e); // модалка+play в том же клике
      const t = +btn.getAttribute("data-seek") || 0;
      // Ждём метаданные (без setTimeout)
      if (video.readyState < 1) {
        await new Promise((res) => {
          video.addEventListener("loadedmetadata", () => res(), { once: true });
          video.load();
        });
      }
      video.currentTime = t;
      await video.play().catch(() => {});
    });
  });

  // Показ end-slate после окончания
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

// === ScrollToTop ===
(() => {
  const btn = document.getElementById("scrollTop");
  if (!btn) return;

  const THRESHOLD = 400; // px
  let ticking = false;

  const toggle = () => {
    const show = window.scrollY > THRESHOLD;
    btn.classList.toggle("is-visible", show);
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(toggle);
      ticking = true;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("load", toggle);

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
