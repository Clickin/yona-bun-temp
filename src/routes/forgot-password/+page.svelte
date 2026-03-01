<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		// Auto-redirect after 3 seconds
		setTimeout(() => {
			goto('/reset-password');
		}, 3000);
	});
</script>

<div class="forgot-container">
	<div class="forgot-content">
		<h1 class="forgot-title">Password Reset</h1>
		<p class="forgot-message">
			Password reset is handled by administrators. You will be redirected to the admin reset
			page shortly.
		</p>
		<p class="forgot-note">
			If you need your password reset, please contact your system administrator or use the
			admin reset form below.
		</p>
		<a href="/reset-password" class="link-button">Go to Admin Reset Page</a>
	</div>
</div>

<style>
	.forgot-container {
		max-width: 480px;
		margin: 60px auto;
		padding: 0;
		text-align: center;
	}

	.forgot-content {
		background: #fff;
		padding: 32px;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
	}

	.forgot-title {
		font-size: 24px;
		font-weight: 700;
		margin: 0 0 16px 0;
		color: #1a1a1a;
		letter-spacing: -0.3px;
	}

	.forgot-message {
		font-size: 14px;
		color: #4b5563;
		margin: 0 0 12px 0;
		line-height: 1.5;
	}

	.forgot-note {
		font-size: 13px;
		color: #6b7280;
		margin: 0 0 24px 0;
		line-height: 1.5;
	}

	.link-button {
		display: inline-block;
		padding: 10px 20px;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		background: var(--yona-accent);
		text-decoration: none;
		border-radius: 4px;
		transition: background-color 0.15s, transform 0.05s;
	}

	.link-button:hover {
		background: #e05a1b;
	}

	.link-button:active {
		transform: translateY(1px);
	}
</style>
