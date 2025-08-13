// API Key Library - centralized pool for Google Gemini keys
// Warning: Do not expose real keys client-side in production. Use a server-side proxy instead.
(function () {
  // Chuỗi key sẽ được xoay tuần tự TỪ TRÊN XUỐNG DƯỚI.
  // Lưu ý: KHÔNG để key thật trên client trong sản phẩm production.
  const pool = [
    // User-provided keys (thứ tự xoay: dòng trên -> dòng dưới)
    "AIzaSyB6n0MKL4GT5moF1-NQ2wDjiM2xnFV6Bdg",
    "AIzaSyA76JKGb7lQaKDCvu2BAAMqzcl4y8Q5sOE",
    "AIzaSyC2Z76Ar6W4s3oViMrIFdC4cchzZGAHa40",
    "AIzaSyCYIFzqpdHIDacCcweOPNMHcs1orjtsFWg",
  ].filter(Boolean);

  // Con trỏ vị trí key hiện tại trong pool
  let index = 0;
  // Chống đổi key liên tiếp trong thời gian ngắn gây "chạy đồng thời nhiều key"
  const ROTATE_COOLDOWN_MS = 5_000; // 5s; có thể cấu hình thêm qua KeySwapManager
  let lastRotateAt = 0;

  // Kiểm tra có thể xoay key ngay lúc này không (dựa theo cooldown và KeySwapManager nếu có)
  function canRotateNow() {
    const now = Date.now();
    const cooldownOk = now - lastRotateAt >= ROTATE_COOLDOWN_MS;
    // Nếu có KeySwapManager, ưu tiên logic của nó để tránh xoay trùng lặp giữa các module
    try {
      if (typeof window !== 'undefined' && window.KeySwapManager) {
        return cooldownOk && window.KeySwapManager.shouldRotateKey();
      }
    } catch (_) {}
    return cooldownOk;
  }

  // Đồng bộ key mới về AppConfig: chỉ cập nhật những key đang dùng cùng "oldKey"
  function syncAppConfigKeys(oldKey, newKey) {
    try {
      if (typeof window === 'undefined' || !window.AppConfig) return;
      const keys = window.AppConfig.APIs?.gemini?.keys;
      if (!keys || typeof keys !== 'object') return;
      Object.keys(keys).forEach((k) => {
        try {
          if (keys[k] === oldKey) {
            keys[k] = newKey; // giữ đồng bộ để tránh mỗi nơi dùng 1 key khác nhau cùng lúc
          }
        } catch (_) {}
      });
      // Nếu có default, cập nhật luôn cho đồng bộ chung
      if (keys.default) keys.default = newKey;
    } catch (_) {}
  }

  const lib = {
    google: {
      gemini: {
        // Sao chép pool để tránh bị mutate từ bên ngoài
        pool: pool.slice(),
        // Lấy key hiện hành (KHÔNG đổi con trỏ)
        getActiveKey() {
          return this.pool.length ? this.pool[index % this.pool.length] : "";
        },
        // Xoay key theo thứ tự từ trên xuống dưới, có cooldown để tránh "xoay chồng"
        // Trả về key mới nếu xoay được; nếu đang cooldown thì trả về key hiện hành
        nextKey() {
          if (!this.pool.length) return "";

          // Nếu chưa nên xoay (cooldown hoặc chính sách), trả về key hiện tại
          if (!canRotateNow()) {
            return this.getActiveKey();
          }

          const oldKey = this.getActiveKey();
          index = (index + 1) % this.pool.length; // tăng con trỏ tuần tự, vòng tròn
          const newKey = this.getActiveKey();
          lastRotateAt = Date.now();

          // Báo cho KeySwapManager biết đã xoay (nếu có), để các nơi khác không xoay tiếp ngay lập tức
          try {
            if (typeof window !== 'undefined' && window.KeySwapManager) {
              window.KeySwapManager.markSwitched('api-key-library');
            }
          } catch (_) {}

          // Đồng bộ về AppConfig để các module khác đang dùng oldKey sẽ chuyển sang newKey
          syncAppConfigKeys(oldKey, newKey);
          return newKey;
        },
        // Gán lại danh sách key (reset về đầu) – hữu ích khi bạn muốn thay đổi thứ tự xoay
        setKeys(keys) {
          if (Array.isArray(keys)) {
            this.pool = keys.filter(Boolean);
            index = 0;
          }
        },
        // Trả về thứ tự xoay (để debug): mảng copy theo đúng thứ tự từ trên xuống
        getRotationOrder() {
          return this.pool.slice();
        },
        // Trả về vị trí con trỏ hiện tại (0-based) – giúp bạn biết đang ở key thứ mấy
        getCurrentIndex() {
          return index % (this.pool.length || 1);
        },
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
