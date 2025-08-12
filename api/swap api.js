(function(){
  // Centralized key swap manager using heuristics
  const DEFAULTS = {
    MAX_TOKENS_PER_DAY: 1_000_000, // configurable
    RPM_LIMIT: 60,
    RPM_SAFE_THRESHOLD: 55,
    ROTATE_INTERVAL_MS: 30 * 60 * 1000, // 30 minutes
  };

  const state = {
    lastSwitchTime: Date.now(),
    tokenUsed: 0,
    requestTimestamps: [], // epoch ms of requests
    config: { ...DEFAULTS },
  };

  function pruneOldRequests(now){
    const oneMinuteAgo = now - 60_000;
    while (state.requestTimestamps.length && state.requestTimestamps[0] < oneMinuteAgo){
      state.requestTimestamps.shift();
    }
  }

  function requestsLastMinute(){
    const now = Date.now();
    pruneOldRequests(now);
    return state.requestTimestamps.length;
  }

  function recordRequest({ tokensEstimated = 0, statusCode } = {}){
    const now = Date.now();
    state.requestTimestamps.push(now);
    pruneOldRequests(now);
    if (tokensEstimated && Number.isFinite(tokensEstimated)) {
      state.tokenUsed += Math.max(0, tokensEstimated);
    }
    // statusCode can be inspected by callers; not stored here
  }

  function markSwitched(){
    state.lastSwitchTime = Date.now();
  }

  function shouldRotateKey(errorCode){
    const nearDailyQuota = state.tokenUsed >= state.config.MAX_TOKENS_PER_DAY * 0.85;
    const isRateLimited = errorCode === 429;
    const timeToRotate = Date.now() - state.lastSwitchTime >= state.config.ROTATE_INTERVAL_MS;
    const rpm = requestsLastMinute();
    const rpmHigh = rpm > state.config.RPM_SAFE_THRESHOLD; // keep under 60 rpm
    return nearDailyQuota || isRateLimited || timeToRotate || rpmHigh;
  }

  function setConfig(cfg = {}){
    state.config = { ...state.config, ...cfg };
  }
  function addTokensUsed(n){
    const v = Number(n);
    if (Number.isFinite(v) && v > 0) state.tokenUsed += v;
  }

  const api = {
  setConfig,
  addTokensUsed,
    recordRequest,
    markSwitched,
    requestsLastMinute,
    shouldRotateKey,
    get tokenUsed(){ return state.tokenUsed; },
    get lastSwitchTime(){ return state.lastSwitchTime; },
    get config(){ return { ...state.config }; },
  };

  if (typeof window !== 'undefined') {
    window.KeySwapManager = api;
  }
})();
