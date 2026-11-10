import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// 手機的瀏覽器只在 https 下允許開相機，所以 dev server 一律走自簽憑證的 https。
export default defineConfig({
  plugins: [basicSsl()],
  build: {
    // mind-ar 內含 tfjs，bundle 本來就大，不需要每次 build 都警告。
    chunkSizeWarningLimit: 4000,
  },
});
