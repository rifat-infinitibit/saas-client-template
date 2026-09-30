import { server } from './msw';

// Start's compiler is what splits a server function into a browser fetch and a
// server handler, and tests run without it. The handler runs in-process instead,
// against the same `process.env` a test stubs.
vi.mock('@tanstack/react-start', async (importOriginal) => ({
	...(await importOriginal()),
	createServerFn: () => ({
		handler:
			(handler: (ctx: { data: unknown }) => unknown) =>
			async (options?: { data?: unknown }) =>
				await handler({ data: options?.data }),
	}),
}));

// jsdom lays nothing out and leaves `scrollTo` unimplemented; the router calls
// it after every navigation. Guarded for suites that run under `node`.
if (typeof window !== 'undefined') {
	window.scrollTo = () => undefined;
}

beforeAll(() => {
	server.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => {
	server.resetHandlers();
});
afterAll(() => {
	server.close();
});
