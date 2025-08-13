(function(){
  // Centralized key swap manager using heuristics
  const DEFAULTS = {
    MAX_TOKENS_PER_DAY: 1_000_000, // configurable
    RPM_LIMIT: 60,
    RPM_SAFE_THRESHOLD: 55,
    ROTATE_INTERVAL_MS: 30 * 60 * 1000, // 30 minutes
    // added
    ROTATE_COOLDOWN_MS: 5_000,
    ERROR_ROTATE_CODES: [401, 403, 429],
    PERSIST_STATE: false,
    PERSIST_KEY: 'KeySwapManager:v1',
    DAILY_RESET_UTC: true,
    BACKOFF_BASE_MS: 1000,
    BACKOFF_MAX_MS: 60_000,
  };

  const state = {
    lastSwitchTime: Date.now(),
    tokenUsed: 0,
    requestTimestamps: [], // epoch ms of requests
    config: { ...DEFAULTS },
    // added
    rotatingUntil: 0,
    lastRotateCause: null,
    dayKey: getUtcDayKey(Date.now()),
  };

  // added
  function getUtcDayKey(now){
    const d = new Date(now);
    return `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
  }

  // added
  function maybeResetDaily(now){
    if (!state.config.DAILY_RESET_UTC) return;
    const key = getUtcDayKey(now);
    if (key !== state.dayKey){
      state.dayKey = key;
      state.tokenUsed = 0;
      saveState();
    }
  }

  // added
  function canRotateNow(){
    return Date.now() >= state.rotatingUntil;
  }

  function pruneOldRequests(now){
    const oneMinuteAgo = now - 60_000;
    while (state.requestTimestamps.length && state.requestTimestamps[0] < oneMinuteAgo){
      state.requestTimestamps.shift();
    }
  }

  function requestsLastMinute(){
    const now = Date.now();
    maybeResetDaily(now);
    pruneOldRequests(now);
    return state.requestTimestamps.length;
  }

  function recordRequest({ tokensEstimated = 0, statusCode } = {}){
    const now = Date.now();
    maybeResetDaily(now);
    state.requestTimestamps.push(now);
    pruneOldRequests(now);
    if (tokensEstimated && Number.isFinite(tokensEstimated)) {
      state.tokenUsed += Math.max(0, tokensEstimated);
    }
    // statusCode can be inspected by callers; not stored here
    saveState();
  }

  function markSwitched(cause = 'manual'){
    state.lastSwitchTime = Date.now();
    state.lastRotateCause = cause;
    state.rotatingUntil = state.lastSwitchTime + (state.config.ROTATE_COOLDOWN_MS || 0);
    saveState();
  }

  function shouldRotateKey(errorCode){
    if (!canRotateNow()) return false;

    const nearDailyQuota = state.tokenUsed >= state.config.MAX_TOKENS_PER_DAY * 0.85;
    const isRotateError = state.config.ERROR_ROTATE_CODES.includes(errorCode);
    const timeToRotate = Date.now() - state.lastSwitchTime >= state.config.ROTATE_INTERVAL_MS;
    const rpm = requestsLastMinute();
    const rpmHigh = rpm > state.config.RPM_SAFE_THRESHOLD; // keep under 60 rpm
    return nearDailyQuota || isRotateError || timeToRotate || rpmHigh;
  }

  function setConfig(cfg = {}){
    state.config = { ...state.config, ...cfg };
    loadState();
  }
  function addTokensUsed(n){
    const v = Number(n);
    if (Number.isFinite(v) && v > 0) state.tokenUsed += v;
    saveState();
  }

  // added
  function getBackoffDelay({ attempt = 1, retryAfterMs } = {}){
    if (Number.isFinite(retryAfterMs) && retryAfterMs > 0){
      return Math.min(retryAfterMs, state.config.BACKOFF_MAX_MS);
    }
    const base = state.config.BACKOFF_BASE_MS;
    const max = state.config.BACKOFF_MAX_MS;
    const exp = Math.min(max, base * Math.pow(2, Math.max(0, attempt - 1)));
    const jitter = 0.5 + Math.random() * 0.5; // 50–100%
    return Math.min(max, Math.floor(exp * jitter));
  }

  // added: lightweight persistence (browser only)
  function saveState(){
    try {
      if (!state.config.PERSIST_STATE) return;
      if (typeof localStorage === 'undefined') return;
      const data = {
        tokenUsed: state.tokenUsed,
        lastSwitchTime: state.lastSwitchTime,
        dayKey: state.dayKey,
      };
      localStorage.setItem(state.config.PERSIST_KEY, JSON.stringify(data));
    } catch {}
  }
  function loadState(){
    try {
      if (!state.config.PERSIST_STATE) return;
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(state.config.PERSIST_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Number.isFinite(data?.tokenUsed)) state.tokenUsed = data.tokenUsed;
      if (Number.isFinite(data?.lastSwitchTime)) state.lastSwitchTime = data.lastSwitchTime;
      if (typeof data?.dayKey === 'string') state.dayKey = data.dayKey;
      maybeResetDaily(Date.now());
    } catch {}
  }
  loadState();

  const api = {
    setConfig,
    addTokensUsed,
    recordRequest,
    markSwitched,
    requestsLastMinute,
    shouldRotateKey,
    getBackoffDelay,
    get tokenUsed(){ return state.tokenUsed; },
    get lastSwitchTime(){ return state.lastSwitchTime; },
    get config(){ return { ...state.config }; },
    get lastRotateCause(){ return state.lastRotateCause; },
  };

  if (typeof window !== 'undefined') {
    window.KeySwapManager = api;
  }

  // added: Node/CommonJS export
  if (typeof module !== 'undefined' && module.exports){
    module.exports = api;
  }
})();
