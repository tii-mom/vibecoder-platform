import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id, { getModuleInfo }) {
            // Vendor chunk
            if (id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/react-router-dom/') ||
                id.includes('node_modules/react-is/')) {
              return 'vendor';
            }
            // TON core libraries (large)
            if (id.includes('node_modules/@ton/core/') ||
                id.includes('node_modules/@ton/crypto/') ||
                id.includes('node_modules/@ton/ton/') ||
                id.includes('node_modules/@tonconnect/')) {
              return 'ton';
            }
            // Charts (recharts + d3)
            if (id.includes('node_modules/recharts/') ||
                id.includes('node_modules/d3-') ||
                id.includes('node_modules/victory-') ||
                id.includes('node_modules/react-smooth/') ||
                id.includes('node_modules/recharts-scale/')) {
              return 'charts';
            }
            // Icons (lucide-react)
            if (id.includes('node_modules/lucide-react/')) {
              return 'icons';
            }
            // Animation (motion)
            if (id.includes('node_modules/motion/') ||
                id.includes('node_modules/framer-motion/')) {
              return 'motion';
            }
            // OpenAI SDK
            if (id.includes('node_modules/openai/')) {
              return 'openai';
            }
            // Zustand stores — group for cache efficiency
            if (id.includes('/src/store/')) {
              return 'stores';
            }
            // Large pages can get their own chunk
            if (id.includes('/src/pages/BountyPage')) {
              return 'bounty';
            }
          },
        },
      },
    },
  };
});
