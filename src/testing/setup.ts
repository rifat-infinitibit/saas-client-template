import { server } from './msw';

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
