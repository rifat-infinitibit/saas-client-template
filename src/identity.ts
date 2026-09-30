import { useQuery } from '@tanstack/react-query';

import { IDENTITY_PATH, type Identity } from '@/api';

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

	if (!response.ok) throw new Error(`${IDENTITY_PATH} ${response.status}`);

	return response.json() as Promise<Identity>;
}
