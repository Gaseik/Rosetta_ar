import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// 手機的瀏覽器只在 https 下允許開相機，所以 dev server 一律走自簽憑證的 https。
export default defineConfig({
  // 相對路徑：同一份 build 放在網域根目錄或子路徑（GitHub Pages 的 /Rosetta_ar/）都能用
  base: './',
  plugins: [basicSsl()],
  build: {
    // mind-ar 內含 tfjs，bundle 本來就大，不需要每次 build 都警告。
    chunkSizeWarningLimit: 4000,
  },
});
