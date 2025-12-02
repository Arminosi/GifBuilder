import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['react-window'],
  },
  // Ensure relative paths for assets so it works in nested folders or IP access
  base: './',
})