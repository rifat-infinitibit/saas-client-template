import { COOKIE_PREFIX } from '@/application';
import { gtServerUrl, mode, platformAuthUrl } from '@/env.server';

const SESSION_COOKIE = `${COOKIE_PREFIX}-session`;
const REFRESH_COOKIE = `${COOKIE_PREFIX}-refresh`;
const ARRIVAL_COOKIE = `${COOKIE_PREFIX}-arrival`;

// No lifetime: the token's own expiry bounds access, upstream enforces it.
const ATTRIBUTES = 'HttpOnly; Secure; SameSite=Lax; Path=/';

const held = (name: string, value: string) => `${name}=${value}; ${ATTRIBUTES}`;
const expired = (name: string) => `${name}=; ${ATTRIBUTES}; Max-Age=0`;

// Both come from a fragment anyone can craft and go into a Set-Cookie, where a
// `;`, comma or newline would start a second attribute or header.
const JWT = /^[\w-]+\.[\w-]+\.[\w-]+$/;
const COOKIE_SAFE = /^[\w.~+/=-]+$/;

// Left by `/signin` on a browser it sends to gt, spent by adoption: a link to
// gt's public callback can carry anyone's pair, but not a `__Host-` cookie
// this origin set. Ten minutes, as long as Entra's authorization code lasts.
export const ARRIVAL_SET_COOKIE = `${ARRIVAL_COOKIE}=1; ${ATTRIBUTES}; Max-Age=600`;

const refused = () => new Response(null, { status: 400 });

export async function adoptSession(request: Request) {
	// An HTML form cannot send JSON, and a cross-site fetch that claims it is
	// preflighted, so no other origin can plant its own Session here.
	if (!request.headers.get('content-type')?.startsWith('application/json'))
		return refused();

	const body: unknown = await request.json().catch(() => null);
	const { token, refresh_token: refresh } = (body ?? {}) as Record<
		string,
		unknown
	>;

	if (typeof token !== 'string' || !JWT.test(token)) return refused();
	if (
		refresh !== undefined &&
		(typeof refresh !== 'string' || !COOKIE_SAFE.test(refresh))
	)
		return refused();

	// SaaS has no mark to ask for: a portal Launch never passes through `/signin`.
	const standalone = mode() === 'standalone';

	if (standalone && cookieValue(request, ARRIVAL_COOKIE) === null)
		return refused();

	const headers = new Headers();

	headers.append('set-cookie', held(SESSION_COOKIE, token));
	// Always written: a refresh token left from the last Session would be spent
	// against this one, and Platform Auth answers reuse by revoking the family.
	headers.append(
		'set-cookie',
		refresh === undefined
			? expired(REFRESH_COOKIE)
			: held(REFRESH_COOKIE, refresh),
	);
	if (standalone) headers.append('set-cookie', expired(ARRIVAL_COOKIE));

	return new Response(null, { status: 204, headers });
}

export function readSession(request: Request) {
	return {
		access: cookieValue(request, SESSION_COOKIE),
		refresh: cookieValue(request, REFRESH_COOKIE),
	};
}

export async function endSession(request: Request) {
	const token = cookieValue(request, SESSION_COOKIE);

	// Standalone has nothing to revoke (ADR 0005).
	if (mode() === 'saas' && token !== null) await revokeAtPlatformAuth(token);

	return new Response(null, {
		status: 204,
		headers: dropSession(new Headers()),
	});
}

export function dropSession(headers: Headers) {
	headers.delete('set-cookie');
	headers.append('set-cookie', expired(SESSION_COOKIE));
	headers.append('set-cookie', expired(REFRESH_COOKIE));

	return headers;
}

interface Pair {
	access: string;
	refresh: string;
}

export function holdSession(headers: Headers, pair: Pair) {
	headers.delete('set-cookie');
	headers.append('set-cookie', held(SESSION_COOKIE, pair.access));
	headers.append('set-cookie', held(REFRESH_COOKIE, pair.refresh));

	return headers;
}

// A request that left before the renewed cookies landed still carries the
// spent refresh token, so the answer is kept a while for it too.
const RETAINED_MS = 60_000;
// ponytail: in-process, so single-flight holds per server; a shared store once
// more than one instance serves the same browser.
const renewals = new Map<string, Promise<Pair | null>>();

/** A fresh pair for `refresh`, or null once it can renew nothing. */
export function renewSession(refresh: string) {
	let renewal = renewals.get(refresh);

	if (!renewal) {
		const forget = () => renewals.delete(refresh);

		renewal = (mode() === 'saas' ? renewAtPlatformAuth : renewAtGt)(refresh);
		renewals.set(refresh, renewal);
		renewal.then(
			(pair) => (pair ? setTimeout(forget, RETAINED_MS).unref() : forget()),
			forget,
		);
	}

	return renewal;
}

async function renewAtPlatformAuth(refresh: string) {
	const url = new URL('/api/v1/auth/token/refresh', platformAuthUrl());

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: refresh }),
			signal: AbortSignal.timeout(10_000),
		});

		if (!response.ok) {
			await response.body?.cancel();

			return null;
		}

		const body = (await response.json()) as Record<string, unknown>;

		return pairOf(body.access_token, body.refresh_token);
	} catch {
		return null;
	}
}

// gt takes the refresh token only as the cookie it issued it in, and answers
// with the pair the same way.
async function renewAtGt(refresh: string) {
	const url = new URL('/api/auth/sso/refresh', gtServerUrl());

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { cookie: `sso_refresh_token=${refresh}` },
			redirect: 'manual',
			signal: AbortSignal.timeout(10_000),
		});

		await response.body?.cancel();

		if (!response.ok) return null;

		const issued = new Map(
			response.headers.getSetCookie().map((cookie) => {
				const [name, ...value] = cookie.split(';')[0].split('=');

				return [name, value.join('=')];
			}),
		);

		return pairOf(
			issued.get('sso_access_token'),
			issued.get('sso_refresh_token'),
		);
	} catch {
		return null;
	}
}

// Headed for a Set-Cookie, so checked as strictly as a Launch.
function pairOf(access: unknown, refresh: unknown): Pair | null {
	return typeof access === 'string' &&
		JWT.test(access) &&
		typeof refresh === 'string' &&
		COOKIE_SAFE.test(refresh)
		? { access, refresh }
		: null;
}

async function revokeAtPlatformAuth(token: string) {
	try {
		const response = await fetch(
			new URL('/api/v1/auth/logout', platformAuthUrl()),
			{
				method: 'POST',
				headers: { authorization: `Bearer ${token}` },
				signal: AbortSignal.timeout(3000),
			},
		);

		await response.body?.cancel();
	} catch {
		// Best effort, misconfiguration included: leaving the user signed in here
		// is worse than a revoke that did not land.
	}
}

// Off the request rather than Start's `getCookie`, so handlers stay plain
// Request → Response functions.
function cookieValue(request: Request, name: string) {
	for (const pair of request.headers.get('cookie')?.split(';') ?? []) {
		const [key, ...value] = pair.trim().split('=');

		if (key === name) return value.join('=');
	}

	return null;
}
