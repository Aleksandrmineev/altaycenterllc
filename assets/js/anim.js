// reveal on scroll
(function () {
  const io = new IntersectionObserver(
    (entries) => {
      for (const it of entries) {
        if (it.isIntersecting) {
          it.target.classList.add("is-visible");
          io.unobserve(it.target);
        }
      }
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();
