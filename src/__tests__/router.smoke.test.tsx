import { screen } from '@testing-library/react';

import { renderApp } from '@/testing/render-app';

it('draws the home route from the design system', async () => {
	await renderApp('/');

	const banner = await screen.findByRole('status');

	expect(banner.textContent).toBe('The template is running.');
});
