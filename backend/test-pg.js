const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const pool = new Pool({
    connectionString: 'postgresql://corner:corner_secret@124.222.190.43:15432/corner',
    connectionTimeoutMillis: 15000,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const posts = await prisma.post.findMany({ take: 3 });
    console.log('OK:', posts.length, 'posts');
  } catch (e) {
    console.error('ERROR:', e.message, e.code);
  } finally {
    await prisma['$disconnect']();
  }
}

main();
