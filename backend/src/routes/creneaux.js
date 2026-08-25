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
// GET /api/creneaux/demandes
// =====================
router.get('/demandes', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN', 'SERVICE_ADMINISTRATIF'), async (req, res) => {
    try {
        const { statut } = req.query;

        const where = {};
        if (statut && statut !== 'TOUT') {
            where.statut = statut;
        }

        const affectations = await prisma.affectation.findMany({
            where,
            include: {
                assistant: {
                    include: { user: { select: { email: true } } },
                },
                seance: {
                    include: {
                        matiere: true,
                        professeur: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const result = affectations.map(a => ({
            id: a.id,
            seanceId: a.seanceId,
            assistantId: a.assistantId,
            assistantNom: `${a.assistant.prenom} ${a.assistant.nom}`,
            assistantEmail: a.assistant.user?.email,
            assistantFormation: a.assistant.formation,
            assistantNiveau: a.assistant.niveau,
            matiere: a.seance.matiere.nom,
            matiereCode: a.seance.matiere.code,
            matiereCouleur: a.seance.matiere.couleur,
            professeurNom: `${a.seance.professeur.prenom} ${a.seance.professeur.nom}`,
            groupe: a.seance.groupe,
            salle: a.seance.salle,
            date: a.seance.date,
            heureDebut: a.seance.heureDebut,
            heureFin: a.seance.heureFin,
            heuresCount: a.heuresCount,
            dateDemande: a.createdAt,
            statut: a.statut,
            commentaire: a.commentaire,
        }));

        res.json(result);
    } catch (error) {
        console.error('[CRENEAUX/DEMANDES/GET]', error);
        res.status(500).json({ error: 'Erreur lors du chargement des demandes de créneaux.' });
    }
});

// =====================
// PATCH /api/creneaux/demandes/:id/valider
// =====================
router.patch('/demandes/:id/valider', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const affectationId = parseInt(req.params.id);

        const affectation = await prisma.affectation.findUnique({
            where: { id: affectationId },
            include: {
                assistant: { include: { user: true } },
                seance: { include: { matiere: true } },
            },
        });

        if (!affectation) {
            return res.status(404).json({ error: 'Demande de créneau introuvable.' });
        }

        const updated = await prisma.affectation.update({
            where: { id: affectationId },
            data: { statut: 'VALIDEE' },
        });

        // Notify Assistant
        await createNotification({
            userId: affectation.assistant.userId,
            type: 'RESERVATION_VALIDEE',
            titre: 'Créneau validé ! 🎉',
            message: `Votre demande de réservation pour le TP de ${affectation.seance.matiere.nom} (${affectation.seance.groupe}) le ${new Date(affectation.seance.date).toLocaleDateString('fr-FR')} a été validée officiellement.`,
            lien: '/mes-seances',
        });

        // Log History
        await logPedagogicalAction(
            req.user,
            'RESERVATION_VALIDEE',
            `Créneau ${affectation.seance.matiere.nom} - ${affectation.assistant.prenom} ${affectation.assistant.nom}`,
            `Validation officielle de la réservation pour le ${new Date(affectation.seance.date).toLocaleDateString('fr-FR')} (${affectation.seance.heureDebut}-${affectation.seance.heureFin}).`
        );

        res.json({ message: 'Réservation validée avec succès.', affectation: updated });
    } catch (error) {
        console.error('[CRENEAUX/DEMANDES/VALIDER]', error);
        res.status(500).json({ error: 'Erreur lors de la validation du créneau.' });
    }
});

// =====================
// PATCH /api/creneaux/demandes/:id/refuser
// =====================
router.patch('/demandes/:id/refuser', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const affectationId = parseInt(req.params.id);
        const { motif } = req.body;

        const affectation = await prisma.affectation.findUnique({
            where: { id: affectationId },
            include: {
                assistant: { include: { user: true } },
                seance: { include: { matiere: true } },
            },
        });

        if (!affectation) {
            return res.status(404).json({ error: 'Demande de créneau introuvable.' });
        }

        const updated = await prisma.affectation.update({
            where: { id: affectationId },
            data: { statut: 'REFUSEE', commentaire: motif || 'Demande refusée par le responsable.' },
        });

        // Notify Assistant
        await createNotification({
            userId: affectation.assistant.userId,
            type: 'RESERVATION_REFUSEE',
            titre: 'Demande de créneau non retenue',
            message: `Votre demande de réservation pour ${affectation.seance.matiere.nom} du ${new Date(affectation.seance.date).toLocaleDateString('fr-FR')} a été refusée. Motif : ${motif || 'Non spécifié'}`,
            lien: '/tps-disponibles',
        });

        // Log History
        await logPedagogicalAction(
            req.user,
            'RESERVATION_REFUSEE',
            `Créneau ${affectation.seance.matiere.nom} - ${affectation.assistant.prenom} ${affectation.assistant.nom}`,
            `Refus de la demande de réservation. Motif : ${motif || 'Aucun motif'}`
        );

        res.json({ message: 'Réservation refusée. Le créneau est à nouveau libre.', affectation: updated });
    } catch (error) {
        console.error('[CRENEAUX/DEMANDES/REFUSER]', error);
        res.status(500).json({ error: 'Erreur lors du refus du créneau.' });
    }
});

// =====================
// GET /api/creneaux/config
// =====================
router.get('/config', async (req, res) => {
    try {
        let config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
        if (!config) {
            config = await prisma.systemConfig.create({ data: { id: 1, blocageCreneauEnAttente: false } });
        }
        res.json(config);
    } catch (error) {
        console.error('[CRENEAUX/CONFIG/GET]', error);
        res.status(500).json({ error: 'Erreur lors du chargement de la configuration.' });
    }
});

// =====================
// PATCH /api/creneaux/config
// =====================
router.patch('/config', requireRole('RESPONSABLE_PEDAGOGIQUE', 'ADMIN'), async (req, res) => {
    try {
        const { blocageCreneauEnAttente } = req.body;
        const config = await prisma.systemConfig.upsert({
            where: { id: 1 },
            update: { blocageCreneauEnAttente: Boolean(blocageCreneauEnAttente) },
            create: { id: 1, blocageCreneauEnAttente: Boolean(blocageCreneauEnAttente) },
        });
        res.json(config);
    } catch (error) {
        console.error('[CRENEAUX/CONFIG/PATCH]', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la configuration.' });
    }
});

export default router;
