import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { render } from '@testing-library/react';

import { getRouter } from '@/router';

/**
 * The real router, route tree and root document, opened at `at` in memory.
 * Rendered into `document` because the root route draws `<html>` itself.
 */
export async function renderRouter(at: string) {
	const router = await getRouter();

	router.update({
		...router.options,
		history: createMemoryHistory({ initialEntries: [at] }),
	});
	await router.load();

	render(<RouterProvider router={router} />, { container: document });
}
