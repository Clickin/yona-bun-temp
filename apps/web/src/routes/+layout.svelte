<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import './layout.css';

	let { children } = $props();
</script>

<header class="yona-header" data-testid="yona-shell-header">
	<div class="yona-header-inner">
		<a class="yona-brand" href={localizeHref('/')}>
			<img class="yona-logo" src={`${base}/images/yona_logo.png`} alt="Yona" />
			<span class="yona-wordmark">Yona</span>
		</a>
		<nav class="yona-nav" aria-label="Primary">
			<a data-testid="yona-nav-projects" href={localizeHref('/projects')}>Projects</a>
			<a data-testid="yona-nav-organizations" href={localizeHref('/organizations')}>Organizations</a>
			<a data-testid="yona-nav-help" href={localizeHref('/help')}>Help</a>
			<a data-testid="yona-nav-login" href={localizeHref('/login')}>Login</a>
		</nav>
	</div>
</header>

<main class="yona-main">{@render children()}</main>

<footer class="yona-footer" data-testid="yona-shell-footer">
	<div class="yona-footer-inner">
		<span>Powered by Yona</span>
		<span class="yona-footer-sep">|</span>
		<a class="yona-footer-link" href="https://github.com/yona-projects" target="_blank" rel="noreferrer">Project</a>
	</div>
</footer>

<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>
