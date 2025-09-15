// Server utilities for building absolute URLs safely across environments
// - Uses Vercel env when present
// - Falls back to NEXT_PUBLIC_SITE_URL if provided
// - Finally falls back to localhost in development

export function getBaseUrl() {
  // Explicit public URL if set
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (explicit && explicit.trim()) {
    const hasProto = /^https?:\/\//i.test(explicit);
    return hasProto ? explicit.replace(/\/$/, '') : `https://${explicit.replace(/\/$/, '')}`;
  }

  // Vercel provides VERCEL_URL without protocol
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.trim()) {
    return `https://${vercel.replace(/\/$/, '')}`;
  }

  // Railway/Render/Other common HOST/PORT combos
  const host = process.env.HOST || process.env.HOSTNAME;
  if (host) {
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const port = process.env.PORT ? `:${process.env.PORT}` : '';
    return `${protocol}://${host}${port}`;
  }

  // Local default
  return `http://localhost:${process.env.PORT || 3000}`;
}
