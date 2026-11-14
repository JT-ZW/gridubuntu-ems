import { env } from '$env/dynamic/private';
export function config(event) {
 return { ...env, ...(event?.platform?.env || {}) };
}
export function authConfigured(event) {
 const c=config(event);return Boolean(c.SUPABASE_URL && c.SUPABASE_PUBLISHABLE_KEY);
}
