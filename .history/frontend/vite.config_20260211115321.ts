import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  // Ziel-Server
        changeOrigin: true,
        secure: false,  // Falls dein Server kein SSL verwendet
      },
    },
  },
};