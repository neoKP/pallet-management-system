import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * ใช้ตอน `npm run dev` เท่านั้น — ให้ฟังก์ชันใน api/ (Vercel Edge: รับ Request คืน Response) ทำงานในเครื่อง
 * บน Vercel ไฟล์ใน api/ รันเป็น serverless function เอง ปลั๊กอินนี้ไม่ถูกใช้
 * ค่าตั้งค่าฝั่งเซิร์ฟเวอร์ (เช่น FIREBASE_*_EMULATOR_HOST) อ่านจาก .env.local / ตัวแปรระบบ
 */
const DEV_API_ROUTES = ['/api/partner/view', '/api/telegram/send'];

const devEdgeApi = (serverEnv: Record<string, string>): Plugin => ({
    name: 'dev-edge-api',
    apply: 'serve',
    configureServer(server) {
        // vitest ก็ใช้ config นี้ (โหมด serve) — ห้ามโหลดความลับจริง (เช่น token Telegram) เข้าเทสต์
        if (process.env.VITEST) return;
        for (const [k, v] of Object.entries(serverEnv)) if (v !== undefined) process.env[k] = v;
        for (const route of DEV_API_ROUTES) {
            server.middlewares.use(route, async (req, res) => {
                try {
                    const chunks: Buffer[] = [];
                    for await (const c of req) chunks.push(c as Buffer);
                    const mod = await server.ssrLoadModule(`${route}.ts`);
                    const headers = new Headers();
                    for (const [k, v] of Object.entries(req.headers)) {
                        if (typeof v === 'string') headers.set(k, v);
                    }
                    headers.set('x-forwarded-for', req.socket.remoteAddress || 'local');
                    const request = new Request(`http://localhost${req.originalUrl || req.url}`, {
                        method: req.method,
                        headers,
                        body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
                    });
                    const response: Response = await mod.default(request);
                    res.statusCode = response.status;
                    response.headers.forEach((v, k) => res.setHeader(k, v));
                    res.end(await response.text());
                } catch (e) {
                    console.error(`[dev api ${route}]`, e);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ ok: false, error: 'dev server error' }));
                }
            });
        }
    },
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), devEdgeApi({
        FIREBASE_AUTH_EMULATOR_HOST: env.FIREBASE_AUTH_EMULATOR_HOST,
        FIREBASE_DATABASE_EMULATOR_HOST: env.FIREBASE_DATABASE_EMULATOR_HOST,
        FIREBASE_SERVICE_ACCOUNT: env.FIREBASE_SERVICE_ACCOUNT,
        TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_ALLOWED_CHAT_IDS: env.TELEGRAM_ALLOWED_CHAT_IDS,
      })],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
