import { useQuery } from '@tanstack/react-query';

import {
	IDENTITY_PATH,
	type Identity,
	identitySchema,
} from '@/features/api/lib/api';

// By hand: the proxy shapes the Identity, so no Service spec describes it.
export function useIdentity() {
	const { data } = useQuery({
		queryKey: [IDENTITY_PATH],
		queryFn: readIdentity,
	});

	return data ?? null;
}

async function readIdentity(): Promise<Identity> {
	const response = await fetch(IDENTITY_PATH);

	// The refusal's `error_code` is what tells a Session error from any other.
	if (!response.ok)
		throw new Error(`${IDENTITY_PATH} answered ${response.status}`, {
			cause: await response.json().catch(() => null),
		});

	return identitySchema.parse(await response.json());
}
