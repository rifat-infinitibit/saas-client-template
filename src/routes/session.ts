import { createFileRoute } from '@tanstack/react-router';

import { adoptSession, endSession } from '@/session.server';

// Not under `/api`, which is forwarded to the Service.
export const Route = createFileRoute('/session')({
	server: {
		handlers: {
			POST: ({ request }) => adoptSession(request),
			DELETE: ({ request }) => endSession(request),
		},
	},
});
