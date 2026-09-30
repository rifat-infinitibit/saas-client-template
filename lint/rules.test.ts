// @vitest-environment node

import { spawnSync } from 'node:child_process';

// The project-specific rules run as oxlint JS plugins, which are alpha. If an
// upgrade quietly stops loading one, `pnpm lint` stays green; this does not.
it('flags every project-specific rule on the bad example', () => {
	const { stdout } = spawnSync(
		'node_modules/.bin/oxlint',
		['--format=json', 'lint/fixtures/bad.tsx'],
		{ encoding: 'utf8' },
	);
	const { diagnostics } = JSON.parse(stdout) as {
		diagnostics: { code: string }[];
	};

	expect(diagnostics.map(({ code }) => code)).toEqual(
		expect.arrayContaining([
			'local(no-jsx-and)',
			'shadcn(no-raw-colors)',
			'@tanstack/router(create-route-property-order)',
		]),
	);
}, 30_000);
