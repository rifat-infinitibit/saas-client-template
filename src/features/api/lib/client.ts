import type { QueryKey } from '@tanstack/react-query';
import Axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

// No base URL: every call is same-origin, and the proxy alone knows the Service.
const instance = Axios.create();

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
	try {
		return (await instance.request<T>(config)).data;
	} catch (error) {
		// The refusal's body as `cause`, where the Session gate reads its code.
		// A request that got no answer keeps its own cause.
		if (Axios.isAxiosError<unknown>(error) && error.response)
			Object.assign(error, { cause: error.response.data });

		throw error;
	}
}

export type ErrorType<Body> = AxiosError<Body>;

export type BodyType<Body> = Body;

/**
 * The URL, then whichever of the operation's arguments were given: its path
 * params, then its query params as one object. A key getter called with nothing
 * is the URL alone, which matches every page and search of its endpoint.
 */
export function apiQueryKey<Args extends Record<string, unknown>>(
	args: Args,
	{ url }: { url: string; queryOptions?: unknown },
): QueryKey {
	return [url, ...Object.values(args).filter((value) => value !== undefined)];
}
