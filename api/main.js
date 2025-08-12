// Centralized API keys and endpoints
// Note: Exposing API keys in client-side code is insecure. Prefer server-side proxy in production.
(function () {
	const AppConfig = {
		meta: {
			app: "TechFuture",
			updatedAt: new Date().toISOString(),
		},
		APIs: {
			gemini: {
				// Common settings
				baseUrlV1Beta: "https://generativelanguage.googleapis.com/v1beta",
				defaultModel: "gemini-1.5-flash",
				// Keys by feature/module (move all keys here)
				keys: {
					// Interview feature (js/interview.js)
					interview: "AIzaSyBCk71sTWF6ig2Gki5AHYYFpMEhZ4Vt9tk",
					// Agent CV (backend/agent-cv/agent-cv.js)
					agentCV: "AIzaSyC1DiQKS7prwii1ev3taOpg3bh7yMhXPPU",
					// Holland chatbot (js/holland.js)
					holland: "AIzaSyA2sIWEgaOMnIlUXyf7jekG-Sw8GjrtZSA",
					// CV analyzer (backend/cv/cv.js)
					cv: "AIzaSyA6cO0fKzu-1Tm19attpzS3PV9axohOx7Y",
					// Legacy/Node (backend/cv/cv2.js) — client pages won't use this directly
					cv2: "AIzaSyDMPb99FUL4Rb5p3KE5c1sceHmhpvdDgrk",
					// Optionally set a default to reuse
					default: null,
				},
				// Helper to build a generateContent URL
				buildGenerateUrl(model, key) {
					const m = model || this.defaultModel;
					return `${this.baseUrlV1Beta}/models/${m}:generateContent?key=${encodeURIComponent(key)}`;
				},
				// Resolve a key by feature name with fallback to default
				getKey(feature) {
					return (
						(this.keys && (this.keys[feature] || this.keys.default)) || ""
					);
				},
			},
		},
	};
    
	// Attach to window
	if (typeof window !== "undefined") {
		window.AppConfig = Object.freeze(AppConfig);
	}
})();

