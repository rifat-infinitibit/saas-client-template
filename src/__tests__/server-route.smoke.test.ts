// @vitest-environment node

import { createRootRoute, createRoute } from '@tanstack/react-router';
import { http, HttpResponse } from 'msw';

import { server } from '@/testing/msw';
import { respond } from '@/testing/respond';

// A stand-in until the client has server routes of its own: it forwards to an
// upstream, which is the shape every real one here takes.
const greeting = createRoute({
	getParentRoute: () => createRootRoute(),
	path: '/greeting/$name',
	server: {
		handlers: {
			POST: async ({ params, request }) => {
				const upstream = await fetch(
					`https://upstream.example.com/greet/${params.name}`,
				);

				return new Response(
					`${await upstream.text()} ${await request.text()}`,
					{
						status: 201,
					},
				);
			},
		},
	},
});

it('answers a Request with the Response the route handler returns', async () => {
	server.use(
		http.get('https://upstream.example.com/greet/ada', () =>
			HttpResponse.text('Hello, ada.'),
		),
	);

	const response = await respond(
		greeting,
		new Request('http://localhost/greeting/ada', {
			body: 'Welcome back.',
			method: 'POST',
		}),
		{ name: 'ada' },
	);

	expect(response.status).toBe(201);
	expect(await response.text()).toBe('Hello, ada. Welcome back.');
});
