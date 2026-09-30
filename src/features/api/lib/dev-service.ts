import { setupWorker } from 'msw/browser';

import {
	createdNotes,
	pagedNotes,
	sampleNotes,
} from '@/features/notes/lib/notes-mock';

/**
 * Answers the Service's paths in the browser under `vite dev`, so the template
 * runs with no Service behind the proxy. Drop a handler once the real Service
 * serves its path; anything without one goes through to the proxy.
 */
export async function startDevService() {
	const notes = sampleNotes();

	await setupWorker(pagedNotes(notes), createdNotes(notes)).start({
		onUnhandledFrame: 'bypass',
		quiet: true,
	});
}
