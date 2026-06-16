import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const publicHost = env.VITE_DEV_HOST || '10.14.77.183'
  const devPort = Number(env.VITE_DEV_PORT || 5173)
  const previewPort = Number(env.VITE_PREVIEW_PORT || 4173)
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://10.14.77.183:5000'
  const httpsEnabled = env.VITE_DEV_HTTPS === 'true'
  const certFile = env.VITE_DEV_HTTPS_CERT_FILE
    ? resolve(process.cwd(), env.VITE_DEV_HTTPS_CERT_FILE)
    : resolve(process.cwd(), 'certs/dev-cert.pem')
  const keyFile = env.VITE_DEV_HTTPS_KEY_FILE
    ? resolve(process.cwd(), env.VITE_DEV_HTTPS_KEY_FILE)
    : resolve(process.cwd(), 'certs/dev-key.pem')

  const httpsConfig = httpsEnabled && existsSync(certFile) && existsSync(keyFile)
    ? {
        cert: readFileSync(certFile),
        key: readFileSync(keyFile),
      }
    : undefined

  return {
    plugins: [react()],
    build: {
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined

            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router-dom/')
            ) {
              return 'vendor-react'
            }

            if (id.includes('/@ant-design/icons/')) {
              return 'vendor-antd-icons'
            }

            if (id.includes('/antd/')) {
              if (
                id.includes('/layout/') ||
                id.includes('/grid/') ||
                id.includes('/space/') ||
                id.includes('/divider/')
              ) {
                return 'vendor-antd-layout'
              }

              if (
                id.includes('/card/') ||
                id.includes('/tag/') ||
                id.includes('/badge/') ||
                id.includes('/tooltip/') ||
                id.includes('/typography/') ||
                id.includes('/button/') ||
                id.includes('/empty/') ||
                id.includes('/skeleton/') ||
                id.includes('/timeline/')
              ) {
                return 'vendor-antd-display'
              }

              if (
                id.includes('/table/') ||
                id.includes('/pagination/') ||
                id.includes('/tabs/')
              ) {
                return 'vendor-antd-data'
              }

              if (
                id.includes('/date-picker/') ||
                id.includes('/time-picker/') ||
                id.includes('/calendar/')
              ) {
                return 'vendor-antd-date'
              }

              if (
                id.includes('/form/') ||
                id.includes('/input/') ||
                id.includes('/select/') ||
                id.includes('/checkbox/') ||
                id.includes('/switch/')
              ) {
                return 'vendor-antd-forms'
              }

              if (
                id.includes('/modal/') ||
                id.includes('/popconfirm/') ||
                id.includes('/notification/') ||
                id.includes('/message/') ||
                id.includes('/progress/') ||
                id.includes('/spin/')
              ) {
                return 'vendor-antd-feedback'
              }

              return 'vendor-antd-core'
            }

            if (id.includes('/sweetalert2/')) {
              return 'vendor-swal'
            }

            if (
              id.includes('/axios/') ||
              id.includes('/crypto-js/') ||
              id.includes('/dayjs/') ||
              id.includes('/react-icons/')
            ) {
              return 'vendor-utils'
            }

            return 'vendor-misc'
          },
        },
      },
    },
    server: {
      host: true,
      port: devPort,
      strictPort: true,
      https: httpsConfig,
      hmr: {
        host: publicHost,
        port: devPort,
        clientPort: devPort,
        protocol: httpsConfig ? 'wss' : 'ws',
      },
      proxy: {
        // Every /api/* call is forwarded to the Express backend.
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: true,
      port: previewPort,
      strictPort: true,
      https: httpsConfig,
    },
  }
})
