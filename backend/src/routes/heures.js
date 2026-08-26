import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { createNotification } from '../lib/notify.js';

const router = express.Router();

router.use(authMiddleware);

// Helper for pedagogical action logging
async function logPedagogicalAction(user, action, objet, details) {
    let uName = user.email;
    if (user.userId) {
        const u = await prisma.user.findUnique({
            where: { id: user.userId },
            include: { professeur: true, assistant: true },
        });
        if (u?.professeur) uName = `${u.professeur.prenom} ${u.professeur.nom} (${user.role})`;
        else if (u?.assistant) uName = `${u.assistant.prenom} ${u.assistant.nom} (Assistant)`;
    }
    await prisma.historiquePeda.create({
        data: {
            utilisateur: uName,
            action,
            objet,
            details,
        },
    });
}

// =====================
// GET /api/heures/validation
// List all submitted hours
// =====================
router.get('/validation', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const { statut } = req.query;

        const where = {
            statut: 'VALIDEE', // Only confirmed assignments have hours to validate
        };

        if (statut && statut !== 'TOUT') {
            where.statutHeures = statut;
        }

        const affectations = await prisma.affectation.findMany({
            where,
            include: {
                assistant: {
                    include: { user: { select: { email: true } } },
                },
                seance: {
                    include: { matiere: true, professeur: true },
                },
            },
            orderBy: { seance: { date: 'desc' } },
        });

        const result = affectations.map(a => ({
            id: a.id,
            assistantId: a.assistantId,
            assistantNom: `${a.assistant.prenom} ${a.assistant.nom}`,
            assistantEmail: a.assistant.user?.email,
            assistantFormation: a.assistant.formation,
            seanceId: a.seanceId,
            matiere: a.seance.matiere.nom,
            matiereCode: a.seance.matiere.code,
            matiereCouleur: a.seance.matiere.couleur,
            professeurNom: `${a.seance.professeur.prenom} ${a.seance.professeur.nom}`,
            groupe: a.seance.groupe,
            salle: a.seance.salle,
            date: a.seance.date,
            heureDebut: a.seance.heureDebut,
            heureFin: a.seance.heureFin,
            duree: a.heuresCount,
            statut: a.statutHeures,
            commentaire: a.commentaireHeures,
            dateValidation: a.dateValidationHeures,
        }));

        res.json(result);
    } catch (error) {
        console.error('[HEURES/VALIDATION/GET]', error);
        res.status(500).json({ error: 'Erreur lors du chargement de la validation des heures.' });
    }
});

// =====================
// PATCH /api/heures/validation/:id/valider
// =====================
router.patch('/validation/:id/valider', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const affectationId = parseInt(req.params.id);
        const { commentaire } = req.body;

        const affectation = await prisma.affectation.findUnique({
            where: { id: affectationId },
            include: {
                assistant: { include: { user: true } },
                seance: { include: { matiere: true } },
            },
        });

        if (!affectation) {
            return res.status(404).json({ error: 'Fiche d\'heures introuvable.' });
        }

        const updated = await prisma.affectation.update({
            where: { id: affectationId },
            data: {
                statutHeures: 'VALIDEE',
                commentaireHeures: commentaire || affectation.commentaireHeures || 'Heures validées par le responsable.',
                dateValidationHeures: new Date(),
            },
        });

        // Notify assistant
        await createNotification({
            userId: affectation.assistant.userId,
            type: 'HEURES_VALIDEES',
            titre: 'Heures de TP comptabilisées ✅',
            message: `Vos ${affectation.heuresCount} heures de TP pour ${affectation.seance.matiere.nom} (${affectation.seance.groupe}) du ${new Date(affectation.seance.date).toLocaleDateString('fr-FR')} ont été validées officiellement.`,
            lien: '/mes-seances',
        });

        // Log History
        await logPedagogicalAction(
            req.user,
            'HEURES_VALIDEES',
            `${affectation.heuresCount}h - ${affectation.assistant.prenom} ${affectation.assistant.nom}`,
            `Validation officielle de ${affectation.heuresCount}h pour la séance ${affectation.seance.matiere.nom} (${affectation.seance.groupe}).`
        );

        res.json({ message: 'Heures de TP validées avec succès.', affectation: updated });
    } catch (error) {
        console.error('[HEURES/VALIDATION/VALIDER]', error);
        res.status(500).json({ error: 'Erreur lors de la validation des heures.' });
    }
});

// =====================
// PATCH /api/heures/validation/:id/refuser
// =====================
router.patch('/validation/:id/refuser', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const affectationId = parseInt(req.params.id);
        const { commentaire } = req.body;

        const affectation = await prisma.affectation.findUnique({
            where: { id: affectationId },
            include: {
                assistant: { include: { user: true } },
                seance: { include: { matiere: true } },
            },
        });

        if (!affectation) {
            return res.status(404).json({ error: 'Fiche d\'heures introuvable.' });
        }

        const updated = await prisma.affectation.update({
            where: { id: affectationId },
            data: {
                statutHeures: 'REFUSEE',
                commentaireHeures: commentaire || 'Refusé par le responsable.',
                dateValidationHeures: null,
            },
        });

        // Notify assistant
        await createNotification({
            userId: affectation.assistant.userId,
            type: 'HEURES_REFUSEES',
            titre: 'Heures de TP non comptabilisées',
            message: `Vos heures de TP pour ${affectation.seance.matiere.nom} (${affectation.seance.groupe}) du ${new Date(affectation.seance.date).toLocaleDateString('fr-FR')} n'ont pas été validées. Motif : ${commentaire || 'Non spécifié'}`,
            lien: '/mes-seances',
        });

        // Log History
        await logPedagogicalAction(
            req.user,
            'HEURES_REFUSEES',
            `${affectation.heuresCount}h - ${affectation.assistant.prenom} ${affectation.assistant.nom}`,
            `Refus de validation pour les heures de ${affectation.seance.matiere.nom}. Motif : ${commentaire || 'Aucun motif'}`
        );

        res.json({ message: 'Validation des heures refusée.', affectation: updated });
    } catch (error) {
        console.error('[HEURES/VALIDATION/REFUSER]', error);
        res.status(500).json({ error: 'Erreur lors du refus des heures.' });
    }
});

// =====================
// POST /api/heures/soumettre (Assistant submits hours after completed TP)
// =====================
router.post('/soumettre', requireRole('ASSISTANT'), async (req, res) => {
    try {
        const { affectationId, commentaire } = req.body;

        const assistant = await prisma.assistant.findUnique({ where: { userId: req.user.userId } });
        if (!assistant) return res.status(404).json({ error: 'Assistant introuvable.' });

        const affectation = await prisma.affectation.findFirst({
            where: { id: parseInt(affectationId), assistantId: assistant.id },
            include: { seance: { include: { matiere: true } } },
        });

        if (!affectation) {
            return res.status(404).json({ error: 'Affectation introuvable.' });
        }

        const updated = await prisma.affectation.update({
            where: { id: affectation.id },
            data: {
                statutHeures: 'EN_ATTENTE',
                commentaireHeures: commentaire || 'Heures soumises par l\'assistant après la séance.',
            },
        });

        // Log action
        await logPedagogicalAction(
            req.user,
            'HEURES_SOUMISES',
            `TP ${affectation.seance.matiere.nom} (${affectation.seance.groupe})`,
            `Heures soumises pour validation par ${assistant.prenom} ${assistant.nom}.`
        );

        res.json({ message: 'Heures soumises pour validation avec succès.', affectation: updated });
    } catch (error) {
        console.error('[HEURES/SOUMETTRE]', error);
        res.status(500).json({ error: 'Erreur lors de la soumission des heures.' });
    }
});

export default router;
