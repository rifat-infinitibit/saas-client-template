import {
	Avatar,
	Button,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	TopNav,
} from '@infinitibit_gmbh/ui';
import { Icon, type IconName } from '@infinitibit_gmbh/ui/icons';
import { Link, type LinkProps, useLoaderData } from '@tanstack/react-router';
import React, { createContext, use } from 'react';
import { createPortal } from 'react-dom';

import { useIdentity } from '@/features/auth/hooks/identity';
import { brandAsset, brandNames } from '@/features/brand/lib/brand';
import { m } from '@/paraglide/messages';
import { getLocale, locales, setLocale } from '@/paraglide/runtime';

const ActionsSlot = createContext<HTMLElement | null>(null);

/** Puts a Screen's actions in the top bar, from anywhere in the Screen. */
export function ShellActions({ children }: { children: React.ReactNode }) {
	const slot = use(ActionsSlot);

	return slot ? createPortal(children, slot) : null;
}

interface NavItem {
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
					<PlatformEntry icon="apps" label={m.shell_apps()} />
					<PlatformEntry
						icon="notifications_none"
						label={m.shell_notifications()}
					/>
					<AccountMenu />
				</div>
			</TopNav>
			<main className="flex min-w-0 flex-1 flex-col p-6">
				<ActionsSlot value={actionsSlot}>{children}</ActionsSlot>
			</main>
		</div>
	);
}

// Drawn by the frame, but the platform has no Apps or Notifications behind it yet.
function PlatformEntry({ icon, label }: { icon: IconName; label: string }) {
	return (
		<Button
			aria-label={label}
			disabled
			iconOnly
			title={label}
			variant="tertiary"
		>
			<Icon name={icon} />
		</Button>
	);
}

function AccountMenu() {
	const identity = useIdentity();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					aria-label={m.shell_account()}
					className="rounded-full"
					title={identity?.email ?? undefined}
					type="button"
				>
					{/* The Identity carries no name; initials of a Workspace would read as a person's. */}
					{identity?.email ? (
						<Avatar name={identity.email} size="sm" />
					) : (
						<Avatar size="sm" type="profile" />
					)}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" size="small">
				{identity ? (
					<>
						<DropdownMenuLabel>
							{identity.email ? (
								<span className="block truncate">{identity.email}</span>
							) : null}
							{identity.workspace ? (
								<span className="block truncate">{identity.workspace}</span>
							) : null}
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
					</>
				) : null}
				<DropdownMenuLabel>{m.shell_language()}</DropdownMenuLabel>
				{locales.map((locale) => (
					<DropdownMenuCheckboxItem
						checked={locale === getLocale()}
						key={locale}
						onSelect={() => void setLocale(locale)}
					>
						{/* Each language in its own words, so a reader of either finds theirs. */}
						{new Intl.DisplayNames(locale, { type: 'language' }).of(locale)}
					</DropdownMenuCheckboxItem>
				))}
				<DropdownMenuSeparator />
				{/* Offered whatever the Identity read returned: a refused one still needs its way out. */}
				<DropdownMenuItem onSelect={() => void signOut()}>
					{m.shell_sign_out()}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

async function signOut() {
	// The document load follows either way: the cookies may be gone even if the
	// answer is not, and the gate is the place to retry from.
	await fetch('/session', { method: 'DELETE' }).catch(() => undefined);
	location.assign('/');
}

// The design system ships no nav item, so this one is written from its tokens.
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
