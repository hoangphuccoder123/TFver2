// API Key Library - centralized pool for Google Gemini keys
// Warning: Do not expose real keys client-side in production. Use a server-side proxy instead.
(function () {
  const pool = [
    // User-provided keys
    "AIzaSyB6n0MKL4GT5moF1-NQ2wDjiM2xnFV6Bdg",
    "AIzaSyA76JKGb7lQaKDCvu2BAAMqzcl4y8Q5sOE",
    "AIzaSyC2Z76Ar6W4s3oViMrIFdC4cchzZGAHa40",
    "AIzaSyCYIFzqpdHIDacCcweOPNMHcs1orjtsFWg",
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

