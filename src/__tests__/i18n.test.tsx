import { screen } from '@testing-library/react';

import { cookieName } from '@/paraglide/runtime';
import { renderRouter } from '@/testing/render-router';
import { holdSession } from '@/testing/session';

import de from '../../messages/de.json';
import en from '../../messages/en.json';

const keys = (catalogue: object) =>
	Object.keys(catalogue)
		.filter((key) => key !== '$schema')
		.sort();

afterEach(() => {
	vi.unstubAllEnvs();
});

it('has every message in both English and German', () => {
	expect(keys(de)).toEqual(keys(en));
});

it('draws German when the saved locale is de', async () => {
	vi.stubEnv('APP_MODE', 'saas');
	document.cookie = `${cookieName}=de`;
	holdSession();

	await renderRouter('/');

	const banner = await screen.findByRole('status');

	expect(banner.textContent).toBe('Die Vorlage läuft.');
	expect(document.documentElement.lang).toBe('de');
});
