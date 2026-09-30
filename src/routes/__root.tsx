import { AlertBanner } from '@infinitibit_gmbh/ui';
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

import { mode } from '@/env.server';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';

import appCss from '@/styles.css?url';

// The whole of what the browser learns about the Mode.
const readSignInWording = createServerFn({ method: 'GET' }).handler(() =>
	mode() === 'saas' ? 'portal' : 'entra',
);

export const Route = createRootRoute({
	loader: async () => ({ signIn: await readSignInWording() }),
	// The Mode is settled for the life of the server process.
	staleTime: Infinity,
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: 'SaaS Client Template' },
		],
		links: [{ rel: 'stylesheet', href: appCss }],
	}),
	shellComponent: RootDocument,
	notFoundComponent: NotFound,
});

function NotFound() {
	return (
		<main>
			<AlertBanner title={m.not_found_title()} />
		</main>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang={getLocale()}>
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
