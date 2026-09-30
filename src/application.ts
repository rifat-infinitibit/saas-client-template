// Rename all three when starting a new Application from the template.

/** How the platform and gt know this Application. */
export const APPLICATION_NAME = 'saas-client-template';

export const COOKIE_PREFIX = `__Host-${APPLICATION_NAME}`;

/**
 * Where gt's Facade mounts this Application's Service; the Service path follows
 * it unchanged. gt's to choose, since gt already answers paths such as `/api/files`.
 */
export const FACADE_PREFIX = '/api/saas-client-template';
