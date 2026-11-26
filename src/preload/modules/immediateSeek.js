const SEEK_SECONDS = 10;
const WATCH_CONTAINER_TAGS = new Set([
  "ytlr-watch-default",
  "ytlr-watch",
  "ytlr-player",
  "ytlr-app",
]);
const INTERACTIVE_SELECTOR = [
  "button",
  "input",
  "a",
  '[role="button"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="slider"]',
  '[role="tab"]',
].join(",");
const OVERLAY_SELECTOR =
  "ytlr-dialog, ytlr-popup-container, .ytlr-watch-default--controls-visible";

function isVisible(el, minSize = 1) {
  if (!el) return false;
  const { width, height } = el.getBoundingClientRect();
  if (width < minSize || height < minSize) return false;

  const { display, visibility, opacity } = window.getComputedStyle(el);
  return (
    display !== "none" &&
    visibility !== "hidden" &&
    Number.parseFloat(opacity) > 0.05
  );
}

function isControlFocused() {
  const active = document.activeElement;
  if (!active || active === document.body || active.tagName === "VIDEO") {
    return false;
  }
  if (active.matches(INTERACTIVE_SELECTOR)) return true;

  const tag = active.tagName.toLowerCase();
  return tag.startsWith("ytlr-") && !WATCH_CONTAINER_TAGS.has(tag);
}

function isOverlayOrShelfOpen(video) {
  const hasVisibleOverlay = [
    ...document.querySelectorAll(OVERLAY_SELECTOR),
  ].some((el) => isVisible(el, 10));
  if (hasVisibleOverlay) return true;

  const { top, height } = video.getBoundingClientRect();
  return top < -20 || height < window.innerHeight * 0.75;
}

window.addEventListener(
  "keydown",
  (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

    const video = document.querySelector("video");
    const isWatchPage =
      window.location.hash.includes("/watch") ||
      Boolean(document.querySelector("ytlr-watch-default, ytlr-watch"));

    if (!video || video.readyState < 1 || !isWatchPage) return;
    if (isControlFocused() || isOverlayOrShelfOpen(video)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const delta = e.key === "ArrowRight" ? SEEK_SECONDS : -SEEK_SECONDS;
    const maxTime = Number.isFinite(video.duration) ? video.duration : Infinity;
    video.currentTime = Math.max(
      0,
      Math.min(maxTime, video.currentTime + delta),
    );
  },
  true,
);
