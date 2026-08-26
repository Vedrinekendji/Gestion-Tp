import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { createNotification } from '../lib/notify.js';
import { sendWelcomeEmail } from '../lib/email.js';

const router = express.Router();

// Helper for pedagogical action logging (compatible with requireRole)
async function logPedagogicalAction(user, action, objet, details) {
    let uName = user.email;
    if (user.userId) {
        const u = await prisma.user.findUnique({
            where: { id: user.userId },
            include: { professeur: true, assistant: true },
        });
        if (u?.professeur) uName = `${u.professeur.prenom} ${u.professeur.nom} (Professeur)`;
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

// ==================================================
// ROUTE PUBLIQUE : Soumission d'une candidature
// ==================================================
router.post('/', async (req, res) => {
    try {
        const { nom, prenom, deuxiemePrenom, email, telephone, formation, niveau, disponibilites, cvUrl } = req.body;

        // Validation des champs côté backend
        if (!nom || !prenom || !email || !formation || !niveau) {
            return res.status(400).json({ error: 'Tous les champs obligatoires (nom, premier prénom, email, formation, niveau) doivent être renseignés.' });
        }

        // Valider le format de l'adresse email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'L\'adresse email saisie est invalide.' });
        }

        // Empêcher les doublons évidents (candidature déjà en attente ou acceptée avec cet email)
        const existingCandidature = await prisma.candidature.findFirst({
            where: {
                email,
                statut: { in: ['EN_ATTENTE', 'ACCEPTEE'] }
            }
        });
        if (existingCandidature) {
            return res.status(400).json({ error: 'Une candidature active ou acceptée est déjà associée à cette adresse email.' });
        }

        const candidature = await prisma.candidature.create({
            data: {
                nom: nom.trim(),
                prenom: prenom.trim(),
                deuxiemePrenom: deuxiemePrenom ? deuxiemePrenom.trim() : null,
                email: email.trim().toLowerCase(),
                telephone: telephone ? telephone.trim() : null,
                formation: formation.trim(),
                niveau: niveau.trim(),
                disponibilites: disponibilites ? disponibilites.trim() : 'Non renseigné',
                cvUrl: cvUrl ? cvUrl.trim() : null,
                statut: 'EN_ATTENTE'
            },
        });

        res.status(201).json(candidature);
    } catch (error) {
        console.error('[CANDIDATURES/POST/PUBLIC]', error);
        res.status(500).json({ error: 'Erreur lors de la création de votre candidature.' });
    }
});

// ==================================================
// TOUTES LES ROUTES EN DESSOUS SONT PROTÉGÉES
// ==================================================
router.use(authMiddleware);

// =====================
// GET /api/candidatures (Admin et Professeur uniquement)
// =====================
router.get('/', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
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
                        user: { select: { email: true, login: true } },
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
router.get('/:id', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
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
// PATCH /api/candidatures/:id/accepter
// =====================
router.patch('/:id/accepter', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const candidatureId = parseInt(req.params.id);
        const candidature = await prisma.candidature.findUnique({
            where: { id: candidatureId }
        });

        if (!candidature) {
            return res.status(404).json({ error: 'Candidature introuvable.' });
        }

        // Si la candidature a déjà été acceptée ou a déjà un assistant lié, on empêche la recréation de compte
        if (candidature.statut === 'ACCEPTEE' || candidature.assistantId !== null) {
            return res.status(400).json({ error: 'Cette candidature a déjà été acceptée. Impossible de générer plusieurs comptes.' });
        }

        // ---- LOGIQUE DE GÉNÉRATION D'INITIALES ET DE LOGIN ----
        const generateInitials = (text) => {
            if (!text) return '';
            // Supprimer les accents
            const cleaned = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            // Découper par tirets et espaces pour les noms/prénoms composés
            const parts = cleaned.split(/[\s-]+/).filter(Boolean);
            return parts.map(p => p[0].toUpperCase()).join('');
        };

        const prenomInitials = generateInitials(candidature.prenom) + generateInitials(candidature.deuxiemePrenom);
        const nomInitials = generateInitials(candidature.nom);

        // Année de création de la candidature
        const annee = new Date(candidature.createdAt).getFullYear().toString().slice(-2);

        const baseLogin = `${prenomInitials}${annee}${nomInitials}`.toUpperCase();

        // Gérer l'unicité en base de données avec index incrémental si déjà existant
        let finalLogin = baseLogin;
        let counter = 1;
        let loginExists = true;
        while (loginExists) {
            const testLogin = counter === 1 ? baseLogin : `${baseLogin}${counter}`;
            const count = await prisma.user.count({ where: { login: testLogin } });
            if (count === 0) {
                finalLogin = testLogin;
                loginExists = false;
            } else {
                counter++;
            }
        }

        // ---- MOT DE PASSE TEMPORAIRE ----
        const generateTempPassword = () => {
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
            let pass = '';
            for (let i = 0; i < 10; i++) {
                pass += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return pass;
        };

        const passwordTemp = generateTempPassword();
        const hashPass = await bcrypt.hash(passwordTemp, 10);

        let assistantId = null;

        // Relation SQL transactionnelle pour garantir la cohérence
        const result = await prisma.$transaction(async (tx) => {
            // Re-valider le statut pour éviter les doubles clics
            const freshCand = await tx.candidature.findUnique({ where: { id: candidatureId } });
            if (freshCand.statut === 'ACCEPTEE' || freshCand.assistantId !== null) {
                throw new Error('DOUBLON_ACCEPTER');
            }

            // Vérifier si un User avec cet email existe déjà
            let user = await tx.user.findFirst({ where: { email: candidature.email } });

            if (user) {
                // Si l'utilisateur existe déjà
                let assistant = await tx.assistant.findUnique({ where: { userId: user.id } });
                if (!assistant) {
                    assistant = await tx.assistant.create({
                        data: {
                            userId: user.id,
                            nom: candidature.nom,
                            prenom: candidature.prenom,
                            deuxiemePrenom: candidature.deuxiemePrenom,
                            telephone: candidature.telephone,
                            formation: candidature.formation,
                            niveau: candidature.niveau,
                            inscription: new Date(),
                            statut: 'ACTIF',
                            heuresMax: 120,
                        }
                    });
                } else {
                    // Réactiver l'assistant existant
                    await tx.assistant.update({
                        where: { id: assistant.id },
                        data: { statut: 'ACTIF' }
                    });
                }
                assistantId = assistant.id;
            } else {
                // Créer le compte utilisateur assistant
                user = await tx.user.create({
                    data: {
                        email: candidature.email,
                        login: finalLogin,
                        password: hashPass,
                        role: 'ASSISTANT',
                        assistant: {
                            create: {
                                nom: candidature.nom,
                                prenom: candidature.prenom,
                                deuxiemePrenom: candidature.deuxiemePrenom,
                                telephone: candidature.telephone,
                                formation: candidature.formation,
                                niveau: candidature.niveau,
                                inscription: new Date(),
                                statut: 'ACTIF',
                                heuresMax: 120,
                            }
                        }
                    },
                    include: { assistant: true }
                });
                assistantId = user.assistant.id;
            }

            // Mettre à jour le statut de la candidature
            const updatedCand = await tx.candidature.update({
                where: { id: candidatureId },
                data: {
                    statut: 'ACCEPTEE',
                    assistantId,
                    commentaire: req.body.commentaire || candidature.commentaire,
                },
                include: { assistant: true },
            });

            return { updatedCand, user };
        });

        // ---- ENVOI EMAIL AUTOMATIQUE (Hors transaction SQL pour performance) ----
        const nomComplet = `${candidature.prenom} ${candidature.deuxiemePrenom ? candidature.deuxiemePrenom + ' ' : ''}${candidature.nom}`;
        await sendWelcomeEmail({
            email: candidature.email,
            nomComplet,
            login: finalLogin,
            passwordTemp
        });

        // Créer une notification interne pour le compte créé
        await createNotification({
            userId: result.user.id,
            type: 'CANDIDATURE_ACCEPTEE',
            titre: 'Candidature Acceptée 🎉',
            message: `Bienvenue ${candidature.prenom}. Votre candidature a été acceptée. Connectez-vous avec votre login ${finalLogin} et changez votre mot de passe à la première connexion.`,
            lien: '/mes-seances',
        });

        // Enregistrer l'action
        await logPedagogicalAction(
            req.user,
            'CANDIDATURE_ACCEPTEE',
            `Candidature #${candidatureId} - ${candidature.prenom} ${candidature.nom}`,
            `Candidature acceptée officiellement. Login généré : ${finalLogin}.`
        );

        res.json(result.updatedCand);
    } catch (error) {
        if (error.message === 'DOUBLON_ACCEPTER') {
            return res.status(400).json({ error: 'Cette candidature a déjà été acceptée simultanément.' });
        }
        console.error('[CANDIDATURES/ACCEPTER]', error);
        res.status(500).json({ error: 'Erreur lors de l\'acceptation de la candidature.' });
    }
});

// =====================
// PATCH /api/candidatures/:id/refuser
// =====================
router.patch('/:id/refuser', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const candidatureId = parseInt(req.params.id);
        const { motifRefus } = req.body;

        if (!motifRefus || motifRefus.trim() === '') {
            return res.status(400).json({ error: 'Un motif de refus valide doit obligatoirement être spécifié.' });
        }

        const candidature = await prisma.candidature.findUnique({ where: { id: candidatureId } });
        if (!candidature) {
            return res.status(404).json({ error: 'Candidature introuvable.' });
        }

        const updated = await prisma.candidature.update({
            where: { id: candidatureId },
            data: {
                statut: 'REFUSEE',
                motifRefus: motifRefus.trim(),
            },
        });

        // Envoyer la notification in-app si un compte utilisateur correspondant existe déjà
        const user = await prisma.user.findFirst({ where: { email: candidature.email } });
        if (user) {
            await createNotification({
                userId: user.id,
                type: 'CANDIDATURE_REFUSEE',
                titre: 'Candidature Non Retenue',
                message: `Votre candidature pour le poste d'assistant TP n'a pas été retenue. Motif : ${motifRefus}`,
            });
        }

        // Historique de l'action
        await logPedagogicalAction(
            req.user,
            'CANDIDATURE_REFUSEE',
            `Candidature #${candidatureId} - ${candidature.prenom} ${candidature.nom}`,
            `Candidature refusée. Motif : ${motifRefus}`
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
router.patch('/:id/commentaire', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const candidatureId = parseInt(req.params.id);
        const { commentaire } = req.body;

        const updated = await prisma.candidature.update({
            where: { id: candidatureId },
            data: { commentaire: commentaire ? commentaire.trim() : null },
        });

        res.json(updated);
    } catch (error) {
        console.error('[CANDIDATURES/COMMENTAIRE]', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire.' });
    }
});

export default router;
