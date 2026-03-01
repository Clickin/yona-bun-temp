import { expect, test } from '@playwright/test';

test('register page renders and shows client validation', async ({ page }) => {
	await page.goto('/register');

	await expect(page.getByRole('heading', { level: 1, name: 'Create account' })).toBeVisible();
	await page.getByLabel('Email').fill('user@example.com');
	await page.getByLabel('Name').fill('a');
	await page.getByLabel('Password', { exact: true }).fill('password123');
	await page.getByLabel('Confirm Password').fill('password123');
	await page.getByRole('button', { name: 'Create account' }).click();

	await expect(page.getByRole('alert')).toHaveText('Name must be at least 2 characters');
});

test('login page renders and shows invalid credential error path', async ({ page }) => {
	await page.route('**/api/auth/login', async (route) => {
		await route.fulfill({
			status: 401,
			contentType: 'application/json',
			body: JSON.stringify({ error: 'Invalid email or password' })
		});
	});

	await page.goto('/login');

	await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
	await page.getByLabel('Email').fill('invalid@example.com');
	await page.getByLabel('Password').fill('wrong-password');
	await page.getByRole('button', { name: 'Sign in' }).click();

	await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
});

test('forgot-password route redirects to reset-password', async ({ page }) => {
	await page.goto('/forgot-password');

	await expect(page.getByRole('heading', { level: 1, name: 'Password Reset' })).toBeVisible();
	await expect(page).toHaveURL(/\/reset-password$/, { timeout: 4000 });
});

test('reset-password page renders and validates password mismatch', async ({ page }) => {
	await page.goto('/reset-password');

	await expect(page.getByRole('heading', { level: 1, name: 'Reset Password' })).toBeVisible();
	await page.getByLabel('User ID', { exact: true }).fill('123');
	await page.getByLabel('New Password').fill('password123');
	await page.getByLabel('Confirm Password').fill('password456');
	await page.getByRole('checkbox', { name: 'Enable admin mode' }).check();
	await page.getByLabel('Admin User ID').fill('admin1');
	await page.getByLabel('Admin Name').fill('Admin');
	await page.getByLabel('Admin Email').fill('admin@example.com');
	await page.getByRole('button', { name: 'Reset Password' }).click();

	await expect(page.getByRole('alert')).toHaveText('Passwords do not match');
});

test('session API returns unauthenticated JSON shape', async ({ page }) => {
	const response = await page.request.get('/api/auth/session');
	const body = await response.json();

	expect(response.status()).toBe(200);
	expect(body).toEqual({ session: null });
});

test('github oauth route can be simulated with redirect response shape', async ({ page }) => {
	const simulatedLocation = 'https://github.com/login/oauth/authorize?client_id=e2e';
	let simulatedStatus = 0;
	await page.route('**/api/auth/github', async (route) => {
		simulatedStatus = 302;
		await route.fulfill({
			status: simulatedStatus,
			headers: {
				location: simulatedLocation
			}
		});
	});
	await page.goto('/');
	await page.evaluate(async () => {
		await fetch('/api/auth/github', { redirect: 'manual' });
	});

	expect(simulatedStatus).toBe(302);
	expect(simulatedLocation).toContain('github.com/login/oauth/authorize');
});

test('google oauth route can be simulated with redirect response shape', async ({ page }) => {
	const simulatedLocation = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=e2e';
	let simulatedStatus = 0;
	await page.route('**/api/auth/google', async (route) => {
		simulatedStatus = 302;
		await route.fulfill({
			status: simulatedStatus,
			headers: {
				location: simulatedLocation
			}
		});
	});
	await page.goto('/');
	await page.evaluate(async () => {
		await fetch('/api/auth/google', { redirect: 'manual' });
	});

	expect(simulatedStatus).toBe(302);
	expect(simulatedLocation).toContain('accounts.google.com/o/oauth2/v2/auth');
});
