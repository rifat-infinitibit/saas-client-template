import type { QueryKey } from '@tanstack/react-query';
import Axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

// No base URL: every call is same-origin, and the proxy alone knows the Service.
const instance = Axios.create();

export function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
	return instance.request<T>(config).then(
		({ data }) => data,
		(error: unknown) => {
			// The refusal's body as `cause`, where the Session gate reads its code.
			// A request that got no answer keeps its own cause.
			if (Axios.isAxiosError<unknown>(error) && error.response)
				Object.assign(error, { cause: error.response.data });

			throw error;
		},
	);
}

export type ErrorType<Body> = AxiosError<Body>;

export type BodyType<Body> = Body;

/**
 * The URL, then whichever params were given, so a key getter called with
 * nothing matches every page and search of its endpoint.
 */
export function apiQueryKey(
	params: Record<string, unknown> | undefined,
	{ url }: { url: string; queryOptions?: unknown },
): QueryKey {
	return [
		url,
		...Object.values(params ?? {}).filter((value) => value !== undefined),
	];
}
