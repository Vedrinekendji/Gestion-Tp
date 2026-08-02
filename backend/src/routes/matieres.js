import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// =====================
// GET /api/matieres
// =====================
router.get('/', async (req, res) => {
  try {
    const matieres = await prisma.matiere.findMany({
      orderBy: { nom: 'asc' },
      include: {
        _count: {
          select: {
            assistants: true,
            seances: true,
          },
        },
      },
    });

    const result = matieres.map(m => ({
      id: m.id,
      code: m.code,
      nom: m.nom,
      description: m.description,
      couleur: m.couleur,
      nbAssistants: m._count.assistants,
      nbSeances: m._count.seances,
    }));

    res.json(result);
  } catch (error) {
    console.error('[MATIERES/GET]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// POST /api/matieres
// =====================
router.post('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const { code, nom, description, couleur } = req.body;

    if (!code || !nom) {
      return res.status(400).json({ error: 'Le code et le nom de la matière sont requis.' });
    }

    const existing = await prisma.matiere.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: 'Une matière avec ce code existe déjà.' });
    }

    const matiere = await prisma.matiere.create({
      data: {
        code,
        nom,
        description: description || null,
        couleur: couleur || '#4361ee',
      },
    });

    res.status(201).json(matiere);
  } catch (error) {
    console.error('[MATIERES/POST]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// DELETE /api/matieres/:id
// =====================
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.matiere.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: 'Matière supprimée avec succès.' });
  } catch (error) {
    console.error('[MATIERES/DELETE]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

export default router;

