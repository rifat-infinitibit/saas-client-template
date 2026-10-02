import { spawnSync } from 'node:child_process';

const sha = 'a'.repeat(40);

const zero = '0'.repeat(40);

const line = (local: string, remote: string, localSha = sha) =>
	`${local} ${localSha} ${remote} ${sha}\n`;

const push = (stdin: string) =>
	spawnSync('sh', ['-e', `${import.meta.dirname}/pre-push`], {
		input: stdin,
		encoding: 'utf8',
	});

describe('pre-push', () => {
	it.each([
		[
			'detached HEAD to a compliant branch',
			line('HEAD', 'refs/heads/feat/notes/create-dialog'),
		],
		['main', line('refs/heads/main', 'refs/heads/main')],
		['stage', line('refs/heads/stage', 'refs/heads/stage')],
		['dev', line('refs/heads/dev', 'refs/heads/dev')],
		['a tag', line('refs/tags/v1.0.0', 'refs/tags/v1.0.0')],
		['a deletion', line('(delete)', 'refs/heads/Bad_Name', zero)],
		['no refs', ''],
	])('passes %s', (_, stdin) => {
		expect(push(stdin).status).toBe(0);
	});

	it('rejects a non-compliant remote branch, naming it', () => {
		const result = push(
			line('refs/heads/feat/notes/x', 'refs/heads/whatever-you-like'),
		);

		expect(result.status).toBe(1);
		expect(result.stderr).toContain("Branch 'whatever-you-like'");
	});

	it('rejects when any one of several refs is non-compliant', () => {
		const stdin =
			line('refs/heads/feat/notes/x', 'refs/heads/feat/notes/x') +
			line('refs/heads/feat/notes/x', 'refs/heads/whatever-you-like');

		expect(push(stdin).status).toBe(1);
	});
});
