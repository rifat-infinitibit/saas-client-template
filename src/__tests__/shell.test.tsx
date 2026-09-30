import { Button } from '@infinitibit_gmbh/ui';
import { createRoute } from '@tanstack/react-router';
import { screen, within } from '@testing-library/react';

import { Route as authenticated } from '@/routes/_authenticated';
import { ShellActions } from '@/shell';
import { renderRouter } from '@/testing/render-router';
import { holdSession } from '@/testing/session';

// No template Screen fills the actions slot yet, so this file mounts one
// beside the real ones.
authenticated.addChildren([
	...Object.values(authenticated.children ?? {}),
	createRoute({
		getParentRoute: () => authenticated,
		path: '/with-actions',
		component: () => (
			<ShellActions>
				<Button>Export</Button>
			</ShellActions>
		),
	}),
]);

beforeEach(() => {
	vi.stubEnv('APP_MODE', 'saas');
	holdSession();
});
afterEach(() => {
	vi.unstubAllEnvs();
});

it("draws the Application's navigation in the top bar, marking the current Screen", async () => {
	await renderRouter('/');

	const banner = await screen.findByRole('banner');
	const home = within(
		within(banner).getByRole('navigation', { name: 'Application' }),
	).getByRole('link', { name: 'Home' });

	expect(home.getAttribute('href')).toBe('/');
	expect(home.getAttribute('aria-current')).toBe('page');
});

it("puts a Screen's actions in the top bar", async () => {
	await renderRouter('/with-actions');

	const banner = await screen.findByRole('banner');

	expect(within(banner).getByRole('button', { name: 'Export' })).toBeTruthy();
	expect(
		within(screen.getByRole('main')).queryByRole('button', { name: 'Export' }),
	).toBeNull();
});
