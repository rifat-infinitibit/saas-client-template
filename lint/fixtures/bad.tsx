import { Button } from '@infinitibit_gmbh/ui';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/bad')({
	loader: () => null,
	beforeLoad: () => null,
});

export function Bad({ count }: { count: number }) {
	return (
		<div>
			{count && <span>{count}</span>}
			<Button className="bg-red-500">Save</Button>
		</div>
	);
}
