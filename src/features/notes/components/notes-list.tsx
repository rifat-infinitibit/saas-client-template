import { ActivityIndicator, AlertBanner, Button } from '@infinitibit_gmbh/ui';
import { keepPreviousData } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';

import { DataTable, dataTableFeatures } from '@/components/data-table';
import { ListSearch } from '@/components/list-search';
import { useListNotes } from '@/features/api/generated/service';
import type { Note } from '@/features/api/generated/service.schemas';
import { NewNoteDialog } from '@/features/notes/components/new-note-dialog';
import { ShellActions } from '@/features/shell/components/shell';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';

const route = getRouteApi('/_authenticated/notes');

const column = createColumnHelper<typeof dataTableFeatures, Note>();

// A factory, so the headers are read in the locale of the render that asks.
const notesColumns = () =>
	column.columns([
		column.accessor('title', { header: m.notes_column_title() }),
		column.accessor('body', { header: m.notes_column_body() }),
		column.accessor('created_at', {
			header: m.notes_column_created(),
			cell: (info) =>
				new Date(info.getValue()).toLocaleDateString(getLocale(), {
					dateStyle: 'medium',
				}),
			meta: { align: 'end' },
		}),
	]);

export function NotesList() {
	const { page, size, search } = route.useSearch();
	const navigate = route.useNavigate();

	const notes = useListNotes(
		{ page, size, search: search || undefined },
		{ query: { placeholderData: keepPreviousData } },
	);

	return (
		<section aria-labelledby="notes-title" className="flex flex-col gap-6">
			<ShellActions>
				<NewNoteDialog />
			</ShellActions>
			<h1 className="text-heading-h1 font-semibold" id="notes-title">
				{m.notes_title()}
			</h1>
			<ListSearch label={m.notes_search()} />
			{notes.isError ? (
				<AlertBanner title={m.notes_error()} variant="error" />
			) : notes.data ? (
				<DataTable
					columns={notesColumns()}
					empty={search ? m.notes_no_match({ search }) : m.notes_empty()}
					onPageChange={(next) =>
						void navigate({
							search: (previous) => ({ ...previous, page: next }),
						})
					}
					page={page}
					pageCount={Math.ceil(notes.data.total / size)}
					rowActions={(note) => (
						<Button
							aria-label={m.notes_copy_label({ title: note.title })}
							onClick={() => void navigator.clipboard.writeText(note.body)}
							size="sm"
							variant="tertiary"
						>
							{m.notes_copy()}
						</Button>
					)}
					rows={notes.data.items}
				/>
			) : (
				<ActivityIndicator label={m.notes_loading()} />
			)}
		</section>
	);
}
