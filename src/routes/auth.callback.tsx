import { Navigate, createFileRoute } from '@tanstack/react-router';

// Where gt's sign-in returns a Standalone user; the path is gt's choice.
// Rendered, not redirected by the server: the Launch is in a fragment the
// server never sees.
export const Route = createFileRoute('/auth/callback')({
	component: () => <Navigate replace to="/" />,
});
