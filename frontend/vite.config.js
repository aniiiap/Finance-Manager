import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Only required when frontend is hosted separately from the API
  if (mode === 'production' && env.VITE_REQUIRE_API_URL === 'true' && !env.VITE_API_URL) {
    throw new Error(
      'VITE_API_URL is required when VITE_REQUIRE_API_URL=true (split hosting).'
    )
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  }
})
