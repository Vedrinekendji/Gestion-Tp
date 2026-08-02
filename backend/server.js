import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './src/lib/prisma.js';

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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Démarrage
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📡 API disponible sur http://localhost:${PORT}/api`);
});
