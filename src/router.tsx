import { setIconSprite } from '@infinitibit_gmbh/ui/icons';
import iconSprite from '@infinitibit_gmbh/ui/icons.svg?url';
import { createRouter } from '@tanstack/react-router';

import { adoptLaunch } from './launch';
import { routeTree } from './routeTree.gen';

// Module scope: the server and the browser both enter through here, and every
// `<Icon>` needs the sprite before the first render.
setIconSprite(iconSprite);

export async function getRouter() {
	// Before the router reads the address bar, so no screen ever sees the
	// credentials. A fragment never reaches the server, so this is browser-only.
	if (!import.meta.env.SSR) await adoptLaunch();

	return createRouter({
		routeTree,
		defaultPreload: 'intent',
	});
}
