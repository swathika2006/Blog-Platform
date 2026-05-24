const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Slug generator
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const ensureUniqueSlug = async (baseSlug, excludeId = null) => {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
};

// GET /api/posts — public feed
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

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
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
      },
    });
  } catch (err) {
    console.error('Get posts error:', err);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// GET /api/posts/user/:userId — posts by user (for dashboard)
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const posts = await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { comments: true } },
      },
    });

    res.json({ posts });
  } catch (err) {
    console.error('Get user posts error:', err);
    res.status(500).json({ error: 'Failed to fetch your posts.' });
  }
});

// GET /api/posts/:slug — single post
router.get('/:slug', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { slug: req.params.slug },
      include: {
        user: { select: { id: true, username: true } },
        _count: { select: { comments: true } },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    res.json({ post });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// POST /api/posts — create post
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }
    if (title.length < 5) {
      return res.status(400).json({ error: 'Title must be at least 5 characters.' });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: 'Title must be under 200 characters.' });
    }
    if (content.length < 20) {
      return res.status(400).json({ error: 'Content must be at least 20 characters.' });
    }

    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(baseSlug);

    const post = await prisma.post.create({
      data: {
        title: title.trim(),
        slug,
        content: content.trim(),
        userId: req.user.id,
      },
      include: {
        user: { select: { id: true, username: true } },
        _count: { select: { comments: true } },
      },
    });

    res.status(201).json({ message: 'Post published successfully!', post });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// PUT /api/posts/:id — update post (author only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { title, content } = req.body;

    const existing = await prisma.post.findUnique({ where: { id: postId } });
    if (!existing) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own posts.' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }
    if (title.length < 5) {
      return res.status(400).json({ error: 'Title must be at least 5 characters.' });
    }
    if (content.length < 20) {
      return res.status(400).json({ error: 'Content must be at least 20 characters.' });
    }

    let slug = existing.slug;
    if (title.trim() !== existing.title) {
      const baseSlug = generateSlug(title);
      slug = await ensureUniqueSlug(baseSlug, postId);
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data: { title: title.trim(), content: content.trim(), slug },
      include: {
        user: { select: { id: true, username: true } },
        _count: { select: { comments: true } },
      },
    });

    res.json({ message: 'Post updated successfully!', post });
  } catch (err) {
    console.error('Update post error:', err);
    res.status(500).json({ error: 'Failed to update post.' });
  }
});

// DELETE /api/posts/:id — delete post (author only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    const existing = await prisma.post.findUnique({ where: { id: postId } });
    if (!existing) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own posts.' });
    }

    await prisma.post.delete({ where: { id: postId } });
    res.json({ message: 'Post deleted successfully.' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

module.exports = router;
