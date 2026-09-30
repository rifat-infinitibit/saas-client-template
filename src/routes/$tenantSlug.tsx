import { Navigate, createFileRoute } from '@tanstack/react-router';

// Where the Tenant portal Launches a user. The Workspace comes from the
// Session, never the URL, so the slug is dropped once the Launch is adopted.
export const Route = createFileRoute('/$tenantSlug')({
	component: () => <Navigate replace to="/" />,
});
