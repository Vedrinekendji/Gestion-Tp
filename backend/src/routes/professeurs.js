import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { createNotification } from '../lib/notify.js';

const router = express.Router();

router.use(authMiddleware);

// =====================
// GET /api/professeurs
// =====================
router.get('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const professeurs = await prisma.professeur.findMany({
      include: {
        user: { select: { email: true } },
        _count: {
          select: { seances: true },
        },
      },
      orderBy: { nom: 'asc' },
    });

    const result = professeurs.map(p => ({
      id: p.id,
      nom: `${p.prenom} ${p.nom}`,
      prenom: p.prenom,
      lastName: p.nom,
      email: p.user.email,
      telephone: p.telephone,
      departement: p.departement || 'Informatique',
      nbSeances: p._count.seances,
    }));

    res.json(result);
  } catch (error) {
    console.error('[PROFESSEURS/GET]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// POST /api/professeurs
// =====================
router.post('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const { nom, prenom, email, telephone, departement, password } = req.body;

    if (!nom || !prenom || !email) {
      return res.status(400).json({ error: 'Nom, prénom et email sont requis.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé.' });
    }

    const hashedPassword = await bcrypt.hash(password || 'prof123', 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'PROFESSEUR',
        professeur: {
          create: {
            nom,
            prenom,
            telephone: telephone || null,
            departement: departement || 'Informatique',
          },
        },
      },
      include: { professeur: true },
    });

    await createNotification({
      userId: user.id,
      type: 'BIENVENUE',
      titre: 'Bienvenue sur GestionTP',
      message: `Votre compte professeur a été créé par l'administrateur. Département : ${user.professeur.departement}.`,
    });

    res.status(201).json({
      id: user.professeur.id,
      nom: `${prenom} ${nom}`,
      email: user.email,
      departement: user.professeur.departement,
      message: 'Professeur créé avec succès.',
    });
  } catch (error) {
    console.error('[PROFESSEURS/POST]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// DELETE /api/professeurs/:id
// =====================
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const professeur = await prisma.professeur.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!professeur) {
      return res.status(404).json({ error: 'Professeur introuvable.' });
    }

    await prisma.user.delete({
      where: { id: professeur.userId },
    });

    res.json({ message: 'Professeur supprimé avec succès.' });
  } catch (error) {
    console.error('[PROFESSEURS/DELETE]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

export default router;
