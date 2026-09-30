import { createFileRoute } from '@tanstack/react-router';

import { NotesList } from '@/features/notes/components/notes-list';

export const Route = createFileRoute('/_authenticated/notes')({
	component: NotesList,
});
