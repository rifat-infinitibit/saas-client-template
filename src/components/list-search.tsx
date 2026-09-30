import { stripSearchParams } from '@tanstack/react-router';
import { z } from 'zod';

/**
 * What every list keeps in the address: its page, page size and search. A
 * value a link gets wrong falls back to its default, so a bad link still opens.
 * A route with filters of its own `.extend`s it.
 */
export const listSearchSchema = z.object({
	page: z.number().int().min(1).default(1).catch(1),
	size: z.number().int().min(1).max(100).default(20).catch(20),
	search: z.string().default('').catch(''),
});

/** Leaves the defaults out of the address, so an untouched list is a bare URL. */
export const stripListSearchDefaults = stripSearchParams(
	listSearchSchema.parse({}),
);
