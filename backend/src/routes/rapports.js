import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// =====================
// GET /api/rapports/mensuel
// Query params: mois (1-12), annee (e.g. 2026), assistantId, formation, matiereId, professeurId, statutHeures
// =====================
router.get('/mensuel', requireRole('SERVICE_ADMINISTRATIF', 'ADMIN', 'RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR'), async (req, res) => {
    try {
        const mois = parseInt(req.query.mois) || new Date().getMonth() + 1;
        const annee = parseInt(req.query.annee) || new Date().getFullYear();
        const assistantId = req.query.assistantId ? parseInt(req.query.assistantId) : undefined;
        const matiereId = req.query.matiereId ? parseInt(req.query.matiereId) : undefined;
        const professeurId = req.query.professeurId ? parseInt(req.query.professeurId) : undefined;
        const formation = req.query.formation && req.query.formation !== 'TOUT' ? req.query.formation : undefined;
        const statutHeures = req.query.statutHeures && req.query.statutHeures !== 'TOUT' ? req.query.statutHeures : undefined;

        const startDate = new Date(annee, mois - 1, 1);
        const endDate = new Date(annee, mois, 0, 23, 59, 59);

        // Build filter for affectations
        const affectationWhere = {
            seance: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        };

        if (assistantId) affectationWhere.assistantId = assistantId;
        if (statutHeures) affectationWhere.statutHeures = statutHeures;

        if (formation) {
            affectationWhere.assistant = { formation: { contains: formation } };
        }
        if (matiereId) {
            affectationWhere.seance.matiereId = matiereId;
        }
        if (professeurId) {
            affectationWhere.seance.professeurId = professeurId;
        }

        const affectations = await prisma.affectation.findMany({
            where: affectationWhere,
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
            orderBy: { seance: { date: 'asc' } },
        });

        // 1. Calculate general summary
        const totalHeuresValidees = affectations
            .filter(a => a.statutHeures === 'VALIDEE')
            .reduce((sum, a) => sum + a.heuresCount, 0);

        const totalHeuresEffectuees = affectations
            .reduce((sum, a) => sum + a.heuresCount, 0);

        const uniqueAssistantsMap = new Map();
        affectations.forEach(a => {
            const ast = a.assistant;
            if (!uniqueAssistantsMap.has(ast.id)) {
                uniqueAssistantsMap.set(ast.id, {
                    id: ast.id,
                    nom: ast.nom,
                    prenom: ast.prenom,
                    email: ast.user?.email,
                    formation: ast.formation || 'Non précisée',
                    niveau: ast.niveau || 'N/A',
                    nbSeances: 0,
                    totalHeuresEffectuees: 0,
                    totalHeuresValidees: 0,
                });
            }

            const item = uniqueAssistantsMap.get(ast.id);
            item.nbSeances += 1;
            item.totalHeuresEffectuees += a.heuresCount;
            if (a.statutHeures === 'VALIDEE') {
                item.totalHeuresValidees += a.heuresCount;
            }
        });

        const uniqueSeancesSet = new Set(affectations.map(a => a.seanceId));

        const moisNoms = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];

        const reportData = {
            meta: {
                periode: `${moisNoms[mois - 1]} ${annee}`,
                dateGeneration: new Date().toISOString(),
                nombreAssistants: uniqueAssistantsMap.size,
                nombreSeances: uniqueSeancesSet.size,
                totalHeuresEffectuees,
                totalHeuresValidees,
            },
            detailParAssistant: Array.from(uniqueAssistantsMap.values()),
            detailSeances: affectations.map(a => ({
                id: a.id,
                date: a.seance.date,
                matiere: a.seance.matiere.nom,
                matiereCode: a.seance.matiere.code,
                professeur: `${a.seance.professeur.prenom} ${a.seance.professeur.nom}`,
                groupe: a.seance.groupe,
                salle: a.seance.salle,
                heureDebut: a.seance.heureDebut,
                heureFin: a.seance.heureFin,
                duree: a.heuresCount,
                assistantNom: `${a.assistant.prenom} ${a.assistant.nom}`,
                assistantFormation: a.assistant.formation,
                statutReservation: a.statut,
                statutHeures: a.statutHeures,
                commentaire: a.commentaireHeures,
            })),
        };

        res.json(reportData);
    } catch (error) {
        console.error('[RAPPORTS/MENSUEL]', error);
        res.status(500).json({ error: 'Erreur lors de la génération du rapport mensuel.' });
    }
});

export default router;
