import { screen } from '@testing-library/react';

import { renderRouter } from '@/testing/render-router';

afterEach(() => {
	vi.unstubAllEnvs();
});

it('draws the home route from the design system', async () => {
	vi.stubEnv('APP_MODE', 'saas');

	await renderRouter('/');

	const banner = await screen.findByRole('status');

	expect(banner.textContent).toBe('The template is running.');
});

it('answers an address no route draws with a not-found screen', async () => {
	vi.stubEnv('APP_MODE', 'saas');

	// Two segments: any single one is a tenant slug a Launch lands on.
	await renderRouter('/no/such-page');

	const banner = await screen.findByRole('status');

	expect(banner.textContent).toBe('Page not found');
});

it('draws no Application for a deployment that never said its Mode', async () => {
	vi.stubEnv('APP_MODE', undefined);

	await renderRouter('/');

	expect(await screen.findByText(/APP_MODE/)).toBeTruthy();
	expect(screen.queryByText('The template is running.')).toBeNull();
});
