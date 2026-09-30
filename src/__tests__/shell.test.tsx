import { screen, within } from '@testing-library/react';

import { renderRouter } from '@/testing/render-router';
import { holdSession } from '@/testing/session';

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
