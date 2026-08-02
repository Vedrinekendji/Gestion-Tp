import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// =====================
// GET /api/seances
// =====================
router.get('/', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    // Trouver le professeur connecté
    const professeur = await prisma.professeur.findUnique({
      where: { userId: req.user.userId },
    });

    if (!professeur) {
      return res.status(404).json({ error: 'Professeur introuvable.' });
    }

    const seances = await prisma.seance.findMany({
      where: { professeurId: professeur.id },
      include: {
        matiere: true,
        affectation: {
          include: {
            assistant: {
              include: {
                user: { select: { email: true } },
              },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    const result = seances.map(s => ({
      id: s.id,
      matiere: s.matiere.nom,
      matiereCode: s.matiere.code,
      matiereCouleur: s.matiere.couleur,
      groupe: s.groupe,
      date: s.date,
      heureDebut: s.heureDebut,
      heureFin: s.heureFin,
      salle: s.salle,
      type: s.type,
      niveau: s.niveau,
      statut: s.statut,
      affecte: s.affectation
        ? {
            id: s.affectation.id,
            assistantId: s.affectation.assistantId,
            nom: `${s.affectation.assistant.prenom} ${s.affectation.assistant.nom}`,
            statut: s.affectation.statut,
          }
        : null,
    }));

    res.json(result);
  } catch (error) {
    console.error('[SEANCES/GET]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// POST /api/seances
// =====================
router.post('/', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const { matiereId, groupe, date, heureDebut, heureFin, salle, type, niveau } = req.body;

    const professeur = await prisma.professeur.findUnique({
      where: { userId: req.user.userId },
    });

    if (!professeur) {
      return res.status(404).json({ error: 'Professeur introuvable.' });
    }

    const seance = await prisma.seance.create({
      data: {
        matiereId: parseInt(matiereId),
        professeurId: professeur.id,
        groupe,
        date: new Date(date),
        heureDebut,
        heureFin,
        salle,
        type: type || 'TP',
        niveau,
      },
      include: { matiere: true },
    });

    res.status(201).json(seance);
  } catch (error) {
    console.error('[SEANCES/POST]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// DELETE /api/seances/:id
// =====================
router.delete('/:id', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    await prisma.seance.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: 'Séance supprimée.' });
  } catch (error) {
    console.error('[SEANCES/DELETE]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

export default router;
