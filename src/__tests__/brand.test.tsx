import { readdirSync } from 'node:fs';

import { screen } from '@testing-library/react';

import { brands } from '@/features/brand/lib/brand';
import { renderRouter } from '@/testing/render-router';

beforeEach(() => {
	vi.stubEnv('APP_MODE', 'saas');
});

afterEach(() => {
	vi.unstubAllEnvs();
});

it.for(['default', 'gt'])('dresses the document as %s', async (brand) => {
	vi.stubEnv('APP_BRAND', brand);

	await renderRouter('/');

	expect(document.documentElement.dataset.theme).toBe(brand);
});

it.for([
	['default', 'InfinitiBit'],
	['gt', 'Grant Thornton'],
])('wears the %s favicon and logo', async ([brand, name]) => {
	vi.stubEnv('APP_BRAND', brand);

	await renderRouter('/');

	expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe(
		`/brand/${brand}/favicon.ico`,
	);
	expect(screen.getByRole('img', { name }).getAttribute('src')).toBe(
		`/brand/${brand}/logo.svg`,
	);
});

it.for(brands)('ships every %s asset', (brand) => {
	expect(readdirSync(`public/brand/${brand}`).sort()).toEqual([
		'favicon.ico',
		'logo.svg',
		'mark.svg',
	]);
});

it.for([undefined, '', 'GT', 'acme'])(
	'falls back to the default Brand when APP_BRAND is %j',
	async (value) => {
		vi.stubEnv('APP_BRAND', value);

		await renderRouter('/');

		expect(document.documentElement.dataset.theme).toBe('default');
	},
);
