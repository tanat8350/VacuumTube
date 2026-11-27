const configManager = require("../config");
const config = configManager.get();
const functions = require("../util/functions");

module.exports = async () => {
  await functions.waitForCondition(() => !!document.body);
  const INSTANT_SEEK_SEC = 10;
  const INTRO_SEEK_SEC = 80;
  const POPUP_DURATION_MS = 1200;
  const POPUP_ID = "ytlr-custom-seek-popup";

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

  let popupHideTimer = null;

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    const mm = String(minutes).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function getOrCreatePopup() {
    let el = document.getElementById(POPUP_ID);
    if (el) return el;

    el = document.createElement("div");
    el.id = POPUP_ID;
    Object.assign(el.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      padding: "12px 24px",
      borderRadius: "1.5rem",
      background: "rgba(0, 0, 0, 0.5)",
      color: "white",
      fontSize: "48px",
      fontWeight: "500",
      pointerEvents: "none",
      zIndex: "1000000",
      opacity: "0",
    });

    document.body.appendChild(el);
    return el;
  }

  function showSeekPopup(currentTime, duration, delta) {
    const popup = getOrCreatePopup();
    const sign = delta > 0 ? `+${delta}s` : `${delta}s`;
    const currentStr = formatTime(currentTime);
    const maxStr = Number.isFinite(duration) ? formatTime(duration) : "Live";

    popup.textContent = `${sign}  -  ${currentStr} / ${maxStr}`;
    popup.style.opacity = "1";

    clearTimeout(popupHideTimer);
    popupHideTimer = setTimeout(() => {
      popup.style.opacity = "0";
    }, POPUP_DURATION_MS);
  }

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

  document.addEventListener(
    "keydown",
    (e) => {
      const key = e.key;
      if (!key) return;
      if (
        key !== "ArrowLeft" &&
        key !== "ArrowRight" &&
        key !== config.key_intro_seek
      )
        return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      const video = document.querySelector("video");

      const isWatchPage =
        window.location.hash.includes("/watch") ||
        Boolean(document.querySelector("ytlr-watch-default, ytlr-watch"));
      if (!video || video.readyState < 1 || !isWatchPage) return;
      let delta = INTRO_SEEK_SEC;
      if (key !== config.key_intro_seek) {
        delta = key === "ArrowRight" ? INSTANT_SEEK_SEC : -INSTANT_SEEK_SEC;
        if (isControlFocused() || isOverlayOrShelfOpen(video)) return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();

      const hasDuration = Number.isFinite(video.duration);
      const maxTime = hasDuration ? video.duration : Infinity;
      const nextTime = Math.max(
        0,
        Math.min(maxTime, video.currentTime + delta),
      );

      video.currentTime = nextTime;
      showSeekPopup(nextTime, hasDuration ? video.duration : NaN, delta);
    },
    true,
  );
};
