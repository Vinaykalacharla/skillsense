const configuredBase = import.meta.env.VITE_API_BASE_URL || '';
const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '';

export const apiBase = configuredBase || runtimeOrigin;

export const buildApiUrl = (path: string) => {
  const base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};
