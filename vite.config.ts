
import { defineConfig, loadEnv } from 'vite';
import { assertPublicBuildEnv } from './src/lib/build-security';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync, existsSync } from 'node:fs';

export default defineConfig({
  plugins: [{name:'public-environment-guard',configResolved(config){assertPublicBuildEnv({...loadEnv(config.mode,process.cwd(),'VITE_'),...process.env});}},react(), tailwindcss()],

  server: {
    host: '127.0.0.1',
    port: 5177,
    allowedHosts: ['.trycloudflare.com'],
    cors: false,
  },

  define: {
    __LOCAL_VIDEOS__: JSON.stringify(
      readdirSync('public/videos')
        .filter((file) => /\.(mp4|webm)$/i.test(file))
        .map((file) => `/videos/${file}`)
    ),

    __ABOUT_IMAGES__: JSON.stringify(
      existsSync('public/images/sobre')
        ? readdirSync('public/images/sobre')
            .filter((file) => /^sobre-literare-0[123]\.png$/.test(file))
            .map((file) => `/images/sobre/${file}`)
        : []
    ),
  },

  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: {
          animation: ['gsap', 'gsap/ScrollTrigger'],
          forms: [
            'react-hook-form',
            'zod',
            '@hookform/resolvers/zod',
          ],
          'react-vendor': ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', 'scheduler', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
