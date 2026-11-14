<script>
 import '../app.css';
 import { page } from '$app/state';
 let { children } = $props();
 let menu = $state(false);
 const links = [['/how-it-works','How it works'],['/our-mission','Our mission'],['/community','Community']];
</script>
<a class="skip" href="#main">Skip to content</a>
<header><a class="brand" href="/" aria-label="GridUbuntu home"><img src="/logo.png" alt=""/><span>Grid<span class="brand-green">Ubuntu</span><small>CONNECTED BY ENERGY.</small></span></a><button class="menu" aria-expanded={menu} aria-controls="navigation" onclick={()=>menu=!menu}>{menu?'Close ×':'Menu ☰'}</button><nav id="navigation" class:open={menu} aria-label="Main navigation">{#each links as [url,label]}<a href={url} aria-current={page.url.pathname===url?'page':undefined} onclick={()=>menu=false}>{label}</a>{/each}<a class="button small" href="/get-involved" onclick={()=>menu=false}>Let’s connect <span>↗</span></a></nav></header>
<main id="main">{@render children()}</main>
<footer><div class="footer-top"><a class="brand" href="/">GridUbuntu<span class="sun-mini">✳</span></a><p>A brighter future.<br/>Built together.</p><a class="text-link" href="/get-involved">Be part of the change ↗</a></div><div class="footer-bottom"><span>© {new Date().getFullYear()} GridUbuntu · A Zimbabwean social enterprise</span><div><a href="/our-mission">Our purpose</a><a href="/get-involved">Get in touch</a><span>Made for community.</span></div></div></footer>
