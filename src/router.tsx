import { setIconSprite } from '@infinitibit_gmbh/ui/icons';
import iconSprite from '@infinitibit_gmbh/ui/icons.svg?url';
import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

import { adoptLaunch } from './launch';
import { routeTree } from './routeTree.gen';
import { SessionGate, sessionGateFor } from './session-gate';

// Module scope: the server and the browser both enter through here, and every
// `<Icon>` needs the sprite before the first render.
setIconSprite(iconSprite);

// Thrown to the gate, never retried: an ended Session does not come back.
// Anything else stays on the Screen that asked.
const toGate = (error: Error) => sessionGateFor(error) !== null;

export async function getRouter() {
	// Before the router reads the address bar, so no screen ever sees the
	// credentials. A fragment never reaches the server, so this is browser-only.
	if (!import.meta.env.SSR) await adoptLaunch();

	// Per router, so one reader's data never lands in another's SSR.
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: (failures, error) => !toGate(error) && failures < 3,
				throwOnError: toGate,
			},
			// Left at no retries: a replayed write can land twice.
			mutations: { throwOnError: toGate },
		},
	});

	const router = createRouter({
		routeTree,
		defaultPreload: 'intent',
		defaultErrorComponent: SessionGate,
	});

	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
}
