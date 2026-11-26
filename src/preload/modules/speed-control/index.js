const fs = require("fs");
const path = require("path");
const rcMod = require("../../util/resolveCommandModifiers");
const css = require("../../util/css");
const functions = require("../../util/functions");
const configManager = require("../../config");
const shortcuts = require("../../util/shortcuts");

const config = configManager.get();

module.exports = async () => {
  const el = functions.el;

  await functions.waitForCondition(() => !!document.body);
  const cssPath = path.join(__dirname, "style.css");
  const text = fs.readFileSync(cssPath, "utf-8");

  css.inject("speed-control", text);

  let lastCustomPlaybackRate = 2;
  let currentPlacbackRate = 1;
  let speedTimeout;

  function createSpeedIndicator() {
    return el("div", { id: "vt-speed-indicator" }, [
      el("div", { id: "vt-speed-icon", className: "vt-speed-icon" }),
      el("span", { id: "vt-speed-text", className: "vt-speed-text" }),
    ]);
  }

  const speedIndicatorElement = createSpeedIndicator();
  document.body.appendChild(speedIndicatorElement);

  function showSpeedIndicator() {
    const indicator = document.getElementById("vt-speed-indicator");
    const text = document.getElementById("vt-speed-text");
    if (!indicator || !text) return;

    text.textContent = `${currentPlacbackRate}x`;
    indicator.classList.add("visible");

    clearTimeout(speedTimeout);
    speedTimeout = setTimeout(() => {
      indicator.classList.remove("visible");
    }, 1500);
  }

  function applyVideoPlaybackRate(video, rate) {
    video._vtTargetRate = rate;
    // get changed anyway
    // video.defaultPlaybackRate = rate;
    video.playbackRate = rate;

    if (!video._vtHooked) {
      video._vtHooked = true;

      const enforceRate = () => {
        if (video._vtTargetRate && video.playbackRate !== video._vtTargetRate) {
          // video.defaultPlaybackRate = video._vtTargetRate;
          video.playbackRate = video._vtTargetRate;
        }
      };

      // not sure if really needed
      // video.addEventListener("ratechange", enforceRate);
      // video.addEventListener("play", enforceRate);
      video.addEventListener("loadedmetadata", enforceRate); // when new video
    }
  }

  function setPlaybackRate(step) {
    let players = document.querySelectorAll(".html5-video-player");
    for (let player of players) {
      let video = player.querySelector("video");
      if (!video) continue;

      const playerSpeed = player.getPlaybackRate();
      if (playerSpeed < 2) {
        currentPlacbackRate = playerSpeed;
      } else {
        currentPlacbackRate = video._vtTargetRate || video.playbackRate || 1;
      }

      if (step == 0) {
        if (currentPlacbackRate != 1) {
          lastCustomPlaybackRate = currentPlacbackRate;
          currentPlacbackRate = 1;
        } else {
          currentPlacbackRate = lastCustomPlaybackRate || 2;
        }
      } else {
        currentPlacbackRate = Math.max(
          0.25,
          Math.min(currentPlacbackRate + step, 4),
        );
        if (currentPlacbackRate != 1) {
          lastCustomPlaybackRate = currentPlacbackRate;
        }
      }

      if (currentPlacbackRate <= 2) {
        // player.setPlaybackRate() capped at 2.0
        player.setPlaybackRate(currentPlacbackRate);
      }

      applyVideoPlaybackRate(video, currentPlacbackRate);
    }
  }
  function isWatching() {
    let isShort = !!document
      .querySelector("ytlr-shorts-page")
      ?.classList?.contains("zylon-focus");
    if (isShort) {
      //very dumb, don't like it, but there doesn't seem to be a better way
      return true;
    } else {
      let baseUri = window.yt?.player?.utils?.videoElement_?.baseURI;
      if (!baseUri || !baseUri.includes("/watch?v=")) return false;

      let id = baseUri.split("/watch?v=")[1]?.slice(0, 11);
      if (!id) return false;

      return true;
    }
  }

  //speed controls
  document.addEventListener(
    "keydown",
    (e) => {
      const key = e.key || e.keyCode;
      if (!key || !isWatching() || !shortcuts.isShortcutKey(e)) return;

      const speedStep = 0.25;

      if (key === config.key_speed_toggle) {
        setPlaybackRate(0); // toggle
      } else if (key === config.key_speed_down) {
        setPlaybackRate(-speedStep);
      } else if (key === config.key_speed_up) {
        setPlaybackRate(speedStep);
      } else {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      showSpeedIndicator();
    },
    true,
  );
};
