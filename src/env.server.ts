// Read per boundary, so a SaaS-only setting never breaks Standalone.

// No default: a deployment that half-works as the Mode it did not mean is
// worse than one that refuses to.
export function mode() {
	const value = process.env.APP_MODE;

	if (value !== 'saas' && value !== 'standalone')
		throw new Error(`APP_MODE must be 'saas' or 'standalone'`);

	return value;
}

export function tenantPortalUrl() {
	return url('TENANT_PORTAL_URL');
}

export function platformAuthUrl() {
	return url('PLATFORM_AUTH_URL');
}

export function gtServerUrl() {
	return url('GT_SERVER_URL');
}

function url(name: string) {
	const value = process.env[name];

	if (!value || !URL.canParse(value))
		throw new Error(`${name} must be an absolute URL`);

	return value;
}
