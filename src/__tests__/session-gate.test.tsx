import { screen } from '@testing-library/react';

import { renderRouter } from '@/testing/render-router';
import { holdSession, tokenWith } from '@/testing/session';

const APPLICATION = 'The template is running.';
const now = () => Math.floor(Date.now() / 1000);

beforeEach(() => {
	vi.stubEnv('APP_MODE', 'saas');
});
afterEach(() => {
	vi.unstubAllEnvs();
});

async function expectSignInCard() {
	expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
		'Sign in to continue',
	);
	expect(screen.queryByText(APPLICATION)).toBeNull();
}

it('draws the sign-in card instead of the Application to a visitor with no Session', async () => {
	await renderRouter('/');

	await expectSignInCard();
});

it.for([
	['saas', 'Open tenant portal'],
	['standalone', 'Sign in with Microsoft'],
])(
	'sends a %s visitor to /signin, worded for the Mode',
	async ([mode, action]) => {
		vi.stubEnv('APP_MODE', mode);

		await renderRouter('/');

		const link = await screen.findByRole('link', { name: action });

		expect(link.getAttribute('href')).toBe('/signin');
	},
);

it('draws the Application for a live Session', async () => {
	holdSession(tokenWith({ exp: now() + 300 }));

	await renderRouter('/');

	expect((await screen.findByRole('status')).textContent).toBe(APPLICATION);
});

it('draws the sign-in card once the token is past its expiry and the leeway', async () => {
	holdSession(tokenWith({ exp: now() - 61 }));

	await renderRouter('/');

	await expectSignInCard();
});

it.for([
	['a token inside the leeway', tokenWith({ exp: now() - 30 }), undefined],
	['an expired token a refresh token can renew', tokenWith({ exp: 1 }), 'r1'],
	['a token whose expiry cannot be read', 'not.a-jwt.payload', undefined],
])('draws the Application for %s', async ([, access, refresh]) => {
	holdSession(access, refresh);

	await renderRouter('/');

	expect((await screen.findByRole('status')).textContent).toBe(APPLICATION);
});
