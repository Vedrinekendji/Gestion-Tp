import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// =====================
// GET /api/notifications
// =====================
router.get('/', async (req, res) => {
  try {
    const { userId } = req.user;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({ where: { userId, lu: false } }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('[NOTIFICATIONS/GET]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// PATCH /api/notifications/read-all
// =====================
router.patch('/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.userId, lu: false },
      data: { lu: true },
    });
    res.json({ message: 'Notifications marquées comme lues.' });
  } catch (error) {
    console.error('[NOTIFICATIONS/READ-ALL]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// PATCH /api/notifications/:id/read
// =====================
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!notification || notification.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Notification introuvable.' });
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { lu: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('[NOTIFICATIONS/PATCH]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// DELETE /api/notifications/:id
// =====================
router.delete('/:id', async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!notification || notification.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Notification introuvable.' });
    }

    await prisma.notification.delete({ where: { id: notification.id } });
    res.json({ message: 'Notification supprimée.' });
  } catch (error) {
    console.error('[NOTIFICATIONS/DELETE]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

export default router;
