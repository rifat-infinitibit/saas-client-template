import { z } from 'zod';

// What the browser may reach under `/api`. orval's tag filter is to read the
// same list, so no hook is generated for a path the proxy refuses.

/** Service tags forwarded as `/api/<tag>`: a Service mounts each tag there. */
export const FORWARDED_TAGS = ['notes'] as const;

export const IDENTITY_PATH = '/api/identity';

export const identitySchema = z.object({
	email: z.string().nullable(),
	workspace: z.string().nullable(),
	roles: z.array(z.string()),
	permissions: z.array(z.string()),
});

/** Who the Session says the user is. No Workspace in Standalone. */
export type Identity = z.infer<typeof identitySchema>;
