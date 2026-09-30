import { COOKIE_PREFIX } from '@/application';

/** A token carrying `claims`, signed by no one: the gate never verifies it. */
export function tokenWith(claims: object) {
	return `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
}

/** Puts a Session in the browser's cookie jar, where adopting a Launch leaves it. */
export function holdSession(access = tokenWith({}), refresh?: string) {
	document.cookie = `${COOKIE_PREFIX}-session=${access}; Path=/; Secure`;
	if (refresh !== undefined)
		document.cookie = `${COOKIE_PREFIX}-refresh=${refresh}; Path=/; Secure`;
}
