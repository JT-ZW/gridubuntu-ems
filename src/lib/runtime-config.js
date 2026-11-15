// Accept the standard names used by Supabase/Vercel integrations as aliases.
// This does not supply credentials when the deployment has no configuration.
export function normalizeRuntimeConfig(values){
 return {...values,
  SUPABASE_URL:values.SUPABASE_URL||values.PUBLIC_SUPABASE_URL||values.NEXT_PUBLIC_SUPABASE_URL||'',
  SUPABASE_PUBLISHABLE_KEY:values.SUPABASE_PUBLISHABLE_KEY||values.SUPABASE_ANON_KEY||values.PUBLIC_SUPABASE_PUBLISHABLE_KEY||values.PUBLIC_SUPABASE_ANON_KEY||values.NEXT_PUBLIC_SUPABASE_ANON_KEY||'',
  GOOGLE_MAPS_BROWSER_KEY:values.GOOGLE_MAPS_BROWSER_KEY||values.PUBLIC_GOOGLE_MAPS_BROWSER_KEY||values.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY||''
 };
}
