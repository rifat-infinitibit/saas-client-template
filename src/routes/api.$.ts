import { createFileRoute } from '@tanstack/react-router';

import { proxy } from '@/api-proxy.server';

const handler = ({ request }: { request: Request }) => proxy(request);

export const Route = createFileRoute('/api/$')({
	server: {
		handlers: {
			GET: handler,
			POST: handler,
			PUT: handler,
			PATCH: handler,
			DELETE: handler,
		},
	},
});
