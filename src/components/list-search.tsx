import { Input } from '@infinitibit_gmbh/ui';
import { Icon } from '@infinitibit_gmbh/ui/icons';
import { useDebouncer } from '@tanstack/react-pacer';
import { useNavigate, useSearch } from '@tanstack/react-router';
import React from 'react';
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

// `stripSearchParams` takes its type from the route it is called in, so each
// route calls it with these rather than sharing one middleware.
export const listSearchDefaults = listSearchSchema.parse({});

/**
 * The current list's search field. What the user types shows at once; the
 * address takes it once typing stops or the field is left, returning to the
 * first page in the same navigation.
 */
export function ListSearch({ label }: { label: string }) {
	const value = useSearch({
		strict: false,
		// Typed here, not from the routes, so it compiles before any list exists.
		select: (search: Partial<z.output<typeof listSearchSchema>>) =>
			search.search ?? '',
	});
	const navigate = useNavigate();
	const [draft, setDraft] = React.useState(value);
	const [seen, setSeen] = React.useState(value);
	const debouncer = useDebouncer(
		(typed: string) => {
			// Back or a link replaced the draft while this waited.
			if (typed !== draft || typed.trim() === value) return;
			void navigate({
				to: '.',
				search: (previous) => ({ ...previous, search: typed.trim(), page: 1 }),
				// Replaced, so Back leaves the list instead of retracing searches.
				replace: true,
				resetScroll: false,
			});
		},
		{ wait: 300 },
	);

	if (value !== seen) {
		setSeen(value);
		if (value !== draft.trim()) setDraft(value);
	}

	return (
		<Input
			aria-label={label}
			className="max-w-sm"
			leadingIcon={<Icon name="search" />}
			onBlur={() => debouncer.flush()}
			onChange={(event) => {
				setDraft(event.target.value);
				debouncer.maybeExecute(event.target.value);
			}}
			placeholder={label}
			type="search"
			value={draft}
		/>
	);
}
