import {
	AlertBanner,
	Button,
	Dialog,
	DialogBody,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Input,
	Label,
	Textarea,
} from '@infinitibit_gmbh/ui';
import { revalidateLogic, useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import {
	getListNotesQueryKey,
	useCreateNote,
} from '@/features/api/generated/service';
import { m } from '@/paraglide/messages';

const TITLE_MAX = 200;

// A factory, so the messages are read in the locale of the render that asks.
const noteSchema = () =>
	z.object({
		title: z
			.string()
			.trim()
			.min(1, m.notes_title_required())
			.max(TITLE_MAX, m.notes_title_too_long({ max: TITLE_MAX })),
		body: z.string(),
	});

/** "New note" and the dialog it opens. */
export function NewNoteDialog() {
	const [open, setOpen] = React.useState(false);

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<Button size="sm">{m.notes_new()}</Button>
			</DialogTrigger>
			<DialogContent
				closeLabel={m.notes_dialog_close()}
				// The body is a tab stop, so Radix would focus it before the first field.
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					document.getElementById('note-title')?.focus();
				}}
			>
				{/* Inside the content, so every opening starts from an empty form. */}
				<NewNoteForm onCreated={() => setOpen(false)} />
			</DialogContent>
		</Dialog>
	);
}

function NewNoteForm({ onCreated }: { onCreated: () => void }) {
	const queryClient = useQueryClient();

	const create = useCreateNote({
		mutation: {
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: getListNotesQueryKey(),
				});
				toast.success(m.notes_created());
				onCreated();
			},
		},
	});

	const schema = noteSchema();

	const form = useForm({
		defaultValues: { title: '', body: '' },
		validationLogic: revalidateLogic(),
		validators: { onDynamic: schema },
		// The schema checks the values but hands them back untrimmed.
		onSubmit: ({ value }) => create.mutate({ data: schema.parse(value) }),
	});

	return (
		<form
			className="contents"
			noValidate
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
		>
			<DialogHeader>
				<DialogTitle>{m.notes_new()}</DialogTitle>
			</DialogHeader>
			<DialogBody>
				<div className="flex flex-col gap-4">
					{/* In the dialog, not a toast: what was typed is still here to retry. */}
					{create.isError ? (
						<AlertBanner title={m.notes_create_error()} variant="error" />
					) : null}
					<form.Field name="title">
						{(field) => (
							<div className="flex flex-col gap-1">
								<Label htmlFor="note-title">{m.notes_field_title()}</Label>
								<Input
									aria-describedby="note-title-error"
									error={!field.state.meta.isValid}
									id="note-title"
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									value={field.state.value}
								/>
								{/* The design system ships no field message, so this one is written from its tokens. */}
								<p className="text-body-sm text-critical" id="note-title-error">
									{field.state.meta.errors[0]?.message}
								</p>
							</div>
						)}
					</form.Field>
					<form.Field name="body">
						{(field) => (
							<div className="flex flex-col gap-1">
								<Label htmlFor="note-body">{m.notes_field_body()}</Label>
								<Textarea
									id="note-body"
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									value={field.state.value}
								/>
							</div>
						)}
					</form.Field>
				</div>
			</DialogBody>
			<DialogFooter>
				<DialogClose asChild>
					<Button variant="secondary">{m.notes_cancel()}</Button>
				</DialogClose>
				<Button disabled={create.isPending} type="submit">
					{m.notes_create()}
				</Button>
			</DialogFooter>
		</form>
	);
}
