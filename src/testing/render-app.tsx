import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { render } from '@testing-library/react';

import { getRouter } from '@/router';

/**
 * The app's own router, route tree and root document, opened at `at` in memory.
 * Rendered into `document` because the root route draws `<html>` itself.
 */
export async function renderApp(at: string) {
	const router = getRouter();

	router.update({
		...router.options,
		history: createMemoryHistory({ initialEntries: [at] }),
	});
	await router.load();

	render(<RouterProvider router={router} />, { container: document });

	return router;
}
