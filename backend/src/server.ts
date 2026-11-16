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

    // Ensure primary admin user has the real owner email address for 2FA OTP delivery
    const targetAdminEmail = (process.env.ADMIN_EMAIL || 'bhaveshnakum802@gmail.com').trim().toLowerCase();
    try {
      // Remove legacy unused 'owner' account if present
      await prisma.adminUser.deleteMany({
        where: { username: 'owner' }
      });

      // Update admin user from dummy/unverified email to owner email
      const adminUser = await prisma.adminUser.findFirst({
        where: { username: 'admin' }
      });
      if (adminUser) {
        const currentEmail = (adminUser.email || '').trim().toLowerCase();
        if (!currentEmail || currentEmail === 'admin@example.com' || currentEmail.endsWith('@example.com') || currentEmail === 'admin@chetanbrass.com') {
          await prisma.adminUser.update({
            where: { id: adminUser.id },
            data: { email: targetAdminEmail }
          });
          console.log(`✅ [Admin Sync] Successfully updated admin email to ${targetAdminEmail}`);
        }
      }
    } catch (adminSyncError) {
      console.warn('⚠️ [Admin Sync] Notice during admin account synchronization:', adminSyncError);
    }
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
