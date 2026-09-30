import { FORWARDED_TAGS, IDENTITY_PATH, type Identity } from '@/api';
import { FACADE_PREFIX } from '@/application';
import { gtServerUrl, mode, serviceUrl } from '@/env.server';
import {
	dropSession,
	holdSession,
	readSession,
	renewSession,
} from '@/session.server';

// Anything else could carry a credential or a claim the Service would believe.
const FORWARDED_REQUEST_HEADERS = ['accept', 'content-type'];
// The Session is ours to set, and fetch has already decoded the body these
// would describe.
const WITHHELD_RESPONSE_HEADERS = [
	'set-cookie',
	'content-encoding',
	'content-length',
];

export async function proxy(request: Request) {
	const { pathname, search } = new URL(request.url);
	const identity = pathname === IDENTITY_PATH;

	if (!identity && !forwardable(pathname))
		return new Response(null, { status: 404 });

	const standalone = mode() === 'standalone';
	const target = upstreamUrl(
		identity ? null : `${pathname}${search}`,
		standalone,
	);

	if (target === null)
		return new Response(null, {
			status: 501,
			headers: { 'cache-control': 'no-store' },
		});

	const { access, refresh } = readSession(request);

	// Cleared too: a refresh token left alone would renew a Session that ended.
	if (access === null)
		return Response.json(
			{ detail: 'Not authenticated', error_code: 'NOT_AUTHENTICATED' },
			{ status: 401, headers: dropSession(new Headers()) },
		);

	const headers = new Headers();

	for (const name of FORWARDED_REQUEST_HEADERS) {
		const value = request.headers.get(name);

		if (value !== null) headers.set(name, value);
	}

	// Buffered, so a replay can send it again.
	const body =
		request.method === 'GET' ? undefined : await request.arrayBuffer();
	const send = (bearer: string) => {
		headers.set('authorization', `Bearer ${bearer}`);
		// The Facade reads gt's own cookie and ignores the bearer.
		if (standalone) headers.set('cookie', `sso_access_token=${bearer}`);

		return fetch(target, {
			method: request.method,
			headers,
			body,
			redirect: 'manual',
		});
	};

	let upstream = await send(access);
	const renewed =
		upstream.status === 401 && refresh !== null
			? await renewSession(refresh)
			: null;

	if (renewed) {
		await upstream.body?.cancel();
		upstream = await send(renewed.access);
	}

	const answered = new Headers(upstream.headers);

	for (const name of WITHHELD_RESPONSE_HEADERS) answered.delete(name);

	if (upstream.status === 401) dropSession(answered);
	else if (renewed) holdSession(answered, renewed);

	if (identity && upstream.ok) {
		const described = identityFrom(
			await upstream.json().catch(() => null),
			standalone,
		);

		// Headers still go out, so a renewed pair is held either way.
		return described === null
			? new Response(null, { status: 502, headers: answered })
			: Response.json(described, { headers: answered });
	}

	return new Response(upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers: answered,
	});
}

/** Where `path` goes in this Mode; the Identity's source when it is null. */
function upstreamUrl(path: string | null, standalone: boolean) {
	if (standalone)
		return new URL(
			path === null ? '/api/auth/sso/me' : `${FACADE_PREFIX}${path}`,
			gtServerUrl(),
		);

	const service = serviceUrl();

	return service === null ? null : new URL(path ?? '/api/session', service);
}

// By hand from either upstream's answer: the Service's session in SaaS, gt's
// signed-in user in Standalone, which has one tenant and no Workspace.
function identityFrom(body: unknown, standalone: boolean): Identity | null {
	const { email, tenant_slug, roles, permissions } = (body ?? {}) as Record<
		string,
		unknown
	>;
	const workspace = standalone ? null : tenant_slug;

	return (typeof email === 'string' || email === null) &&
		(typeof workspace === 'string' || workspace === null) &&
		isStrings(roles) &&
		isStrings(permissions)
		? { email, workspace, roles, permissions }
		: null;
}

function isStrings(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === 'string')
	);
}

function forwardable(pathname: string) {
	// An encoded slash is one segment here and two once the Service decodes it.
	if (/%2f/i.test(pathname)) return false;

	return FORWARDED_TAGS.some(
		(tag) => pathname === `/api/${tag}` || pathname.startsWith(`/api/${tag}/`),
	);
}
