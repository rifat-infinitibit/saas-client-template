import { getListNotesMockHandler } from '@/features/api/generated/service.msw';
import type { Note } from '@/features/api/generated/service.schemas';

/** `GET /api/notes` answered from `notes`, paged and searched as the Service does. */
export function pagedNotes(notes: Note[]) {
	return getListNotesMockHandler(({ request }) => {
		const { searchParams } = new URL(request.url);
		const page = Number(searchParams.get('page') ?? 1);
		const size = Number(searchParams.get('size') ?? 20);
		const search = searchParams.get('search')?.toLowerCase() ?? '';
		const found = notes.filter((note) =>
			`${note.title} ${note.body}`.toLowerCase().includes(search),
		);

		return {
			items: found.slice((page - 1) * size, page * size),
			total: found.length,
			page,
			size,
		};
	});
}
