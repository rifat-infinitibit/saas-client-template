import { screen } from '@testing-library/react';

import { renderRouter } from '@/testing/render-router';

it('draws the home route from the design system', async () => {
	await renderRouter('/');

	const banner = await screen.findByRole('status');

	expect(banner.textContent).toBe('The template is running.');
});
