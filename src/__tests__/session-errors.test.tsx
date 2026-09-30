import { useMutation } from '@tanstack/react-query';
import { createRoute } from '@tanstack/react-router';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { IDENTITY_PATH } from '@/api';
import { useIdentity } from '@/identity';
import { Route as root } from '@/routes/__root';
import { server } from '@/testing/msw';
import { renderRouter } from '@/testing/render-router';
import { holdSession } from '@/testing/session';

// The real root, router and QueryClient, with this file's Screen as the only
// route: no Screen in the template yet fails the way these tests need.
let Screen: () => React.ReactNode = () => null;

root.addChildren([
	createRoute({
		getParentRoute: () => root,
		path: '/',
		component: () => <Screen />,
	}),
]);

// How a refusal reaches a Screen: the body the proxy relays, as the cause.
const refusal = (body: object) => new Error('refused', { cause: body });

const SIGN_IN = 'Sign in to continue';
const NOT_PROVISIONED = 'No access to this Application';
const ROUTER_ERROR = /something went wrong/i;

beforeEach(() => {
	vi.stubEnv('APP_MODE', 'saas');
	holdSession();
});
afterEach(() => {
	vi.unstubAllEnvs();
});

async function heading() {
	return (await screen.findByRole('heading', { level: 1 })).textContent;
}

describe('the classifier, as the router default error component', () => {
	async function throwing(error: unknown) {
		Screen = () => {
			throw error;
		};
		await renderRouter('/');
	}

	it.for([
		['NOT_AUTHENTICATED', SIGN_IN],
		['INVALID_PLATFORM_TOKEN', SIGN_IN],
		['AUTH_NOT_AUTHENTICATED', SIGN_IN],
		['SSO_SESSION_EXPIRED', SIGN_IN],
		['TENANT_NOT_FOUND', NOT_PROVISIONED],
	])('gates %s', async ([code, title]) => {
		await throwing(refusal({ error_code: code }));

		expect(await heading()).toBe(title);
	});

	// Refusals the upstreams answer that are not the Session's: the Screen's
	// own, out of a Screen's reach, or a permission rather than a way in.
	it.for([
		'HTTP_ERROR',
		'FILE_NOT_FOUND',
		'VALIDATION_ERROR',
		'RATE_LIMIT_EXCEEDED',
		'SERVER_ERROR',
		'NOT_FOUND',
		'CONFLICT',
		'APP_ERROR',
		'AUTH_UNAVAILABLE',
		'SSO_TOKEN_INVALID',
		'SSO_TOKEN_EXPIRED',
		'SSO_GROUP_ACCESS_DENIED',
		'SSO_GROUPS_NOT_CONFIGURED',
		'SSO_APP_UNKNOWN',
		'SSO_CALLBACK_FAILED',
		'SSO_STATE_INVALID',
		'SSO_PROFILE_INCOMPLETE',
		'PLATFORM_TOKEN_UNCONFIGURED',
		'AUTH_PERMISSION_DENIED',
		'AUTH_ACCOUNT_INACTIVE',
		'AUTH_NOT_INVITED',
		'AUTH_TOKEN_MISSING_CLAIM',
		'AUTH_IDENTITY_CONFLICT',
		'TENANT_MISMATCH',
		'APPLICATION_MISMATCH',
		'TENANT_NOT_IN_TOKEN',
		'PERMISSION_DENIED',
	])('leaves %s to the router', async (code) => {
		await throwing(refusal({ error_code: code }));

		expect(await screen.findByText(ROUTER_ERROR)).toBeTruthy();
		expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
	});

	it.for([
		['a refusal with no code', refusal({ detail: 'Not authenticated' })],
		['an error with no body', new Error('offline')],
		[
			'a code named after an Object key',
			refusal({ error_code: 'constructor' }),
		],
	])('leaves %s to the router', async ([, error]) => {
		await throwing(error);

		expect(await screen.findByText(ROUTER_ERROR)).toBeTruthy();
	});
});

describe('a query', () => {
	function identityAnswers(status: number, body: object) {
		const asked: string[] = [];

		server.use(
			http.get(`${location.origin}${IDENTITY_PATH}`, ({ request }) => {
				asked.push(request.url);

				return HttpResponse.json(body, { status });
			}),
		);
		Screen = () => <p>{useIdentity() === null ? 'Asking' : 'Known'}</p>;

		return asked;
	}

	it('meets the sign-in card on a Session error, asking once', async () => {
		const asked = identityAnswers(401, { error_code: 'NOT_AUTHENTICATED' });

		await renderRouter('/');

		expect(await heading()).toBe(SIGN_IN);
		expect(asked).toHaveLength(1);
	});

	it('meets the not-provisioned card when the Workspace has no Application', async () => {
		const asked = identityAnswers(404, { error_code: 'TENANT_NOT_FOUND' });

		await renderRouter('/');

		expect(await heading()).toBe(NOT_PROVISIONED);
		expect(asked).toHaveLength(1);
	});

	it('retries any other error and stays on the Screen', async () => {
		const asked = identityAnswers(502, { error_code: 'HTTP_ERROR' });

		await renderRouter('/');

		await waitFor(() => expect(asked.length).toBeGreaterThan(1), {
			timeout: 3000,
		});
		expect(screen.getByText('Asking')).toBeTruthy();
		expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
	});
});

describe('a mutation', () => {
	function notesAnswer(status: number, body: object) {
		server.use(
			http.post(`${location.origin}/api/notes`, () =>
				HttpResponse.json(body, { status }),
			),
		);
		Screen = () => {
			const create = useMutation({
				mutationFn: async () => {
					const response = await fetch('/api/notes', { method: 'POST' });

					if (!response.ok) throw refusal(await response.json());
				},
			});

			return (
				<button type="button" onClick={() => create.mutate()}>
					{create.isError ? 'Not saved' : 'Save'}
				</button>
			);
		};
	}

	it('meets the sign-in card on a Session error', async () => {
		notesAnswer(401, { error_code: 'NOT_AUTHENTICATED' });
		await renderRouter('/');

		fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

		expect(await heading()).toBe(SIGN_IN);
	});

	it('stays on the Screen for any other error', async () => {
		notesAnswer(422, { error_code: 'VALIDATION_ERROR' });
		await renderRouter('/');

		fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

		expect(
			await screen.findByRole('button', { name: 'Not saved' }),
		).toBeTruthy();
		expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
	});
});
