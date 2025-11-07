// video fallback if cannot autoplay
(function () {
  const v = document.querySelector(".hero__video");
  if (!v) return;
  const fallback = () => (v.style.display = "none");
  v.addEventListener("error", fallback, { once: true });
  setTimeout(() => {
    if (v.paused) {
      v.play().catch(fallback);
    }
  }, 600);
})();

(function () {
  // ---- 1) ДАННЫЕ МАРШРУТА (менять тут) ----
  const routePoints = [
    { name: "Бийск", coords: [85.179748, 52.535303] },
    { name: "Манжерок", coords: [85.807, 51.833] },
    { name: "Усть-Кан", coords: [84.76, 50.93] },
    { name: "Усть-Кокса", coords: [85.61, 50.27] },
    { name: "Теректа", coords: [85.88, 50.3] }, // посёлок Теректа, р-н Усть-Коксы
    { name: "Башталинское плато", coords: [86.4, 49.98] },
  ];

  const GOLD = "#d7b56a";

  // ---- 2) ЛЕНИВАЯ ИНИЦИАЛИЗАЦИЯ ----
  const mountMap = () => {
    if (mountMap._inited) return;
    mountMap._inited = true;

    // 3) MAPLIBRE (без ключа) — OSM raster
    const map = new maplibregl.Map({
      container: "mapRoute",
      style: {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm-tiles", type: "raster", source: "osm-tiles" }],
      },
      center: [86.0, 51.0],
      zoom: 5.1,
      pitch: 0,
      antialias: true,
    });

    // 4) ФИРМЕННЫЙ ОВЕРЛЕЙ-ГРАДИЕНТ (мягкое затемнение краёв)
    map.on("load", () => {
      map.addSource("gradient-overlay", {
        type: "canvas",
        canvas: createOverlayCanvas(),
        coordinates: canvasQuad(),
      });
      map.addLayer({
        id: "overlay",
        type: "raster",
        source: "gradient-overlay",
        paint: { "raster-opacity": 0.35 },
      });

      // GeoJSON линия + точки
      const line = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: routePoints.map((p) => p.coords),
            },
          },
        ],
      };
      const points = {
        type: "FeatureCollection",
        features: routePoints.map((p) => ({
          type: "Feature",
          properties: { name: p.name },
          geometry: { type: "Point", coordinates: p.coords },
        })),
      };

      map.addSource("route-line", { type: "geojson", data: line });
      map.addSource("route-points", { type: "geojson", data: points });

      // свечение под линией
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route-line",
        paint: {
          "line-color": GOLD,
          "line-width": 10,
          "line-opacity": 0.2,
          "line-blur": 6,
        },
      });
      // основная линия
      map.addLayer({
        id: "route",
        type: "line",
        source: "route-line",
        paint: {
          "line-color": GOLD,
          "line-width": 3.5,
        },
      });

      // точки
      map.addLayer({
        id: "route-points",
        type: "circle",
        source: "route-points",
        paint: {
          "circle-radius": 5,
          "circle-color": "#fff",
          "circle-stroke-width": 2,
          "circle-stroke-color": GOLD,
        },
      });

      // подписи при клике
      map.on("click", "route-points", (e) => {
        const f = e.features[0];
        new maplibregl.Popup({ closeButton: false, offset: 10 })
          .setLngLat(f.geometry.coordinates)
          .setHTML(`<b>${f.properties.name}</b>`)
          .addTo(map);
      });
      map.on(
        "mouseenter",
        "route-points",
        () => (map.getCanvas().style.cursor = "pointer")
      );
      map.on(
        "mouseleave",
        "route-points",
        () => (map.getCanvas().style.cursor = "")
      );

      // подгон рамки по маршруту
      const bounds = new maplibregl.LngLatBounds();
      routePoints.forEach((p) => bounds.extend(p.coords));
      map.fitBounds(bounds, { padding: 60, duration: 0 });

      // Панель мест + кнопки
      buildPoiPanel(map, routePoints);

      // анимируем «проезд» по маршруту
      setupRunner(map, routePoints);
      // посчитаем длину
      document.getElementById("distKm").textContent =
        calcLengthKm(routePoints).toFixed(0);
    });

    // helpers — градиентный канвас
    function createOverlayCanvas() {
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 1024;
      const g = c.getContext("2d");
      const grd = g.createRadialGradient(512, 300, 150, 512, 512, 700);
      grd.addColorStop(0, "rgba(0,0,0,0)");
      grd.addColorStop(1, "rgba(0,0,0,.65)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 1024, 1024);
      return c;
    }
    function canvasQuad() {
      // покрываем текущий вид — квад на всю область карты
      return [
        [-180, 85],
        [180, 85],
        [180, -85],
        [-180, -85],
      ];
    }

    // reset
    document.getElementById("resetView").addEventListener("click", () => {
      const b = new maplibregl.LngLatBounds();
      routePoints.forEach((p) => b.extend(p.coords));
      map.fitBounds(b, { padding: 60 });
    });
  };

  // ленивый запуск по пересечению секции
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          mountMap();
          io.disconnect();
        }
      });
    },
    { threshold: 0.2 }
  );
  io.observe(document.getElementById("map"));

  // ---- UTILS ----
  function buildPoiPanel(map, pts) {
    const box = document.getElementById("poiList");
    box.innerHTML = "";
    pts.forEach((p) => {
      const b = document.createElement("button");
      b.className = "poi-btn";
      b.textContent = p.name;
      b.addEventListener("click", () =>
        map.flyTo({ center: p.coords, zoom: 8, speed: 0.8, curve: 1.4 })
      );
      box.appendChild(b);
    });
  }

  function calcLengthKm(pts) {
    let d = 0;
    for (let i = 1; i < pts.length; i++)
      d += haversine(pts[i - 1].coords, pts[i].coords);
    return d;
  }
  function haversine(a, b) {
    const R = 6371,
      toRad = (x) => (x * Math.PI) / 180;
    const [lon1, lat1] = a,
      [lon2, lat2] = b;
    const dLat = toRad(lat2 - lat1),
      dLon = toRad(lon2 - lon1);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function setupRunner(map, pts) {
    // маркер-комета
    const el = document.createElement("div");
    el.style.width = "14px";
    el.style.height = "14px";
    el.style.borderRadius = "50%";
    el.style.background =
      "radial-gradient(circle at 30% 30%, #fff 0%, #ffe7b0 40%, #d7b56a 60%, rgba(215,181,106,0) 70%)";
    el.style.boxShadow = "0 0 14px 6px rgba(215,181,106,.5)";
    el.style.transform = "translate(-50%,-50%)";
    const tail = document.createElement("div");
    Object.assign(tail.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      width: "8px",
      height: "40px",
      transform: "translate(-50%,-20%) rotate(90deg)",
      borderRadius: "8px",
      background:
        "linear-gradient(180deg, rgba(215,181,106,.55), rgba(215,181,106,0))",
      filter: "blur(3px)",
    });
    el.appendChild(tail);
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(pts[0].coords)
      .addTo(map);

    // кнопка запуска анимации
    document.getElementById("playRoute").addEventListener("click", () => {
      animateAlong(pts, 7000); // 7 секунд
    });

    function animateAlong(points, duration) {
      const segs = [];
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1].coords,
          b = points[i].coords;
        const len = haversine(a, b);
        segs.push({ a, b, len });
      }
      const total = segs.reduce((s, x) => s + x.len, 0);
      const t0 = performance.now();

      function frame(t) {
        const p = Math.min(1, (t - t0) / duration);
        let dist = total * p; // пройденные км (в модели)
        for (const s of segs) {
          if (dist > s.len) {
            dist -= s.len;
            continue;
          }
          // интерполяция
          const k = s.len ? dist / s.len : 0;
          const lon = s.a[0] + (s.b[0] - s.a[0]) * k;
          const lat = s.a[1] + (s.b[1] - s.a[1]) * k;
          marker.setLngLat([lon, lat]);
          break;
        }
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
  }
})();

const housingLB = GLightbox({
  selector: ".housing-lightbox",
  touchNavigation: true,
  loop: true,
  zoomable: true,
  moreText: "Подробнее",
});

document.addEventListener("DOMContentLoaded", function () {
  const reviewsSplide = document.querySelector(".reviews-splide");
  if (reviewsSplide && window.Splide) {
    new Splide(reviewsSplide, {
      type: "loop",
      perPage: 3,
      gap: "16px",
      arrows: false /* 🚫 стрелки выключены */,
      pagination: true,
      speed: 700,
      easing: "ease",
      breakpoints: {
        1024: { perPage: 2, gap: "14px" },
        640: { perPage: 1, gap: "12px" },
      },
    }).mount();
  }
});

const once = (el, cb) =>
  new IntersectionObserver(
    (e, o) => {
      if (e[0].isIntersecting) {
        o.disconnect();
        cb();
      }
    },
    { rootMargin: "200px" }
  ).observe(el);

const reviews = document.querySelector("#reviews");
if (reviews) {
  once(reviews, async () => {
    await Promise.all([
      import(
        "https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js"
      ),
      import("https://cdn.jsdelivr.net/npm/glightbox/dist/js/glightbox.min.js"),
    ]);
    // init Splide + GLightbox здесь
    document.dispatchEvent(new Event("reviews:ready"));
  });
}
