import { createFileRoute } from '@tanstack/react-router';

import { APPLICATION_NAME } from '@/application';
import { gtServerUrl, mode, tenantPortalUrl } from '@/env.server';
import { ARRIVAL_SET_COOKIE } from '@/features/auth/lib/session.server';

export const Route = createFileRoute('/signin')({
	server: {
		handlers: {
			GET: () =>
				new Response(null, {
					status: 302,
					headers:
						mode() === 'saas'
							? { location: tenantPortalUrl(), 'cache-control': 'no-store' }
							: {
									location: entraSignInUrl(),
									'cache-control': 'no-store',
									'set-cookie': ARRIVAL_SET_COOKIE,
								},
				}),
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
