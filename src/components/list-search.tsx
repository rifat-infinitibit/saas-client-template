import { Input } from '@infinitibit_gmbh/ui';
import { Icon } from '@infinitibit_gmbh/ui/icons';
import { useDebouncer } from '@tanstack/react-pacer';
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

/**
 * For `stripSearchParams` in the route, which leaves them out of the address
 * so an untouched list is a bare URL. Called there, where it takes the route's
 * search type.
 */
export const listSearchDefaults = listSearchSchema.parse({});

/**
 * A list's search field. What the user types shows at once; `onSearch` hears
 * it once typing stops or the field is left, so the address and the Service
 * see one search rather than every keystroke.
 */
export function ListSearch({
	label,
	value,
	onSearch,
}: {
	label: string;
	/** The search the list shows now, from the address. */
	value: string;
	onSearch: (search: string) => void;
}) {
	const [draft, setDraft] = React.useState(value);
	const [shown, setShown] = React.useState(value);
	const debouncer = useDebouncer(
		(typed: string) => {
			if (typed.trim() !== value) onSearch(typed.trim());
		},
		{ wait: 300 },
	);

	// Back, Forward or a link changed the search underneath the field.
	if (value !== shown) {
		setShown(value);
		if (value !== draft.trim()) setDraft(value);
	}

	return (
		<Input
			aria-label={label}
			leadingIcon={<Icon name="search" />}
			onBlur={() => debouncer.flush()}
			onChange={(event) => {
				setDraft(event.target.value);
				debouncer.maybeExecute(event.target.value);
			}}
			type="search"
			value={draft}
		/>
	);
}
