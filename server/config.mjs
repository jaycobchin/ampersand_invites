function publicOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function publicConfig(environment = process.env) {
  const mode = environment.APP_MODE || 'standard';
  if (!['standard', 'demo', 'live'].includes(mode))
    throw new Error('APP_MODE must be demo, live, or standard.');
  return {
    mode,
    demoEnabled: mode !== 'live' && environment.ENABLE_DEMO !== 'false',
    registrationEnabled: mode !== 'demo',
    demoUrl: mode === 'live' ? publicOrigin(environment.DEMO_APP_URL) : null,
    liveUrl: mode === 'demo' ? publicOrigin(environment.LIVE_APP_URL) : null,
  };
}
