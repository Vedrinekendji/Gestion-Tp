import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { createNotification } from '../lib/notify.js';

const router = express.Router();

router.use(authMiddleware);

// Helper: parse HH:MM to total minutes for overlap checks
function parseMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

// =====================
// GET /api/seances (Professeur & Admin)
// =====================
router.get('/', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    let where = {};

    if (req.user.role === 'PROFESSEUR') {
      const professeur = await prisma.professeur.findUnique({
        where: { userId: req.user.userId },
      });
      if (!professeur) return res.status(404).json({ error: 'Professeur introuvable.' });
      where = { professeurId: professeur.id };
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
        affectations: s.affectations.map(a => ({
          id: a.id,
          assistantId: a.assistantId,
          nom: `${a.assistant.prenom} ${a.assistant.nom}`,
          email: a.assistant.user?.email,
          statut: a.statut,
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
// GET /api/seances/disponibles (Assistant & Admin)
// =====================
router.get('/disponibles', requireRole('ASSISTANT', 'ADMIN'), async (req, res) => {
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

      // Check if current assistant already reserved
      const myAffectation = assistantId
        ? s.affectations.find(a => a.assistantId === assistantId && a.statut !== 'ANNULEE' && a.statut !== 'REFUSEE')
        : null;

      // Status calculation
      let statutCalcul = 'AVAILABLE';
      if (s.statut === 'ANNULEE') {
        statutCalcul = 'CANCELLED';
      } else if (myAffectation) {
        statutCalcul = 'RESERVED_BY_ME';
      } else if (placesRestantes <= 0) {
        statutCalcul = 'FULL';
      }

      // Schedule conflict check for assistant
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
// POST /api/seances/:id/reserver (Prisma Transaction with Anti-concurrency)
// =====================
const handleReserver = async (req, res) => {
  try {
    const seanceId = parseInt(req.params.id);

    const assistant = await prisma.assistant.findUnique({
      where: { userId: req.user.userId },
      include: { user: true },
    });

    if (!assistant) {
      return res.status(404).json({ error: 'Assistant introuvable.' });
    }

    if (assistant.statut !== 'ACTIF') {
      return res.status(403).json({ error: 'Votre compte assistant est inactif. Réservation impossible.' });
    }

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock and fetch session
      const seance = await tx.seance.findUnique({
        where: { id: seanceId },
        include: {
          matiere: true,
          professeur: true,
          affectations: {
            where: { statut: { in: ['EN_ATTENTE', 'VALIDEE'] } },
          },
        },
      });

      if (!seance) {
        throw new Error('Séance introuvable.');
      }

      if (seance.statut === 'ANNULEE') {
        throw new Error('Cette séance de TP a été annulée.');
      }

      if (seance.statut === 'TERMINEE') {
        throw new Error('Cette séance de TP est déjà terminée.');
      }

      // 2. Capacity check
      const placesPrises = seance.affectations.length;
      const nombreRequis = seance.nombreAssistantsRequis || 1;
      if (placesPrises >= nombreRequis) {
        throw new Error('Ce créneau vient d\'être réservé par un autre assistant (complet).');
      }

      // 3. Uniqueness check
      const alreadyReserved = seance.affectations.some(a => a.assistantId === assistant.id);
      if (alreadyReserved) {
        throw new Error('Vous avez déjà réservé ce créneau.');
      }

      // 4. Schedule Conflict check
      const assistantActiveAffectations = await tx.affectation.findMany({
        where: {
          assistantId: assistant.id,
          statut: { in: ['EN_ATTENTE', 'VALIDEE'] },
        },
        include: { seance: true },
      });

      const targetDate = seance.date.toISOString().split('T')[0];
      const targetStart = parseMinutes(seance.heureDebut);
      const targetEnd = parseMinutes(seance.heureFin);

      const hasConflict = assistantActiveAffectations.some(aff => {
        const s = aff.seance;
        if (!s || s.id === seanceId || s.statut === 'ANNULEE') return false;
        const sDate = s.date.toISOString().split('T')[0];
        if (sDate !== targetDate) return false;

        const sStart = parseMinutes(s.heureDebut);
        const sEnd = parseMinutes(s.heureFin);
        return sStart < targetEnd && sEnd > targetStart;
      });

      if (hasConflict) {
        throw new Error('Vous avez déjà un TP réservé sur cette plage horaire.');
      }

      // 5. Calculate hours
      const heuresCount = Math.max(1, (targetEnd - targetStart) / 60) || 2.0;

      // 6. Create Affectation
      const affectation = await tx.affectation.create({
        data: {
          seanceId,
          assistantId: assistant.id,
          statut: 'EN_ATTENTE',
          heuresCount,
        },
      });

      // 7. Log History
      await tx.historiqueReservation.create({
        data: {
          seanceId,
          assistantId: assistant.id,
          affectationId: affectation.id,
          action: 'RESERVATION',
          nouveauStatut: 'EN_ATTENTE',
          effectuePar: `${assistant.prenom} ${assistant.nom} (${assistant.user.email})`,
          commentaire: 'Créneau pris par l\'assistant via l\'application.',
        },
      });

      return { affectation, seance, assistant };
    });

    // Send Notification
    await createNotification({
      userId: assistant.userId,
      type: 'RESERVATION_CONFIRMEE',
      titre: 'Réservation enregistrée',
      message: `Votre réservation pour ${result.seance.matiere.nom} (${result.seance.groupe}) le ${new Date(result.seance.date).toLocaleDateString('fr-FR')} de ${result.seance.heureDebut} à ${result.seance.heureFin} a été enregistrée.`,
      lien: '/mes-seances',
    });

    res.status(201).json({
      message: 'Créneau réservé avec succès.',
      affectation: result.affectation,
    });
  } catch (error) {
    console.error('[SEANCES/RESERVER]', error.message);
    res.status(400).json({ error: error.message || 'Erreur lors de la réservation du créneau.' });
  }
};

router.post('/:id/reserver', requireRole('ASSISTANT', 'ADMIN'), handleReserver);
router.post('/:id/postuler', requireRole('ASSISTANT', 'ADMIN'), handleReserver); // Alias for backwards compatibility

// =====================
// POST /api/seances/:id/annuler-reservation (Annulation par l'assistant ou l'admin)
// =====================
router.post('/:id/annuler-reservation', requireRole('ASSISTANT', 'ADMIN'), async (req, res) => {
  try {
    const seanceId = parseInt(req.params.id);

    const user = req.user;
    let assistantId = null;

    if (user.role === 'ASSISTANT') {
      const assistant = await prisma.assistant.findUnique({ where: { userId: user.userId } });
      if (!assistant) return res.status(404).json({ error: 'Assistant introuvable.' });
      assistantId = assistant.id;
    } else if (req.body.assistantId) {
      assistantId = parseInt(req.body.assistantId);
    }

    const whereClause = assistantId
      ? { seanceId, assistantId, statut: { in: ['EN_ATTENTE', 'VALIDEE'] } }
      : { seanceId, statut: { in: ['EN_ATTENTE', 'VALIDEE'] } };

    const affectation = await prisma.affectation.findFirst({
      where: whereClause,
      include: { assistant: { include: { user: true } }, seance: { include: { matiere: true } } },
    });

    if (!affectation) {
      return res.status(404).json({ error: 'Réservation active introuvable pour ce créneau.' });
    }

    await prisma.$transaction(async (tx) => {
      // Update affectation to ANNULEE
      await tx.affectation.update({
        where: { id: affectation.id },
        data: { statut: 'ANNULEE' },
      });

      // Log History
      await tx.historiqueReservation.create({
        data: {
          seanceId,
          assistantId: affectation.assistantId,
          affectationId: affectation.id,
          action: user.role === 'ADMIN' ? 'LIBERATION_ADMIN' : 'ANNULATION',
          ancienStatut: affectation.statut,
          nouveauStatut: 'ANNULEE',
          effectuePar: `${user.email || user.role}`,
          commentaire: req.body.motif || 'Annulation de la réservation.',
        },
      });
    });

    // Notify Assistant
    await createNotification({
      userId: affectation.assistant.userId,
      type: 'RESERVATION_ANNULEE',
      titre: 'Réservation annulée',
      message: `La réservation pour ${affectation.seance.matiere.nom} (${affectation.seance.groupe}) du ${new Date(affectation.seance.date).toLocaleDateString('fr-FR')} a été annulée.`,
      lien: '/mes-seances',
    });

    res.json({ message: 'Réservation annulée avec succès. Le créneau est à nouveau disponible.' });
  } catch (error) {
    console.error('[SEANCES/ANNULER-RESERVATION]', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de la réservation.' });
  }
});

// =====================
// GET /api/seances/historique (Audit Logs pour Admin)
// =====================
router.get('/historique', requireRole('ADMIN'), async (req, res) => {
  try {
    const logs = await prisma.historiqueReservation.findMany({
      include: {
        seance: {
          include: { matiere: true, professeur: true },
        },
      },
      orderBy: { dateAction: 'desc' },
      take: 100,
    });

    res.json(logs);
  } catch (error) {
    console.error('[SEANCES/HISTORIQUE]', error);
    res.status(500).json({ error: 'Erreur lors du chargement de l\'historique.' });
  }
});

// =====================
// POST /api/seances/import (Import Planning CSV / JSON for Admin)
// =====================
router.post('/import', requireRole('ADMIN'), async (req, res) => {
  try {
    const { rows } = req.body; // Array of planning objects
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée valide fournie pour l\'import.' });
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const { professeurNom, salle, groupe, matiereNom, date, heureDebut, heureFin, nombreAssistantsRequis } = row;
      if (!professeurNom || !matiereNom || !date || !heureDebut) {
        skippedCount++;
        continue;
      }

      // 1. Get or create Matiere
      let matiere = await prisma.matiere.findFirst({ where: { nom: matiereNom } });
      if (!matiere) {
        const code = matiereNom.replace(/[^A-Za-z]/g, '').slice(0, 5).toUpperCase() || 'MAT' + Math.floor(Math.random() * 100);
        matiere = await prisma.matiere.create({
          data: { nom: matiereNom, code, couleur: '#4361ee' },
        });
      }

      // 2. Get or create Professeur
      const parts = professeurNom.trim().split(' ');
      const nomFamille = parts[0];
      const prenom = parts.slice(1).join(' ') || nomFamille;
      const email = `${nomFamille.toLowerCase().replace(/[^a-z]/g, '')}.${prenom.toLowerCase().replace(/[^a-z]/g, '')}@gestiontp.dz`;

      let user = await prisma.user.findUnique({ where: { email } });
      let profId;

      if (user) {
        let prof = await prisma.professeur.findUnique({ where: { userId: user.id } });
        profId = prof ? prof.id : null;
      } else {
        const bcrypt = (await import('bcryptjs')).default;
        const defaultHash = await bcrypt.hash('prof2026', 10);
        user = await prisma.user.create({
          data: {
            email,
            password: defaultHash,
            role: 'PROFESSEUR',
            professeur: {
              create: { nom: nomFamille, prenom, departement: 'Enseignement' },
            },
          },
          include: { professeur: true },
        });
        profId = user.professeur.id;
      }

      if (!profId) {
        skippedCount++;
        continue;
      }

      // 3. Create Seance if not existing
      const d = new Date(date);
      const existing = await prisma.seance.findFirst({
        where: { professeurId: profId, date: d, heureDebut, groupe: groupe || 'Gr1' },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      await prisma.seance.create({
        data: {
          matiereId: matiere.id,
          professeurId: profId,
          groupe: groupe || 'Gr1',
          date: d,
          heureDebut,
          heureFin: heureFin || '10:30',
          salle: salle || 'Salle non définie',
          type: 'TP',
          nombreAssistantsRequis: parseInt(nombreAssistantsRequis) || 1,
          statut: 'PLANIFIEE',
        },
      });
      createdCount++;
    }

    res.json({
      message: `Import réussi : ${createdCount} séances créées, ${skippedCount} ignorées ou existantes.`,
      createdCount,
      skippedCount,
    });
  } catch (error) {
    console.error('[SEANCES/IMPORT]', error);
    res.status(500).json({ error: 'Erreur lors de l\'importation du planning.' });
  }
});

// =====================
// POST /api/seances (Manually create a session)
// =====================
router.post('/', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const { matiereId, professeurId, groupe, date, heureDebut, heureFin, salle, type, niveau, nombreAssistantsRequis } = req.body;

    let targetProfId = professeurId;
    if (req.user.role === 'PROFESSEUR') {
      const professeur = await prisma.professeur.findUnique({
        where: { userId: req.user.userId },
      });
      if (!professeur) return res.status(404).json({ error: 'Professeur introuvable.' });
      targetProfId = professeur.id;
    }

    const seance = await prisma.seance.create({
      data: {
        matiereId: parseInt(matiereId),
        professeurId: parseInt(targetProfId),
        groupe,
        date: new Date(date),
        heureDebut,
        heureFin,
        salle,
        type: type || 'TP',
        niveau,
        nombreAssistantsRequis: parseInt(nombreAssistantsRequis) || 1,
      },
      include: { matiere: true, professeur: true },
    });

    res.status(201).json(seance);
  } catch (error) {
    console.error('[SEANCES/POST]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// PUT /api/seances/:id (Edit session)
// =====================
router.put('/:id', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { matiereId, groupe, date, heureDebut, heureFin, salle, statut, nombreAssistantsRequis } = req.body;

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
