import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './src/lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Catch unhandled errors gracefully
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// Routes
import authRoutes from './src/routes/auth.js';
import assistantsRoutes from './src/routes/assistants.js';
import matieresRoutes from './src/routes/matieres.js';
import seancesRoutes from './src/routes/seances.js';
import disponibilitesRoutes from './src/routes/disponibilites.js';
import affectationsRoutes from './src/routes/affectations.js';
import dashboardRoutes from './src/routes/dashboard.js';
import professeursRoutes from './src/routes/professeurs.js';
import notificationsRoutes from './src/routes/notifications.js';
import candidaturesRoutes from './src/routes/candidatures.js';
import creneauxRoutes from './src/routes/creneaux.js';
import heuresRoutes from './src/routes/heures.js';
import historiqueRoutes from './src/routes/historique.js';
import rapportsRoutes from './src/routes/rapports.js';
import adminRoutes from './src/routes/admin.js';
import planningRoutes from './src/routes/planning.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers uploadés (CV)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assistants', assistantsRoutes);
app.use('/api/matieres', matieresRoutes);
app.use('/api/seances', seancesRoutes);
app.use('/api/disponibilites', disponibilitesRoutes);
app.use('/api/affectations', affectationsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/professeurs', professeursRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/candidatures', candidaturesRoutes);
app.use('/api/creneaux', creneauxRoutes);
app.use('/api/heures', heuresRoutes);
app.use('/api/historique', historiqueRoutes);
app.use('/api/rapports', rapportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/planning', planningRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Start server
const server = app.listen(PORT);

server.on('listening', () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📡 API disponible sur http://localhost:${PORT}/api`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️ Le port ${PORT} est déjà utilisé (une autre fenêtre de terminal exécute probablement déjà le backend).`);
    console.log(`👉 Pour lancer un nouveau serveur, fermez l'autre terminal qui fait tourner 'npm run start' ou 'node server.js'.`);
  } else {
    console.error('🔥 Erreur serveur :', err);
  }
  process.exit(1);
});
