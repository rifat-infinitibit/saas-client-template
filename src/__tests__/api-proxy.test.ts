import { gzipSync } from 'node:zlib';
// @vitest-environment node

import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import { APPLICATION_NAME, FACADE_PREFIX } from '@/application';
import { FORWARDED_TAGS } from '@/features/api/lib/api';
import { Route } from '@/routes/api.$';
import { server } from '@/testing/msw';
import { respond } from '@/testing/respond';

const TOKEN = 'header.payload.signature';

const SERVICE_URL = 'https://service.example.com';

const PLATFORM_AUTH_URL = 'https://auth.platform.example.com';

const GT_URL = 'https://gt.example.com';

// Any forwarded tag, so the proxy is tested with whichever the Application has.
const [TAG] = FORWARDED_TAGS;

const SESSION = `__Host-${APPLICATION_NAME}-session=${TOKEN}`;

const ENDED = [
	`__Host-${APPLICATION_NAME}-session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
	`__Host-${APPLICATION_NAME}-refresh=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
];

afterEach(() => {
	vi.unstubAllEnvs();
});

function call(path: string, init: RequestInit = {}) {
	return respond(Route, new Request(`http://localhost${path}`, init));
}

describe('forwarding to the Service in SaaS', () => {
	beforeEach(() => {
		vi.stubEnv('APP_MODE', 'saas');
		vi.stubEnv('SERVICE_URL', SERVICE_URL);
	});

	it('turns the Session cookie into a bearer and passes the answer back', async () => {
		const seen: {
			url: string;
			headers: Record<string, string>;
			body: unknown;
		}[] = [];

		server.use(
			http.post(`${SERVICE_URL}/api/${TAG}`, async ({ request }) => {
				seen.push({
					url: request.url,
					headers: Object.fromEntries(request.headers),
					body: await request.json(),
				});

				return HttpResponse.json({ id: 1 }, { status: 201 });
			}),
		);

		const response = await call(`/api/${TAG}?draft=true`, {
			method: 'POST',
			headers: {
				cookie: SESSION,
				'content-type': 'application/json',
				accept: 'application/json',
				'x-tenant-id': 'someone-else',
			},
			body: JSON.stringify({ title: 'Hello' }),
		});

		expect(seen).toEqual([
			{
				url: `${SERVICE_URL}/api/${TAG}?draft=true`,
				headers: expect.objectContaining({
					accept: 'application/json',
					authorization: `Bearer ${TOKEN}`,
					'content-type': 'application/json',
				}),
				body: { title: 'Hello' },
			},
		]);
		// The cookie holds the refresh token; the Service would believe a tenant.
		expect(seen[0]?.headers).not.toHaveProperty('cookie');
		expect(seen[0]?.headers).not.toHaveProperty('x-tenant-id');
		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ id: 1 });
	});

	it("withholds the Service's cookies and the framing fetch already undid", async () => {
		server.use(
			http.get(
				`${SERVICE_URL}/api/${TAG}`,
				() =>
					new HttpResponse(gzipSync(JSON.stringify({ items: [] })), {
						headers: {
							'content-type': 'application/json',
							'content-encoding': 'gzip',
							'set-cookie': 'upstream=1',
							'x-request-id': 'abc',
						},
					}),
			),
		);

		const response = await call(`/api/${TAG}`, {
			headers: { cookie: SESSION },
		});

		expect(await response.json()).toEqual({ items: [] });
		expect(response.headers.get('content-encoding')).toBeNull();
		expect(response.headers.getSetCookie()).toEqual([]);
		expect(response.headers.get('x-request-id')).toBe('abc');
	});
});

describe('refusing what the browser may not reach', () => {
	beforeEach(() => {
		vi.stubEnv('APP_MODE', 'saas');
		vi.stubEnv('SERVICE_URL', SERVICE_URL);
	});

	// An undeclared request fails the test, so these also assert nothing left.
	it.for([
		'/api/admin',
		`/api/${TAG}-archive`,
		'/api',
		// Decoded upstream into a path the allowlist never saw.
		`/api/${TAG}%2F..%2Fadmin`,
		`/api/${TAG}/%2e%2e/admin`,
	])('answers %s with 404', async (path) => {
		const response = await call(path, { headers: { cookie: SESSION } });

		expect(response.status).toBe(404);
	});

	it('forwards a path below an allowed tag', async () => {
		server.use(
			http.get(`${SERVICE_URL}/api/${TAG}/7`, () => HttpResponse.json({})),
		);

		const response = await call(`/api/${TAG}/7`, {
			headers: { cookie: SESSION },
		});

		expect(response.status).toBe(200);
	});

	it('answers a visitor with no Session without asking the Service', async () => {
		const response = await call(`/api/${TAG}`, {
			headers: { cookie: `__Host-${APPLICATION_NAME}-refresh=r1` },
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			detail: 'Not authenticated',
			error_code: 'NOT_AUTHENTICATED',
		});
		expect(response.headers.getSetCookie()).toEqual(ENDED);
	});
});

describe('renewing an expired SaaS Session', () => {
	const RENEWED = 'renewed.payload.signature';

	beforeEach(() => {
		vi.stubEnv('APP_MODE', 'saas');
		vi.stubEnv('SERVICE_URL', SERVICE_URL);
		vi.stubEnv('PLATFORM_AUTH_URL', PLATFORM_AUTH_URL);
	});

	// The Service knows only the renewed token.
	function serviceAccepting(token: string) {
		return http.get(`${SERVICE_URL}/api/${TAG}`, ({ request }) =>
			request.headers.get('authorization') === `Bearer ${token}`
				? HttpResponse.json({ items: [] })
				: HttpResponse.json({ error_code: 'TOKEN_EXPIRED' }, { status: 401 }),
		);
	}

	function platformAuthRenewing(refresh: string, renewals: string[] = []) {
		return http.post(
			`${PLATFORM_AUTH_URL}/api/v1/auth/token/refresh`,
			async ({ request }) => {
				const body = z
					.object({ refresh_token: z.string() })
					.parse(await request.json());

				renewals.push(body.refresh_token);

				return body.refresh_token === refresh
					? HttpResponse.json({
							access_token: RENEWED,
							refresh_token: `${refresh}-next`,
							token_type: 'Bearer',
							expires_in: 900,
						})
					: new HttpResponse(null, { status: 401 });
			},
		);
	}

	function withSession(refresh: string) {
		return {
			headers: {
				cookie: `${SESSION}; __Host-${APPLICATION_NAME}-refresh=${refresh}`,
			},
		};
	}

	it('renews once at Platform Auth, replays, and holds the new pair', async () => {
		server.use(serviceAccepting(RENEWED), platformAuthRenewing('r-renew'));

		const response = await call(`/api/${TAG}`, withSession('r-renew'));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ items: [] });
		expect(response.headers.getSetCookie()).toEqual([
			`__Host-${APPLICATION_NAME}-session=${RENEWED}; HttpOnly; Secure; SameSite=Lax; Path=/`,
			`__Host-${APPLICATION_NAME}-refresh=r-renew-next; HttpOnly; Secure; SameSite=Lax; Path=/`,
		]);
	});

	it('replays the body the first attempt consumed', async () => {
		const bodies: unknown[] = [];

		server.use(
			platformAuthRenewing('r-body'),
			http.post(`${SERVICE_URL}/api/${TAG}`, async ({ request }) => {
				bodies.push(await request.json());

				return request.headers.get('authorization') === `Bearer ${RENEWED}`
					? HttpResponse.json({ id: 1 }, { status: 201 })
					: new HttpResponse(null, { status: 401 });
			}),
		);

		const response = await call(`/api/${TAG}`, {
			method: 'POST',
			headers: {
				...withSession('r-body').headers,
				'content-type': 'application/json',
			},
			body: JSON.stringify({ title: 'Hello' }),
		});

		expect(response.status).toBe(201);
		expect(bodies).toEqual([{ title: 'Hello' }, { title: 'Hello' }]);
	});

	it('ends the Session when Platform Auth refuses the refresh token', async () => {
		server.use(serviceAccepting(RENEWED), platformAuthRenewing('other'));

		const response = await call(`/api/${TAG}`, withSession('r-refused'));

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error_code: 'TOKEN_EXPIRED' });
		expect(response.headers.getSetCookie()).toEqual(ENDED);
	});

	it('ends the Session when the Service refuses the renewed token too', async () => {
		server.use(serviceAccepting('nobody'), platformAuthRenewing('r-twice'));

		const response = await call(`/api/${TAG}`, withSession('r-twice'));

		expect(response.status).toBe(401);
		expect(response.headers.getSetCookie()).toEqual(ENDED);
	});

	it('ends a Session that has no refresh token to renew with', async () => {
		server.use(serviceAccepting(RENEWED));

		const response = await call(`/api/${TAG}`, {
			headers: { cookie: SESSION },
		});

		expect(response.status).toBe(401);
		expect(response.headers.getSetCookie()).toEqual(ENDED);
	});

	it('renews once for concurrent requests carrying the same refresh token', async () => {
		const renewals: string[] = [];

		server.use(
			serviceAccepting(RENEWED),
			platformAuthRenewing('r-shared', renewals),
		);

		const responses = await Promise.all(
			[1, 2, 3].map(() => call(`/api/${TAG}`, withSession('r-shared'))),
		);

		// Platform Auth answers a spent refresh token by revoking the family.
		expect(renewals).toEqual(['r-shared']);
		expect(responses.map((response) => response.status)).toEqual([
			200, 200, 200,
		]);
	});
});

describe('reaching the Service through the Facade in Standalone', () => {
	const FACADE = `${GT_URL}${FACADE_PREFIX}`;
	const RENEWED = 'renewed.payload.signature';

	beforeEach(() => {
		vi.stubEnv('APP_MODE', 'standalone');
		vi.stubEnv('GT_SERVER_URL', GT_URL);
		// Standalone's Service sits behind the Facade; this must not matter.
		vi.stubEnv('SERVICE_URL', SERVICE_URL);
	});

	it('rewrites the Service path to the Facade and sends the token as gt reads it', async () => {
		const seen: {
			url: string;
			authorization: string | null;
			cookie: string | null;
		}[] = [];

		server.use(
			http.get(`${FACADE}/api/${TAG}`, ({ request }) => {
				seen.push({
					url: request.url,
					authorization: request.headers.get('authorization'),
					cookie: request.headers.get('cookie'),
				});

				return HttpResponse.json({ items: [] });
			}),
		);

		const response = await call(`/api/${TAG}?page=2`, {
			headers: { cookie: SESSION },
		});

		expect(response.status).toBe(200);
		// The Facade authenticates by gt's own cookie and ignores the bearer.
		expect(seen).toEqual([
			{
				url: `${FACADE}/api/${TAG}?page=2`,
				authorization: `Bearer ${TOKEN}`,
				cookie: `sso_access_token=${TOKEN}`,
			},
		]);
	});

	it('renews at gt, replays, and holds the new pair', async () => {
		server.use(
			http.get(`${FACADE}/api/${TAG}`, ({ request }) =>
				request.headers.get('cookie') === `sso_access_token=${RENEWED}`
					? HttpResponse.json({ items: [] })
					: new HttpResponse(null, { status: 401 }),
			),
			http.post(`${GT_URL}/api/auth/sso/refresh`, ({ request }) =>
				request.headers.get('cookie') === 'sso_refresh_token=r-gt'
					? new HttpResponse(null, {
							status: 204,
							headers: [
								['set-cookie', `sso_access_token=${RENEWED}; HttpOnly; Path=/`],
								[
									'set-cookie',
									'sso_refresh_token=r-gt-next==; HttpOnly; Path=/',
								],
							],
						})
					: new HttpResponse(null, { status: 401 }),
			),
		);

		const response = await call(`/api/${TAG}`, {
			headers: {
				cookie: `${SESSION}; __Host-${APPLICATION_NAME}-refresh=r-gt`,
			},
		});

		expect(response.status).toBe(200);
		expect(response.headers.getSetCookie()).toEqual([
			`__Host-${APPLICATION_NAME}-session=${RENEWED}; HttpOnly; Secure; SameSite=Lax; Path=/`,
			`__Host-${APPLICATION_NAME}-refresh=r-gt-next==; HttpOnly; Secure; SameSite=Lax; Path=/`,
		]);
	});

	it('ends the Session when gt refuses the refresh token', async () => {
		server.use(
			http.get(
				`${FACADE}/api/${TAG}`,
				() => new HttpResponse(null, { status: 401 }),
			),
			http.post(
				`${GT_URL}/api/auth/sso/refresh`,
				() => new HttpResponse(null, { status: 401 }),
			),
		);

		const response = await call(`/api/${TAG}`, {
			headers: {
				cookie: `${SESSION}; __Host-${APPLICATION_NAME}-refresh=r-gt-refused`,
			},
		});

		expect(response.status).toBe(401);
		expect(response.headers.getSetCookie()).toEqual(ENDED);
	});
});

describe('serving the Identity', () => {
	it("shapes the Service's session into an Identity in SaaS", async () => {
		vi.stubEnv('APP_MODE', 'saas');
		vi.stubEnv('SERVICE_URL', SERVICE_URL);
		server.use(
			http.get(`${SERVICE_URL}/api/session`, ({ request }) =>
				request.headers.get('authorization') === `Bearer ${TOKEN}`
					? HttpResponse.json({
							subject_id: 'u-1',
							email: 'ada@example.com',
							tenant_slug: 'acme',
							roles: ['tenant_member'],
							permissions: ['items:read'],
						})
					: new HttpResponse(null, { status: 401 }),
			),
		);

		const response = await call('/api/identity', {
			headers: { cookie: SESSION },
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			email: 'ada@example.com',
			workspace: 'acme',
			roles: ['tenant_member'],
			permissions: ['items:read'],
		});
	});

	it('asks gt in Standalone, where there is no Workspace', async () => {
		vi.stubEnv('APP_MODE', 'standalone');
		vi.stubEnv('GT_SERVER_URL', GT_URL);
		server.use(
			http.get(`${GT_URL}/api/auth/sso/me`, ({ request }) =>
				request.headers.get('authorization') === `Bearer ${TOKEN}`
					? HttpResponse.json({
							email: 'ada@gt.example.com',
							name: 'Ada',
							roles: ['admin'],
							permissions: [],
						})
					: new HttpResponse(null, { status: 401 }),
			),
		);

		const response = await call('/api/identity', {
			headers: { cookie: SESSION },
		});

		expect(await response.json()).toEqual({
			email: 'ada@gt.example.com',
			workspace: null,
			roles: ['admin'],
			permissions: [],
		});
	});

	it("answers 502 when the upstream's answer is not an Identity", async () => {
		vi.stubEnv('APP_MODE', 'saas');
		vi.stubEnv('SERVICE_URL', SERVICE_URL);
		server.use(
			http.get(`${SERVICE_URL}/api/session`, () =>
				HttpResponse.json({ email: 'ada@example.com', roles: 'admin' }),
			),
		);

		const response = await call('/api/identity', {
			headers: { cookie: SESSION },
		});

		expect(response.status).toBe(502);
	});

	it('passes a refusal through for the Session gate to read', async () => {
		vi.stubEnv('APP_MODE', 'saas');
		vi.stubEnv('SERVICE_URL', SERVICE_URL);
		server.use(
			http.get(`${SERVICE_URL}/api/session`, () =>
				HttpResponse.json({ error_code: 'TENANT_NOT_FOUND' }, { status: 404 }),
			),
		);

		const response = await call('/api/identity', {
			headers: { cookie: SESSION },
		});

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error_code: 'TENANT_NOT_FOUND' });
	});
});

it('answers 501 while SaaS has no Service to reach', async () => {
	vi.stubEnv('APP_MODE', 'saas');
	vi.stubEnv('SERVICE_URL', undefined);

	const response = await call(`/api/${TAG}`, { headers: { cookie: SESSION } });

	expect(response.status).toBe(501);
	expect(response.headers.getSetCookie()).toEqual([]);
});

it('refuses a Service address that is not a URL, naming SERVICE_URL', async () => {
	vi.stubEnv('APP_MODE', 'saas');
	vi.stubEnv('SERVICE_URL', 'service.example.com');

	await expect(
		call(`/api/${TAG}`, { headers: { cookie: SESSION } }),
	).rejects.toThrow(/SERVICE_URL/);
});
