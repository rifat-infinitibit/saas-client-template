import { setIconSprite } from '@infinitibit_gmbh/ui/icons';
import iconSprite from '@infinitibit_gmbh/ui/icons.svg?url';
import { createRouter } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen';

// Module scope: the server and the browser both enter through here, and every
// `<Icon>` needs the sprite before the first render.
setIconSprite(iconSprite);

export function getRouter() {
	return createRouter({
		routeTree,
		defaultPreload: 'intent',
	});
}
