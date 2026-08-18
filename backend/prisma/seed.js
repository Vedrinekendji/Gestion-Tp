import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seeding...');

  // Nettoyage dans l'ordre (pour éviter les conflits FK)
  await prisma.affectation.deleteMany();
  await prisma.disponibilite.deleteMany();
  await prisma.assistantMatiere.deleteMany();
  await prisma.seance.deleteMany();
  await prisma.matiere.deleteMany();
  await prisma.assistant.deleteMany();
  await prisma.professeur.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Base nettoyée (toutes les données de démonstration ont été supprimées).');

  // ============================
  // ADMINISTRATEUR
  // ============================
  const hashAdmin = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@gestiontp.dz',
      password: hashAdmin,
      role: 'ADMIN',
    },
  });
  console.log('👑 Administrateur créé :', adminUser.email);

  // ============================
  // PROFESSEUR (de test)
  // ============================
  const hashProf = await bcrypt.hash('prof123', 10);
  const profUser = await prisma.user.create({
    data: {
      email: 'prof@gestiontp.dz',
      password: hashProf,
      role: 'PROFESSEUR',
      professeur: {
        create: {
          nom: 'Dupont',
          prenom: 'Jean',
          departement: 'Informatique'
        }
      }
    }
  });
  console.log('🎓 Professeur créé :', profUser.email);

  // ============================
  // ASSISTANT (de test)
  // ============================
  const hashAssistant = await bcrypt.hash('assistant123', 10);
  const assistantUser = await prisma.user.create({
    data: {
      email: 'assistant@gestiontp.dz',
      password: hashAssistant,
      role: 'ASSISTANT',
      assistant: {
        create: {
          nom: 'Martin',
          prenom: 'Paul',
          formation: 'Génie Logiciel',
          niveau: 'M1'
        }
      }
    }
  });
  console.log('👨‍🎓 Assistant créé :', assistantUser.email);

  console.log('');
  console.log('🎉 Seeding terminé avec succès !');
  console.log('');
  console.log('📝 Comptes de connexion :');
  console.log('   Admin     : admin@gestiontp.dz / admin123');
  console.log('   Prof      : prof@gestiontp.dz / prof123');
  console.log('   Assistant : assistant@gestiontp.dz / assistant123');
  console.log('');
}

main()
  .catch(e => {
    console.error('❌ Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
