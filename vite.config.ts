import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig, loadEnv } from 'vite';
import { defaultExclude } from 'vitest/config';

// The tests render the router and call server routes directly, so they need
// neither the Start server build nor nitro.
const isVitest = process.env.VITEST === 'true';

export default defineConfig(({ mode }) => ({
	plugins: [
		tailwindcss(),
		!isVitest && devtools(),
		!isVitest && tanstackStart(),
		!isVitest && nitro(),
		viteReact(),
		babel({ presets: [reactCompilerPreset()] }),
	],
	resolve: { tsconfigPaths: true },
	// The container's server reads the same `PORT`, so the Launch URL registered
	// with the platform holds in dev too. Strict, so a busy port fails instead
	// of quietly moving.
	server: {
		port: Number(loadEnv(mode, process.cwd(), '').PORT) || undefined,
		strictPort: true,
	},
	test: {
		environment: 'jsdom',
		globals: true,
		env: { TZ: 'UTC' },
		setupFiles: ['./src/testing/setup.ts'],
		exclude: [...defaultExclude, '.claude/**'],
	},
}));
