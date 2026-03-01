<script lang="ts">
	import { goto } from '$app/navigation';

	const { data } = $props<{ data: { csrfToken: string } }>();

	let userId = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');

	// Admin auth fields (temporary explicit input mode)
	let adminUserId = $state('');
	let adminUserName = $state('');
	let adminUserEmail = $state('');
	let isAdminMode = $state(false);

	let isLoading = $state(false);
	let error = $state('');
	let success = $state(false);

	function validateForm(): { valid: boolean; message: string } {
		// Validate user ID
		const userIdNum = Number.parseInt(userId, 10);
		if (!Number.isInteger(userIdNum) || userIdNum <= 0) {
			return { valid: false, message: 'User ID must be a positive integer' };
		}

		// Validate password length
		if (newPassword.length < 8) {
			return { valid: false, message: 'Password must be at least 8 characters' };
		}

		if (newPassword.length > 128) {
			return { valid: false, message: 'Password must be less than 128 characters' };
		}

		// Validate password match
		if (newPassword !== confirmPassword) {
			return { valid: false, message: 'Passwords do not match' };
		}

		// Validate admin fields
		if (!isAdminMode) {
			return { valid: false, message: 'Admin mode must be enabled' };
		}

		if (!adminUserId || !adminUserName || !adminUserEmail) {
			return { valid: false, message: 'All admin fields are required' };
		}

		return { valid: true, message: '' };
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		error = '';
		success = false;

		const validation = validateForm();
		if (!validation.valid) {
			error = validation.message;
			return;
		}

		isLoading = true;

		try {
			const userIdNum = Number.parseInt(userId, 10);
			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-csrf-token': data.csrfToken,
					'x-yona-user-id': adminUserId,
					'x-yona-user-name': adminUserName,
					'x-yona-user-email': adminUserEmail,
					'x-yona-role': 'admin'
				},
				body: JSON.stringify({
					userId: userIdNum,
					newPassword
				})
			});

			if (response.ok) {
				success = true;
				// Clear form on success
				userId = '';
				newPassword = '';
				confirmPassword = '';
			} else {
				const data = (await response.json()) as { error?: string };
				error = data.error || 'Failed to reset password';
			}
		} catch {
			error = 'Failed to reset password';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="reset-container">
	<h1 class="reset-title">Reset Password</h1>
	<p class="reset-subtitle">Administrator password reset utility</p>

	{#if success}
		<div class="success-message" role="status">
			<strong>Success!</strong> Password has been reset. The user will need to log in again.
		</div>
	{/if}

	<form onsubmit={handleSubmit} method="post" class="reset-form">
		<input type="hidden" name="csrfToken" value={data.csrfToken} />
		<!-- Target User Section -->
		<div class="form-section">
			<h2 class="section-title">Target User</h2>

			<div class="form-group">
				<label for="userId" class="form-label">User ID</label>
				<input
					id="userId"
					name="userId"
					type="number"
					min="1"
					class="form-input"
					placeholder="e.g. 123"
					bind:value={userId}
					required
					disabled={isLoading || success}
				/>
			</div>

			<div class="form-group">
				<label for="newPassword" class="form-label">New Password</label>
				<input
					id="newPassword"
					name="newPassword"
					type="password"
					autocomplete="new-password"
					class="form-input"
					placeholder="••••••••"
					bind:value={newPassword}
					required
					disabled={isLoading || success}
				/>
			</div>

			<div class="form-group">
				<label for="confirmPassword" class="form-label">Confirm Password</label>
				<input
					id="confirmPassword"
					name="confirmPassword"
					type="password"
					autocomplete="new-password"
					class="form-input"
					placeholder="••••••••"
					bind:value={confirmPassword}
					required
					disabled={isLoading || success}
				/>
			</div>
		</div>

		<!-- Admin Auth Section -->
		<div class="form-section">
			<h2 class="section-title">Administrator Authentication</h2>

			<div class="form-group">
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={isAdminMode} disabled={isLoading || success} />
					<span>Enable admin mode</span>
				</label>
			</div>

			<div class="form-group">
				<label for="adminUserId" class="form-label">Admin User ID</label>
				<input
					id="adminUserId"
					name="adminUserId"
					type="text"
					class="form-input"
					placeholder="e.g. admin123"
					bind:value={adminUserId}
					required={isAdminMode}
					disabled={isLoading || success || !isAdminMode}
				/>
			</div>

			<div class="form-group">
				<label for="adminUserName" class="form-label">Admin Name</label>
				<input
					id="adminUserName"
					name="adminUserName"
					type="text"
					class="form-input"
					placeholder="e.g. Administrator"
					bind:value={adminUserName}
					required={isAdminMode}
					disabled={isLoading || success || !isAdminMode}
				/>
			</div>

			<div class="form-group">
				<label for="adminUserEmail" class="form-label">Admin Email</label>
				<input
					id="adminUserEmail"
					name="adminUserEmail"
					type="email"
					autocomplete="email"
					class="form-input"
					placeholder="admin@example.com"
					bind:value={adminUserEmail}
					required={isAdminMode}
					disabled={isLoading || success || !isAdminMode}
				/>
			</div>
		</div>

		{#if error}
			<div class="error-message" role="alert">{error}</div>
		{/if}

		<button type="submit" class="submit-button" disabled={isLoading || success}>
			{isLoading ? 'Resetting...' : 'Reset Password'}
		</button>
	</form>

	<div class="reset-links">
		<a href="/login" class="link">Back to Login</a>
	</div>
</div>

<style>
	.reset-container {
		max-width: 480px;
		margin: 60px auto;
		padding: 0;
	}

	.reset-title {
		font-size: 28px;
		font-weight: 700;
		margin: 0 0 8px 0;
		color: #1a1a1a;
		letter-spacing: -0.3px;
	}

	.reset-subtitle {
		font-size: 15px;
		color: #666;
		margin: 0 0 32px 0;
		line-height: 1.5;
	}

	.reset-form {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.form-section {
		padding: 20px;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
	}

	.section-title {
		font-size: 14px;
		font-weight: 600;
		color: #374151;
		margin: 0 0 16px 0;
		text-transform: uppercase;
		letter-spacing: 0.5px;
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

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	.error-message {
		padding: 12px 16px;
		font-size: 13px;
		color: #dc2626;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 4px;
		line-height: 1.4;
	}

	.success-message {
		padding: 12px 16px;
		font-size: 13px;
		color: #059669;
		background: #ecfdf5;
		border: 1px solid #a7f3d0;
		border-radius: 4px;
		line-height: 1.4;
		margin-bottom: 24px;
	}

	.submit-button {
		padding: 12px 20px;
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

	.reset-links {
		display: flex;
		justify-content: center;
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
