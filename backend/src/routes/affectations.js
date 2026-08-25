import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { createNotification } from '../lib/notify.js';

const router = express.Router();

router.use(authMiddleware);

function parseMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

// =====================
// GET /api/affectations
// Mes affectations (vue assistant) ou toutes (vue admin/resp)
// =====================
router.get('/', async (req, res) => {
  try {
    const role = req.user.role.toUpperCase();

    if (role === 'ASSISTANT') {
      const assistant = await prisma.assistant.findUnique({ where: { userId: req.user.userId } });
      if (!assistant) return res.status(404).json({ error: 'Assistant introuvable.' });

      const affectations = await prisma.affectation.findMany({
        where: { assistantId: assistant.id },
        include: { seance: { include: { matiere: true } } },
        orderBy: { seance: { date: 'asc' } },
      });

      return res.json(affectations.map(af => ({
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
        statutHeures: af.statutHeures,
        heuresCount: af.heuresCount,
      })));
    } else {
      const affectations = await prisma.affectation.findMany({
        include: {
          assistant: { include: { user: { select: { email: true } } } },
          seance: { include: { matiere: true, professeur: true } },
        },
        orderBy: { seance: { date: 'asc' } },
      });

      return res.json(affectations.map(af => ({
        id: af.id,
        seanceId: af.seanceId,
        assistantId: af.assistantId,
        assistantNom: `${af.assistant.prenom} ${af.assistant.nom}`,
        assistantEmail: af.assistant.user?.email,
        matiere: af.seance.matiere.nom,
        professeurNom: `${af.seance.professeur.prenom} ${af.seance.professeur.nom}`,
        groupe: af.seance.groupe,
        date: af.seance.date,
        heureDebut: af.seance.heureDebut,
        heureFin: af.seance.heureFin,
        salle: af.seance.salle,
        statut: af.statut,
        statutHeures: af.statutHeures,
        heuresCount: af.heuresCount,
      })));
    }
  } catch (error) {
    console.error('[AFFECTATIONS/GET]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// POST /api/affectations/verifier-disponibilite
// Vérification automatique de conflit
// =====================
router.post('/verifier-disponibilite', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const { seanceId, assistantId } = req.body;

    const seance = await prisma.seance.findUnique({
      where: { id: parseInt(seanceId) },
    });
    const assistant = await prisma.assistant.findUnique({
      where: { id: parseInt(assistantId) },
      include: {
        affectations: {
          where: { statut: { in: ['EN_ATTENTE', 'VALIDEE'] } },
          include: { seance: true },
        },
      },
    });

    if (!seance || !assistant) {
      return res.status(404).json({ error: 'Séance ou assistant introuvable.' });
    }

    if (assistant.statut !== 'ACTIF') {
      return res.json({ disponible: false, raison: 'Compte assistant inactif ou en congé.' });
    }

    const targetDate = seance.date.toISOString().split('T')[0];
    const targetStart = parseMinutes(seance.heureDebut);
    const targetEnd = parseMinutes(seance.heureFin);

    const hasConflict = assistant.affectations.some(aff => {
      const s = aff.seance;
      if (!s || s.id === seance.id || s.statut === 'ANNULEE') return false;
      const sDate = s.date.toISOString().split('T')[0];
      if (sDate !== targetDate) return false;

      const sStart = parseMinutes(s.heureDebut);
      const sEnd = parseMinutes(s.heureFin);
      return sStart < targetEnd && sEnd > targetStart;
    });

    if (hasConflict) {
      return res.json({
        disponible: false,
        raison: 'Impossible d\'affecter cet assistant : conflit avec une autre séance.',
      });
    }

    return res.json({ disponible: true, message: 'Assistant disponible' });
  } catch (error) {
    console.error('[AFFECTATIONS/VERIFIER]', error);
    res.status(500).json({ error: 'Erreur lors de la vérification.' });
  }
});

// =====================
// POST /api/affectations
// Affecter un assistant à une séance
// =====================
router.post('/', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const { seanceId, assistantId } = req.body;

    const seance = await prisma.seance.findUnique({
      where: { id: parseInt(seanceId) },
      include: { affectations: { where: { statut: { in: ['EN_ATTENTE', 'VALIDEE'] } } } },
    });

    if (!seance) {
      return res.status(404).json({ error: 'Séance introuvable.' });
    }

    if (seance.affectations.length >= (seance.nombreAssistantsRequis || 1)) {
      return res.status(400).json({ error: 'Cette séance est déjà complète (toutes les places d\'assistant sont attribuées).' });
    }

    // Check conflict
    const targetDate = seance.date.toISOString().split('T')[0];
    const targetStart = parseMinutes(seance.heureDebut);
    const targetEnd = parseMinutes(seance.heureFin);

    const assistantAffectations = await prisma.affectation.findMany({
      where: {
        assistantId: parseInt(assistantId),
        statut: { in: ['EN_ATTENTE', 'VALIDEE'] },
      },
      include: { seance: true },
    });

    const hasConflict = assistantAffectations.some(aff => {
      const s = aff.seance;
      if (!s || s.id === seance.id || s.statut === 'ANNULEE') return false;
      const sDate = s.date.toISOString().split('T')[0];
      if (sDate !== targetDate) return false;

      const sStart = parseMinutes(s.heureDebut);
      const sEnd = parseMinutes(s.heureFin);
      return sStart < targetEnd && sEnd > targetStart;
    });

    if (hasConflict) {
      return res.status(400).json({ error: 'Impossible d\'affecter cet assistant : conflit avec une autre séance.' });
    }

    const heuresCount = Math.max(1, (targetEnd - targetStart) / 60) || 2.0;

    const affectation = await prisma.affectation.create({
      data: {
        seanceId: parseInt(seanceId),
        assistantId: parseInt(assistantId),
        statut: 'VALIDEE', // Direct affectation by responsable is automatically confirmed
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
      titre: 'Nouvelle affectation TP',
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
    res.status(500).json({ error: 'Erreur lors de l\'affectation.' });
  }
});

// =====================
// PATCH /api/affectations/:id
// Mettre à jour le statut
// =====================
router.patch('/:id', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN'), async (req, res) => {
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

    res.json(affectation);
  } catch (error) {
    console.error('[AFFECTATIONS/PATCH]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// DELETE /api/affectations/:id
// Supprimer une affectation
// =====================
router.delete('/:id', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN'), async (req, res) => {
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
