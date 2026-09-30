import { AlertBanner } from '@infinitibit_gmbh/ui';
import { Icon } from '@infinitibit_gmbh/ui/icons';
import { createFileRoute, useLoaderData } from '@tanstack/react-router';

import { brandAsset, brandNames } from '@/brand';
import { m } from '@/paraglide/messages';

export const Route = createFileRoute('/_authenticated/')({
	component: Home,
});

function Home() {
	const { brand } = useLoaderData({ from: '__root__' });

	return (
		<main>
			<img alt={brandNames[brand]} src={brandAsset(brand, 'logo.svg')} />
			<AlertBanner icon={<Icon name="dashboard" />} title={m.home_running()} />
		</main>
	);
}
