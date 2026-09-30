import { AlertBanner } from '@infinitibit_gmbh/ui';
import {
	HeadContent,
	Scripts,
	createRootRoute,
	useLoaderData,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

import { brandAsset, toBrand } from '@/brand';
import { mode } from '@/env.server';

import appCss from '@/styles.css?url';

// APP_BRAND lives only in the server process, so the browser asks for it.
const readBrand = createServerFn({ method: 'GET' }).handler(() =>
	toBrand(process.env.APP_BRAND),
);

// The whole of what the browser learns about the Mode.
const readSignInWording = createServerFn({ method: 'GET' }).handler(() =>
	mode() === 'saas' ? 'portal' : 'entra',
);

export const Route = createRootRoute({
	loader: async () => ({
		brand: await readBrand(),
		signIn: await readSignInWording(),
	}),
	// The Brand and the Mode are settled for the life of the server process.
	staleTime: Infinity,
	head: ({ loaderData }) => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: 'SaaS Client Template' },
		],
		links: [
			{ rel: 'stylesheet', href: appCss },
			{
				rel: 'icon',
				href: brandAsset(loaderData?.brand ?? 'default', 'favicon.ico'),
			},
		],
	}),
	shellComponent: RootDocument,
	notFoundComponent: NotFound,
});

function NotFound() {
	return (
		<main>
			<AlertBanner title="Page not found" />
		</main>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	// The shell still renders when the root loader fails.
	const brand = useLoaderData({ from: '__root__' })?.brand ?? 'default';

	return (
		<html data-theme={brand} lang="en">
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
