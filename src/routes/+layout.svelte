<script>
 import '../app.css';
 import { page } from '$app/state';
 let { children } = $props();
 let menu = $state(false);
 const links = [['/how-it-works','Our solution'],['/our-mission','About GridUbuntu'],['/community','Communities']];
</script>
<a class="skip" href="#main">Skip to content</a>
<header><a class="brand" href="/" aria-label="GridUbuntu home"><img src="/logo.png" alt=""/><span>Grid<span class="brand-green">Ubuntu</span><small>RENEWABLE ENERGY. SHARED.</small></span></a><button class="menu" aria-expanded={menu} aria-controls="navigation" onclick={()=>menu=!menu}>{menu?'Close':'Menu'}</button><nav id="navigation" class:open={menu} aria-label="Main navigation">{#each links as [url,label]}<a href={url} aria-current={page.url.pathname===url?'page':undefined} onclick={()=>menu=false}>{label}</a>{/each}<a class="button small" href="/get-involved" onclick={()=>menu=false}>Partner with us <span aria-hidden="true">→</span></a></nav></header>
<main id="main">{@render children()}</main>
<footer><div class="footer-top"><a class="brand" href="/">GridUbuntu</a><p>Zimbabwean roots.<br/>African ambition.<br/>Shared progress.</p><a class="text-link" href="/get-involved">Connect with GridUbuntu <span>→</span></a></div><div class="footer-bottom"><span>© {new Date().getFullYear()} GridUbuntu · A Zimbabwean social enterprise</span><div><a href="/our-mission">Our purpose</a><a href="/community">Community focus</a><a href="/get-involved">Get involved</a></div></div><p class="photo-credit">Harare photograph: <a href="https://commons.wikimedia.org/wiki/File:Carts_loaded_with_fruits_and_vegetables_for_sale_in_Harare.jpg">Cecil Dzwowa / Wikimedia Commons</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Display cropped. Contextual image; not a GridUbuntu installation.</p></footer>
