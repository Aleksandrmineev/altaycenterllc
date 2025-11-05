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
