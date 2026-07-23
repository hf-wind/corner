import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://corner:corner_secret@124.222.190.43:15432/corner',
  connectionTimeoutMillis: 15000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@corner.dev' },
    update: { role: 'admin' },
    create: {
      username: 'admin',
      email: 'admin@corner.dev',
      passwordHash,
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      bio: '博客管理员，热爱技术与写作。',
    },
  });

  const author = await prisma.user.upsert({
    where: { email: 'author@corner.dev' },
    update: { role: 'user' },
    create: {
      username: 'writer',
      email: 'author@corner.dev',
      passwordHash,
      role: 'user',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=writer',
      bio: '一个喜欢写代码也喜欢写文章的人。',
    },
  });

  const categories = [
    { name: '技术', slug: 'tech', description: '编程、架构、技术实践' },
    { name: '随笔', slug: 'essay', description: '生活感悟、随想' },
    { name: '旅行', slug: 'travel', description: '旅途见闻与风景' },
    { name: '思考', slug: 'thinking', description: '深度思考与观点' },
    { name: '开源', slug: 'opensource', description: '开源项目与贡献' },
    { name: '设计', slug: 'design', description: 'UI/UX 设计、视觉艺术' },
  ];

  const createdCats: Record<string, string> = {};
  for (const cat of categories) {
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    createdCats[cat.slug] = c.id;
  }

  const tags = [
    { name: 'Rust', slug: 'rust' },
    { name: 'WebAssembly', slug: 'wasm' },
    { name: 'AI', slug: 'ai' },
    { name: '前端', slug: 'frontend' },
    { name: '后端', slug: 'backend' },
    { name: '架构', slug: 'architecture' },
    { name: '设计', slug: 'design' },
    { name: '摄影', slug: 'photography' },
  ];

  const createdTags: Record<string, string> = {};
  for (const tag of tags) {
    const t = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
    createdTags[tag.slug] = t.id;
  }

  const posts = [
    {
      title: '用 Rust 重写我的个人博客系统',
      slug: 'rust-blog',
      content: `<p>从 Node.js 迁移到 Rust，不仅获得了更好的性能，还让我重新思考了系统架构的设计哲学。</p><p>Rust 的所有权系统和零成本抽象让我能够编写出既安全又高效的代码。在这次重构中，我使用了 Actix-web 作为 Web 框架，Diesel 作为 ORM，并且将前端静态资源通过 Rust 内置的模板引擎进行渲染。</p><h2>为什么选择 Rust</h2><p>性能、安全性和并发性是选择 Rust 的主要原因。Rust 的所有权系统在编译时就保证了内存安全，无需垃圾回收器的介入。</p><h2>迁移过程</h2><p>迁移过程比想象中要顺利。Rust 强大的类型系统和丰富的生态系统让我能够快速搭建起完整的后端服务。</p>`,
      excerpt: '从 Node.js 迁移到 Rust，不仅获得了更好的性能，还让我重新思考了系统架构的设计哲学。',
      coverImage: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=300&fit=crop',
      categorySlug: 'tech',
      tagSlugs: ['rust', 'backend', 'architecture'],
      status: 'published',
      featured: true,
      viewCount: 1280,
      likeCount: 56,
    },
    {
      title: '深夜写代码时的那些胡思乱想',
      slug: 'late-night-coding',
      content: `<p>凌晨三点的屏幕光映在脸上，思绪却飘向了远方。关于创造、关于意义。</p><p>写代码到深夜的时候，思维总是特别活跃。那些白天想不通的问题，在深夜往往能迎刃而解。</p>`,
      excerpt: '凌晨三点的屏幕光映在脸上，思绪却飘向了远方。关于创造、关于意义。',
      coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=300&fit=crop',
      categorySlug: 'essay',
      tagSlugs: [],
      status: 'published',
      featured: true,
      viewCount: 856,
      likeCount: 32,
    },
    {
      title: '云南行记：在丽江古城寻找慢生活',
      slug: 'yunnan-travel',
      content: `<p>放下键盘，背上行囊。在古城的石板路上，时间似乎变得很慢很慢。</p><p>丽江古城，一个让人忘记时间的地方。蜿蜒的小巷，古朴的建筑，还有那潺潺的流水，都让人沉醉其中。</p>`,
      excerpt: '放下键盘，背上行囊。在古城的石板路上，时间似乎变得很慢很慢。',
      coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=300&fit=crop',
      categorySlug: 'travel',
      tagSlugs: ['photography'],
      status: 'published',
      featured: true,
      viewCount: 2100,
      likeCount: 88,
    },
    {
      title: 'WebAssembly 实战：浏览器中的高性能计算',
      slug: 'wasm-practice',
      content: `<p>探索 WASM 在前端的无限可能，从图像处理到实时音视频。</p><p>WebAssembly 为 Web 应用带来了接近原生的性能。在这篇文章中，我将分享如何将 C/C++/Rust 代码编译成 WASM 并在浏览器中运行。</p>`,
      excerpt: '探索 WASM 在前端的无限可能，从图像处理到实时音视频。',
      coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=300&fit=crop',
      categorySlug: 'tech',
      tagSlugs: ['wasm', 'rust', 'frontend'],
      status: 'published',
      featured: true,
      viewCount: 654,
      likeCount: 23,
    },
    {
      title: 'AI 时代的创作者：工具还是伙伴？',
      slug: 'ai-creator',
      content: `<p>当 AI 可以写诗、作画、编程，人类创作者的独特价值究竟在哪里？</p><p>这个问题困扰着许多创作者。但我认为，AI 不是替代者，而是协作者。它能够帮助我们完成繁琐的工作，让我们有更多精力专注于真正的创造。</p>`,
      excerpt: '当 AI 可以写诗、作画、编程，人类创作者的独特价值究竟在哪里？',
      coverImage: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=300&fit=crop',
      categorySlug: 'thinking',
      tagSlugs: ['ai'],
      status: 'published',
      featured: true,
      viewCount: 3456,
      likeCount: 145,
    },
    {
      title: 'TypeScript 类型体操：从入门到进阶',
      slug: 'typescript-type-gymnastics',
      content: `<p>TypeScript 的类型系统是图灵完备的，这意味着你可以在类型层面进行复杂的逻辑运算。</p><p>从基础的泛型约束到高级的条件类型、模板字面量类型，TypeScript 的类型系统远比你想像的强大。</p>`,
      excerpt: 'TypeScript 的类型系统是图灵完备的，从泛型到条件类型，探索类型编程的无限可能。',
      coverImage: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&h=300&fit=crop',
      categorySlug: 'tech',
      tagSlugs: ['frontend'],
      status: 'published',
      featured: false,
      viewCount: 2340,
      likeCount: 89,
    },
    {
      title: 'Docker 容器化部署最佳实践',
      slug: 'docker-best-practices',
      content: `<p>从单机部署到容器编排，Docker 已经成为现代应用部署的标准基础设施。</p><p>本文将从实际项目经验出发，分享 Dockerfile 编写、镜像优化、多阶段构建、容器网络配置等最佳实践。</p>`,
      excerpt: '从 Dockerfile 优化到多阶段构建，分享生产环境容器化部署的实战经验。',
      coverImage: 'https://images.unsplash.com/photo-1605745341112-85968b19335b?w=800&h=300&fit=crop',
      categorySlug: 'tech',
      tagSlugs: ['backend', 'architecture'],
      status: 'published',
      featured: false,
      viewCount: 1876,
      likeCount: 67,
    },
    {
      title: '设计模式在前端的应用',
      slug: 'design-patterns-frontend',
      content: `<p>设计模式不仅是后端的专利，在前端开发中同样有着广泛的应用。</p><p>从观察者模式实现事件系统，到策略模式封装表单验证逻辑，设计模式帮助我们写出更可维护的代码。</p>`,
      excerpt: '观察者模式、策略模式、单例模式——这些经典设计模式在前端项目中的实际应用。',
      coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=300&fit=crop',
      categorySlug: 'tech',
      tagSlugs: ['frontend', 'architecture'],
      status: 'published',
      featured: false,
      viewCount: 980,
      likeCount: 42,
    },
    {
      title: '那些年我写过的 Bug',
      slug: 'bugs-i-wrote',
      content: `<p>每一个 Bug 都是一次学习的机会。回顾这些年踩过的坑，记录下来也是一种成长。</p><p>从经典的 off-by-one 错误到复杂的并发问题，Bug 的种类多种多样。最重要的是从每一次错误中吸取教训。</p>`,
      excerpt: '从 off-by-one 到并发竞争，回顾这些年踩过的坑和学到的教训。',
      coverImage: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&h=300&fit=crop',
      categorySlug: 'essay',
      tagSlugs: [],
      status: 'published',
      featured: false,
      viewCount: 4567,
      likeCount: 234,
    },
    {
      title: '从零实现一个简易操作系统',
      slug: 'simple-os-from-scratch',
      content: `<p>操作系统不再神秘。通过从零开始实现一个微型内核，理解计算机系统的工作原理。</p><p>本文将带领你从 BIOS 启动开始，一步步实现一个能够在 QEMU 中运行的最小操作系统。</p>`,
      excerpt: '从 BIOS 启动到内核加载，一步步实现一个能在 QEMU 中运行的微型操作系统。',
      coverImage: 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=800&h=300&fit=crop',
      categorySlug: 'tech',
      tagSlugs: ['rust', 'architecture'],
      status: 'published',
      featured: false,
      viewCount: 3200,
      likeCount: 156,
    },
  ];

  const createdPostIds: string[] = [];
  for (const p of posts) {
    const existing = await prisma.post.findUnique({ where: { slug: p.slug } });
    if (existing) {
      createdPostIds.push(existing.id);
      continue;
    }
    const post = await prisma.post.create({
      data: {
        title: p.title,
        slug: p.slug,
        content: p.content,
        excerpt: p.excerpt,
        coverImage: p.coverImage,
        authorId: admin.id,
        categoryId: createdCats[p.categorySlug],
        status: p.status,
        featured: p.featured,
        viewCount: p.viewCount,
        likeCount: p.likeCount,
        publishedAt: new Date(),
        tags: {
          create: p.tagSlugs.map((ts) => ({ tagId: createdTags[ts] })).filter((t) => t.tagId),
        },
      },
    });
    createdPostIds.push(post.id);
  }

  const comments = [
    { postIdx: 0, author: '张三', content: '写得太好了！Rust 确实值得学习。', replies: ['谢谢支持，一起学习！'] },
    { postIdx: 1, author: '李四', content: '深夜写代码的感觉我太懂了🤝', replies: [] },
    { postIdx: 2, author: '王五', content: '丽江真的是一个治愈的地方，照片拍得很美。', replies: ['是的，值得再去一次。'] },
    { postIdx: 3, author: '赵六', content: 'WASM 的性能提升确实显著，期待更多应用场景。', replies: [] },
    { postIdx: 4, author: '小明', content: 'AI 时代，保持学习的心态最重要。', replies: ['说得对，拥抱变化。'] },
  ];

  for (const c of comments) {
    if (c.postIdx >= createdPostIds.length) continue;
    const comment = await prisma.comment.create({
      data: {
        postId: createdPostIds[c.postIdx],
        authorName: c.author,
        content: c.content,
        status: 'approved',
      },
    });
    for (const reply of c.replies) {
      await prisma.comment.create({
        data: {
          postId: createdPostIds[c.postIdx],
          authorName: 'admin',
          content: reply,
          status: 'approved',
          parentId: comment.id,
        },
      });
    }
  }

  const defaultSettings = [
    { key: 'site_title', value: 'Corner' },
    { key: 'site_description', value: '一个记录技术与生活的个人博客' },
    { key: 'site_keywords', value: ['技术', '博客', '编程', 'Rust', '前端'] },
    { key: 'friends', value: [
      { name: '张三的博客', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=friend1', desc: '专注于后端技术分享', tags: ['技术'] },
      { name: '李四的小站', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=friend2', desc: '旅行摄影与生活随笔', tags: ['生活'] },
      { name: '设计笔记', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=friend3', desc: 'UI/UX 设计思考', tags: ['设计'] },
    ] },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value as any },
      create: { key: s.key, value: s.value as any },
    });
  }

  console.log('Seed completed successfully!');
  console.log(`  Users: ${await prisma.user.count()}`);
  console.log(`  Categories: ${await prisma.category.count()}`);
  console.log(`  Tags: ${await prisma.tag.count()}`);
  console.log(`  Posts: ${await prisma.post.count()}`);
  console.log(`  Comments: ${await prisma.comment.count()}`);
  console.log(`  Settings: ${await prisma.setting.count()}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
