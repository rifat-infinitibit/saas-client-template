import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import type { Note } from '@/features/api/generated/service.schemas';
import { IDENTITY_PATH } from '@/features/api/lib/api';
import { pagedNotes } from '@/features/notes/lib/notes-mock';
import { server } from '@/testing/msw';
import { renderRouter } from '@/testing/render-router';
import { holdSession } from '@/testing/session';

const notes: Note[] = Array.from({ length: 25 }, (_, index) => ({
	id: `note-${index + 1}`,
	title: `Note ${index + 1}`,
	body: `Body of note ${index + 1}`,
	created_at: '2026-09-01T09:30:00Z',
}));

beforeEach(() => {
	vi.stubEnv('APP_MODE', 'saas');
	holdSession();
	server.use(
		http.get(`${location.origin}${IDENTITY_PATH}`, () =>
			HttpResponse.json({
				email: 'ada@example.com',
				workspace: 'acme',
				roles: [],
				permissions: [],
			}),
		),
	);
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

const titles = () =>
	within(screen.getAllByRole('rowgroup')[1])
		.getAllByRole('row')
		.map((row) => within(row).getAllByRole('cell')[0].textContent);

it('lists the first page of Notes from the Service', async () => {
	server.use(pagedNotes(notes));

	await renderRouter('/notes');

	expect(await screen.findByRole('cell', { name: 'Note 1' })).toBeTruthy();
	expect(titles()).toHaveLength(20);
	expect(titles().at(-1)).toBe('Note 20');
});

it('pages through the Notes on the Service', async () => {
	server.use(pagedNotes(notes));

	await renderRouter('/notes');
	await screen.findByRole('cell', { name: 'Note 1' });
	fireEvent.click(
		within(screen.getByRole('navigation', { name: 'Pages' })).getByRole(
			'button',
			{ name: /2/ },
		),
	);

	expect(await screen.findByRole('cell', { name: 'Note 21' })).toBeTruthy();
	expect(titles()).toEqual([
		'Note 21',
		'Note 22',
		'Note 23',
		'Note 24',
		'Note 25',
	]);
});

it("copies a Note's text from its row", async () => {
	const writeText = vi.fn(() => Promise.resolve());

	vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
	server.use(pagedNotes(notes));

	await renderRouter('/notes');
	fireEvent.click(
		await screen.findByRole('button', { name: 'Copy text of Note 2' }),
	);

	expect(writeText).toHaveBeenCalledWith('Body of note 2');
});

it('says so when there are no Notes', async () => {
	server.use(pagedNotes([]));

	await renderRouter('/notes');

	expect(await screen.findByText('No notes yet.')).toBeTruthy();
});

it('draws the Session gate when the Service refuses the Session', async () => {
	server.use(
		http.get(`${location.origin}/api/notes`, () =>
			HttpResponse.json(
				{ detail: 'Not authenticated', error_code: 'NOT_AUTHENTICATED' },
				{ status: 401 },
			),
		),
	);

	await renderRouter('/notes');

	expect(
		await screen.findByRole('heading', { name: 'Sign in to continue' }),
	).toBeTruthy();
});

it('keeps any other failure on the Screen, once the retries are spent', async () => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
	server.use(
		http.get(`${location.origin}/api/notes`, () =>
			HttpResponse.json({ detail: 'Boom' }, { status: 500 }),
		),
	);

	await renderRouter('/notes');
	await vi.advanceTimersByTimeAsync(10_000);

	expect(
		await screen.findByText('The notes could not be loaded.'),
	).toBeTruthy();
});

it('reaches the Notes from the top bar', async () => {
	server.use(pagedNotes(notes));

	await renderRouter('/');
	fireEvent.click(
		within(screen.getByRole('navigation', { name: 'Application' })).getByRole(
			'link',
			{ name: 'Notes' },
		),
	);

	expect(await screen.findByRole('cell', { name: 'Note 1' })).toBeTruthy();
});

describe('creating a Note', () => {
	const openNewNote = async () => {
		fireEvent.click(await screen.findByRole('button', { name: 'New note' }));

		return screen.findByRole('dialog', { name: 'New note' });
	};

	it('says nothing is wrong until the first submit, then what is', async () => {
		server.use(pagedNotes(notes));

		await renderRouter('/notes');
		const dialog = await openNewNote();
		const title = within(dialog).getByRole('textbox', { name: 'Title' });

		fireEvent.change(title, { target: { value: 'x' } });
		fireEvent.change(title, { target: { value: '' } });
		expect(title.getAttribute('aria-invalid')).not.toBe('true');

		fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

		expect(await within(dialog).findByText('Enter a title.')).toBeTruthy();
		expect(title.getAttribute('aria-invalid')).toBe('true');
	});
});
