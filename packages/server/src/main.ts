import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';

async function bootstrap() {
  require('dotenv').config({ path: path.join(__dirname, '../../..', '.env') });

  const certPath = process.env.TAILSCALE_CERT;
  const keyPath  = process.env.TAILSCALE_KEY;
  const useHttps = !!(certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath));

  const httpsOptions = useHttps
    ? { cert: fs.readFileSync(certPath!), key: fs.readFileSync(keyPath!) }
    : undefined;

  const app = await NestFactory.create(AppModule, { httpsOptions });
  app.useWebSocketAdapter(new WsAdapter(app));
  app.enableCors({ origin: '*' });

  const port = process.env.PORT ?? 3000;
  const host = process.env.TAILSCALE_HOSTNAME ?? process.env.TAILSCALE_IP ?? 'localhost';
  const proto = useHttps ? 'https' : 'http';

  await app.listen(port, '0.0.0.0');
  console.log(`Memoir running on ${proto}://0.0.0.0:${port}`);
  console.log(`  Desktop: ${proto}://localhost:${port}/desktop`);
  console.log(`  Mobile:  ${proto}://${host}:${port}/mobile`);

  if (useHttps) {
    const redirect = http.createServer((req, res) => {
      res.writeHead(301, { Location: `https://${host}:${port}${req.url}` });
      res.end();
    });
    redirect.listen(Number(port) + 1, '0.0.0.0');
  }
}

bootstrap();
