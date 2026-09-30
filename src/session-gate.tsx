import { Button, Card, CardSlot } from '@infinitibit_gmbh/ui';
import {
	ErrorComponent,
	type ErrorComponentProps,
	useLoaderData,
} from '@tanstack/react-router';

import { brandAsset, brandNames } from '@/brand';
import { m } from '@/paraglide/messages';

export type GateState = 'no-session' | 'not-provisioned';

// The code decides, never the status: a 404 is also a document that is not
// there. Carried over from local-file-client, which read each row off the
// running upstreams: gt at localhost:9000 on 2026-08-15, SaaS Local File at
// localhost:8002 on 2026-08-19. Re-read them when an upstream changes its gate.
// Everything else is the Screen's, including permission refusals: signing in
// again would not help. The unmapped codes are listed in session-errors.test.tsx.
const GATE_BY_ERROR_CODE: Partial<Record<string, GateState>> = {
	// Our proxy with no Session cookie, and the Service with no bearer.
	NOT_AUTHENTICATED: 'no-session',
	// The Service, to any bearer it will not accept.
	INVALID_PLATFORM_TOKEN: 'no-session',
	// gt's Facade and gt's `/api/auth/sso/me`, to the same unusable bearer.
	AUTH_NOT_AUTHENTICATED: 'no-session',
	SSO_SESSION_EXPIRED: 'no-session',
	// The Service's `TenantNotProvisioned`: a Workspace with none of this
	// Application. Read from its source; only a portal Launch can mint the token.
	TENANT_NOT_FOUND: 'not-provisioned',
};

/** The gate a failed call puts the user behind, or null if it is the Screen's. */
export function sessionGateFor(error: unknown): GateState | null {
	const body = error instanceof Error ? error.cause : null;
	const code =
		typeof body === 'object' && body !== null && 'error_code' in body
			? body.error_code
			: null;

	return typeof code === 'string' ? (GATE_BY_ERROR_CODE[code] ?? null) : null;
}

/** The router's default error component: the gate, or the router's own. */
export function SessionGate({ error, ...props }: ErrorComponentProps) {
	const state = sessionGateFor(error);

	return state === null ? (
		<ErrorComponent error={error} {...props} />
	) : (
		<GateScreen state={state} />
	);
}

export function GateScreen({ state }: { state: GateState }) {
	const { brand, signIn } = useLoaderData({ from: '__root__' });
	const [title, description] =
		state === 'no-session'
			? [
					m.gate_sign_in_title(),
					signIn === 'portal'
						? m.gate_sign_in_portal()
						: m.gate_sign_in_entra(),
				]
			: [m.gate_not_provisioned_title(), m.gate_not_provisioned_description()];

	return (
		<main className="grid min-h-dvh place-items-center">
			<Card className="max-w-md">
				<CardSlot>
					<div className="flex flex-col gap-6">
						<img alt={brandNames[brand]} src={brandAsset(brand, 'logo.svg')} />
						<h1>{title}</h1>
						<p>{description}</p>
						{/* A document navigation: `/signin` answers with a redirect off this origin. */}
						<Button asChild variant="primary">
							<a href="/signin">
								{signIn === 'portal'
									? m.gate_action_portal()
									: m.gate_action_entra()}
							</a>
						</Button>
					</div>
				</CardSlot>
			</Card>
		</main>
	);
}
