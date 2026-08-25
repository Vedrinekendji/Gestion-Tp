import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// Helper: parse HH:MM to total minutes for overlap checks
function parseMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

// =====================
// GET /api/seances (Professeur, Responsable, Admin, Service Admin)
// =====================
router.get('/', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN', 'SERVICE_ADMINISTRATIF'), async (req, res) => {
  try {
    let where = {};

    if (req.user.role === 'PROFESSEUR') {
      const professeur = await prisma.professeur.findUnique({
        where: { userId: req.user.userId },
      });
      if (professeur) {
        where = { professeurId: professeur.id };
      }
    }

    const seances = await prisma.seance.findMany({
      where,
      include: {
        matiere: true,
        professeur: true,
        affectations: {
          include: {
            assistant: {
              include: { user: { select: { email: true } } },
            },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { heureDebut: 'asc' }],
    });

    const result = seances.map(s => {
      const activeAffectations = s.affectations.filter(a => a.statut !== 'ANNULEE' && a.statut !== 'REFUSEE');
      return {
        id: s.id,
        matiere: s.matiere.nom,
        matiereId: s.matiereId,
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
        nombreAssistantsRequis: s.nombreAssistantsRequis || 1,
        placesPrises: activeAffectations.length,
        professeur: `${s.professeur.prenom} ${s.professeur.nom}`,
        professeurId: s.professeurId,
        affectations: s.affectations.map(a => ({
          id: a.id,
          assistantId: a.assistantId,
          nom: `${a.assistant.prenom} ${a.assistant.nom}`,
          email: a.assistant.user?.email,
          statut: a.statut,
          statutHeures: a.statutHeures,
        })),
      };
    });

    res.json(result);
  } catch (error) {
    console.error('[SEANCES/GET]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// GET /api/seances/disponibles (Assistant, Admin, Responsable)
// =====================
router.get('/disponibles', requireRole('ASSISTANT', 'ADMIN', 'RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'SERVICE_ADMINISTRATIF'), async (req, res) => {
  try {
    let assistantId = null;
    let assistantAffectations = [];

    if (req.user.role === 'ASSISTANT') {
      const assistant = await prisma.assistant.findUnique({
        where: { userId: req.user.userId },
        include: {
          affectations: {
            where: { statut: { in: ['EN_ATTENTE', 'VALIDEE'] } },
            include: { seance: true },
          },
        },
      });
      if (assistant) {
        assistantId = assistant.id;
        assistantAffectations = assistant.affectations;
      }
    }

    const seances = await prisma.seance.findMany({
      include: {
        matiere: true,
        professeur: true,
        affectations: {
          include: {
            assistant: {
              include: { user: { select: { email: true } } },
            },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { heureDebut: 'asc' }],
    });

    const result = seances.map(s => {
      const activeAffectations = s.affectations.filter(a => a.statut !== 'ANNULEE' && a.statut !== 'REFUSEE');
      const placesTotales = s.nombreAssistantsRequis || 1;
      const placesPrises = activeAffectations.length;
      const placesRestantes = Math.max(0, placesTotales - placesPrises);

      const myAffectation = assistantId
        ? s.affectations.find(a => a.assistantId === assistantId && a.statut !== 'ANNULEE' && a.statut !== 'REFUSEE')
        : null;

      let statutCalcul = 'AVAILABLE';
      if (s.statut === 'ANNULEE') {
        statutCalcul = 'CANCELLED';
      } else if (myAffectation) {
        statutCalcul = 'RESERVED_BY_ME';
      } else if (placesRestantes <= 0) {
        statutCalcul = 'FULL';
      }

      let conflitHoraire = false;
      if (assistantId && !myAffectation && s.statut !== 'ANNULEE') {
        const targetDate = s.date.toISOString().split('T')[0];
        const targetStart = parseMinutes(s.heureDebut);
        const targetEnd = parseMinutes(s.heureFin);

        conflitHoraire = assistantAffectations.some(myAff => {
          const mySeance = myAff.seance;
          if (!mySeance || mySeance.id === s.id || mySeance.statut === 'ANNULEE') return false;
          const myDate = mySeance.date.toISOString().split('T')[0];
          if (myDate !== targetDate) return false;

          const myStart = parseMinutes(mySeance.heureDebut);
          const myEnd = parseMinutes(mySeance.heureFin);
          return myStart < targetEnd && myEnd > targetStart;
        });
      }

      return {
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
        statutCalcul,
        nombreAssistantsRequis: placesTotales,
        placesPrises,
        placesRestantes,
        conflitHoraire,
        professeur: `${s.professeur.prenom} ${s.professeur.nom}`,
        myAffectationId: myAffectation ? myAffectation.id : null,
        myAffectationStatut: myAffectation ? myAffectation.statut : null,
        assistants: activeAffectations.map(a => ({
          id: a.assistant.id,
          nom: `${a.assistant.prenom} ${a.assistant.nom}`,
          statut: a.statut,
        })),
      };
    });

    res.json(result);
  } catch (error) {
    console.error('[SEANCES/DISPONIBLES/GET]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// POST /api/seances (Manually create a session with validations)
// =====================
router.post('/', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const { matiereId, professeurId, groupe, date, heureDebut, heureFin, salle, type, niveau, nombreAssistantsRequis } = req.body;

    if (!matiereId || !date || !heureDebut || !heureFin || !groupe) {
      return res.status(400).json({ error: 'Remplissez tous les champs obligatoires.' });
    }

    // Validation heures début / fin
    const startMin = parseMinutes(heureDebut);
    const endMin = parseMinutes(heureFin);
    if (endMin <= startMin) {
      return res.status(400).json({ error: 'L\'heure de fin doit être postérieure à l\'heure de début.' });
    }

    let targetProfId = professeurId;
    if (req.user.role === 'PROFESSEUR') {
      const professeur = await prisma.professeur.findUnique({
        where: { userId: req.user.userId },
      });
      if (professeur) targetProfId = professeur.id;
    }
    if (!targetProfId) {
      const firstProf = await prisma.professeur.findFirst();
      targetProfId = firstProf ? firstProf.id : 1;
    }

    // Check conflict for professor/room
    const targetDate = new Date(date);
    const existingConflicts = await prisma.seance.findMany({
      where: {
        date: targetDate,
        statut: { not: 'ANNULEE' },
        OR: [
          { professeurId: parseInt(targetProfId) },
          { salle: salle || '' },
        ],
      },
    });

    const hasConflict = existingConflicts.some(s => {
      const sStart = parseMinutes(s.heureDebut);
      const sEnd = parseMinutes(s.heureFin);
      return sStart < endMin && sEnd > startMin;
    });

    if (hasConflict) {
      return res.status(400).json({ error: 'Conflit d\'emploi du temps détecté (professeur ou salle déjà occupé(e) sur ce créneau).' });
    }

    const seance = await prisma.seance.create({
      data: {
        matiereId: parseInt(matiereId),
        professeurId: parseInt(targetProfId),
        groupe,
        date: targetDate,
        heureDebut,
        heureFin,
        salle: salle || 'Salle TP',
        type: type || 'TP',
        niveau: niveau || 'Master',
        nombreAssistantsRequis: parseInt(nombreAssistantsRequis) || 1,
      },
      include: { matiere: true, professeur: true },
    });

    res.status(201).json(seance);
  } catch (error) {
    console.error('[SEANCES/POST]', error);
    res.status(500).json({ error: 'Erreur lors de la création de la séance.' });
  }
});

// =====================
// PUT /api/seances/:id (Edit session)
// =====================
router.put('/:id', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { matiereId, groupe, date, heureDebut, heureFin, salle, statut, nombreAssistantsRequis } = req.body;

    if (heureDebut && heureFin) {
      const startMin = parseMinutes(heureDebut);
      const endMin = parseMinutes(heureFin);
      if (endMin <= startMin) {
        return res.status(400).json({ error: 'L\'heure de fin doit être postérieure à l\'heure de début.' });
      }
    }

    const seance = await prisma.seance.update({
      where: { id: parseInt(id) },
      data: {
        matiereId: matiereId ? parseInt(matiereId) : undefined,
        groupe,
        date: date ? new Date(date) : undefined,
        heureDebut,
        heureFin,
        salle,
        statut,
        nombreAssistantsRequis: nombreAssistantsRequis ? parseInt(nombreAssistantsRequis) : undefined,
      },
      include: { matiere: true, professeur: true },
    });

    res.json(seance);
  } catch (error) {
    console.error('[SEANCES/PUT]', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la séance.' });
  }
});

// =====================
// POST /api/seances/:id/reserver (Assistant slot reservation)
// =====================
router.post('/:id/reserver', requireRole('ASSISTANT'), async (req, res) => {
  try {
    const seanceId = parseInt(req.params.id);
    const assistant = await prisma.assistant.findUnique({
      where: { userId: req.user.userId },
      include: {
        affectations: {
          where: { statut: { in: ['EN_ATTENTE', 'VALIDEE'] } },
          include: { seance: true },
        },
      },
    });

    if (!assistant) {
      return res.status(404).json({ error: 'Profil assistant non trouvé.' });
    }

    if (assistant.statut !== 'ACTIF') {
      return res.status(400).json({ error: 'Votre compte assistant est inactif.' });
    }

    const seance = await prisma.seance.findUnique({
      where: { id: seanceId },
      include: {
        matiere: true,
        affectations: { where: { statut: { in: ['EN_ATTENTE', 'VALIDEE'] } } },
      },
    });

    if (!seance || seance.statut === 'ANNULEE') {
      return res.status(404).json({ error: 'Séance non disponible.' });
    }

    const placesTotales = seance.nombreAssistantsRequis || 1;
    if (seance.affectations.length >= placesTotales) {
      return res.status(400).json({ error: 'Toutes les places pour cette séance sont déjà réservées.' });
    }

    const existing = seance.affectations.find(a => a.assistantId === assistant.id);
    if (existing) {
      return res.status(400).json({ error: 'Vous avez déjà réservé ou demandé cette séance.' });
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
      return res.status(400).json({ error: 'Conflit d\'horaire avec un autre TP déjà prévu.' });
    }

    const duration = Math.max(1, (targetEnd - targetStart) / 60) || 2.0;

    const affectation = await prisma.affectation.create({
      data: {
        seanceId,
        assistantId: assistant.id,
        statut: 'EN_ATTENTE',
        heuresCount: duration,
      },
    });

    await prisma.historiquePeda.create({
      data: {
        utilisateur: `${assistant.prenom} ${assistant.nom} (Assistant)`,
        action: 'DEMANDE_CRENEAU',
        objet: `Séance TP ${seance.matiere.nom} (${seance.groupe})`,
        details: `Demande de créneau du ${new Date(seance.date).toLocaleDateString('fr-FR')} de ${seance.heureDebut} à ${seance.heureFin}`,
      },
    });

    res.status(201).json({ message: 'Réservation enregistrée avec succès.', affectation });
  } catch (error) {
    console.error('[SEANCES/RESERVER]', error);
    res.status(500).json({ error: 'Erreur lors de la réservation du créneau.' });
  }
});

// =====================
// POST /api/seances/:id/annuler-reservation (Assistant cancellation)
// =====================
router.post('/:id/annuler-reservation', requireRole('ASSISTANT'), async (req, res) => {
  try {
    const seanceId = parseInt(req.params.id);
    const { motif } = req.body;

    const assistant = await prisma.assistant.findUnique({
      where: { userId: req.user.userId },
    });

    if (!assistant) {
      return res.status(404).json({ error: 'Profil assistant non trouvé.' });
    }

    const affectation = await prisma.affectation.findFirst({
      where: {
        seanceId,
        assistantId: assistant.id,
        statut: { in: ['EN_ATTENTE', 'VALIDEE'] },
      },
      include: { seance: { include: { matiere: true } } },
    });

    if (!affectation) {
      return res.status(404).json({ error: 'Aucune réservation active trouvée pour cette séance.' });
    }

    await prisma.affectation.update({
      where: { id: affectation.id },
      data: { statut: 'ANNULEE' },
    });

    await prisma.historiquePeda.create({
      data: {
        utilisateur: `${assistant.prenom} ${assistant.nom} (Assistant)`,
        action: 'ANNULATION_CRENEAU',
        objet: `Séance TP ${affectation.seance.matiere.nom} (${affectation.seance.groupe})`,
        details: motif || 'Annulation effectuée par l\'assistant',
      },
    });

    res.json({ message: 'Réservation annulée avec succès.' });
  } catch (error) {
    console.error('[SEANCES/ANNULER-RESERVATION]', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation.' });
  }
});

export default router;
