import { AlertBanner } from '@infinitibit_gmbh/ui';
import { Icon } from '@infinitibit_gmbh/ui/icons';
import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages';

export const Route = createFileRoute('/')({
	component: Home,
});

function Home() {
	return (
		<main>
			<AlertBanner icon={<Icon name="dashboard" />} title={m.home_running()} />
		</main>
	);
}
