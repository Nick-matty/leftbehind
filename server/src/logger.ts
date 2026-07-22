import pino from 'pino';
import { env } from './env';

// Redact anything that could carry secrets. Note: request/response BODIES are
// never logged by pino-http, so ciphertext and auth keys never hit the logs.
export const logger = pino({
  level: env.isProd ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.authKey',
      'req.body.newAuthKey',
      'req.body.password',
      'req.body.ciphertext',
      'req.body.refreshToken',
      'res.headers["set-cookie"]',
    ],
    censor: '[redacted]',
  },
  transport: env.isProd
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
});
