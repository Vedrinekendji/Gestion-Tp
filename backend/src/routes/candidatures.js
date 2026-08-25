import express from 'express';
import bcrypt from 'bcryptjs';
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
// GET /api/candidatures
// =====================
router.get('/', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN', 'SERVICE_ADMINISTRATIF'), async (req, res) => {
    try {
        const { statut, search } = req.query;

        const where = {};
        if (statut && statut !== 'TOUT') {
            where.statut = statut;
        }
        if (search) {
            where.OR = [
                { nom: { contains: search } },
                { prenom: { contains: search } },
                { email: { contains: search } },
                { formation: { contains: search } },
            ];
        }

        const candidatures = await prisma.candidature.findMany({
            where,
            include: {
                assistant: {
                    include: {
                        user: { select: { email: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(candidatures);
    } catch (error) {
        console.error('[CANDIDATURES/GET]', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des candidatures.' });
    }
});

// =====================
// GET /api/candidatures/:id
// =====================
router.get('/:id', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN', 'SERVICE_ADMINISTRATIF'), async (req, res) => {
    try {
        const candidature = await prisma.candidature.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { assistant: true },
        });

        if (!candidature) {
            return res.status(404).json({ error: 'Candidature introuvable.' });
        }

        res.json(candidature);
    } catch (error) {
        console.error('[CANDIDATURES/GET/:id]', error);
        res.status(500).json({ error: 'Erreur lors du chargement de la candidature.' });
    }
});

// =====================
// POST /api/candidatures (Créer une nouvelle candidature)
// =====================
router.post('/', async (req, res) => {
    try {
        const { nom, prenom, email, telephone, formation, niveau, disponibilites, cvUrl } = req.body;

        if (!nom || !prenom || !email || !formation) {
            return res.status(400).json({ error: 'Champs obligatoires manquants.' });
        }

        const candidature = await prisma.candidature.create({
            data: {
                nom,
                prenom,
                email,
                telephone: telephone || null,
                formation,
                niveau: niveau || 'M1',
                disponibilites: disponibilites || 'Disponibilités à préciser',
                cvUrl: cvUrl || null,
                statut: 'EN_ATTENTE',
            },
        });

        res.status(201).json(candidature);
    } catch (error) {
        console.error('[CANDIDATURES/POST]', error);
        res.status(500).json({ error: 'Erreur lors de la création de la candidature.' });
    }
});

// =====================
// PATCH /api/candidatures/:id/accepter
// =====================
router.patch('/:id/accepter', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const candidatureId = parseInt(req.params.id);
        const candidature = await prisma.candidature.findUnique({ where: { id: candidatureId } });

        if (!candidature) {
            return res.status(404).json({ error: 'Candidature introuvable.' });
        }

        let assistantId = candidature.assistantId;

        // Si pas de compte assistant lié, on le crée
        if (!assistantId) {
            let existingUser = await prisma.user.findUnique({ where: { email: candidature.email } });
            if (!existingUser) {
                const hashedPassword = await bcrypt.hash('asst123', 10);
                existingUser = await prisma.user.create({
                    data: {
                        email: candidature.email,
                        password: hashedPassword,
                        role: 'ASSISTANT',
                        assistant: {
                            create: {
                                nom: candidature.nom,
                                prenom: candidature.prenom,
                                telephone: candidature.telephone,
                                formation: candidature.formation,
                                niveau: candidature.niveau,
                                inscription: new Date(),
                                statut: 'ACTIF',
                                heuresMax: 120,
                            },
                        },
                    },
                    include: { assistant: true },
                });
                assistantId = existingUser.assistant.id;
            } else {
                const existingAssistant = await prisma.assistant.findUnique({ where: { userId: existingUser.id } });
                if (existingAssistant) {
                    assistantId = existingAssistant.id;
                    await prisma.assistant.update({ where: { id: assistantId }, data: { statut: 'ACTIF' } });
                }
            }
        }

        const updated = await prisma.candidature.update({
            where: { id: candidatureId },
            data: {
                statut: 'ACCEPTEE',
                assistantId,
                commentaire: req.body.commentaire || candidature.commentaire,
            },
            include: { assistant: true },
        });

        // Envoyer notification si l'utilisateur existe
        if (updated.assistant) {
            await createNotification({
                userId: updated.assistant.userId,
                type: 'CANDIDATURE_ACCEPTEE',
                titre: 'Candidature Acceptée 🎉',
                message: `Félicitations ${updated.prenom} ! Votre candidature d'assistant TP a été acceptée. Votre compte est désormais actif.`,
                lien: '/mes-seances',
            });
        }

        // Historique pédagogique
        await logPedagogicalAction(
            req.user,
            'CANDIDATURE_ACCEPTEE',
            `Candidature #${candidatureId} - ${candidature.prenom} ${candidature.nom}`,
            `Acceptation de la candidature. Compte assistant ${assistantId ? '#' + assistantId : 'activé'}.`
        );

        res.json(updated);
    } catch (error) {
        console.error('[CANDIDATURES/ACCEPTER]', error);
        res.status(500).json({ error: 'Erreur lors de l\'acceptation de la candidature.' });
    }
});

// =====================
// PATCH /api/candidatures/:id/refuser
// =====================
router.patch('/:id/refuser', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const candidatureId = parseInt(req.params.id);
        const { motifRefus } = req.body;

        const candidature = await prisma.candidature.findUnique({ where: { id: candidatureId } });
        if (!candidature) {
            return res.status(404).json({ error: 'Candidature introuvable.' });
        }

        const updated = await prisma.candidature.update({
            where: { id: candidatureId },
            data: {
                statut: 'REFUSEE',
                motifRefus: motifRefus || 'Candidature non retenue pour cette session.',
            },
        });

        // Envoyer notification si un compte existe
        const user = await prisma.user.findUnique({ where: { email: candidature.email } });
        if (user) {
            await createNotification({
                userId: user.id,
                type: 'CANDIDATURE_REFUSEE',
                titre: 'Candidature Non Retenue',
                message: `Votre candidature pour le poste d'assistant TP n'a pas été retenue. Motif : ${updated.motifRefus}`,
            });
        }

        // Historique pédagogique
        await logPedagogicalAction(
            req.user,
            'CANDIDATURE_REFUSEE',
            `Candidature #${candidatureId} - ${candidature.prenom} ${candidature.nom}`,
            `Refus de la candidature. Motif : ${updated.motifRefus}`
        );

        res.json(updated);
    } catch (error) {
        console.error('[CANDIDATURES/REFUSER]', error);
        res.status(500).json({ error: 'Erreur lors du refus de la candidature.' });
    }
});

// =====================
// PATCH /api/candidatures/:id/commentaire
// =====================
router.patch('/:id/commentaire', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const candidatureId = parseInt(req.params.id);
        const { commentaire } = req.body;

        const updated = await prisma.candidature.update({
            where: { id: candidatureId },
            data: { commentaire },
        });

        res.json(updated);
    } catch (error) {
        console.error('[CANDIDATURES/COMMENTAIRE]', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire.' });
    }
});

export default router;
