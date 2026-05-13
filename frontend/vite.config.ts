import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
function clearCookiesPlugin(): Plugin {
  return {
    name: 'clear-cookies',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const cookies = req.headers.cookie
        if (cookies) {
          const cookieNames = cookies.split(';').map(c => c.trim().split('=')[0])
          cookieNames.forEach(name => {
            res.appendHeader('Set-Cookie', `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`)
          })
        }
        next()
      })
    },
  }
}
export default defineConfig({
  plugins: [react(), clearCookiesPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5001,
    strictPort: true,
    allowedHosts: ['trg9.localhost'],
  }
})
