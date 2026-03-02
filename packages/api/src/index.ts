import { Hono } from 'hono';
import { authApp } from './auth/auth-app';
import { repoApp } from './repos/repo-app';

export const apiApp = new Hono();

apiApp.route('/', authApp);
apiApp.route('/', repoApp);

export { authApp, repoApp };
