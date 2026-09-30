import { setupServer } from 'msw/node';

/**
 * Every upstream a test talks to is declared on this server, per test, with
 * `server.use(...)`. Anything undeclared fails the test.
 */
export const server = setupServer();
