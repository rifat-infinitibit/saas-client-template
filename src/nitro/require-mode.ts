import { definePlugin } from 'nitro';

import { mode } from '../env.server';

// A deployment without a Mode refuses to start instead of erroring per page.
export default definePlugin(() => {
	mode();
});
