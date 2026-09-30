import { COOKIE_PREFIX } from '@/application';
import { mode, platformAuthUrl } from '@/env.server';

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

/**
 * Left by `/signin` on a browser it sends to gt, and spent by adoption. gt's
 * callback address is public, so a link to it can carry anyone's pair; what the
 * link cannot carry is a `__Host-` cookie this origin set.
 *
 * ponytail: presence, not binding. Binding the pair to this sign-in needs gt to
 * echo a nonce back in the fragment.
 */
export function beginArrival(headers: Headers) {
	// Entra's authorization codes last ten minutes; a sign-in past that has failed.
	headers.append(
		'set-cookie',
		`${ARRIVAL_COOKIE}=1; ${ATTRIBUTES}; Max-Age=600`,
	);
}

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

export async function endSession(request: Request) {
	const token = cookieValue(request, SESSION_COOKIE);

	// Forgetting it here alone would leave Platform Auth honouring the refresh
	// token for its whole lifetime. gt has nothing to revoke: its tokens are
	// stateless and its own `/logout` only clears gt's cookies.
	if (mode() === 'saas' && token !== null) await revokeAtPlatformAuth(token);

	const headers = new Headers();

	headers.append('set-cookie', expired(SESSION_COOKIE));
	headers.append('set-cookie', expired(REFRESH_COOKIE));

	return new Response(null, { status: 204, headers });
}

// Best effort: leaving the user signed in here is worse than a revoke that
// did not land, so a refusal or a silent Platform Auth still ends the Session.
async function revokeAtPlatformAuth(token: string) {
	await fetch(new URL('/api/v1/auth/logout', platformAuthUrl()), {
		method: 'POST',
		headers: { authorization: `Bearer ${token}` },
		signal: AbortSignal.timeout(3000),
	})
		.then((response) => response.body?.cancel())
		.catch(() => undefined);
}

function cookieValue(request: Request, name: string) {
	for (const pair of request.headers.get('cookie')?.split(';') ?? []) {
		const [key, ...value] = pair.trim().split('=');

		if (key === name) return value.join('=');
	}

	return null;
}
