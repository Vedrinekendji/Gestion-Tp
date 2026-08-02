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

    if (role === 'ADMIN') {
      // === Stats globales pour l'Administrateur ===
      const professeursCount = await prisma.professeur.count();
      const assistantsActifs = await prisma.assistant.count({ where: { statut: 'ACTIF' } });
      const matieresCount = await prisma.matiere.count();
      const seancesCount = await prisma.seance.count();

      const heuresValidees = await prisma.affectation.aggregate({
        where: { statut: 'VALIDEE' },
        _sum: { heuresCount: true },
      });

      const heuresAttente = await prisma.affectation.aggregate({
        where: { statut: 'EN_ATTENTE' },
        _sum: { heuresCount: true },
      });

      const seancesAffectees = await prisma.affectation.count({
        where: { statut: { in: ['VALIDEE', 'EN_ATTENTE'] } },
      });
      const tauxAffectation = seancesCount > 0 ? Math.round((seancesAffectees / seancesCount) * 100) : 0;

      // Liste des professeurs
      const professeursList = await prisma.professeur.findMany({
        include: {
          user: { select: { email: true } },
          _count: { select: { seances: true } },
        },
        orderBy: { nom: 'asc' },
      });

      // Top assistants
      const topAssistants = await prisma.assistant.findMany({
        where: { statut: 'ACTIF' },
        include: {
          affectations: {
            where: { statut: 'VALIDEE' },
            select: { heuresCount: true },
          },
        },
        orderBy: { nom: 'asc' },
      });

      const topAssistantsSorted = topAssistants
        .map(a => ({
          name: `${a.prenom} ${a.nom}`,
          initials: `${a.prenom[0]}${a.nom[0]}`.toUpperCase(),
          heures: a.affectations.reduce((sum, af) => sum + af.heuresCount, 0),
          max: a.heuresMax,
        }))
        .sort((a, b) => b.heures - a.heures)
        .slice(0, 5);

      const colors = ['#4361ee', '#10b981', '#f59e0b', '#8b5cf6', '#f97316'];
      topAssistantsSorted.forEach((a, i) => { a.color = colors[i % colors.length]; });

      // Évolution mensuelle
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const affectationsParMois = await prisma.affectation.findMany({
        where: {
          statut: 'VALIDEE',
          seance: { date: { gte: sixMonthsAgo } },
        },
        include: { seance: { select: { date: true } } },
      });

      const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
      const chartData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mois = d.getMonth();
        const annee = d.getFullYear();
        const heures = affectationsParMois
          .filter(af => {
            const sd = new Date(af.seance.date);
            return sd.getMonth() === mois && sd.getFullYear() === annee;
          })
          .reduce((sum, af) => sum + af.heuresCount, 0);
        chartData.push({ mois: moisNoms[mois], heures });
      }

      return res.json({
        role: 'admin',
        professeursCount,
        assistantsActifs,
        matieresCount,
        seancesCount,
        heuresValidees: heuresValidees._sum.heuresCount || 0,
        heuresAttente: heuresAttente._sum.heuresCount || 0,
        tauxAffectation,
        topAssistants: topAssistantsSorted,
        chartData,
        professeursList: professeursList.map(p => ({
          id: p.id,
          nom: `${p.prenom} ${p.nom}`,
          email: p.user.email,
          departement: p.departement,
          nbSeances: p._count.seances,
        })),
      });
    } else if (role === 'PROFESSEUR') {
      // === Stats pour le professeur ===
      const professeur = await prisma.professeur.findUnique({
        where: { userId },
      });

      if (!professeur) {
        return res.status(404).json({ error: 'Professeur introuvable.' });
      }

      // Nombre d'assistants actifs
      const assistantsActifs = await prisma.assistant.count({
        where: { statut: 'ACTIF' },
      });

      // Heures validées totales
      const heuresValidees = await prisma.affectation.aggregate({
        where: { statut: 'VALIDEE' },
        _sum: { heuresCount: true },
      });

      // Heures en attente
      const heuresAttente = await prisma.affectation.aggregate({
        where: { statut: 'EN_ATTENTE' },
        _sum: { heuresCount: true },
      });

      // Taux d'affectation (séances avec affectation / total séances)
      const totalSeances = await prisma.seance.count({
        where: { professeurId: professeur.id },
      });
      const seancesAffectees = await prisma.affectation.count({
        where: {
          seance: { professeurId: professeur.id },
          statut: { in: ['VALIDEE', 'EN_ATTENTE'] },
        },
      });
      const tauxAffectation = totalSeances > 0
        ? Math.round((seancesAffectees / totalSeances) * 100)
        : 0;

      // Top assistants par heures
      const topAssistants = await prisma.assistant.findMany({
        where: { statut: 'ACTIF' },
        include: {
          affectations: {
            where: { statut: 'VALIDEE' },
            select: { heuresCount: true },
          },
        },
        orderBy: { nom: 'asc' },
      });

      const topAssistantsSorted = topAssistants
        .map(a => ({
          name: `${a.prenom} ${a.nom}`,
          initials: `${a.prenom[0]}${a.nom[0]}`.toUpperCase(),
          heures: a.affectations.reduce((sum, af) => sum + af.heuresCount, 0),
          max: a.heuresMax,
        }))
        .sort((a, b) => b.heures - a.heures)
        .slice(0, 5);

      // Couleurs pour le top assistants
      const colors = ['#4361ee', '#10b981', '#f59e0b', '#8b5cf6', '#f97316'];
      topAssistantsSorted.forEach((a, i) => {
        a.color = colors[i % colors.length];
      });

      // Évolution des heures par mois (6 derniers mois)
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      
      const affectationsParMois = await prisma.affectation.findMany({
        where: {
          statut: 'VALIDEE',
          seance: {
            date: { gte: sixMonthsAgo },
          },
        },
        include: {
          seance: { select: { date: true } },
        },
      });

      const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
      const chartData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mois = d.getMonth();
        const annee = d.getFullYear();
        const heures = affectationsParMois
          .filter(af => {
            const sd = new Date(af.seance.date);
            return sd.getMonth() === mois && sd.getFullYear() === annee;
          })
          .reduce((sum, af) => sum + af.heuresCount, 0);
        chartData.push({ mois: moisNoms[mois], heures });
      }

      res.json({
        role: 'professeur',
        assistantsActifs,
        heuresValidees: heuresValidees._sum.heuresCount || 0,
        heuresAttente: heuresAttente._sum.heuresCount || 0,
        tauxAffectation,
        topAssistants: topAssistantsSorted,
        chartData,
      });

    } else {
      // === Stats pour l'assistant ===
      const assistant = await prisma.assistant.findUnique({
        where: { userId },
        include: {
          affectations: {
            include: {
              seance: {
                include: { matiere: true },
              },
            },
          },
        },
      });

      if (!assistant) {
        return res.status(404).json({ error: 'Assistant introuvable.' });
      }

      const heuresValidees = assistant.affectations
        .filter(af => af.statut === 'VALIDEE')
        .reduce((sum, af) => sum + af.heuresCount, 0);

      const heuresAttente = assistant.affectations
        .filter(af => af.statut === 'EN_ATTENTE')
        .reduce((sum, af) => sum + af.heuresCount, 0);

      // Séances cette semaine
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lundi
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const seancesCetteSemaine = assistant.affectations.filter(af => {
        const d = new Date(af.seance.date);
        return d >= startOfWeek && d <= endOfWeek && ['VALIDEE', 'EN_ATTENTE'].includes(af.statut);
      });

      // Taux de présence (validées / total non-annulées)
      const totalNonAnnulees = assistant.affectations.filter(af => af.statut !== 'ANNULEE').length;
      const tauxPresence = totalNonAnnulees > 0
        ? Math.round((assistant.affectations.filter(af => af.statut === 'VALIDEE').length / totalNonAnnulees) * 100)
        : 0;

      // Prochaines séances
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

      // Évolution des heures par mois
      const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
      const chartData = [];
      const now2 = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now2.getFullYear(), now2.getMonth() - i, 1);
        const mois = d.getMonth();
        const annee = d.getFullYear();
        const heures = assistant.affectations
          .filter(af => {
            if (af.statut !== 'VALIDEE') return false;
            const sd = new Date(af.seance.date);
            return sd.getMonth() === mois && sd.getFullYear() === annee;
          })
          .reduce((sum, af) => sum + af.heuresCount, 0);
        chartData.push({ mois: moisNoms[mois], heures });
      }

      res.json({
        role: 'assistant',
        seancesCetteSemaine: seancesCetteSemaine.length,
        heuresValidees,
        heuresAttente,
        tauxPresence,
        prochainesSeances,
        chartData,
      });
    }
  } catch (error) {
    console.error('[DASHBOARD/STATS]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

export default router;
