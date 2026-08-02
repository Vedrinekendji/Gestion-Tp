import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { createNotification } from '../lib/notify.js';

const router = express.Router();

router.use(authMiddleware);

// =====================
// GET /api/affectations
// Mes affectations (vue assistant)
// =====================
router.get('/', requireRole('ASSISTANT'), async (req, res) => {
  try {
    const assistant = await prisma.assistant.findUnique({ where: { userId: req.user.userId } });
    if (!assistant) return res.status(404).json({ error: 'Assistant introuvable.' });

    const affectations = await prisma.affectation.findMany({
      where: { assistantId: assistant.id },
      include: { seance: { include: { matiere: true } } },
      orderBy: { seance: { date: 'asc' } },
    });

    res.json(affectations.map(af => ({
      id: af.id,
      matiere: af.seance.matiere.nom,
      matiereCode: af.seance.matiere.code,
      matiereCouleur: af.seance.matiere.couleur,
      groupe: af.seance.groupe,
      date: af.seance.date,
      heureDebut: af.seance.heureDebut,
      heureFin: af.seance.heureFin,
      salle: af.seance.salle,
      type: af.seance.type,
      niveau: af.seance.niveau,
      statut: af.statut,
      heuresCount: af.heuresCount,
    })));
  } catch (error) {
    console.error('[AFFECTATIONS/GET]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// POST /api/affectations
// Affecter un assistant à une séance
// =====================
router.post('/', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const { seanceId, assistantId } = req.body;

    // Vérifier que la séance existe et n'est pas déjà affectée
    const seance = await prisma.seance.findUnique({
      where: { id: parseInt(seanceId) },
      include: { affectation: true },
    });

    if (!seance) {
      return res.status(404).json({ error: 'Séance introuvable.' });
    }

    if (seance.affectation) {
      return res.status(400).json({ error: 'Cette séance est déjà affectée.' });
    }

    // Calculer la durée en heures
    const [hd, md] = seance.heureDebut.split(':').map(Number);
    const [hf, mf] = seance.heureFin.split(':').map(Number);
    const heuresCount = (hf * 60 + mf - hd * 60 - md) / 60;

    const affectation = await prisma.affectation.create({
      data: {
        seanceId: parseInt(seanceId),
        assistantId: parseInt(assistantId),
        statut: 'EN_ATTENTE',
        heuresCount,
      },
      include: {
        assistant: true,
        seance: { include: { matiere: true } },
      },
    });

    await createNotification({
      userId: affectation.assistant.userId,
      type: 'AFFECTATION_CREEE',
      titre: 'Nouvelle affectation',
      message: `Vous avez été affecté(e) à la séance de ${affectation.seance.matiere.nom} (${affectation.seance.groupe}) du ${new Date(affectation.seance.date).toLocaleDateString('fr-FR')}, ${affectation.seance.heureDebut}–${affectation.seance.heureFin}.`,
      lien: '/mes-seances',
    });

    res.status(201).json({
      id: affectation.id,
      seanceId: affectation.seanceId,
      assistantId: affectation.assistantId,
      assistantNom: `${affectation.assistant.prenom} ${affectation.assistant.nom}`,
      statut: affectation.statut,
      heuresCount: affectation.heuresCount,
    });
  } catch (error) {
    console.error('[AFFECTATIONS/POST]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// PATCH /api/affectations/:id
// Mettre à jour le statut
// =====================
router.patch('/:id', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const { statut } = req.body;

    const validStatuts = ['EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'ANNULEE'];
    if (!validStatuts.includes(statut)) {
      return res.status(400).json({ error: 'Statut invalide.' });
    }

    const affectation = await prisma.affectation.update({
      where: { id: parseInt(req.params.id) },
      data: { statut },
      include: {
        assistant: true,
        seance: { include: { matiere: true } },
      },
    });

    const statutMessages = {
      VALIDEE: 'a été validée ✅',
      REFUSEE: 'a été refusée ❌',
      ANNULEE: 'a été annulée',
      EN_ATTENTE: 'est de nouveau en attente de validation',
    };

    await createNotification({
      userId: affectation.assistant.userId,
      type: 'AFFECTATION_STATUT',
      titre: 'Mise à jour d\'affectation',
      message: `Votre affectation à la séance de ${affectation.seance.matiere.nom} (${affectation.seance.groupe}) du ${new Date(affectation.seance.date).toLocaleDateString('fr-FR')} ${statutMessages[statut] || 'a été mise à jour'}.`,
      lien: '/mes-seances',
    });

    res.json({
      id: affectation.id,
      statut: affectation.statut,
      assistantNom: `${affectation.assistant.prenom} ${affectation.assistant.nom}`,
    });
  } catch (error) {
    console.error('[AFFECTATIONS/PATCH]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// DELETE /api/affectations/:id
// Supprimer une affectation
// =====================
router.delete('/:id', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    await prisma.affectation.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: 'Affectation supprimée.' });
  } catch (error) {
    console.error('[AFFECTATIONS/DELETE]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

export default router;
