import { createFileRoute } from '@tanstack/react-router';

import {
	listSearchSchema,
	stripListSearchDefaults,
} from '@/components/list-search';
import { NotesList } from '@/features/notes/components/notes-list';

export const Route = createFileRoute('/_authenticated/notes')({
	validateSearch: listSearchSchema,
	search: { middlewares: [stripListSearchDefaults] },
	component: NotesList,
});
