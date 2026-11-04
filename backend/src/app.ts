import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { apiRouter } from './routes';
import { notFound, errorHandler } from './middleware/error.middleware';

const app = express();

// Trust proxy for express-rate-limit behind reverse proxies (like Render)
app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: [
              "'self'",
              'https://api.resend.com',
              'https://formspree.io',
            ],
            fontSrc: ["'self'", 'data:'],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: [],
          },
        }
      : false, // Disable CSP in development (Vite HMR uses unsafe-eval etc.)
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
  })
);

// ── CORS ────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(
  cors({
    origin: (origin, callback) => {
      const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      const isLocalhost = origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      // Only allow chetan-brass.vercel.app and its preview deployments (not all *.vercel.app)
      const isVercel = origin && /^https?:\/\/(chetan-brass|chetan-brass-[a-zA-Z0-9-]+)\.vercel\.app$/.test(origin);

      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || (isDevelopment && isLocalhost) || isVercel) {
        callback(null, true);
      } else {
        console.warn(`[CORS Blocked] Origin: "${origin}"`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// ── Rate limiting ────────────────────────────────────────────
// 1. General API rate limit (defense against scraping / high-frequency traffic)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// 2. Strict limit for authentication & password resets (defense against brute-force attacks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/verify-reset-otp', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// 3. Spam protection for public inquiries and contact submissions
const formSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many form submissions from this IP. Please wait a few minutes before trying again.' },
});
app.use('/api/contact', formSubmissionLimiter);
app.use('/api/inquiry', formSubmissionLimiter);

// 4. Rate limiter for visitor analytics to prevent artificial count inflation
const visitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many visitor requests.' },
});
app.use('/api/settings/visit', visitLimiter);

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression() as express.RequestHandler);

// ── Static files (uploaded images) ───────────────────────────
app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: '7d',
  immutable: true,
}));

// ── API routes ────────────────────────────────────────────────
app.use('/api', apiRouter);

// ── Health check ──────────────────────────────────────────────
app.get(['/', '/health', '/api/health'], (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handling ────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
