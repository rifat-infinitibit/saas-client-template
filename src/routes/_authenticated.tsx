import { Outlet, createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { GateScreen } from '@/session-gate';
import { hasLiveSession } from '@/session.server';

const readLiveSession = createServerFn({ method: 'GET' }).handler(() =>
	hasLiveSession(getRequest()),
);

// Every Application Screen sits below this layout, so the first byte already
// holds the gate or the Application (ADR 0007).
export const Route = createFileRoute('/_authenticated')({
	loader: async () => ({ live: await readLiveSession() }),
	// Settled for the document: a Session that ends later is met as a refusal.
	staleTime: Infinity,
	component: Authenticated,
});

function Authenticated() {
	return Route.useLoaderData().live ? (
		<Outlet />
	) : (
		<GateScreen state="no-session" />
	);
}
