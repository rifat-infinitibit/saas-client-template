import { server } from './msw';

// Tests run without Start's compiler, which is what turns a server function
// into an RPC, and Start ships no runtime for one outside its server. Here the
// handler runs in-process, as it does during SSR.
vi.mock('@tanstack/react-start', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tanstack/react-start')>()),
	createServerFn: () => ({ handler: (fn: () => unknown) => fn }),
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
