import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					three: ['three'],
					cannon: ['cannon-es']
				}
			}
		},
		chunkSizeWarningLimit: 1000
	},
	worker: {
		format: 'es'
	}
});