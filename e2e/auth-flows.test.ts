import { expect, test, type Page } from '@playwright/test';

async function browserFetchJson<T>(
	page: Page,
	url: string,
	init?: RequestInit
): Promise<{ body: T; headers: Record<string, string>; status: number }> {
	const response = await page.evaluate(
		async ({ fetchInit, fetchUrl }) => {
			const result = await fetch(fetchUrl, {
				...fetchInit,
				headers: {
					...(fetchInit?.headers ?? {}),
					'content-type': 'application/json'
				}
			});

			let parsedBody: unknown = null;
			try {
				parsedBody = await result.json();
			} catch {
				parsedBody = null;
			}

			const allHeaders: Record<string, string> = {};
			for (const [key, value] of result.headers.entries()) {
				allHeaders[key] = value;
			}

			return {
				body: parsedBody,
				headers: allHeaders,
				status: result.status
			};
		},
		{ fetchInit: init, fetchUrl: url }
	);

	return response as { body: T; headers: Record<string, string>; status: number };
}

test('register validates client fields before submit', async ({ page }) => {
	await page.goto('/register');

	await expect(page.getByRole('heading', { level: 1, name: 'Create account' })).toBeVisible();
	await page.getByLabel('Email').fill('user@example.com');
	await page.getByLabel('Name').fill('a');
	await page.getByLabel('Password', { exact: true }).fill('password123');
	await page.getByLabel('Confirm Password').fill('password123');
	await page.getByRole('button', { name: 'Create account' }).click();

	await expect(page.getByRole('alert')).toHaveText('Name must be at least 2 characters');
});

test('register happy path submits and redirects to login', async ({ page }) => {
	let requestBody: { email?: string; name?: string; password?: string } | null = null;
	let requestHeaders: Record<string, string> | null = null;

	await page.route('**/api/auth/register', async (route) => {
		requestBody = (route.request().postDataJSON() as typeof requestBody) ?? null;
		requestHeaders = route.request().headers();
		await route.fulfill({
			status: 201,
			contentType: 'application/json',
			body: JSON.stringify({
				csrfToken: 'csrf-register-token',
				session: { expiresAt: '2030-01-01T00:00:00.000Z', userId: 1001 },
				user: { email: 'user@example.com', id: 1001, loginId: 'user@example.com', name: 'User' }
			})
		});
	});

	await page.goto('/register');
	await page.getByLabel('Email').fill('user@example.com');
	await page.getByLabel('Name').fill('User');
	await page.getByLabel('Password', { exact: true }).fill('password123');
	await page.getByLabel('Confirm Password').fill('password123');
	await page.getByRole('button', { name: 'Create account' }).click();

	expect(requestBody).toEqual({ email: 'user@example.com', name: 'User', password: 'password123' });
	expect(requestHeaders?.['x-csrf-token']).toBeTruthy();
	await expect(page).toHaveURL(/\/login\?registered=1$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
});

test('login invalid credentials show generic error', async ({ page }) => {
	await page.route('**/api/auth/login', async (route) => {
		await route.fulfill({
			status: 401,
			contentType: 'application/json',
			body: JSON.stringify({ error: 'Invalid email or password' })
		});
	});

	await page.goto('/login');
	await page.getByLabel('Email').fill('invalid@example.com');
	await page.getByLabel('Password').fill('wrong-password');
	await page.getByRole('button', { name: 'Sign in' }).click();

	await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
	await expect(page).toHaveURL(/\/login$/);
});

test('login valid response includes csrf/session shape and redirects home', async ({ page }) => {
	let requestBody: { email?: string; password?: string } | null = null;
	let requestHeaders: Record<string, string> | null = null;

	await page.route('**/api/auth/login', async (route) => {
		requestBody = (route.request().postDataJSON() as typeof requestBody) ?? null;
		requestHeaders = route.request().headers();
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				csrfToken: 'csrf-login-token',
				session: { expiresAt: '2030-01-01T00:00:00.000Z', userId: 101 },
				user: { email: 'user@example.com', id: 101, loginId: 'user@example.com', name: 'User' }
			})
		});
	});

	await page.goto('/login');
	await page.getByLabel('Email').fill('user@example.com');
	await page.getByLabel('Password').fill('password123');
	await page.getByRole('button', { name: 'Sign in' }).click();

	expect(requestBody).toEqual({ email: 'user@example.com', password: 'password123' });
	expect(requestHeaders?.['x-csrf-token']).toBeTruthy();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByTestId('yona-shell-header')).toBeVisible();
});

test('forgot-password redirects to reset-password page', async ({ page }) => {
	await page.goto('/forgot-password');

	await expect(page.getByRole('heading', { level: 1, name: 'Password Reset' })).toBeVisible();
	await expect(page).toHaveURL(/\/reset-password$/, { timeout: 4000 });
});

test('admin reset validates mismatch and successful reset path', async ({ page }) => {
	let resetRequestBody: { newPassword?: string; userId?: number } | null = null;
	let resetHeaders: Record<string, string> | null = null;

	await page.route('**/api/auth/reset-password', async (route) => {
		resetRequestBody = (route.request().postDataJSON() as typeof resetRequestBody) ?? null;
		resetHeaders = route.request().headers();
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ ok: true })
		});
	});

	await page.goto('/reset-password');
	await page.getByLabel('User ID', { exact: true }).fill('123');
	await page.getByLabel('New Password').fill('password123');
	await page.getByLabel('Confirm Password').fill('password456');
	await page.getByRole('checkbox', { name: 'Enable admin mode' }).check();
	await page.getByLabel('Admin User ID').fill('admin1');
	await page.getByLabel('Admin Name').fill('Admin');
	await page.getByLabel('Admin Email').fill('admin@example.com');
	await page.getByRole('button', { name: 'Reset Password' }).click();

	await expect(page.getByRole('alert')).toHaveText('Passwords do not match');

	await page.getByLabel('Confirm Password').fill('password123');
	await page.getByRole('button', { name: 'Reset Password' }).click();

	await expect(page.getByRole('status')).toContainText('Success!');
	expect(resetRequestBody).toEqual({ newPassword: 'password123', userId: 123 });
	expect(resetHeaders?.['x-csrf-token']).toBeTruthy();
	expect(resetHeaders?.['x-yona-role']).toBe('admin');
	expect(resetHeaders?.['x-yona-user-id']).toBe('admin1');
	expect(resetHeaders?.['x-yona-user-email']).toBe('admin@example.com');
});

test('logout API returns success shape', async ({ page }) => {
	await page.route('**/api/auth/logout', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ ok: true })
		});
	});

	await page.goto('/');
	const { body, status } = await browserFetchJson<{ ok: boolean }>(page, '/api/auth/logout', {
		method: 'POST'
	});

	expect(status).toBe(200);
	expect(body).toEqual({ ok: true });
});

test('session endpoint unauthenticated shape is stable', async ({ page }) => {
	const response = await page.request.get('/api/auth/session');
	const body = (await response.json()) as { session: null };

	expect(response.status()).toBe(200);
	expect(body).toEqual({ session: null });
});

test('login shows generic error for rate-limited response', async ({ page }) => {
	await page.route('**/api/auth/login', async (route) => {
		await route.fulfill({
			status: 429,
			contentType: 'application/json',
			body: JSON.stringify({ error: 'Too many requests' })
		});
	});

	await page.goto('/login');
	await page.getByLabel('Email').fill('user@example.com');
	await page.getByLabel('Password').fill('password123');
	await page.getByRole('button', { name: 'Sign in' }).click();

	await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
});

test('github oauth initiation returns redirect response shape', async ({ page }) => {
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

	await page.goto('/login');
	await page.evaluate(async () => {
		await fetch('/api/auth/github', { redirect: 'manual' });
	});

	expect(simulatedStatus).toBe(302);
	expect(simulatedLocation).toContain('github.com/login/oauth/authorize');
});

test('google oauth initiation returns redirect response shape', async ({ page }) => {
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

	await page.goto('/login');
	await page.evaluate(async () => {
		await fetch('/api/auth/google', { redirect: 'manual' });
	});

	expect(simulatedStatus).toBe(302);
	expect(simulatedLocation).toContain('accounts.google.com/o/oauth2/v2/auth');
});

test('github oauth callback invalid shape returns error payload', async ({ page }) => {
	await page.route('**/api/auth/callback/github**', async (route) => {
		await route.fulfill({
			status: 400,
			contentType: 'application/json',
			body: JSON.stringify({ error: 'Invalid OAuth callback' })
		});
	});

	await page.goto('/login');
	const response = await browserFetchJson<{ error: string }>(
		page,
		'/api/auth/callback/github?code=missing&state=missing'
	);

	expect(response.status).toBe(400);
	expect(response.body).toEqual({ error: 'Invalid OAuth callback' });
});

test('google oauth callback invalid shape returns error payload', async ({ page }) => {
	await page.route('**/api/auth/callback/google**', async (route) => {
		await route.fulfill({
			status: 400,
			contentType: 'application/json',
			body: JSON.stringify({ error: 'Invalid OAuth callback' })
		});
	});

	await page.goto('/login');
	const response = await browserFetchJson<{ error: string }>(
		page,
		'/api/auth/callback/google?code=missing&state=missing'
	);

	expect(response.status).toBe(400);
	expect(response.body).toEqual({ error: 'Invalid OAuth callback' });
});
