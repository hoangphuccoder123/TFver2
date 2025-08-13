// API Key Library - centralized pool for Google Gemini keys
// Warning: Do not expose real keys client-side in production. Use a server-side proxy instead.
(function () {
  // Chuỗi key sẽ được xoay tuần tự TỪ TRÊN XUỐNG DƯỚI.
  // Lưu ý: KHÔNG để key thật trên client trong sản phẩm production.
  const pool = [
    // User-provided keys (thứ tự xoay: dòng trên -> dòng dưới)
    "AIzaSyDoJZ6NoDNcm5KSS6A54xN_kXIbgXy0AVE",
    "AIzaSyAxML5o0IscxTIBAze7K4bDhklKQLSDkJ4",
    "AIzaSyBB4gRCYON93G1_k0aZMhOIXTWVpDUi6gY",
    "AIzaSyBla8XyUXuNYJ2603ODImdz48ZKu7znFe0",
  ].filter(Boolean);

  // Con trỏ vị trí key hiện tại trong pool
  let index = 0;
  // Chống đổi key liên tiếp trong thời gian ngắn gây "chạy đồng thời nhiều key"
  const ROTATE_COOLDOWN_MS = 5_000; // 5s; có thể cấu hình thêm qua KeySwapManager
  let lastRotateAt = 0;

  function canRotateNow() {
    const now = Date.now();
    const cooldownOk = now - lastRotateAt >= ROTATE_COOLDOWN_MS;
    try {
      if (typeof window !== 'undefined' && window.KeySwapManager) {
        return cooldownOk && window.KeySwapManager.shouldRotateKey();
      }
    } catch (_) {}
    return cooldownOk;
  }

  function syncAppConfigKeys(oldKey, newKey) {
    try {
      if (typeof window === 'undefined' || !window.AppConfig) return;
      const keys = window.AppConfig.APIs?.gemini?.keys;
      if (!keys || typeof keys !== 'object') return;
      Object.keys(keys).forEach((k) => {
        try {
          if (keys[k] === oldKey) {
            keys[k] = newKey;
          }
        } catch (_) {}
      });
      if (keys.default) keys.default = newKey;
    } catch (_) {}
  }

  const lib = {
    google: {
      gemini: {
        pool: pool.slice(),
        getActiveKey() {
          return this.pool.length ? this.pool[index % this.pool.length] : "";
        },
        nextKey() {
          if (!this.pool.length) return "";
          if (!canRotateNow()) {
            return this.getActiveKey();
          }
          const oldKey = this.getActiveKey();
          index = (index + 1) % this.pool.length;
          const newKey = this.getActiveKey();
          lastRotateAt = Date.now();
          try {
            if (typeof window !== 'undefined' && window.KeySwapManager) {
              window.KeySwapManager.markSwitched('api-key-library');
            }
          } catch (_) {}
          syncAppConfigKeys(oldKey, newKey);
          return newKey;
        },
        setKeys(keys) {
          if (Array.isArray(keys)) {
            this.pool = keys.filter(Boolean);
            index = 0;
          }
        },
        getRotationOrder() { return this.pool.slice(); },
        getCurrentIndex() { return index % (this.pool.length || 1); },
      },
    },
    meta: {
      updatedAt: new Date().toISOString(),
    },
  };

  if (typeof window !== "undefined") {
    window.APIKeyLibrary = Object.freeze(lib);
  }
})();
