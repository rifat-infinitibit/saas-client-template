import { createFileRoute } from '@tanstack/react-router';

import { APPLICATION_NAME } from '@/application';
import { gtServerUrl, mode, tenantPortalUrl } from '@/env.server';
import { beginArrival } from '@/session.server';

export const Route = createFileRoute('/signin')({
	server: {
		handlers: {
			GET: () => {
				const headers = new Headers({ 'cache-control': 'no-store' });

				if (mode() === 'saas') {
					headers.set('location', tenantPortalUrl());
				} else {
					headers.set('location', entraSignInUrl());
					beginArrival(headers);
				}

				return new Response(null, { status: 302, headers });
			},
		},
	},
});

function entraSignInUrl() {
	const url = new URL('/api/auth/sso/login', gtServerUrl());

	url.searchParams.set('app', APPLICATION_NAME);
	// The Entra session outlives ours: without the prompt, a signed-out user on
	// a shared machine is silently signed back in as the previous person.
	url.searchParams.set('prompt', 'select_account');

	return url.toString();
}
