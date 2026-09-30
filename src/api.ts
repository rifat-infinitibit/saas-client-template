// What the browser may reach under `/api`, shared with the server's proxy and
// with orval's tag filter so no hook is generated for a path the proxy refuses.

/** Service tags forwarded as `/api/<tag>`: a Service mounts each tag there. */
export const FORWARDED_TAGS = ['notes'] as const;

export const IDENTITY_PATH = '/api/identity';

/** Who the Session says the user is. No Workspace in Standalone. */
export interface Identity {
	email: string | null;
	workspace: string | null;
	roles: string[];
	permissions: string[];
}
