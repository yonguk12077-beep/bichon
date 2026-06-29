import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // 💡 main.js에서 /api/soop-notice를 부르면, 백엔드 서버(예: 3000포트)로 토스해줍니다.
      '/api': {
        target: 'http://localhost:3000', // 본인의 Express 서버가 켜진 포트 번호
        changeOrigin: true,
      }
    }
  }
});