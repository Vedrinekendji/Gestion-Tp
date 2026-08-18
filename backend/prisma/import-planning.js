/**
 * import-planning.js
 * 
 * Script d'import du planning de la semaine du 23-27 mars 2026.
 * NE SUPPRIME PAS les utilisateurs/assistants existants.
 * Crée uniquement les matières, professeurs et séances manquants.
 * 
 * Run: node prisma/import-planning.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ==========================================
// DONNÉES DU PLANNING
// ==========================================

// Durées estimées des créneaux (début → fin, durée 2h)
const endTimeMap = {
    '08:30': '10:30',
    '10:45': '12:45',
    '13:00': '15:00',
    '14:00': '16:00',
    '15:15': '17:15',
    '16:15': '18:15',
    '17:30': '19:30',
};

function toHHMM(str) {
    // "08:30:00" -> "08:30"
    return str.slice(0, 5);
}

const planning = [
    ['BENBEKHOUCHE SANA', 'Salle EM216', 'Ing3 App Gr05 (SE)', 'Initiation Réseaux APP', 'jeudi', '2026-03-26', '08:30'],
    ['MENTA ISSA', 'Salle EM216', 'Ing3 App Gr05 (SE)', 'LINUX APP', 'jeudi', '2026-03-26', '16:15'],
    ['BENBEKHOUCHE SANA', 'Salle EM322', 'Ing3 Gr11', 'POO Java', 'jeudi', '2026-03-26', '08:30'],
    ['BENNAI SOUFIA', 'Salle EM324', "Prép'ac Gr01", 'Informatique', 'jeudi', '2026-03-26', '17:30'],
    ['FEDDAOUI ILHEM', 'Salle EM321', 'Ing1 Gr01', 'Prog structurée avancée', 'jeudi', '2026-03-26', '08:30'],
    ['SIROT ISABELLE', 'Salle EM314', 'Ing1 Gr07', 'Électronique analogique', 'lundi', '2026-03-23', '15:15'],
    ['SIROT ISABELLE', 'Salle EM314', 'Ing1 Gr03', 'Électronique analogique', 'lundi', '2026-03-23', '17:30'],
    ['MENTA ISSA', 'Salle P439', 'Ing3 Gr02', 'POO Java', 'jeudi', '2026-03-26', '08:30'],
    ['SEKKIOU IMÈNE', 'Salle EM324', 'Ing2 Gr11', 'Systèmes bouclés', 'mardi', '2026-03-24', '14:00'],
    ['HAJ HAMAD IMEN', 'Salle EM324', 'Ing1 Gr15', 'Électronique analogique', 'mardi', '2026-03-24', '08:30'],
    ['HAJ HAMAD IMEN', 'Salle EM314', 'Ing1 Gr14', 'Électronique analogique', 'mardi', '2026-03-24', '10:45'],
    ['BENNAI SOUFIA', 'Salle EM324', "Prép'ac Gr01", 'Informatique', 'jeudi', '2026-03-26', '14:00'],
    ['MENTA ISSA', 'Salle P439', 'Ing3 Gr02', 'POO Java', 'jeudi', '2026-03-26', '10:45'],
    ['MENTA ISSA', 'Salle EM216', 'Ing3 App Gr05 (SE)', 'LINUX APP', 'jeudi', '2026-03-26', '17:30'],
    ['ZENAKHRA DJAMEL', 'Salle SC215', 'Ing1 Gr15', 'Prog structurée avancée', 'jeudi', '2026-03-26', '10:45'],
    ['BENNAI SOUFIA', 'Salle EM324', "Prép'ac Gr01", 'Informatique', 'jeudi', '2026-03-26', '15:15'],
    ['BOUBAKRI ANIS', 'Salle EM213', 'Ing1 Gr10', 'Prog structurée avancée', 'jeudi', '2026-03-26', '08:30'],
    ['FEDDAOUI ILHEM', 'Salle EM318', 'Ing1 Gr18 (renfo)', 'Prog structurée avancée', 'jeudi', '2026-03-26', '10:45'],
    ['BOUZGOU KAMEL', 'Salle SC214', 'Ing2 Gr08', 'Systèmes bouclés', 'mardi', '2026-03-24', '17:30'],
    ['BOUZGOU KAMEL', 'Salle EM326', 'Ing2 Gr09', 'Systèmes bouclés', 'mardi', '2026-03-24', '15:15'],
    ['BENBEKHOUCHE SANA', 'Salle EM111', 'Ing3 App Gr06', 'Initiation Réseaux APP', 'jeudi', '2026-03-26', '10:45'],
    ['MNASSRI BALIGH', 'Salle G015', 'Ing3 Gr13', 'POO Java', 'jeudi', '2026-03-26', '08:30'],
    ['MNASSRI BALIGH', 'Salle SC210', 'Ing1 Gr06', 'Prog structurée avancée', 'jeudi', '2026-03-26', '10:45'],
    ['HAJ HAMAD IMEN', 'Salle EM222', 'Ing2 Gr13', 'Systèmes bouclés', 'mardi', '2026-03-24', '13:00'],
    ['BENBEKHOUCHE SANA', 'Salle EM216', 'Ing3 App Gr05 (SE)', 'Initiation Réseaux APP', 'jeudi', '2026-03-26', '15:15'],
    ['KHOURY CLAUDE', 'Salle EM326', 'Ing3 Gr11', 'Calcul embarqué', 'jeudi', '2026-03-26', '10:45'],
    ['CHRISTOU CHRISTOS', 'Salle EM215', 'Ing1 Gr04', 'Prog structurée avancée', 'lundi', '2026-03-23', '17:30'],
    ['HAMADOUCHE MOHAMMED AMINE', 'Salle EM224', 'Ing3 Gr13', 'Calcul embarqué', 'lundi', '2026-03-23', '10:45'],
    ['EUTAMENE NOREDDINE', 'Salle SC004', 'Ing3 Gr07', 'POO Java', 'lundi', '2026-03-23', '16:15'],
    ['HAMADOUCHE MOHAMMED AMINE', 'Salle EM218', 'Ing3 Gr04', 'Calcul embarqué', 'lundi', '2026-03-23', '08:30'],
    ['SENAYA KOMIVI ERIC', 'Salle P436', 'Ing3 Gr10', 'POO Java', 'lundi', '2026-03-23', '10:45'],
    ['SEKKIOU IMÈNE', 'Salle EM324', 'Ing2 Gr11', 'Systèmes bouclés', 'mardi', '2026-03-24', '15:15'],
    ['BENBEKHOUCHE SANA', 'Salle EM318', 'Ing1 Gr14', 'Prog structurée avancée', 'lundi', '2026-03-23', '15:15'],
    ['EUTAMENE NOREDDINE', 'Salle EM316', 'Ing3 Gr01', 'POO Java', 'lundi', '2026-03-23', '08:30'],
    ['EUTAMENE NOREDDINE', 'Salle SC004', 'Ing3 Gr07', 'POO Java', 'lundi', '2026-03-23', '17:30'],
    ['MOKHBER ARASH', 'Salle EM326', 'Ing3 Gr02', 'Calcul embarqué', 'lundi', '2026-03-23', '10:45'],
    ['PALASI JULIENNE', 'Salle EM316', 'Ing3 Gr04', 'POO Java', 'lundi', '2026-03-23', '17:30'],
    ['SEGADO JEAN PIERRE', 'Salle P345', 'Ing3 Gr03', 'POO Java', 'lundi', '2026-03-23', '10:45'],
    ['SEKKIOU IMÈNE', 'Salle EM314', 'Ing3 Gr14', 'Calcul embarqué', 'lundi', '2026-03-23', '10:45'],
    ['SEKKIOU IMÈNE', 'Salle EM222', 'Ing2 Gr07', 'Systèmes bouclés', 'mercredi', '2026-03-25', '10:45'],
    ['BENBEKHOUCHE SANA', 'Salle EM318', 'Ing1 Gr14', 'Prog structurée avancée', 'lundi', '2026-03-23', '14:00'],
    ['EUTAMENE NOREDDINE', 'Salle EM124', 'Ing1 Gr05', 'Prog structurée avancée', 'lundi', '2026-03-23', '14:00'],
    ['ZENAKHRA DJAMEL', 'Salle EM322', 'Ing1 Gr09', 'Prog structurée avancée', 'lundi', '2026-03-23', '10:45'],
    ['CHRISTOU CHRISTOS', 'Salle EM215', 'Ing1 Gr04', 'Prog structurée avancée', 'lundi', '2026-03-23', '13:00'],
    ['EUTAMENE NOREDDINE', 'Salle EM124', 'Ing1 Gr05', 'Prog structurée avancée', 'lundi', '2026-03-23', '10:45'],
    ['MNASSRI BALIGH', 'Salle EM316', 'Ing1 Gr13', 'Prog structurée avancée', 'lundi', '2026-03-23', '15:15'],
    ['SEGADO JEAN PIERRE', 'Salle P345', 'Ing3 Gr03', 'POO Java', 'lundi', '2026-03-23', '08:30'],
    ['ZENAKHRA DJAMEL', 'Salle EM113', 'Ing1 Gr15', 'Prog structurée avancée', 'lundi', '2026-03-23', '13:00'],
    ['HAMADOUCHE MOHAMMED AMINE', 'Salle EM324', 'Ing3 Gr08', 'Calcul embarqué', 'lundi', '2026-03-23', '16:15'],
    ['MNASSRI BALIGH', 'Salle EM316', 'Ing1 Gr06', 'Prog structurée avancée', 'lundi', '2026-03-23', '13:00'],
    ['PALASI JULIENNE', 'Salle P416', 'Ing3 Gr15', 'POO Java', 'lundi', '2026-03-23', '13:00'],
    ['BENBEKHOUCHE SANA', 'Salle EM318', 'Ing1 Gr14', 'Prog structurée avancée', 'lundi', '2026-03-23', '17:30'],
    ['EUTAMENE NOREDDINE', 'Salle EM124', 'Ing1 Gr05', 'Prog structurée avancée', 'lundi', '2026-03-23', '15:15'],
    ['HAMADOUCHE MOHAMMED AMINE', 'Salle EM324', 'Ing3 Gr09', 'Calcul embarqué', 'lundi', '2026-03-23', '14:00'],
    ['SENAYA KOMIVI ERIC', 'Salle P436', 'Ing3 Gr10', 'POO Java', 'lundi', '2026-03-23', '08:30'],
    ['CHRISTOU CHRISTOS', 'Salle EM215', 'Ing1 Gr04', 'Prog structurée avancée', 'lundi', '2026-03-23', '16:15'],
    ['HAMADOUCHE MOHAMMED AMINE', 'Salle EM324', 'Ing3 Gr09', 'Calcul embarqué', 'lundi', '2026-03-23', '15:15'],
    ['HAMADOUCHE MOHAMMED AMINE', 'Salle EM324', 'Ing3 Gr08', 'Calcul embarqué', 'lundi', '2026-03-23', '17:30'],
    ['PALASI JULIENNE', 'Salle SC214', 'Ing1 Gr16', 'Prog structurée avancée', 'lundi', '2026-03-23', '10:45'],
    ['SEKKIOU IMÈNE', 'Salle EM314', 'Ing3 Gr05', 'Calcul embarqué', 'lundi', '2026-03-23', '08:30'],
    ['FEDDAOUI ILHEM', 'Salle P424', 'Ing1 Gr18 (renfo)', 'Prog structurée avancée', 'mardi', '2026-03-24', '10:45'],
    ['KALIFA ETHANE', 'Salle EM323', 'Ing1 Gr11', 'Prog structurée avancée', 'mardi', '2026-03-24', '08:30'],
    ['MOKHBER ARASH', 'Salle EM314', 'Ing3 Gr10', 'Calcul embarqué', 'mardi', '2026-03-24', '13:00'],
    ['MOKHBER ARASH', 'Salle EM216', 'Ing2 Gr10', 'Systèmes bouclés', 'mercredi', '2026-03-25', '10:45'],
    ['KHOURY CLAUDE', 'Salle EM222', 'Ing3 Gr06', 'Calcul embarqué', 'mardi', '2026-03-24', '17:30'],
    ['SEGADO JEAN PIERRE', 'Salle P440', 'Ing1 Gr17 (renfo)', 'Prog structurée avancée', 'mardi', '2026-03-24', '13:00'],
    ['GHARBI INES', 'Salle EM326', 'Ing3 Gr06', 'POO Java', 'mardi', '2026-03-24', '13:00'],
    ['KHALIL GEORGES', 'Salle EM218', 'Ing1 Gr17 (renfo)', 'Électronique analogique', 'mercredi', '2026-03-25', '08:30'],
    ['GHARBI INES', 'Salle G019', 'Ing3 Gr06', 'POO Java', 'mardi', '2026-03-24', '08:30'],
    ['MOKHBER ARASH', 'Salle EM312', 'Ing2 Gr03', 'Systèmes bouclés', 'mercredi', '2026-03-25', '08:30'],
    ['HINA MANOLO', 'Salle P427', 'Ing3 Gr14', 'POO Java', 'mardi', '2026-03-24', '15:15'],
    ['SEKKIOU IMÈNE', 'Salle EM222', 'Ing2 Gr01', 'Systèmes bouclés', 'mercredi', '2026-03-25', '08:30'],
    ['LE GALL ALAIN', 'Salle EM222', 'Ing3 App Gr06', 'Calcul embarqué APP', 'mardi', '2026-03-24', '08:30'],
    ['MOKHBER ARASH', 'Salle EM324', 'Ing3 Gr03', 'Calcul embarqué', 'mardi', '2026-03-24', '16:15'],
    ['SEKKIOU IMÈNE', 'Salle EM222', 'Ing2 Gr06', 'Systèmes bouclés', 'mercredi', '2026-03-25', '15:15'],
    ['GHARBI INES', 'Salle SC004', 'Ing1 Gr12', 'Prog structurée avancée', 'mardi', '2026-03-24', '15:15'],
    ['HINA MANOLO', 'Salle P427', 'Ing3 Gr05', 'POO Java', 'mardi', '2026-03-24', '13:00'],
    ['LE GALL ALAIN', 'Salle EM222', 'Ing3 App Gr06', 'Calcul embarqué APP', 'mardi', '2026-03-24', '10:45'],
    ['MOKHBER ARASH', 'Salle EM324', 'Ing3 Gr03', 'Calcul embarqué', 'mardi', '2026-03-24', '17:30'],
    ['ZENAKHRA DJAMEL', 'Salle EM113', 'Ing3 Gr12', 'POO Java', 'mardi', '2026-03-24', '08:30'],
    ['HAJ HAMAD IMEN', 'Salle EM314', 'Ing2 Gr14 (renfo)', 'Systèmes bouclés', 'mercredi', '2026-03-25', '13:00'],
    ['KALIFA ETHANE', 'Salle EM323', 'Ing1 Gr11', 'Prog structurée avancée', 'mardi', '2026-03-24', '10:45'],
    ['HAJ HAMAD IMEN', 'Salle EM314', 'Ing2 Gr12', 'Systèmes bouclés', 'mercredi', '2026-03-25', '08:30'],
    ['ZENAKHRA DJAMEL', 'Salle EM111', 'Ing3 Gr12', 'POO Java', 'mardi', '2026-03-24', '13:00'],
    ['BENBEKHOUCHE SANA', 'Salle EM225', 'Ing3 Gr11', 'POO Java', 'mercredi', '2026-03-25', '15:15'],
    ['EUTAMENE NOREDDINE', 'Salle SC004', 'Ing3 Gr01', 'POO Java', 'mercredi', '2026-03-25', '08:30'],
    ['FEDDAOUI ILHEM', 'Salle EM215', 'Ing1 Gr01', 'Prog structurée avancée', 'mercredi', '2026-03-25', '10:45'],
    ['HINA MANOLO', 'Salle P439', 'Ing3 Gr14', 'POO Java', 'mercredi', '2026-03-25', '10:45'],
    ['SEKKIOU IMÈNE', 'Salle EM222', 'Ing2 Gr06', 'Systèmes bouclés', 'mercredi', '2026-03-25', '14:00'],
    ['SEKKIOU IMÈNE', 'Salle EM222', 'Ing3 Gr01', 'Calcul embarqué', 'mercredi', '2026-03-25', '16:15'],
    ['ARNAL MELCHIOR', 'Salle P416', 'Ing3 Gr08', 'POO Java', 'mercredi', '2026-03-25', '10:45'],
    ['KHOURY CLAUDE', 'Salle EM324', 'Ing3 Gr07', 'Calcul embarqué', 'mercredi', '2026-03-25', '08:30'],
    ['SICHLER ROMARIC', 'Salle EM216', 'Ing3 App Gr05 (SE)', 'Électronique analogique APP', 'mercredi', '2026-03-25', '08:30'],
    ['PALASI JULIENNE', 'Salle P436', 'Ing3 Gr15', 'POO Java', 'mercredi', '2026-03-25', '10:45'],
    ['EUTAMENE NOREDDINE', 'Salle EM126', 'Ing3 Gr07', 'POO Java', 'mercredi', '2026-03-25', '17:30'],
    ['KARKOUR RAYANE', 'Salle EM219', 'Ing3 Gr09', 'POO Java', 'mercredi', '2026-03-25', '08:30'],
    ['HAJ HAMAD IMEN', 'Salle EM216', 'Ing1 Gr09', 'Électronique analogique', 'jeudi', '2026-03-26', '08:30'],
    ['LE GALL ALAIN', 'Salle EM312', 'Ing3 App Gr06', 'Calcul embarqué APP', 'mercredi', '2026-03-25', '10:45'],
    ['ARNAL MELCHIOR', 'Salle EM112', 'Ing3 Gr08', 'POO Java', 'mercredi', '2026-03-25', '15:15'],
    ['KALIFA ETHANE', 'Salle EM127', 'Ing1 Gr08', 'Prog structurée avancée', 'mercredi', '2026-03-25', '10:45'],
    ['MNASSRI BALIGH', 'Salle P415', 'Ing3 Gr13', 'POO Java', 'mercredi', '2026-03-25', '10:45'],
    ['HAJ HAMAD IMEN', 'Salle EM218', 'Ing1 Gr01', 'Électronique analogique', 'jeudi', '2026-03-26', '10:45'],
    ['PALASI JULIENNE', 'Salle EM224', 'Ing3 Gr04', 'POO Java', 'mercredi', '2026-03-25', '15:15'],
    ['SEKKIOU IMÈNE', 'Salle EM324', 'Ing1 Gr02', 'Électronique analogique', 'jeudi', '2026-03-26', '08:30'],
    ['SIROT ISABELLE', 'Salle EM222', 'Ing1 Gr18 (renfo)', 'Électronique analogique', 'jeudi', '2026-03-26', '08:30'],
    ['SEKKIOU IMÈNE', 'Salle EM222', 'Ing3 Gr01', 'Calcul embarqué', 'mercredi', '2026-03-25', '17:30'],
    ['BOUKEHILA ALI', 'Salle EM214', 'Ing1 Gr07', 'Prog structurée avancée', 'mercredi', '2026-03-25', '08:30'],
    ['HINA MANOLO', 'Salle P439', 'Ing3 Gr05', 'POO Java', 'mercredi', '2026-03-25', '08:30'],
    ['KHOURY CLAUDE', 'Salle EM324', 'Ing3 Gr12', 'Calcul embarqué', 'mercredi', '2026-03-25', '10:45'],
    ['SEKKIOU IMÈNE', 'Salle EM222', 'Ing1 Gr05', 'Électronique analogique', 'jeudi', '2026-03-26', '10:45'],
    ['ARNAL MELCHIOR', 'Salle EM112', 'Ing3 Gr08', 'POO Java', 'mercredi', '2026-03-25', '14:00'],
    ['SICHLER ROMARIC', 'Salle EM224', 'Ing1 Gr12', 'Électronique analogique', 'jeudi', '2026-03-26', '08:30'],
    ['KALIFA ETHANE', 'Salle EM127', 'Ing1 Gr08', 'Prog structurée avancée', 'mercredi', '2026-03-25', '08:30'],
    ['SIROT ISABELLE', 'Salle EM312', 'Ing1 Gr08', 'Électronique analogique', 'jeudi', '2026-03-26', '10:45'],
    ['EUTAMENE NOREDDINE', 'Salle EM126', 'Ing3 Gr07', 'POO Java', 'mercredi', '2026-03-25', '16:15'],
    ['GHARBI INES', 'Salle EM323', 'Ing3 App Gr06', 'LINUX APP', 'mercredi', '2026-03-25', '08:30'],
    ['MOKHBER ARASH', 'Salle EM224', 'Ing2 Gr02', 'Systèmes bouclés', 'jeudi', '2026-03-26', '10:45'],
    ['BENBEKHOUCHE SANA', 'Salle SC217', 'Ing1 Gr02', 'Prog structurée avancée', 'vendredi', '2026-03-27', '14:00'],
    ['KARKOUR RAYANE', 'Salle EM315', 'Ing3 Gr09', 'POO Java', 'vendredi', '2026-03-27', '08:30'],
    ['BOUZGOU KAMEL', 'Salle EM218', 'Ing2 Gr05', 'Systèmes bouclés', 'vendredi', '2026-03-27', '17:30'],
    ['DANDOY LOÏC', 'Salle EM112', 'Ing1 Gr03', 'Prog structurée avancée', 'vendredi', '2026-03-27', '13:00'],
    ['SCHNEIDER MAXIME', 'Salle EM324', 'Ing1 Gr16', 'Électronique analogique', 'vendredi', '2026-03-27', '08:30'],
    ['SICHLER ROMARIC', 'Salle EM216', 'Ing3 App Gr05 (SE)', 'Électronique analogique APP', 'vendredi', '2026-03-27', '08:30'],
    ['BENBEKHOUCHE SANA', 'Salle EM220', 'Ing3 App Gr06', 'Initiation Réseaux APP', 'vendredi', '2026-03-27', '08:30'],
    ['BENBEKHOUCHE SANA', 'Salle EM124', 'Ing3 App Gr05 (SE)', 'Initiation Réseaux APP', 'vendredi', '2026-03-27', '10:45'],
    ['HAJ HAMAD IMEN', 'Salle EM222', 'Ing1 Gr11', 'Électronique analogique', 'vendredi', '2026-03-27', '08:30'],
    ['BENBEKHOUCHE SANA', 'Salle SC217', 'Ing1 Gr02', 'Prog structurée avancée', 'vendredi', '2026-03-27', '15:15'],
    ['HAJ HAMAD IMEN', 'Salle EM218', "Prép'ac Gr01", 'Électronique', 'vendredi', '2026-03-27', '13:00'],
    ['MNASSRI BALIGH', 'Salle EM126', 'Ing1 Gr13', 'Prog structurée avancée', 'vendredi', '2026-03-27', '08:30'],
    ['BOUKEHILA ALI', 'Salle EM315', 'Ing1 Gr07', 'Prog structurée avancée', 'vendredi', '2026-03-27', '10:45'],
    ['DANDOY LOÏC', 'Salle EM112', 'Ing1 Gr03', 'Prog structurée avancée', 'vendredi', '2026-03-27', '10:45'],
    ['MAHDI NAJIB', 'Salle EM216', 'Ing1 Gr06', 'Électronique analogique', 'vendredi', '2026-03-27', '10:45'],
    ['SEGADO JEAN PIERRE', 'Salle P346', 'Ing1 Gr17 (renfo)', 'Prog structurée avancée', 'vendredi', '2026-03-27', '10:45'],
    ['BENBEKHOUCHE SANA', 'Salle SC217', 'Ing1 Gr02', 'Prog structurée avancée', 'vendredi', '2026-03-27', '17:30'],
    ['BOUZGOU KAMEL', 'Salle EM324', 'Ing2 Gr04', 'Systèmes bouclés', 'vendredi', '2026-03-27', '15:15'],
    ['GHARBI INES', 'Salle EM220', 'Ing1 Gr12', 'Prog structurée avancée', 'vendredi', '2026-03-27', '15:15'],
    ['KHALIL GEORGES', 'Salle EM314', 'Ing1 Gr13', 'Électronique analogique', 'vendredi', '2026-03-27', '10:45'],
    ['BOUBAKRI ANIS', 'Salle EM222', 'Ing1 Gr10', 'Prog structurée avancée', 'vendredi', '2026-03-27', '10:45'],
    ['KHOURY CLAUDE', 'Salle EM312', 'Ing3 Gr15', 'Calcul embarqué', 'vendredi', '2026-03-27', '08:30'],
    ['MAHDI NAJIB', 'Salle EM314', 'Ing1 Gr10', 'Électronique analogique', 'vendredi', '2026-03-27', '08:30'],
    ['PALASI JULIENNE', 'Salle EM323', 'Ing1 Gr16', 'Prog structurée avancée', 'vendredi', '2026-03-27', '10:45'],
    ['HAJ HAMAD IMEN', 'Salle EM324', 'Ing1 Gr04', 'Électronique analogique', 'vendredi', '2026-03-27', '10:45'],
    ['ZENAKHRA DJAMEL', 'Salle EM323', 'Ing1 Gr09', 'Prog structurée avancée', 'vendredi', '2026-03-27', '08:30'],
];

// ==========================================
// Couleurs par matière
// ==========================================
const matiereColors = {
    'POO Java': '#4361ee',
    'Prog structurée avancée': '#7209b7',
    'Électronique analogique': '#f77f00',
    'Électronique analogique APP': '#f77f00',
    'Systèmes bouclés': '#e63946',
    'Calcul embarqué': '#2dc653',
    'Calcul embarqué APP': '#2dc653',
    'Initiation Réseaux APP': '#4cc9f0',
    'LINUX APP': '#3d405b',
    'Informatique': '#06d6a0',
    'Électronique': '#f77f00',
};

async function main() {
    console.log('🚀 Import du planning - Semaine du 23 au 27 mars 2026');
    console.log('');

    // ==========================================
    // 1. Créer les matières uniques
    // ==========================================
    const matiereNoms = [...new Set(planning.map(p => p[3]))];
    const matiereMap = {};
    const usedCodes = new Set();

    for (const nom of matiereNoms) {
        // Generate a unique code
        let baseCode = nom.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 5).toUpperCase();
        let code = baseCode;
        let suffix = 2;
        while (usedCodes.has(code)) {
            code = baseCode.slice(0, 4) + suffix;
            suffix++;
        }
        usedCodes.add(code);

        const existing = await prisma.matiere.findFirst({ where: { nom } });
        if (existing) {
            matiereMap[nom] = existing.id;
            console.log(`  ✓ Matière existante : ${nom}`);
        } else {
            const created = await prisma.matiere.create({
                data: { nom, code, couleur: matiereColors[nom] || '#999' }
            });
            matiereMap[nom] = created.id;
            console.log(`  ➕ Matière créée : ${nom} [${code}]`);
        }
    }
    console.log(`\n✅ ${matiereNoms.length} matières traitées`);

    // ==========================================
    // 2. Créer les professeurs uniques
    // ==========================================
    const profNoms = [...new Set(planning.map(p => p[0]))];
    const profMap = {};
    const defaultHash = await bcrypt.hash('prof2026', 10);

    for (const nom of profNoms) {
        const parts = nom.split(' ');
        const nomFamille = parts[0];
        const prenom = parts.slice(1).join(' ') || nomFamille;

        const email = `${nomFamille.toLowerCase().replace(/[^a-z]/g, '')}.${prenom.toLowerCase().replace(/[^a-z]/g, '')}@gestiontp.dz`;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing?.professeur) {
            profMap[nom] = (await prisma.professeur.findUnique({ where: { userId: existing.id } })).id;
            console.log(`  ✓ Prof existant : ${nom}`);
        } else if (existing) {
            const prof = await prisma.professeur.create({
                data: { userId: existing.id, nom: nomFamille, prenom, departement: 'Enseignement' }
            });
            profMap[nom] = prof.id;
        } else {
            const user = await prisma.user.create({
                data: {
                    email,
                    password: defaultHash,
                    role: 'PROFESSEUR',
                    professeur: {
                        create: { nom: nomFamille, prenom, departement: 'Enseignement' }
                    }
                },
                include: { professeur: true }
            });
            profMap[nom] = user.professeur.id;
            console.log(`  ➕ Prof créé : ${nom} (${email} / prof2026)`);
        }
    }
    console.log(`\n✅ ${profNoms.length} professeurs traités`);

    // ==========================================
    // 3. Créer les séances
    // ==========================================
    console.log('\n📅 Création des séances...');
    let created = 0, skipped = 0;

    for (const row of planning) {
        const [profNom, salle, groupe, matiere, , dateStr, heure] = row;
        const heureFin = endTimeMap[heure] || '10:30';
        const date = new Date(dateStr);

        const profId = profMap[profNom];
        const matiereId = matiereMap[matiere];

        if (!profId || !matiereId) { skipped++; continue; }

        // Vérifier si la séance existe déjà (même prof, même date, même heure, même groupe)
        const existing = await prisma.seance.findFirst({
            where: { professeurId: profId, date, heureDebut: heure, groupe }
        });

        if (existing) { skipped++; continue; }

        await prisma.seance.create({
            data: {
                matiereId,
                professeurId: profId,
                groupe,
                date,
                heureDebut: heure,
                heureFin,
                salle: salle.split(' - ')[0], // Simplifié : "Salle EM216"
                type: 'TP',
                niveau: groupe.includes('Ing1') ? 'L3' : groupe.includes('Ing2') ? 'M1' : 'M2',
                statut: 'PLANIFIEE'
            }
        });
        created++;
    }

    console.log(`\n🎉 Import terminé !`);
    console.log(`   ✅ ${created} séances créées`);
    console.log(`   ⏭️  ${skipped} séances ignorées (existent déjà ou données manquantes)`);
    console.log('');
    console.log('📌 Mot de passe par défaut de tous les professeurs créés : prof2026');
}

main()
    .catch(e => {
        console.error('❌ Erreur lors de l\'import :', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
