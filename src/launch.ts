/**
 * Hands the credentials a Launch carries in the fragment to this origin's own
 * server, which keeps them in cookies no script can read. One shape in both
 * Modes: the Tenant portal's Launch and gt's sign-in callback.
 *
 * No QueryClient to clear: the portal opens every Launch in a new tab and gt's
 * callback is a full redirect, so a Launch always boots a fresh document.
 */
export async function adoptLaunch() {
	const fragment = new URLSearchParams(location.hash.slice(1));
	const token = fragment.get('token');

	if (!token) return;

	const refresh = fragment.get('refresh_token');

	// Before the round trip, so the credentials leave the address bar and history
	// at once. `replaceState`, or Back would bring them back.
	history.replaceState(
		history.state,
		'',
		`${location.pathname}${location.search}`,
	);

	// A failed adoption still boots the Application, as a visitor with no Session.
	await fetch('/session', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(
			refresh ? { token, refresh_token: refresh } : { token },
		),
	}).catch(() => undefined);
}
