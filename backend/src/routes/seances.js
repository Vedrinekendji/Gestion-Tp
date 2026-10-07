import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import {
  sendSlotAvailableEmail,
  sendRoomChangeEmail,
  sendScheduleChangeEmail,
  sendDateChangeEmail,
  sendPresenceValidationEmail,
} from '../lib/email.js';

const router = express.Router();

router.use(authMiddleware);

// Helper: parse HH:MM to total minutes for overlap checks
function parseMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Helper: Trouve les emails des assistants éligibles sans conflit d'emploi du temps ET possédant la spécialité
async function findEligibleAssistantsForSeance(seance, excludeAssistantId = null) {
  try {
    const targetDate = new Date(seance.date).toISOString().split('T')[0];
    const targetStart = parseMinutes(seance.heureDebut);
    const targetEnd = parseMinutes(seance.heureFin);
    const seanceSpecialty = seance.specialite || 'INFORMATIQUE';

    const assistants = await prisma.assistant.findMany({
      where: {
        statut: 'ACTIF',
        specialties: { some: { specialty: seanceSpecialty } },
        ...(excludeAssistantId ? { id: { not: excludeAssistantId } } : {}),
      },
      include: {
        user: { select: { email: true } },
        affectations: {
          where: { statut: { in: ['EN_ATTENTE', 'VALIDEE'] } },
          include: { seance: true },
        },
      },
    });

    const eligible = assistants.filter(ast => {
      const hasConflict = ast.affectations.some(aff => {
        const s = aff.seance;
        if (!s || s.id === seance.id || s.statut === 'ANNULEE') return false;
        const sDate = new Date(s.date).toISOString().split('T')[0];
        if (sDate !== targetDate) return false;
        const sStart = parseMinutes(s.heureDebut);
        const sEnd = parseMinutes(s.heureFin);
        return sStart < targetEnd && sEnd > targetStart;
      });
      return !hasConflict && ast.user?.email;
    });

    return eligible.map(ast => ast.user.email);
  } catch (err) {
    console.error('[SEANCES/ELIGIBLE_ASSISTANTS_ERROR]', err);
    return [];
  }
}

// =====================
// GET /api/seances/historique (Audit Trail des actions)
// =====================
router.get('/historique', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const logs = await prisma.historiquePeda.findMany({
      orderBy: { dateAction: 'desc' },
      take: 100,
    });

    res.json(logs.map(log => ({
      id: log.id,
      action: log.action,
      dateAction: log.dateAction,
      effectuePar: log.utilisateur,
      objet: log.objet,
      commentaire: log.details,
    })));
  } catch (error) {
    console.error('[SEANCES/HISTORIQUE/GET]', error);
    res.status(500).json({ error: 'Erreur lors du chargement de l\'historique.' });
  }
});

// =====================
// GET /api/seances (Professeur, Admin uniquement)
// Isolation par spécialité (EXIGENCE REQUIS 5)
// =====================
router.get('/', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const role = req.user.role.toUpperCase();
    const { specialty } = req.query;
    let where = {};

    if (role === 'ADMIN_INFORMATIQUE') {
      where.specialite = 'INFORMATIQUE';
    } else if (role === 'ADMIN_ELECTRONIQUE') {
      where.specialite = 'ELECTRONIQUE';
    } else if (specialty && specialty !== 'TOUTES') {
      where.specialite = specialty;
    }

    if (role === 'PROFESSEUR') {
      const professeur = await prisma.professeur.findUnique({
        where: { userId: req.user.userId },
      });
      if (professeur) {
        where.professeurId = professeur.id;
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
        specialite: s.specialite,
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
          statutPresence: a.statutPresence || 'PRESENCE_A_VALIDER',
          dateValidationPresence: a.dateValidationPresence,
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
// GET /api/seances/disponibles (Assistant, Professeur, Admin)
// Gestion des permissions par spécialité (EXIGENCE REQUIS 14)
// =====================
router.get('/disponibles', requireRole('ASSISTANT', 'PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    let assistantId = null;
    let assistantAffectations = [];
    let assistantSpecialties = [];

    if (req.user.role === 'ASSISTANT') {
      const assistant = await prisma.assistant.findUnique({
        where: { userId: req.user.userId },
        include: {
          specialties: true,
          affectations: {
            where: { statut: { in: ['EN_ATTENTE', 'VALIDEE'] } },
            include: { seance: true },
          },
        },
      });
      if (assistant) {
        assistantId = assistant.id;
        assistantAffectations = assistant.affectations;
        assistantSpecialties = assistant.specialties.map(s => s.specialty);
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

      const hasRequiredSpecialty = !assistantId || assistantSpecialties.includes(s.specialite);

      let statutCalcul = 'AVAILABLE';
      let reason = null;

      if (s.statut === 'ANNULEE') {
        statutCalcul = 'CANCELLED';
        reason = 'Séance annulée';
      } else if (myAffectation) {
        statutCalcul = 'RESERVED_BY_ME';
        reason = 'Vous avez réservé ce créneau';
      } else if (!hasRequiredSpecialty) {
        statutCalcul = 'FORBIDDEN_SPECIALTY';
        reason = `Réservé aux assistants ${s.specialite === 'INFORMATIQUE' ? 'Informatique' : 'Électronique'}`;
      } else if (placesRestantes <= 0) {
        statutCalcul = 'FULL';
        reason = 'Complet';
      }

      let conflitHoraire = false;
      if (assistantId && !myAffectation && s.statut !== 'ANNULEE') {
        const targetDate = new Date(s.date).toISOString().split('T')[0];
        const targetStart = parseMinutes(s.heureDebut);
        const targetEnd = parseMinutes(s.heureFin);

        conflitHoraire = assistantAffectations.some(myAff => {
          const mySeance = myAff.seance;
          if (!mySeance || mySeance.id === s.id || mySeance.statut === 'ANNULEE') return false;
          const myDate = new Date(mySeance.date).toISOString().split('T')[0];
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
        specialite: s.specialite,
        statutCalcul,
        canReserve: statutCalcul === 'AVAILABLE' && !conflitHoraire,
        reason,
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
          statutPresence: a.statutPresence || 'PRESENCE_A_VALIDER',
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
// POST /api/seances (Création manuelle, Prof ou Admin uniquement)
// =====================
router.post('/', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const { matiereId, professeurId, groupe, date, heureDebut, heureFin, salle, type, niveau, nombreAssistantsRequis, specialite } = req.body;

    if (!matiereId || !date || !heureDebut || !heureFin || !groupe) {
      return res.status(400).json({ error: 'Remplissez tous les champs obligatoires.' });
    }

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

    const matiereObj = await prisma.matiere.findUnique({ where: { id: parseInt(matiereId) } });
    const targetSpecialite = specialite || (matiereObj ? matiereObj.specialite : 'INFORMATIQUE');

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
        specialite: targetSpecialite,
      },
      include: { matiere: true, professeur: true },
    });

    await prisma.historiquePeda.create({
      data: {
        utilisateur: `${req.user.prenom || req.user.login} (${req.user.role})`,
        action: 'CREATION_SEANCE',
        objet: `Séance TP ${seance.matiere.nom} (${seance.groupe})`,
        details: `Création de la séance le ${targetDate.toLocaleDateString('fr-FR')} (${heureDebut}-${heureFin}), Salle: ${seance.salle}, Spécialité: ${seance.specialite}`,
      },
    });

    res.status(201).json(seance);
  } catch (error) {
    console.error('[SEANCES/POST]', error);
    res.status(500).json({ error: 'Erreur lors de la création de la séance.' });
  }
});

// =====================
// PUT /api/seances/:id (Édition & détection intelligente de changements avec e-mails)
// =====================
router.put('/:id', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const seanceId = parseInt(id);
    const { matiereId, groupe, date, heureDebut, heureFin, salle, statut, nombreAssistantsRequis, specialite } = req.body;

    if (heureDebut && heureFin) {
      const startMin = parseMinutes(heureDebut);
      const endMin = parseMinutes(heureFin);
      if (endMin <= startMin) {
        return res.status(400).json({ error: 'L\'heure de fin doit être postérieure à l\'heure de début.' });
      }
    }

    const oldSeance = await prisma.seance.findUnique({
      where: { id: seanceId },
      include: {
        matiere: true,
        professeur: { include: { user: { select: { email: true } } } },
        affectations: {
          where: { statut: { in: ['EN_ATTENTE', 'VALIDEE'] } },
          include: { assistant: { include: { user: { select: { email: true } } } } },
        },
      },
    });

    if (!oldSeance) {
      return res.status(404).json({ error: 'Séance non trouvée.' });
    }

    const newSeance = await prisma.seance.update({
      where: { id: seanceId },
      data: {
        matiereId: matiereId ? parseInt(matiereId) : undefined,
        groupe,
        date: date ? new Date(date) : undefined,
        heureDebut,
        heureFin,
        salle,
        statut,
        nombreAssistantsRequis: nombreAssistantsRequis ? parseInt(nombreAssistantsRequis) : undefined,
        specialite: specialite || undefined,
      },
      include: {
        matiere: true,
        professeur: { include: { user: { select: { email: true } } } },
        affectations: {
          where: { statut: { in: ['EN_ATTENTE', 'VALIDEE'] } },
          include: { assistant: { include: { user: { select: { email: true } } } } },
        },
      },
    });

    const oldDateStr = new Date(oldSeance.date).toISOString().split('T')[0];
    const newDateStr = new Date(newSeance.date).toISOString().split('T')[0];

    const roomChanged = oldSeance.salle !== newSeance.salle;
    const timeChanged = oldSeance.heureDebut !== newSeance.heureDebut || oldSeance.heureFin !== newSeance.heureFin;
    const dateChanged = oldDateStr !== newDateStr;

    const recipientEmails = [];
    if (newSeance.professeur?.user?.email) {
      recipientEmails.push(newSeance.professeur.user.email);
    }
    newSeance.affectations.forEach(aff => {
      if (aff.assistant?.user?.email) {
        recipientEmails.push(aff.assistant.user.email);
      }
    });

    const uniqueEmails = [...new Set(recipientEmails)];

    const userLabel = `${req.user.prenom || req.user.login} (${req.user.role})`;

    if (roomChanged) {
      await prisma.historiquePeda.create({
        data: {
          utilisateur: userLabel,
          action: 'CHANGEMENT_SALLE',
          objet: `Séance TP ${newSeance.matiere.nom} (${newSeance.groupe})`,
          details: `Changement de salle : ancienne="${oldSeance.salle}" -> nouvelle="${newSeance.salle}"`,
        },
      });

      if (uniqueEmails.length > 0) {
        await sendRoomChangeEmail({
          emails: uniqueEmails,
          seance: {
            matiereNom: newSeance.matiere.nom,
            date: newSeance.date,
            heureDebut: newSeance.heureDebut,
            heureFin: newSeance.heureFin,
          },
          oldRoom: oldSeance.salle,
          newRoom: newSeance.salle,
        });
      }
    }

    if (dateChanged) {
      await prisma.historiquePeda.create({
        data: {
          utilisateur: userLabel,
          action: 'CHANGEMENT_DATE',
          objet: `Séance TP ${newSeance.matiere.nom} (${newSeance.groupe})`,
          details: `Changement de date : ancienne=${oldDateStr} -> nouvelle=${newDateStr}`,
        },
      });

      if (uniqueEmails.length > 0) {
        await sendDateChangeEmail({
          emails: uniqueEmails,
          seance: {
            matiereNom: newSeance.matiere.nom,
            salle: newSeance.salle,
            professeurNom: `${newSeance.professeur.prenom} ${newSeance.professeur.nom}`,
          },
          oldDate: oldSeance.date,
          newDate: newSeance.date,
          oldStart: oldSeance.heureDebut,
          newStart: newSeance.heureDebut,
          oldEnd: oldSeance.heureFin,
          newEnd: newSeance.heureFin,
        });
      }
    } else if (timeChanged) {
      await prisma.historiquePeda.create({
        data: {
          utilisateur: userLabel,
          action: 'CHANGEMENT_HORAIRE',
          objet: `Séance TP ${newSeance.matiere.nom} (${newSeance.groupe})`,
          details: `Changement d'horaire : ancien=${oldSeance.heureDebut}-${oldSeance.heureFin} -> nouveau=${newSeance.heureDebut}-${newSeance.heureFin}`,
        },
      });

      if (uniqueEmails.length > 0) {
        await sendScheduleChangeEmail({
          emails: uniqueEmails,
          seance: {
            matiereNom: newSeance.matiere.nom,
            date: newSeance.date,
            salle: newSeance.salle,
            professeurNom: `${newSeance.professeur.prenom} ${newSeance.professeur.nom}`,
          },
          oldStart: oldSeance.heureDebut,
          oldEnd: oldSeance.heureFin,
          newStart: newSeance.heureDebut,
          newEnd: newSeance.heureFin,
        });
      }
    }

    res.json(newSeance);
  } catch (error) {
    console.error('[SEANCES/PUT]', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la séance.' });
  }
});

// =========================================================================
// POST /api/seances/:id/reserver (Réservation immédiate transactionnelle)
// CONTRÔLE SERVEUR RIGOUREUX PAR SPÉCIALITÉ ET TRANSACTION ATOMIQUE (EXIGENCE REQUIS 14 & 26)
// =========================================================================
router.post('/:id/reserver', requireRole('ASSISTANT'), async (req, res) => {
  try {
    const seanceId = parseInt(req.params.id);

    const result = await prisma.$transaction(async (tx) => {
      const assistant = await tx.assistant.findUnique({
        where: { userId: req.user.userId },
        include: {
          specialties: true,
          affectations: {
            where: { statut: { in: ['EN_ATTENTE', 'VALIDEE'] } },
            include: { seance: true },
          },
        },
      });

      if (!assistant) {
        throw new Error('ASSISTANT_NOT_FOUND');
      }

      if (assistant.statut !== 'ACTIF') {
        throw new Error('ASSISTANT_INACTIVE');
      }

      const seance = await tx.seance.findUnique({
        where: { id: seanceId },
        include: {
          matiere: true,
          affectations: {
            where: { statut: { in: ['EN_ATTENTE', 'VALIDEE'] } }
          },
        },
      });

      if (!seance || seance.statut === 'ANNULEE') {
        throw new Error('SEANCE_NOT_AVAILABLE');
      }

      // RÈGLE MÉTIER REQUIS 14: Vérification stricte côté serveur de la spécialité
      const assistantSpecs = assistant.specialties.map(s => s.specialty);
      if (!assistantSpecs.includes(seance.specialite)) {
        throw new Error('SPECIALTY_MISMATCH');
      }

      const placesTotales = seance.nombreAssistantsRequis || 1;
      if (seance.affectations.length >= placesTotales) {
        throw new Error('NO_SEATS_LEFT');
      }

      const existing = seance.affectations.find(a => a.assistantId === assistant.id);
      if (existing) {
        throw new Error('ALREADY_RESERVED');
      }

      const targetDate = new Date(seance.date).toISOString().split('T')[0];
      const targetStart = parseMinutes(seance.heureDebut);
      const targetEnd = parseMinutes(seance.heureFin);

      const hasConflict = assistant.affectations.some(aff => {
        const s = aff.seance;
        if (!s || s.id === seance.id || s.statut === 'ANNULEE') return false;
        const sDate = new Date(s.date).toISOString().split('T')[0];
        if (sDate !== targetDate) return false;
        const sStart = parseMinutes(s.heureDebut);
        const sEnd = parseMinutes(s.heureFin);
        return sStart < targetEnd && sEnd > targetStart;
      });

      if (hasConflict) {
        throw new Error('SCHEDULE_CONFLICT');
      }

      const duration = Math.max(1, (targetEnd - targetStart) / 60) || 2.0;

      const affectation = await tx.affectation.create({
        data: {
          seanceId,
          assistantId: assistant.id,
          statut: 'VALIDEE',
          heuresCount: duration,
          statutPresence: 'PRESENCE_A_VALIDER',
        },
      });

      await tx.historiquePeda.create({
        data: {
          utilisateur: `${assistant.prenom} ${assistant.nom} (Assistant)`,
          action: 'RESERVATION',
          objet: `Séance TP ${seance.matiere.nom} (${seance.groupe})`,
          details: `Créneau réservé et validé le ${new Date(seance.date).toLocaleDateString('fr-FR')} (${seance.heureDebut}-${seance.heureFin}). Spécialité : ${seance.specialite}`,
        },
      });

      return { affectation, seance };
    });

    res.status(201).json({
      message: 'Votre réservation a été effectuée avec succès.',
      affectation: result.affectation
    });

  } catch (error) {
    if (error.message === 'SPECIALTY_MISMATCH') {
      return res.status(403).json({ error: 'Réservation impossible : vous n\'avez pas la spécialité requise pour cette séance.' });
    }
    if (error.message === 'ASSISTANT_NOT_FOUND') {
      return res.status(404).json({ error: 'Profil assistant non trouvé.' });
    }
    if (error.message === 'ASSISTANT_INACTIVE') {
      return res.status(400).json({ error: 'Votre compte assistant est inactif.' });
    }
    if (error.message === 'SEANCE_NOT_AVAILABLE') {
      return res.status(404).json({ error: 'Séance non disponible à la réservation.' });
    }
    if (error.message === 'NO_SEATS_LEFT') {
      return res.status(400).json({ error: 'Ce créneau vient d\'être réservé par un autre assistant.' });
    }
    if (error.message === 'ALREADY_RESERVED') {
      return res.status(400).json({ error: 'Vous avez déjà réservé cette séance.' });
    }
    if (error.message === 'SCHEDULE_CONFLICT') {
      return res.status(400).json({ error: 'Vous avez un conflit d\'horaire avec une autre affectation active.' });
    }

    console.error('[SEANCES/RESERVER]', error);
    res.status(500).json({ error: 'Erreur interne lors de la réservation du créneau.' });
  }
});

// =========================================================================
// POST /api/seances/:id/desister (ou /annuler-reservation)
// Libération automatique du créneau + notification aux assistants éligibles
// =========================================================================
const handleDesistement = async (req, res) => {
  try {
    const seanceId = parseInt(req.params.id);
    const { motif, assistantId: targetAssistantIdInput } = req.body;

    let assistant = null;
    if (req.user.role === 'ASSISTANT') {
      assistant = await prisma.assistant.findUnique({
        where: { userId: req.user.userId },
      });
    } else if (targetAssistantIdInput) {
      assistant = await prisma.assistant.findUnique({
        where: { id: parseInt(targetAssistantIdInput) },
      });
    }

    if (!assistant) {
      return res.status(404).json({ error: 'Profil assistant non trouvé.' });
    }

    // 1. Recherche de l'affectation active
    const affectation = await prisma.affectation.findFirst({
      where: {
        seanceId,
        assistantId: assistant.id,
        statut: { in: ['EN_ATTENTE', 'VALIDEE'] },
      },
      include: {
        seance: {
          include: {
            matiere: true,
            professeur: true,
          },
        },
      },
    });

    if (!affectation) {
      return res.status(404).json({ error: 'Aucune réservation active trouvée pour cette séance.' });
    }

    // 2. Mise à jour transactionnelle du statut d'affectation à ANNULEE
    await prisma.affectation.update({
      where: { id: affectation.id },
      data: { statut: 'ANNULEE' },
    });

    const userLabel = `${req.user.prenom || req.user.login} (${req.user.role})`;

    // 3. Journalisation obligatoire dans l'historique d'audit
    await prisma.historiquePeda.create({
      data: {
        utilisateur: userLabel,
        action: 'DESISTEMENT_CRENEAU',
        objet: `Séance TP ${affectation.seance.matiere.nom} (${affectation.seance.groupe})`,
        details: `Désistement de l'assistant ${assistant.prenom} ${assistant.nom}. Motif: ${motif || 'Non précisé'}. Le créneau est libéré.`,
      },
    });

    // 4. Recherche des assistants éligibles (sans conflit d'horaire et hors assistant désisté)
    const eligibleEmails = await findEligibleAssistantsForSeance(affectation.seance, assistant.id);

    // 5. Notification automatique par e-mail aux assistants éligibles
    if (eligibleEmails.length > 0) {
      await sendSlotAvailableEmail({
        emails: eligibleEmails,
        seance: {
          matiereNom: affectation.seance.matiere.nom,
          date: affectation.seance.date,
          heureDebut: affectation.seance.heureDebut,
          heureFin: affectation.seance.heureFin,
          professeurNom: `${affectation.seance.professeur.prenom} ${affectation.seance.professeur.nom}`,
          salle: affectation.seance.salle,
        },
      });
    }

    res.json({
      message: 'Désistement enregistré avec succès. Le créneau a été libéré et une notification par e-mail a été envoyée aux assistants éligibles.',
      eligibleNotifiedCount: eligibleEmails.length,
    });
  } catch (error) {
    console.error('[SEANCES/DESISTER]', error);
    res.status(500).json({ error: 'Erreur lors du désistement.' });
  }
};

router.post('/:id/desister', requireRole('ASSISTANT', 'PROFESSEUR', 'ADMIN'), handleDesistement);
router.post('/:id/annuler-reservation', requireRole('ASSISTANT', 'PROFESSEUR', 'ADMIN'), handleDesistement);

// =========================================================================
// PATCH /api/seances/:seanceId/presence/:assistantId
// Validation de la PRÉSENCE par le Professeur (autonome et indépendante)
// =========================================================================
router.patch('/:seanceId/presence/:assistantId', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const seanceId = parseInt(req.params.seanceId);
    const assistantId = parseInt(req.params.assistantId);
    const { statutPresence } = req.body;

    if (!['PRESENT', 'ABSENT', 'PRESENCE_A_VALIDER'].includes(statutPresence)) {
      return res.status(400).json({ error: 'Statut de présence invalide (PRESENT, ABSENT ou PRESENCE_A_VALIDER).' });
    }

    // 1. Récupérer l'affectation
    const affectation = await prisma.affectation.findFirst({
      where: { seanceId, assistantId },
      include: {
        assistant: { include: { user: { select: { email: true } } } },
        seance: { include: { matiere: true, professeur: true } },
      },
    });

    if (!affectation) {
      return res.status(404).json({ error: 'Affectation introuvable pour cette séance et cet assistant.' });
    }

    let profId = null;
    if (req.user.role === 'PROFESSEUR') {
      const prof = await prisma.professeur.findUnique({ where: { userId: req.user.userId } });
      if (prof) profId = prof.id;
    }

    // 2. Mettre à jour la présence
    const updatedAffectation = await prisma.affectation.update({
      where: { id: affectation.id },
      data: {
        statutPresence,
        dateValidationPresence: new Date(),
        valideParProfesseurId: profId,
      },
    });

    const profNom = affectation.seance.professeur
      ? `${affectation.seance.professeur.prenom} ${affectation.seance.professeur.nom}`
      : req.user.login;

    // 3. Traçabilité dans l'historique pédagogique
    await prisma.historiquePeda.create({
      data: {
        utilisateur: `${req.user.prenom || req.user.login} (${req.user.role})`,
        action: 'VALIDATION_PRESENCE',
        objet: `Assistant ${affectation.assistant.prenom} ${affectation.assistant.nom} - TP ${affectation.seance.matiere.nom}`,
        details: `Validation de la présence par le professeur : statut="${statutPresence}" le ${new Date().toLocaleString('fr-FR')}`,
      },
    });

    // 4. Notification par e-mail automatique à l'assistant
    if (affectation.assistant.user?.email) {
      await sendPresenceValidationEmail({
        email: affectation.assistant.user.email,
        assistantNom: `${affectation.assistant.prenom} ${affectation.assistant.nom}`,
        seance: {
          matiereNom: affectation.seance.matiere.nom,
          date: affectation.seance.date,
          heureDebut: affectation.seance.heureDebut,
          heureFin: affectation.seance.heureFin,
        },
        professeurNom: profNom,
        statutPresence,
      });
    }

    res.json({
      message: `Présence enregistrée (${statutPresence}) et e-mail envoyé à l'assistant.`,
      affectation: updatedAffectation,
    });
  } catch (error) {
    console.error('[SEANCES/PRESENCE/PATCH]', error);
    res.status(500).json({ error: 'Erreur lors de la validation de la présence.' });
  }
});

export default router;
