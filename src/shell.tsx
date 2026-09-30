import { TopNav } from '@infinitibit_gmbh/ui';
import { Link, type LinkProps, useLoaderData } from '@tanstack/react-router';
import React, { createContext, use } from 'react';
import { createPortal } from 'react-dom';

import { brandAsset, brandNames } from '@/brand';
import { m } from '@/paraglide/messages';

const ActionsSlot = createContext<HTMLElement | null>(null);

/** Puts a Screen's actions in the top bar, from anywhere in the Screen. */
export function ShellActions({ children }: { children: React.ReactNode }) {
	const slot = use(ActionsSlot);

	return slot ? createPortal(children, slot) : null;
}

export interface NavItem {
	to: LinkProps['to'];
	label: string;
}

/** The top-bar frame every Application Screen sits in. */
export function Shell({
	nav,
	children,
}: {
	nav: NavItem[];
	children: React.ReactNode;
}) {
	const { brand } = useLoaderData({ from: '__root__' });
	const [actionsSlot, setActionsSlot] = React.useState<HTMLElement | null>(
		null,
	);

	return (
		<div className="flex min-h-dvh flex-col">
			<TopNav
				className="sticky top-0 z-1"
				logo={
					<img
						alt={brandNames[brand]}
						className="h-8"
						src={brandAsset(brand, 'mark.svg')}
					/>
				}
			>
				{/* TopNav draws no nav region of its own. */}
				<nav aria-label={m.shell_nav()} className="flex items-center gap-2">
					{nav.map((item) => (
						<NavLink key={item.to} {...item} />
					))}
				</nav>
				<div className="flex items-center gap-4">
					{/* Hidden while empty, or its gap doubles the spacing beside it. */}
					<div
						className="flex items-center gap-2 empty:hidden"
						ref={setActionsSlot}
					/>
				</div>
			</TopNav>
			<main className="flex min-w-0 flex-1 flex-col p-6">
				<ActionsSlot value={actionsSlot}>{children}</ActionsSlot>
			</main>
		</div>
	);
}

// ponytail: the design system ships no nav item, so this one is written from
// its tokens. Replace it when the package ships one.
function NavLink({ to, label }: NavItem) {
	return (
		<Link
			activeOptions={{ exact: to === '/' }}
			className="rounded-lg px-3 py-1.5 text-body-m font-semibold text-secondary aria-[current=page]:bg-info-subtle aria-[current=page]:text-link"
			to={to}
		>
			{label}
		</Link>
	);
}
