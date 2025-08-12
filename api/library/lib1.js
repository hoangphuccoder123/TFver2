// API Key Library - centralized pool for Google Gemini keys
// Warning: Do not expose real keys client-side in production. Use a server-side proxy instead.
(function () {
  const pool = [
    // User-provided keys
    "AIzaSyDoJZ6NoDNcm5KSS6A54xN_kXIbgXy0AVE",
    "AIzaSyAxML5o0IscxTIBAze7K4bDhklKQLSDkJ4",
    "AIzaSyBB4gRCYON93G1_k0aZMhOIXTWVpDUi6gY",
    "AIzaSyBla8XyUXuNYJ2603ODImdz48ZKu7znFe0",
  ].filter(Boolean);

  let index = 0;

  const lib = {
    google: {
      gemini: {
        pool: pool.slice(),
        getActiveKey() {
          return this.pool.length ? this.pool[index % this.pool.length] : "";
        },
        nextKey() {
          if (!this.pool.length) return "";
          index = (index + 1) % this.pool.length;
          return this.getActiveKey();
        },
        setKeys(keys) {
          if (Array.isArray(keys)) {
            this.pool = keys.filter(Boolean);
            index = 0;
          }
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
