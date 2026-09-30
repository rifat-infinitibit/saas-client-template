import {
	REFRESH_COOKIE,
	SESSION_COOKIE,
} from '@/features/auth/lib/session.server';

/** A token carrying `claims`, signed by no one: the gate never verifies it. */
export function tokenWith(claims: object) {
	return `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
}

/** Puts a Session in the browser's cookie jar, where adopting a Launch leaves it. */
export function holdSession(access = tokenWith({}), refresh?: string) {
	document.cookie = `${SESSION_COOKIE}=${access}; Path=/; Secure`;
	if (refresh !== undefined)
		document.cookie = `${REFRESH_COOKIE}=${refresh}; Path=/; Secure`;
}
