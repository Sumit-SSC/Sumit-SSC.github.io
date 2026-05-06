// Lightweight analytics helper for all pages in this project.
// Usage in HTML:
//   <script src="./assets/js/analytics.js"></script>
//   <script>
//     initAnalyticsTracking({
//       site: 'analytics-lab',
//       baseEvent: 'playground',
//       endpoint: 'https://events.colab.indevs.in/api/events'
//     });
//   </script>

(function () {
  var DEFAULT_ENDPOINT = "https://events.colab.indevs.in/api/events";
  var DEFAULT_SECRET = null; // unused, kept for API compatibility
  var SESSION_KEY = "analytics_lab_session_id";
  var DEBUG_KEY = "analytics_debug";

  function isDebug() {
    try {
      if (typeof window !== "undefined" && window.location && window.location.search) {
        if (window.location.search.indexOf("analytics_debug=1") !== -1) return true;
      }
      if (typeof localStorage !== "undefined" && localStorage.getItem(DEBUG_KEY) === "1") return true;
    } catch (e) {}
    return false;
  }

  function generateSessionId() {
    if (window.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "s-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function getSessionId() {
    var existing = null;
    try {
      existing = localStorage.getItem(SESSION_KEY);
    } catch (e) {}
    if (existing) return existing;
    var id = generateSessionId();
    try {
      localStorage.setItem(SESSION_KEY, id);
    } catch (e) {}
    return id;
  }

  function getFingerprintTraits() {
    var nav = (typeof navigator !== "undefined" && navigator) || {};
    var scr = (typeof window !== "undefined" && window.screen) || {};
    var intlOpts = {};
    try {
      if (window.Intl && Intl.DateTimeFormat) {
        intlOpts = Intl.DateTimeFormat().resolvedOptions() || {};
      }
    } catch (e) {}

    var pointerCoarse = false;
    try {
      if (window.matchMedia) {
        pointerCoarse = window.matchMedia("(pointer: coarse)").matches;
      }
    } catch (e) {}

    return {
      hardwareConcurrency: nav.hardwareConcurrency || null,
      deviceMemory: nav.deviceMemory || null, // GB on some browsers
      colorDepth: scr.colorDepth || null,
      maxTouchPoints:
        typeof nav.maxTouchPoints === "number" ? nav.maxTouchPoints : null,
      timeZone: intlOpts.timeZone || null,
      languages: nav.languages || (nav.language ? [nav.language] : null),
      pointerCoarse: pointerCoarse,
      platform: nav.platform || null,
      vendor: nav.vendor || null,
      userAgent: nav.userAgent || null
    };
  }

  function buildBasePayload(config, eventName) {
    return {
      site: config.site || "analytics-lab",
      event: eventName,
      sessionId: config.sessionId,
      ts: new Date().toISOString(),
      path: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
      userAgent: navigator.userAgent || null,
      language: navigator.language || null,
      platform: navigator.platform || null,
      device: {
        width: window.innerWidth || null,
        height: window.innerHeight || null,
        screenWidth: window.screen && window.screen.width,
        screenHeight: window.screen && window.screen.height,
        pixelRatio: window.devicePixelRatio || 1,
        touch: "ontouchstart" in window || navigator.maxTouchPoints > 0
      },
      fpTraits: getFingerprintTraits()
    };
  }

  function sendAnalyticsEvent(config, eventName, extra) {
    var debug = isDebug();
    var endpointsToTry = [];
    if (Array.isArray(config.endpoints) && config.endpoints.length) {
      endpointsToTry = config.endpoints.filter(Boolean);
    } else if (config.endpoint) {
      endpointsToTry = [config.endpoint];
    }

    if (!endpointsToTry.length) {
      if (debug) console.warn("[Analytics] No endpoint configured, event not sent:", eventName);
      return;
    }
    if (debug) console.log("[Analytics] Sending:", eventName, "→", config.endpoint);

    var payload = buildBasePayload(config, eventName);
    if (extra && typeof extra === "object") {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) {
          payload[k] = extra[k];
        }
      }
    }

    var body = JSON.stringify(payload);

    // Extract base URL for fallback paths (only best-effort, for the first endpoint).
    var baseUrl = endpointsToTry[0];
    try {
      var urlObj = new URL(endpointsToTry[0]);
      baseUrl = urlObj.origin;
    } catch (e) {}

    // Fallback paths to try (same host).
    var fallbackPaths = ["/api/events", "/api/track", "/events", "/track", "/ping", "/log"];
    if (baseUrl !== endpointsToTry[0]) {
      for (var i = 0; i < fallbackPaths.length; i++) {
        endpointsToTry.push(baseUrl + fallbackPaths[i]);
      }
    }

    function tryBeaconFallback() {
      if (!navigator.sendBeacon) return false;
      try {
        for (var b = 0; b < endpointsToTry.length; b++) {
          var blob = new Blob([body], { type: "application/json" });
          if (navigator.sendBeacon(endpointsToTry[b], blob)) {
            if (debug) console.log("[Analytics] Sent via sendBeacon fallback:", endpointsToTry[b]);
            return true;
          }
        }
      } catch (e) {}
      return false;
    }

    // Fetch-first is more trustworthy for delivery status than sendBeacon.
    // Use beacon only as a backup for unload or fetch failures.
    function tryEndpoint(index) {
      if (index >= endpointsToTry.length) {
        var isUnload = /_unload$/.test(eventName);
        if (isUnload) {
          tryBeaconFallback();
        } else if (debug) {
          console.warn("[Analytics] All endpoints failed (blocked or unreachable).");
        }
        return;
      }

      var endpoint = endpointsToTry[index];
      var timeoutId = setTimeout(function() {
        tryEndpoint(index + 1);
      }, 2200);

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true,
        credentials: "omit"
      })
        .then(function (response) {
          clearTimeout(timeoutId);
          if (response && response.ok) {
            if (debug) console.log("[Analytics] Sent via fetch:", endpoint);
            return;
          }
          if (debug) console.warn("[Analytics] fetch failed:", endpoint, response && response.status);
          tryEndpoint(index + 1);
        })
        .catch(function (err) {
          clearTimeout(timeoutId);
          if (debug) console.warn("[Analytics] fetch error:", endpoint, err && err.message);
          tryEndpoint(index + 1);
        });
    }

    try {
      tryEndpoint(0);
    } catch (e) {
      // Never break the page
    }
  }

  window.initAnalyticsTracking = function initAnalyticsTracking(options) {
    try {
      var pageLoadMs = Date.now();
      var sessionId = getSessionId();
      var primaryEndpoint = (options && options.endpoint) || DEFAULT_ENDPOINT || null;

      // Robust fallback:
      // Your repo historically used BOTH:
      // - events.colab.indevs.in/api/events
      // - stats.colab.indevs.in/collect
      // If one is down, try the other automatically.
      var fallbackEndpoint = null;
      if (primaryEndpoint && primaryEndpoint.indexOf("events.colab.indevs.in") !== -1) {
        fallbackEndpoint = "https://stats.colab.indevs.in/collect";
      } else if (primaryEndpoint && primaryEndpoint.indexOf("stats.colab.indevs.in") !== -1) {
        fallbackEndpoint = "https://events.colab.indevs.in/api/events";
      }

      var endpoints = [];
      if (Array.isArray(options && options.endpoints) && options.endpoints.length) {
        endpoints = options.endpoints.filter(Boolean);
      } else {
        if (primaryEndpoint) endpoints.push(primaryEndpoint);
        if (fallbackEndpoint && fallbackEndpoint !== primaryEndpoint) endpoints.push(fallbackEndpoint);
      }

      var cfg = {
        site: (options && options.site) || "analytics-lab",
        baseEvent: (options && options.baseEvent) || "page",
        endpoint: primaryEndpoint,
        endpoints: endpoints,
        secret: (options && options.secret) || DEFAULT_SECRET || null,
        sessionId: sessionId
      };

      if (!cfg.endpoints || !cfg.endpoints.length) return;

      if (isDebug()) console.log("[Analytics] Init:", cfg.baseEvent, "site:", cfg.site, "endpoint:", cfg.endpoint);

      // Initial visit
      sendAnalyticsEvent(cfg, cfg.baseEvent + "_visit");

      // Time-on-page on unload
      window.addEventListener("beforeunload", function () {
        var durationMs = Date.now() - pageLoadMs;
        if (durationMs >= 0 && durationMs < 24 * 60 * 60 * 1000) {
          sendAnalyticsEvent(cfg, cfg.baseEvent + "_unload", {
            durationMs: durationMs
          });
        }
      });
    } catch (e) {
      // Fail silently
    }
  };
})();
