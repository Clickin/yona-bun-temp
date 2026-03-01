<script lang="ts">
	import { goto } from '$app/navigation';
	import { localizeHref } from '$lib/paraglide/runtime';

	let email = $state('');
	let password = $state('');
	let isLoading = $state(false);
	let error = $state('');

	async function handleSubmit(event: Event) {
		event.preventDefault();
		error = '';
		isLoading = true;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ email, password })
			});

			if (response.ok) {
				await goto('/');
			} else {
				error = 'Invalid email or password';
				password = '';
			}
		} catch {
			error = 'Invalid email or password';
			password = '';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="login-container">
	<h1 class="login-title">Sign in</h1>
	<p class="login-subtitle">Welcome back to Yona</p>

	<form on:submit={handleSubmit} class="login-form">
		<div class="form-group">
			<label for="email" class="form-label">Email</label>
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				class="form-input"
				placeholder="you@example.com"
				bind:value={email}
				required
				disabled={isLoading}
			/>
		</div>

		<div class="form-group">
			<label for="password" class="form-label">Password</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				class="form-input"
				placeholder="••••••••"
				bind:value={password}
				required
				disabled={isLoading}
			/>
		</div>

		{#if error}
			<div class="error-message" role="alert">{error}</div>
		{/if}

		<button type="submit" class="submit-button" disabled={isLoading}>
			{isLoading ? 'Signing in...' : 'Sign in'}
		</button>
	</form>

	<div class="login-links">
		<a href={localizeHref('/register')} class="link">Create account</a>
		<a href={localizeHref('/reset-password')} class="link">Forgot password?</a>
	</div>
</div>

<style>
	.login-container {
		max-width: 400px;
		margin: 60px auto;
		padding: 0;
	}

	.login-title {
		font-size: 28px;
		font-weight: 700;
		margin: 0 0 8px 0;
		color: #1a1a1a;
		letter-spacing: -0.3px;
	}

	.login-subtitle {
		font-size: 15px;
		color: #666;
		margin: 0 0 32px 0;
		line-height: 1.5;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-label {
		font-size: 13px;
		font-weight: 600;
		color: #333;
	}

	.form-input {
		padding: 10px 12px;
		font-size: 14px;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		background: #fff;
		color: #1a1a1a;
		line-height: 1.4;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.form-input::placeholder {
		color: #9ca3af;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--yona-accent);
		box-shadow: 0 0 0 3px rgba(243, 108, 34, 0.1);
	}

	.form-input:disabled {
		background: #f3f4f6;
		cursor: not-allowed;
	}

	.error-message {
		padding: 10px 12px;
		font-size: 13px;
		color: #dc2626;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 4px;
		line-height: 1.4;
	}

	.submit-button {
		margin-top: 8px;
		padding: 10px 16px;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		background: var(--yona-accent);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		line-height: 1.4;
		transition: background-color 0.15s, transform 0.05s;
	}

	.submit-button:hover:not(:disabled) {
		background: #e05a1b;
	}

	.submit-button:active:not(:disabled) {
		transform: translateY(1px);
	}

	.submit-button:disabled {
		background: #f97316;
		opacity: 0.6;
		cursor: not-allowed;
	}

	.login-links {
		display: flex;
		justify-content: space-between;
		margin-top: 20px;
		padding-top: 20px;
		border-top: 1px solid #e5e7eb;
	}

	.link {
		font-size: 13px;
		color: #666;
		text-decoration: none;
		transition: color 0.15s;
	}

	.link:hover {
		color: var(--yona-accent);
	}
</style>
