const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────────────
const toSlug = (title) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const uniqueSlug = async (base, excludeId = null) => {
  let slug = base;
  let n = 1;
  while (true) {
    const found = await prisma.post.findUnique({ where: { slug } });
    if (!found || found.id === excludeId) break;
    slug = `${base}-${n++}`;
  }
  return slug;
};

// ── GET /api/posts ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.post.count(),
    ]);

    res.json({
      posts,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
      },
    });
  } catch (err) {
    console.error('GET /posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// ── GET /api/posts/user/:userId ────────────────────────────────────────
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId)
      return res.status(403).json({ error: 'Access denied.' });

    const posts = await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { comments: true } } },
    });
    res.json({ posts });
  } catch (err) {
    console.error('GET /posts/user:', err);
    res.status(500).json({ error: 'Failed to fetch your posts.' });
  }
});

// ── GET /api/posts/:slug ───────────────────────────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { slug: req.params.slug },
      include: {
        user: { select: { id: true, username: true } },
        _count: { select: { comments: true } },
      },
    });
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    res.json({ post });
  } catch (err) {
    console.error('GET /posts/:slug:', err);
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// ── POST /api/posts ────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content)
      return res.status(400).json({ error: 'Title and content are required.' });
    if (title.length < 5)
      return res.status(400).json({ error: 'Title must be at least 5 characters.' });
    if (title.length > 200)
      return res.status(400).json({ error: 'Title must be under 200 characters.' });
    if (content.length < 20)
      return res.status(400).json({ error: 'Content must be at least 20 characters.' });

    const slug = await uniqueSlug(toSlug(title));
    const post = await prisma.post.create({
      data: { title: title.trim(), slug, content: content.trim(), userId: req.user.id },
      include: {
        user: { select: { id: true, username: true } },
        _count: { select: { comments: true } },
      },
    });
    res.status(201).json({ message: 'Post published successfully!', post });
  } catch (err) {
    console.error('POST /posts:', err);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// ── PUT /api/posts/:id ─────────────────────────────────────────────────
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params; // MongoDB ObjectId string
    const { title, content } = req.body;

    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Post not found.' });
    if (existing.userId !== req.user.id)
      return res.status(403).json({ error: 'You can only edit your own posts.' });
    if (!title || !content)
      return res.status(400).json({ error: 'Title and content are required.' });
    if (title.length < 5)
      return res.status(400).json({ error: 'Title must be at least 5 characters.' });
    if (content.length < 20)
      return res.status(400).json({ error: 'Content must be at least 20 characters.' });

    const slug = title.trim() !== existing.title
      ? await uniqueSlug(toSlug(title), id)
      : existing.slug;

    const post = await prisma.post.update({
      where: { id },
      data: { title: title.trim(), content: content.trim(), slug },
      include: {
        user: { select: { id: true, username: true } },
        _count: { select: { comments: true } },
      },
    });
    res.json({ message: 'Post updated successfully!', post });
  } catch (err) {
    console.error('PUT /posts/:id:', err);
    res.status(500).json({ error: 'Failed to update post.' });
  }
});

// ── DELETE /api/posts/:id ──────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params; // MongoDB ObjectId string

    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Post not found.' });
    if (existing.userId !== req.user.id)
      return res.status(403).json({ error: 'You can only delete your own posts.' });

    // Delete comments first (no CASCADE in Prisma MongoDB)
    await prisma.comment.deleteMany({ where: { postId: id } });
    await prisma.post.delete({ where: { id } });

    res.json({ message: 'Post deleted successfully.' });
  } catch (err) {
    console.error('DELETE /posts/:id:', err);
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

module.exports = router;
