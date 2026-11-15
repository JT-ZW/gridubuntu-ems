import { env } from '$env/dynamic/private';
import {env as publicEnv} from '$env/dynamic/public';
import {normalizeRuntimeConfig} from '../runtime-config.js';
export function config(event) {
 return normalizeRuntimeConfig({...publicEnv,...env,...(event?.platform?.env||{})});
}
export function authConfigured(event) {
 const c=config(event);return Boolean(c.SUPABASE_URL && c.SUPABASE_PUBLISHABLE_KEY);
}
