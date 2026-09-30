import { createFileRoute, stripSearchParams } from '@tanstack/react-router';

import { listSearchDefaults, listSearchSchema } from '@/components/list-search';
import { NotesList } from '@/features/notes/components/notes-list';

export const Route = createFileRoute('/_authenticated/notes')({
	validateSearch: listSearchSchema,
	search: { middlewares: [stripSearchParams(listSearchDefaults)] },
	component: NotesList,
});
