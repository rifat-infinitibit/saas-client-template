import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { server } from '@/testing/msw';
import { renderRouter } from '@/testing/render-router';

const TOKEN = 'header.payload.signature';

let adopted: { body: unknown; addressBar: string }[] = [];

beforeEach(() => {
	vi.stubEnv('APP_MODE', 'saas');
	adopted = [];
	server.use(
		http.post(`${location.origin}/session`, async ({ request }) => {
			adopted.push({ body: await request.json(), addressBar: location.href });

			return new HttpResponse(null, { status: 204 });
		}),
	);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

async function launchAt(address: string) {
	history.replaceState(null, '', address);
	await renderRouter(location.pathname);
}

it.for([
	['a SaaS Launch onto a tenant slug', '/acme'],
	["gt's Standalone sign-in callback", '/auth/callback'],
])(
	'adopts %s, with the credentials out of the address bar first',
	async ([, arrival]) => {
		await launchAt(`${arrival}#token=${TOKEN}&refresh_token=r1`);

		expect(adopted).toEqual([
			{
				body: { token: TOKEN, refresh_token: 'r1' },
				addressBar: `${location.origin}${arrival}`,
			},
		]);
		expect(location.hash).toBe('');
		expect((await screen.findByRole('status')).textContent).toBe(
			'The template is running.',
		);
	},
);

it('adopts a Launch without a refresh token', async () => {
	await launchAt(`/acme#token=${TOKEN}`);

	expect(adopted.map(({ body }) => body)).toEqual([{ token: TOKEN }]);
});

it('adopts nothing when the address carries no Launch', async () => {
	await launchAt('/');

	expect(adopted).toEqual([]);
});
