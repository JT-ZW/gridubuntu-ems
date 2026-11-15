import {test} from 'node:test';import assert from 'node:assert/strict';import {normalizeRuntimeConfig} from '../src/lib/runtime-config.js';
test('deployment configuration accepts standard Supabase integration names',()=>{
 const c=normalizeRuntimeConfig({NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public-test',PUBLIC_GOOGLE_MAPS_BROWSER_KEY:'browser-test'});
 assert.equal(c.SUPABASE_URL,'https://example.supabase.co');assert.equal(c.SUPABASE_PUBLISHABLE_KEY,'public-test');assert.equal(c.GOOGLE_MAPS_BROWSER_KEY,'browser-test');
});
test('canonical configuration wins and missing credentials remain missing',()=>{
 const c=normalizeRuntimeConfig({SUPABASE_PUBLISHABLE_KEY:'canonical',SUPABASE_ANON_KEY:'alias',SUPABASE_SECRET_KEY:'server-only'});assert.equal(c.SUPABASE_PUBLISHABLE_KEY,'canonical');assert.equal(c.SUPABASE_SECRET_KEY,'server-only');assert.equal(normalizeRuntimeConfig({}).SUPABASE_PUBLISHABLE_KEY,'');
});
