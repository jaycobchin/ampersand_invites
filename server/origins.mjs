export function allowedOrigins(req, environment = process.env) {
  const urls = [environment.APP_URL, environment.RENDER_EXTERNAL_URL];
  if (environment.VERCEL === '1') {
    for (const key of ['VERCEL_URL', 'VERCEL_BRANCH_URL', 'VERCEL_PROJECT_PRODUCTION_URL']) {
      if (environment[key]) urls.push(`https://${environment[key]}`);
    }
  }
  if (environment.NODE_ENV !== 'production' && environment.VERCEL !== '1') {
    urls.push(`http://${req.get('host')}`);
  }
  return new Set(
    urls
      .filter(Boolean)
      .map((value) => {
        try {
          return new URL(value).origin;
        } catch {
          return null;
        }
      })
      .filter(Boolean),
  );
}
