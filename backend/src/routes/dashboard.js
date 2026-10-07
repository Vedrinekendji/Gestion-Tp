import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// =====================
// GET /api/dashboard/stats
// =====================
router.get('/stats', async (req, res) => {
  try {
    const { role, userId } = req.user;

    // Standardize role checks
    const normalizedRole = role.toUpperCase();

    if (normalizedRole === 'RESPONSABLE_PEDAGOGIQUE' || normalizedRole === 'PROFESSEUR' || normalizedRole.includes('ADMIN')) {
      // === Dashboard Pédagogique ===
      const specialtyFilter = req.query.specialty;
      let candWhere = { statut: 'EN_ATTENTE' };
      let asstWhere = { statut: 'ACTIF' };
      let seanceWhere = {};

      if (normalizedRole === 'ADMIN_INFORMATIQUE' || specialtyFilter === 'INFORMATIQUE') {
        candWhere.specialties = { some: { specialty: 'INFORMATIQUE' } };
        asstWhere.specialties = { some: { specialty: 'INFORMATIQUE' } };
        seanceWhere.specialite = 'INFORMATIQUE';
      } else if (normalizedRole === 'ADMIN_ELECTRONIQUE' || specialtyFilter === 'ELECTRONIQUE') {
        candWhere.specialties = { some: { specialty: 'ELECTRONIQUE' } };
        asstWhere.specialties = { some: { specialty: 'ELECTRONIQUE' } };
        seanceWhere.specialite = 'ELECTRONIQUE';
      }

      const candidaturesAttente = await prisma.candidature.count({ where: candWhere });
      const assistantsActifs = await prisma.assistant.count({ where: asstWhere });
      const seancesProgrammees = await prisma.seance.count({ where: { ...seanceWhere, statut: 'PLANIFIEE' } });
      const seancesTerminees = await prisma.seance.count({ where: { ...seanceWhere, statut: 'TERMINEE' } });

      const heuresValideesAgg = await prisma.affectation.aggregate({
        where: { statutHeures: 'VALIDEE' },
        _sum: { heuresCount: true },
      });
      const heuresAttenteAgg = await prisma.affectation.aggregate({
        where: { statutHeures: 'EN_ATTENTE', statut: 'VALIDEE' },
        _sum: { heuresCount: true },
      });
      const heuresRefuseesAgg = await prisma.affectation.aggregate({
        where: { statutHeures: 'REFUSEE' },
        _sum: { heuresCount: true },
      });

      const heuresValidees = heuresValideesAgg._sum.heuresCount || 0;
      const heuresAttente = heuresAttenteAgg._sum.heuresCount || 0;
      const heuresRefusees = heuresRefuseesAgg._sum.heuresCount || 0;

      // 1. Chart: Heures réalisées par mois (6 derniers mois)
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const affectationsParMois = await prisma.affectation.findMany({
        where: {
          statutHeures: 'VALIDEE',
          seance: { date: { gte: sixMonthsAgo } },
        },
        include: { seance: { select: { date: true } } },
      });

      const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
      const chartHeuresParMois = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        const h = affectationsParMois
          .filter(af => {
            const sd = new Date(af.seance.date);
            return sd.getMonth() === m && sd.getFullYear() === y;
          })
          .reduce((sum, af) => sum + af.heuresCount, 0);
        chartHeuresParMois.push({ mois: moisNoms[m], heures: h });
      }

      // 2. Chart: Heures par assistant
      const topAssistants = await prisma.assistant.findMany({
        where: { statut: 'ACTIF' },
        include: {
          affectations: {
            where: { statutHeures: 'VALIDEE' },
            select: { heuresCount: true },
          },
        },
      });

      const chartHeuresParAssistant = topAssistants.map(a => ({
        name: `${a.prenom} ${a.nom}`,
        heures: a.affectations.reduce((sum, af) => sum + af.heuresCount, 0),
        max: a.heuresMax,
      })).sort((a, b) => b.heures - a.heures).slice(0, 6);

      // 3. Chart: Nombre de séances par matière
      const matieres = await prisma.matiere.findMany({
        include: { _count: { select: { seances: true } } },
      });
      const chartSeancesParMatiere = matieres.map(m => ({
        name: m.code,
        fullname: m.nom,
        count: m._count.seances,
        couleur: m.couleur || '#4361ee',
      }));

      // 4. Chart: Répartition des heures (validées / attente / refusées)
      const chartRepartitionHeures = [
        { name: 'Validées', value: heuresValidees, color: '#10b981' },
        { name: 'En attente', value: heuresAttente, color: '#f59e0b' },
        { name: 'Refusées', value: heuresRefusees, color: '#ef4444' },
      ];

      // Recent Feeds
      const prochainesSeances = await prisma.seance.findMany({
        where: { date: { gte: new Date() } },
        include: { matiere: true, professeur: true },
        orderBy: { date: 'asc' },
        take: 5,
      });

      const dernieresCandidatures = await prisma.candidature.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      const dernieresReservations = await prisma.affectation.findMany({
        include: {
          assistant: true,
          seance: { include: { matiere: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      const dernieresValidations = await prisma.affectation.findMany({
        where: { statutHeures: 'VALIDEE' },
        include: {
          assistant: true,
          seance: { include: { matiere: true } },
        },
        orderBy: { dateValidationHeures: 'desc' },
        take: 5,
      });

      return res.json({
        role: 'responsable_pedagogique',
        metrics: {
          candidaturesAttente,
          assistantsActifs,
          seancesProgrammees,
          seancesTerminees,
          heuresAttente,
          heuresValidees,
          heuresRefusees,
        },
        charts: {
          heuresParMois: chartHeuresParMois,
          heuresParAssistant: chartHeuresParAssistant,
          seancesParMatiere: chartSeancesParMatiere,
          repartitionHeures: chartRepartitionHeures,
        },
        recent: {
          prochainesSeances,
          dernieresCandidatures,
          dernieresReservations,
          dernieresValidations,
        },
      });

    } else if (normalizedRole === 'SERVICE_ADMINISTRATIF') {
      // === Dashboard Administratif ===
      const totalAssistants = await prisma.assistant.count();
      const seancesCount = await prisma.seance.count();

      const totalHeuresValideesAgg = await prisma.affectation.aggregate({
        where: { statutHeures: 'VALIDEE' },
        _sum: { heuresCount: true },
      });

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const heuresMoisAgg = await prisma.affectation.aggregate({
        where: {
          statutHeures: 'VALIDEE',
          seance: { date: { gte: startOfMonth, lte: endOfMonth } },
        },
        _sum: { heuresCount: true },
      });

      const totalHeuresValidees = totalHeuresValideesAgg._sum.heuresCount || 0;
      const heuresMois = heuresMoisAgg._sum.heuresCount || 0;

      // Heures par assistant
      const assistants = await prisma.assistant.findMany({
        include: {
          affectations: {
            where: { statutHeures: 'VALIDEE' },
            select: { heuresCount: true },
          },
        },
      });

      const heuresParAssistant = assistants.map(a => ({
        nom: `${a.prenom} ${a.nom}`,
        formation: a.formation || 'N/A',
        heures: a.affectations.reduce((sum, af) => sum + af.heuresCount, 0),
        heuresMax: a.heuresMax,
      })).sort((a, b) => b.heures - a.heures);

      // Heures par matière
      const matieres = await prisma.matiere.findMany({
        include: {
          seances: {
            include: {
              affectations: {
                where: { statutHeures: 'VALIDEE' },
                select: { heuresCount: true },
              },
            },
          },
        },
      });

      const heuresParMatiere = matieres.map(m => {
        const heures = m.seances.reduce((sum, s) => {
          return sum + s.affectations.reduce((s2, af) => s2 + af.heuresCount, 0);
        }, 0);
        return {
          code: m.code,
          nom: m.nom,
          couleur: m.couleur || '#4361ee',
          heures,
        };
      }).sort((a, b) => b.heures - a.heures);

      // Évolution par mois (6 derniers mois)
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const affectationsParMois = await prisma.affectation.findMany({
        where: {
          statutHeures: 'VALIDEE',
          seance: { date: { gte: sixMonthsAgo } },
        },
        include: { seance: { select: { date: true } } },
      });

      const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
      const heuresParPeriode = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        const h = affectationsParMois
          .filter(af => {
            const sd = new Date(af.seance.date);
            return sd.getMonth() === m && sd.getFullYear() === y;
          })
          .reduce((sum, af) => sum + af.heuresCount, 0);
        heuresParPeriode.push({ mois: moisNoms[m], annee: y, heures: h });
      }

      return res.json({
        role: 'service_administratif',
        metrics: {
          totalHeuresValidees,
          totalAssistants,
          seancesCount,
          heuresMois,
        },
        charts: {
          heuresParAssistant,
          heuresParMatiere,
          heuresParPeriode,
        },
      });

    } else {
      // === Dashboard Assistant ===
      const assistant = await prisma.assistant.findUnique({
        where: { userId },
        include: {
          affectations: {
            include: {
              seance: { include: { matiere: true } },
            },
          },
        },
      });

      if (!assistant) {
        return res.status(404).json({ error: 'Assistant introuvable.' });
      }

      const heuresValidees = assistant.affectations
        .filter(af => af.statutHeures === 'VALIDEE')
        .reduce((sum, af) => sum + af.heuresCount, 0);

      const heuresAttente = assistant.affectations
        .filter(af => af.statutHeures === 'EN_ATTENTE' && af.statut === 'VALIDEE')
        .reduce((sum, af) => sum + af.heuresCount, 0);

      const today = new Date();
      const prochainesSeances = assistant.affectations
        .filter(af => new Date(af.seance.date) >= today && ['VALIDEE', 'EN_ATTENTE'].includes(af.statut))
        .sort((a, b) => new Date(a.seance.date).getTime() - new Date(b.seance.date).getTime())
        .slice(0, 5)
        .map(af => ({
          matiere: af.seance.matiere.nom,
          matiereCode: af.seance.matiere.code,
          matiereCouleur: af.seance.matiere.couleur,
          groupe: af.seance.groupe,
          date: af.seance.date,
          heureDebut: af.seance.heureDebut,
          heureFin: af.seance.heureFin,
          salle: af.seance.salle,
          type: af.seance.type,
        }));

      return res.json({
        role: 'assistant',
        heuresValidees,
        heuresAttente,
        prochainesSeances,
      });
    }
  } catch (error) {
    console.error('[DASHBOARD/STATS]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

export default router;
