import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// =====================
// GET /api/historique
// =====================
router.get('/', requireRole('RESPONSABLE_PEDAGOGIQUE', 'PROFESSEUR', 'ADMIN', 'SERVICE_ADMINISTRATIF'), async (req, res) => {
    try {
        const { action, search } = req.query;

        const where = {};
        if (action && action !== 'TOUT') {
            where.action = action;
        }
        if (search) {
            where.OR = [
                { utilisateur: { contains: search } },
                { action: { contains: search } },
                { objet: { contains: search } },
                { details: { contains: search } },
            ];
        }

        const logs = await prisma.historiquePeda.findMany({
            where,
            orderBy: { date: 'desc' },
            take: 100,
        });

        res.json(logs);
    } catch (error) {
        console.error('[HISTORIQUE/GET]', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique pédagogique.' });
    }
});

export default router;
