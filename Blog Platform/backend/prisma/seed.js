const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  // Create seed users
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const devPioneer = await prisma.user.create({
    data: {
      username: 'dev_pioneer',
      email: 'pioneer@blog.com',
      passwordHash,
    },
  });

  const codeTraveler = await prisma.user.create({
    data: {
      username: 'code_traveler',
      email: 'traveler@blog.com',
      passwordHash,
    },
  });

  console.log(`✅ Created users: ${devPioneer.username}, ${codeTraveler.username}`);

  // Create seed post
  const post1 = await prisma.post.create({
    data: {
      userId: devPioneer.id,
      title: 'The Future of Web Development in 2026',
      slug: 'the-future-of-web-development-in-2026',
      content: `Web development is moving faster than ever. Edge computing, AI-assisted coding, and ultra-lightweight frontend frameworks are completely changing how we think about the architecture of modern applications.

The shift towards edge-first architectures means that code now runs closer to the user than ever before — reducing latency dramatically and enabling new classes of real-time applications that simply weren't possible five years ago.

Meanwhile, AI copilots have matured from novelty to necessity. The best developers in 2026 aren't necessarily the ones who memorize APIs — they're the ones who can architect systems, write clear specs, and collaborate fluently with AI to ship at 10x the speed.

On the frontend, we're seeing a renaissance of minimalism. After years of framework fatigue, many teams are returning to vanilla approaches, or adopting ultra-thin layers like Lit or HTMX that keep the browser runtime lean. The "ship less JavaScript" mantra has never been more relevant.

What does this mean for you? Double down on fundamentals: HTTP, the DOM, accessibility, and system design. These skills compound, whereas framework knowledge often expires. The developers who thrive in 2026 are the ones who understand the platform deeply and reach for abstractions only when they genuinely add value.

The future is fast, distributed, and AI-augmented — and it's more exciting than ever to be building on the web.`,
    },
  });

  console.log(`✅ Created post: "${post1.title}"`);

  // Create seed comment
  const comment1 = await prisma.comment.create({
    data: {
      postId: post1.id,
      userId: codeTraveler.id,
      content:
        'Spot on! Embracing edge architecture has completely eliminated our cold-start issues this year.',
    },
  });

  console.log(`✅ Created comment by ${codeTraveler.username}`);

  // Additional seed posts for a richer feed
  await prisma.post.create({
    data: {
      userId: codeTraveler.id,
      title: 'Why I Switched Back to SQLite in 2026',
      slug: 'why-i-switched-back-to-sqlite-in-2026',
      content: `After years of running Postgres in production, I made the switch back to SQLite for several of my projects — and I haven't looked back.

SQLite has undergone a quiet revolution. With WAL mode, proper indexing, and modern tooling like Litestream for replication, it handles workloads that would have required a full-blown database cluster just a few years ago.

The operational simplicity alone is worth it. No connection pooling, no separate process to manage, no cloud database bill. Your database is just a file. Back it up with cp. Replicate it with Litestream to S3. Done.

For applications with up to a few thousand concurrent users, SQLite is not just "good enough" — it's often the superior choice. It's faster for reads, simpler to operate, and trivial to test locally with production parity.

The lesson here is to resist the urge to reach for complexity before you need it. SQLite is a masterpiece of software engineering. Give it a fair chance before defaulting to the heavyweight alternatives.`,
    },
  });

  await prisma.post.create({
    data: {
      userId: devPioneer.id,
      title: 'Building with AI: Lessons from 6 Months of Pair Programming',
      slug: 'building-with-ai-lessons-from-6-months',
      content: `Six months ago, I started using an AI coding assistant as a true pair programmer — not just for boilerplate, but for architecture, debugging, and code review. Here's what I learned.

First: AI excels at breadth, humans excel at depth. When I need to explore a new library, spin up a proof of concept, or generate test cases, the AI is invaluable. When I need to reason about subtle edge cases in a distributed system I've lived with for two years, my contextual knowledge wins.

Second: prompt quality is a skill. The engineers getting 10x value from AI tools are the ones who write precise, context-rich prompts. Vague questions get vague answers. Treat it like writing a good issue ticket.

Third: review everything. AI-generated code can be subtly wrong in ways that compile and pass basic tests. The danger zone is confident-sounding code with hidden assumptions. Always read what you ship.

The bottom line: AI pair programming is a force multiplier for developers who already have strong fundamentals. It doesn't replace understanding — it amplifies it. Invest in the basics, and the AI tools will make you formidable.`,
    },
  });

  console.log('✅ Created 2 additional seed posts');
  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Seed credentials:');
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
