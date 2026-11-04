import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import app from './app';
import { prisma } from './utils/prisma';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function main(): Promise<void> {
  // Ensure upload directories exist
  const uploadDirs = ['uploads', 'uploads/products', 'uploads/categories', 'uploads/avatars'];
  for (const dir of uploadDirs) {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
  console.log('📁 Upload directories ready');

  // Test database connection and ensure schema updates
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    // Ensure refresh_token_hash column exists in PostgreSQL without breaking existing data
    await prisma.$executeRawUnsafe(`ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "refresh_token_hash" TEXT;`);
  } catch (error) {
    console.error('❌ Database connection/migration check failed:', error);
    console.error('\nMake sure your database is accessible and DATABASE_URL in .env is correct.');
    process.exit(1);
  }

  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base:    http://localhost:${PORT}/api`);
    console.log(`🖼  Uploads:     http://localhost:${PORT}/api/uploads`);
    console.log(`🔒 Application initialized securely`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('✅ Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
