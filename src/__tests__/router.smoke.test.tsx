import { screen } from '@testing-library/react';

import { renderRouter } from '@/testing/render-router';

it('draws the home route from the design system', async () => {
	await renderRouter('/');

	const banner = await screen.findByRole('status');

	expect(banner.textContent).toBe('The template is running.');
});

it('answers an address no route draws with a not-found screen', async () => {
	await renderRouter('/no-such-page');

	const banner = await screen.findByRole('status');

	expect(banner.textContent).toBe('Page not found');
});
