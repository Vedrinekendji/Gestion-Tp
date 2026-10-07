import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seeding avec la nouvelle structure des Rôles & Spécialités...');

  // Nettoyage dans l'ordre (évite conflits FK)
  await prisma.historiquePeda.deleteMany();
  await prisma.historiqueReservation.deleteMany();
  await prisma.candidatureSpecialty.deleteMany();
  await prisma.candidature.deleteMany();
  await prisma.affectation.deleteMany();
  await prisma.disponibilite.deleteMany();
  await prisma.assistantMatiere.deleteMany();
  await prisma.assistantSpecialty.deleteMany();
  await prisma.seance.deleteMany();
  await prisma.matiere.deleteMany();
  await prisma.assistant.deleteMany();
  await prisma.professeur.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Base de données nettoyée avec succès.');

  // Config système initiale
  await prisma.systemConfig.create({
    data: { id: 1, blocageCreneauEnAttente: false },
  });

  const commonPassword = await bcrypt.hash('password123', 10);

  // =========================================================================
  // 1. CRÉATION DES COMPTES DE TEST OBLIGATOIRES (EXIGENCE REQUIS 27)
  // =========================================================================

  // TEST 1 : Super Admin (Accès total INFORMATIQUE + ÉLECTRONIQUE)
  const superAdminUser = await prisma.user.create({
    data: {
      email: 'superadmin@gestiontp.fr',
      login: 'SUPERADMIN',
      password: commonPassword,
      role: 'SUPER_ADMIN',
    },
  });

  // Compte admin historique pour rétrocompatibilité
  await prisma.user.create({
    data: {
      email: 'admin@gestiontp.dz',
      login: 'ADMIN',
      password: commonPassword,
      role: 'SUPER_ADMIN',
    },
  });

  // TEST 2 : Administrateur Informatique (Limité à INFORMATIQUE)
  const adminInfoUser = await prisma.user.create({
    data: {
      email: 'admin.info@gestiontp.fr',
      login: 'ADMININFO',
      password: commonPassword,
      role: 'ADMIN_INFORMATIQUE',
    },
  });

  // TEST 3 : Administrateur Électronique (Limité à ÉLECTRONIQUE)
  const adminElecUser = await prisma.user.create({
    data: {
      email: 'admin.elec@gestiontp.fr',
      login: 'ADMINELEC',
      password: commonPassword,
      role: 'ADMIN_ELECTRONIQUE',
    },
  });

  // TEST 4 : Professeur Informatique
  const profInfoUser = await prisma.user.create({
    data: {
      email: 'prof.info@gestiontp.fr',
      login: 'PROFINFO',
      password: commonPassword,
      role: 'PROFESSEUR',
      professeur: {
        create: {
          nom: 'Benali',
          prenom: 'Karim',
          departement: 'Informatique',
          telephone: '0550123456',
          specialite: 'INFORMATIQUE',
        },
      },
    },
    include: { professeur: true },
  });

  // TEST 5 : Professeur Électronique
  const profElecUser = await prisma.user.create({
    data: {
      email: 'prof.elec@gestiontp.fr',
      login: 'PROFELEC',
      password: commonPassword,
      role: 'PROFESSEUR',
      professeur: {
        create: {
          nom: 'Mansouri',
          prenom: 'Salim',
          departement: 'Électronique',
          telephone: '0550987654',
          specialite: 'ELECTRONIQUE',
        },
      },
    },
    include: { professeur: true },
  });

  // TEST 6 : Assistant Informatique
  const astInfoUser = await prisma.user.create({
    data: {
      email: 'ast.info@gestiontp.fr',
      login: 'ASTINFO',
      password: commonPassword,
      role: 'ASSISTANT',
      assistant: {
        create: {
          nom: 'Martin',
          prenom: 'Paul',
          formation: 'Génie Logiciel',
          niveau: 'M1',
          telephone: '0661223344',
          statut: 'ACTIF',
          heuresMax: 120,
          inscription: new Date(),
          specialties: {
            create: [{ specialty: 'INFORMATIQUE' }],
          },
        },
      },
    },
    include: { assistant: true },
  });

  // TEST 7 : Assistant Électronique
  const astElecUser = await prisma.user.create({
    data: {
      email: 'ast.elec@gestiontp.fr',
      login: 'ASTELEC',
      password: commonPassword,
      role: 'ASSISTANT',
      assistant: {
        create: {
          nom: 'Khadraoui',
          prenom: 'Yasmine',
          formation: 'Électronique Embarquée',
          niveau: 'M2',
          telephone: '0661556677',
          statut: 'ACTIF',
          heuresMax: 120,
          inscription: new Date(),
          specialties: {
            create: [{ specialty: 'ELECTRONIQUE' }],
          },
        },
      },
    },
    include: { assistant: true },
  });

  // TEST 8 : Assistant Informatique + Électronique (Multi-Spécialités)
  const astBothUser = await prisma.user.create({
    data: {
      email: 'ast.both@gestiontp.fr',
      login: 'ASTBOTH',
      password: commonPassword,
      role: 'ASSISTANT',
      assistant: {
        create: {
          nom: 'Dupont',
          prenom: 'Jean',
          formation: 'Systèmes Mécatroniques & IT',
          niveau: 'M2',
          telephone: '0770889900',
          statut: 'ACTIF',
          heuresMax: 120,
          inscription: new Date(),
          specialties: {
            create: [
              { specialty: 'INFORMATIQUE' },
              { specialty: 'ELECTRONIQUE' },
            ],
          },
        },
      },
    },
    include: { assistant: true },
  });

  console.log('✅ Les 8 comptes de TEST obligatoires ont été créés.');

  // =========================================================================
  // 2. CRÉATION DES MATIÈRES PAR SPÉCIALITÉ
  // =========================================================================

  const matAlgo = await prisma.matiere.create({
    data: {
      code: 'ALGO',
      nom: 'Algorithmique & Structures de Données',
      couleur: '#4361ee',
      specialite: 'INFORMATIQUE',
    },
  });

  const matBdd = await prisma.matiere.create({
    data: {
      code: 'BDD',
      nom: 'Bases de Données SQL',
      couleur: '#10b981',
      specialite: 'INFORMATIQUE',
    },
  });

  const matElecNum = await prisma.matiere.create({
    data: {
      code: 'ELEC_NUM',
      nom: 'Électronique Numérique & Circuits Logiques',
      couleur: '#f59e0b',
      specialite: 'ELECTRONIQUE',
    },
  });

  const matMicroProc = await prisma.matiere.create({
    data: {
      code: 'MICRO_PROC',
      nom: 'Microprocesseurs, Microcontrôleurs & IoT',
      couleur: '#ef4444',
      specialite: 'ELECTRONIQUE',
    },
  });

  // Associer les matières aux assistants
  await prisma.assistantMatiere.createMany({
    data: [
      { assistantId: astInfoUser.assistant.id, matiereId: matAlgo.id },
      { assistantId: astInfoUser.assistant.id, matiereId: matBdd.id },
      { assistantId: astElecUser.assistant.id, matiereId: matElecNum.id },
      { assistantId: astElecUser.assistant.id, matiereId: matMicroProc.id },
      { assistantId: astBothUser.assistant.id, matiereId: matAlgo.id },
      { assistantId: astBothUser.assistant.id, matiereId: matMicroProc.id },
    ],
  });

  // =========================================================================
  // 3. CRÉATION DES CANDIDATURES DE DÉMONSTRATION (AVEC SPÉCIALITÉS)
  // =========================================================================

  const cand1 = await prisma.candidature.create({
    data: {
      nom: 'Zerrouki',
      prenom: 'Amine',
      email: 'amine.zerrouki@gmail.com',
      telephone: '0770112233',
      formation: 'Informatique Décisionnelle',
      niveau: 'M1',
      disponibilites: 'Lundi et Mercredi matin',
      motivation: 'Très motivé par l encadrement des séances de TP en informatique et développement.',
      statut: 'EN_ATTENTE',
      specialties: {
        create: [{ specialty: 'INFORMATIQUE' }],
      },
    },
  });

  const cand2 = await prisma.candidature.create({
    data: {
      nom: 'Belkacem',
      prenom: 'Sarah',
      email: 'sarah.belkacem@gmail.com',
      telephone: '0770445566',
      formation: 'Genie Électronique & Systèmes Embarqués',
      niveau: 'M2',
      disponibilites: 'Mardi et Jeudi',
      motivation: 'Passionnée par la conception des cartes électroniques et microcontrôleurs.',
      statut: 'EN_ATTENTE',
      specialties: {
        create: [{ specialty: 'ELECTRONIQUE' }],
      },
    },
  });

  const cand3 = await prisma.candidature.create({
    data: {
      nom: 'Brahimi',
      prenom: 'Khaled',
      email: 'khaled.brahimi@gmail.com',
      telephone: '0555334455',
      formation: 'Informatique & Électronique de puissance',
      niveau: 'M2',
      disponibilites: 'Plein temps',
      motivation: 'Double compétence en programmation bas niveau et assemblage électronique.',
      statut: 'EN_ATTENTE',
      specialties: {
        create: [
          { specialty: 'INFORMATIQUE' },
          { specialty: 'ELECTRONIQUE' },
        ],
      },
    },
  });

  // =========================================================================
  // 4. CRÉATION DES SÉANCES TP (INFORMATIQUE ET ÉLECTRONIQUE)
  // =========================================================================

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const afterTomorrow = new Date();
  afterTomorrow.setDate(afterTomorrow.getDate() + 2);

  // Séance Informatique 1
  const seanceInfo1 = await prisma.seance.create({
    data: {
      matiereId: matAlgo.id,
      professeurId: profInfoUser.professeur.id,
      groupe: 'Groupe INFO-A1',
      date: tomorrow,
      heureDebut: '08:30',
      heureFin: '10:30',
      salle: 'Labo Info 101',
      type: 'TP',
      niveau: 'L2 Informatique',
      statut: 'PLANIFIEE',
      nombreAssistantsRequis: 2,
      specialite: 'INFORMATIQUE',
    },
  });

  // Séance Informatique 2
  const seanceInfo2 = await prisma.seance.create({
    data: {
      matiereId: matBdd.id,
      professeurId: profInfoUser.professeur.id,
      groupe: 'Groupe INFO-B2',
      date: afterTomorrow,
      heureDebut: '14:00',
      heureFin: '16:00',
      salle: 'Labo Info 102',
      type: 'TP',
      niveau: 'L3 Informatique',
      statut: 'PLANIFIEE',
      nombreAssistantsRequis: 1,
      specialite: 'INFORMATIQUE',
    },
  });

  // Séance Électronique 1
  const seanceElec1 = await prisma.seance.create({
    data: {
      matiereId: matElecNum.id,
      professeurId: profElecUser.professeur.id,
      groupe: 'Groupe ELEC-E1',
      date: tomorrow,
      heureDebut: '14:00',
      heureFin: '16:00',
      salle: 'Labo Électronique 201',
      type: 'TP',
      niveau: 'L2 Électronique',
      statut: 'PLANIFIEE',
      nombreAssistantsRequis: 2,
      specialite: 'ELECTRONIQUE',
    },
  });

  // Séance Électronique 2
  const seanceElec2 = await prisma.seance.create({
    data: {
      matiereId: matMicroProc.id,
      professeurId: profElecUser.professeur.id,
      groupe: 'Groupe ELEC-E2',
      date: afterTomorrow,
      heureDebut: '10:00',
      heureFin: '12:00',
      salle: 'Labo Électronique 202',
      type: 'TP',
      niveau: 'M1 Microélectronique',
      statut: 'PLANIFIEE',
      nombreAssistantsRequis: 1,
      specialite: 'ELECTRONIQUE',
    },
  });

  // Une réservation existante pour démonstration
  await prisma.affectation.create({
    data: {
      seanceId: seanceInfo1.id,
      assistantId: astInfoUser.assistant.id,
      statut: 'VALIDEE',
      heuresCount: 2.0,
      statutPresence: 'PRESENCE_A_VALIDER',
    },
  });

  console.log('🎉 Seeding réussi ! Tous les comptes, spécialités et séances ont été générés.');
  console.log('----------------------------------------------------');
  console.log('🔑 RECAPITULATIF DES COMPTES DE TEST (Mot de passe: password123)');
  console.log('1. SUPER ADMIN            : superadmin@gestiontp.fr / login: SUPERADMIN');
  console.log('2. ADMIN INFORMATIQUE     : admin.info@gestiontp.fr   / login: ADMININFO');
  console.log('3. ADMIN ÉLECTRONIQUE     : admin.elec@gestiontp.fr   / login: ADMINELEC');
  console.log('4. PROFESSEUR INFO        : prof.info@gestiontp.fr    / login: PROFINFO');
  console.log('5. PROFESSEUR ELEC        : prof.elec@gestiontp.fr    / login: PROFELEC');
  console.log('6. ASSISTANT INFO         : ast.info@gestiontp.fr     / login: ASTINFO');
  console.log('7. ASSISTANT ELEC         : ast.elec@gestiontp.fr     / login: ASTELEC');
  console.log('8. ASSISTANT INFO + ELEC  : ast.both@gestiontp.fr     / login: ASTBOTH');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
