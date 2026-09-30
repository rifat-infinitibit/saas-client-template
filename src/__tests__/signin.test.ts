// @vitest-environment node

import { Route } from '@/routes/signin';
import { respond } from '@/testing/respond';

const PORTAL_URL = 'https://portal.example.com/';
const GT_URL = 'https://gt.example.com';

afterEach(() => {
	vi.unstubAllEnvs();
});

function signIn() {
	return respond(Route, new Request('http://localhost/signin'));
}

it('sends a SaaS visitor to the Tenant portal', async () => {
	vi.stubEnv('APP_MODE', 'saas');
	vi.stubEnv('TENANT_PORTAL_URL', PORTAL_URL);

	const response = await signIn();

	expect(response.status).toBe(302);
	expect(response.headers.get('location')).toBe(PORTAL_URL);
	// A deployment repointed at another portal must not be shadowed by a
	// redirect the browser cached from the old one.
	expect(response.headers.get('cache-control')).toBe('no-store');
});

it('sends a Standalone visitor to gt Entra sign-in, forcing the account prompt', async () => {
	vi.stubEnv('APP_MODE', 'standalone');
	vi.stubEnv('GT_SERVER_URL', GT_URL);

	const response = await signIn();

	expect(response.status).toBe(302);
	expect(response.headers.get('location')).toBe(
		`${GT_URL}/api/auth/sso/login?app=saas-client-template&prompt=select_account`,
	);
	expect(response.headers.get('cache-control')).toBe('no-store');
});

it.for([undefined, '', 'SAAS', 'gt'])(
	'refuses a Mode of %o, naming APP_MODE',
	async (appMode) => {
		vi.stubEnv('APP_MODE', appMode);
		vi.stubEnv('TENANT_PORTAL_URL', PORTAL_URL);
		vi.stubEnv('GT_SERVER_URL', GT_URL);

		await expect(signIn()).rejects.toThrow(/APP_MODE/);
	},
);

it.for([undefined, 'portal.example.com'])(
	'refuses SaaS with a Tenant portal of %o, naming TENANT_PORTAL_URL',
	async (portalUrl) => {
		vi.stubEnv('APP_MODE', 'saas');
		vi.stubEnv('TENANT_PORTAL_URL', portalUrl);
		vi.stubEnv('GT_SERVER_URL', GT_URL);

		await expect(signIn()).rejects.toThrow(/TENANT_PORTAL_URL/);
	},
);

it.for([undefined, 'gt.example.com'])(
	'refuses Standalone with a gt of %o, naming GT_SERVER_URL',
	async (gtUrl) => {
		vi.stubEnv('APP_MODE', 'standalone');
		vi.stubEnv('GT_SERVER_URL', gtUrl);
		vi.stubEnv('TENANT_PORTAL_URL', PORTAL_URL);

		await expect(signIn()).rejects.toThrow(/GT_SERVER_URL/);
	},
);

it('needs nothing of the other Mode', async () => {
	vi.stubEnv('APP_MODE', 'saas');
	vi.stubEnv('TENANT_PORTAL_URL', PORTAL_URL);
	vi.stubEnv('GT_SERVER_URL', undefined);

	expect((await signIn()).status).toBe(302);

	vi.stubEnv('APP_MODE', 'standalone');
	vi.stubEnv('GT_SERVER_URL', GT_URL);
	vi.stubEnv('TENANT_PORTAL_URL', undefined);

	expect((await signIn()).status).toBe(302);
});
