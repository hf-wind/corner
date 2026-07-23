import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://corner:corner_secret@124.222.190.43:15432/corner',
  })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  const updated = await prisma.user.updateMany({
    where: { email: 'admin@corner.dev' },
    data: { role: 'admin' },
  })
  const users = await prisma.user.findMany({
    select: { email: true, username: true, role: true },
  })
  console.log('updated', updated.count)
  console.log(users)
  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
