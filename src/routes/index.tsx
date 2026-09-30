import { AlertBanner } from '@infinitibit_gmbh/ui';
import { Icon } from '@infinitibit_gmbh/ui/icons';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
	component: Home,
});

function Home() {
	return (
		<main className="p-8">
			<AlertBanner
				icon={<Icon name="dashboard" />}
				title="The template is running."
			/>
		</main>
	);
}
