const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ── GET /api/comments/:postId ──────────────────────────────────────────
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params; // MongoDB ObjectId string
    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, username: true } } },
    });
    res.json({ comments });
  } catch (err) {
    console.error('GET /comments/:postId:', err);
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

// ── POST /api/comments ─────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { postId, content } = req.body;

    if (!postId || !content)
      return res.status(400).json({ error: 'Post ID and content are required.' });
    if (content.trim().length < 2)
      return res.status(400).json({ error: 'Comment must be at least 2 characters.' });
    if (content.trim().length > 2000)
      return res.status(400).json({ error: 'Comment must be under 2000 characters.' });

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        postId,
        userId: req.user.id,
      },
      include: { user: { select: { id: true, username: true } } },
    });
    res.status(201).json({ message: 'Comment posted!', comment });
  } catch (err) {
    console.error('POST /comments:', err);
    res.status(500).json({ error: 'Failed to post comment.' });
  }
});

// ── DELETE /api/comments/:id ───────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params; // MongoDB ObjectId string

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });
    if (comment.userId !== req.user.id)
      return res.status(403).json({ error: 'You can only delete your own comments.' });

    await prisma.comment.delete({ where: { id } });
    res.json({ message: 'Comment deleted.' });
  } catch (err) {
    console.error('DELETE /comments/:id:', err);
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

module.exports = router;
