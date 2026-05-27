const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding MongoDB Atlas...');

  // Check if already seeded
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('⚠️  Database already has data. Skipping seed.');
    console.log('   To reseed, manually clear the collections in MongoDB Atlas.');
    return;
  }

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const devPioneer = await prisma.user.create({
    data: { username: 'dev_pioneer', email: 'pioneer@blog.com', passwordHash },
  });

  const codeTraveler = await prisma.user.create({
    data: { username: 'code_traveler', email: 'traveler@blog.com', passwordHash },
  });

  console.log(`✅ Created users: ${devPioneer.username}, ${codeTraveler.username}`);

  const post1 = await prisma.post.create({
    data: {
      userId: devPioneer.id,
      title: 'The Future of Web Development in 2026',
      slug: 'the-future-of-web-development-in-2026',
      content: `Web development is moving faster than ever. Edge computing, AI-assisted coding, and ultra-lightweight frontend frameworks are completely changing how we think about the architecture of modern applications.

The shift towards edge-first architectures means that code now runs closer to the user than ever before — reducing latency dramatically and enabling new classes of real-time applications that simply weren't possible five years ago.

Meanwhile, AI copilots have matured from novelty to necessity. The best developers in 2026 aren't necessarily the ones who memorize APIs — they're the ones who can architect systems, write clear specs, and collaborate fluently with AI to ship at 10x the speed.

On the frontend, we're seeing a renaissance of minimalism. After years of framework fatigue, many teams are returning to vanilla approaches, or adopting ultra-thin layers like Lit or HTMX that keep the browser runtime lean. The "ship less JavaScript" mantra has never been more relevant.

The future is fast, distributed, and AI-augmented — and it's more exciting than ever to be building on the web.`,
    },
  });

  const post2 = await prisma.post.create({
    data: {
      userId: codeTraveler.id,
      title: 'Why I Switched Back to SQLite in 2026',
      slug: 'why-i-switched-back-to-sqlite-in-2026',
      content: `After years of running Postgres in production, I made the switch back to SQLite for several of my projects — and I haven't looked back.

SQLite has undergone a quiet revolution. With WAL mode, proper indexing, and modern tooling like Litestream for replication, it handles workloads that would have required a full-blown database cluster just a few years ago.

The operational simplicity alone is worth it. No connection pooling, no separate process to manage, no cloud database bill. Your database is just a file. Back it up with cp. Replicate it with Litestream to S3. Done.

The lesson here is to resist the urge to reach for complexity before you need it. SQLite is a masterpiece of software engineering.`,
    },
  });

  await prisma.post.create({
    data: {
      userId: devPioneer.id,
      title: 'Building with AI: Lessons from 6 Months of Pair Programming',
      slug: 'building-with-ai-lessons-from-6-months',
      content: `Six months ago, I started using an AI coding assistant as a true pair programmer — not just for boilerplate, but for architecture, debugging, and code review. Here's what I learned.

First: AI excels at breadth, humans excel at depth. When I need to explore a new library, spin up a proof of concept, or generate test cases, the AI is invaluable.

Second: prompt quality is a skill. The engineers getting 10x value from AI tools are the ones who write precise, context-rich prompts.

Third: review everything. AI-generated code can be subtly wrong in ways that compile and pass basic tests.

The bottom line: AI pair programming is a force multiplier for developers who already have strong fundamentals.`,
    },
  });

  await prisma.comment.create({
    data: {
      postId: post1.id,
      userId: codeTraveler.id,
      content: 'Spot on! Embracing edge architecture has completely eliminated our cold-start issues this year.',
    },
  });

  console.log('✅ Created 3 posts and 1 comment');
  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   pioneer@blog.com  / Password123!');
  console.log('   traveler@blog.com / Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
