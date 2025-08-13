const api = require('./swap api.js');

console.log('exported keys:', Object.keys(api));
console.log('initial:', { tokenUsed: api.tokenUsed, rpm: api.requestsLastMinute(), lastRotateCause: api.lastRotateCause });

api.setConfig({ PERSIST_STATE: false, DAILY_RESET_UTC: true });
api.recordRequest({ tokensEstimated: 123 });
console.log('after record:', { tokenUsed: api.tokenUsed, rpm: api.requestsLastMinute() });

console.log('shouldRotate(429):', api.shouldRotateKey(429));
console.log('backoff1:', api.getBackoffDelay({ attempt: 1 }));
console.log('backoff5:', api.getBackoffDelay({ attempt: 5 }));

api.markSwitched('test');
console.log('after markSwitched:', { lastSwitchTime: api.lastSwitchTime, lastRotateCause: api.lastRotateCause })


