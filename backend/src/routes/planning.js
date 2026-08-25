import express from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 1. IMPORTER UN FICHIER EXCEL (BRUT)
// ==========================================
router.post('/import', authMiddleware, requireRole('ADMIN', 'RESPONSABLE_PEDAGOGIQUE'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier fourni' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true, cellNF: true, cellText: true });
        const importedBy = req.user ? (req.user.prenom + ' ' + req.user.nom).trim() : 'Système';

        // Créer l'entrée principale
        const planningImport = await prisma.planningImport.create({
            data: {
                filename: req.file.originalname,
                importedBy: importedBy,
                status: 'DONNEES_IMPORTEES',
                totalSheets: workbook.SheetNames.length
            }
        });

        let totalRows = 0;
        let totalCells = 0;

        for (const sheetName of workbook.SheetNames) {
            const ws = workbook.Sheets[sheetName];
            const ref = ws['!ref'];

            if (!ref) continue;

            const range = xlsx.utils.decode_range(ref);

            const headers = [];
            for (let c = range.s.c; c <= range.e.c; c++) {
                const cellAddr = xlsx.utils.encode_cell({ r: range.s.r, c });
                const cell = ws[cellAddr];
                const val = cell ? String(cell.v ?? '').trim() : '';
                const columnName = val || `COL_${c}`;
                headers.push({ name: columnName, index: c });
            }

            for (const h of headers) {
                await prisma.planningImportColumn.create({
                    data: {
                        importId: planningImport.id,
                        sheetName: sheetName,
                        columnName: h.name,
                        columnIndex: h.index
                    }
                });
            }

            const rawDataEntries = [];
            for (let r = range.s.r + 1; r <= range.e.r; r++) {
                const dataJson = {};
                let isRowEmpty = true;
                let rowCellCount = 0;

                for (let c = range.s.c; c <= range.e.c; c++) {
                    const cellAddr = xlsx.utils.encode_cell({ r, c });
                    const cell = ws[cellAddr];
                    const val = cell ? String(cell.w ?? cell.v ?? '') : '';
                    dataJson[headers[c - range.s.c].name] = val;

                    if (val && val.trim() !== '') {
                        isRowEmpty = false;
                        rowCellCount++;
                    }
                }

                if (!isRowEmpty) {
                    rawDataEntries.push({
                        importId: planningImport.id,
                        sheetName: sheetName,
                        rowNumber: r + 1,
                        dataJson: dataJson
                    });
                    totalRows++;
                    totalCells += rowCellCount;
                }
            }

            if (rawDataEntries.length > 0) {
                await prisma.planningRawData.createMany({
                    data: rawDataEntries
                });
            }
        }

        const updatedImport = await prisma.planningImport.update({
            where: { id: planningImport.id },
            data: { totalRows, totalCells }
        });

        res.status(201).json(updatedImport);
    } catch (error) {
        console.error('Erreur lors de l’import Excel brut:', error);
        res.status(500).json({ message: 'Erreur serveur lors de l’import', error: error.message });
    }
});

// ==========================================
// 2. RECUPERER LA LISTE DES IMPORTS
// ==========================================
router.get('/imports', authMiddleware, requireRole('ADMIN', 'RESPONSABLE_PEDAGOGIQUE'), async (req, res) => {
    try {
        const imports = await prisma.planningImport.findMany({
            orderBy: { importDate: 'desc' },
            include: {
                _count: {
                    select: { rawData: true }
                }
            }
        });
        res.json(imports);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération' });
    }
});

// ==========================================
// 3. RECUPERER LES DETAILS ET LES DONNEES BRUTES D'UN IMPORT
// ==========================================
router.get('/imports/:id', authMiddleware, requireRole('ADMIN', 'RESPONSABLE_PEDAGOGIQUE'), async (req, res) => {
    try {
        const importId = parseInt(req.params.id);
        const planningImport = await prisma.planningImport.findUnique({
            where: { id: importId },
            include: {
                columns: true
            }
        });

        if (!planningImport) return res.status(404).json({ message: 'Import introuvable' });
        res.json(planningImport);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération' });
    }
});

router.get('/imports/:id/raw', authMiddleware, requireRole('ADMIN', 'RESPONSABLE_PEDAGOGIQUE'), async (req, res) => {
    try {
        const importId = parseInt(req.params.id);
        const { sheet, page = 1, limit = 50 } = req.query;

        const whereClause = { importId };
        if (sheet) whereClause.sheetName = sheet;

        const total = await prisma.planningRawData.count({ where: whereClause });

        const rawData = await prisma.planningRawData.findMany({
            where: whereClause,
            orderBy: [{ sheetName: 'asc' }, { rowNumber: 'asc' }],
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        });

        res.json({
            data: rawData,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des données brutes' });
    }
});

// ==========================================
// 4. NORMALISATION : CONVERTIR LES DONNEES BRUTES EN DONNEES METIER
// ==========================================
router.post('/imports/:id/normalize', authMiddleware, requireRole('ADMIN', 'RESPONSABLE_PEDAGOGIQUE'), async (req, res) => {
    try {
        const importId = parseInt(req.params.id);
        const planningImport = await prisma.planningImport.findUnique({ where: { id: importId } });

        if (!planningImport) return res.status(404).json({ message: 'Import introuvable' });
        if (planningImport.status === 'TERMINE') {
            return res.status(400).json({ message: 'Cet import a déjà été normalisé.' });
        }

        const rawDataRows = await prisma.planningRawData.findMany({
            where: { importId },
            orderBy: [{ sheetName: 'asc' }, { rowNumber: 'asc' }]
        });

        let stats = {
            matieresCreated: 0,
            profsCreated: 0,
            seancesCreated: 0,
            affectationsCreated: 0,
            errors: []
        };

        // Caches
        const cachedMatieres = new Map();
        const cachedProfs = new Map();
        const cachedAssistants = new Map(); // nomPrenom -> id

        // Charger les assistants existants pour le matching
        const assistantsDB = await prisma.assistant.findMany();
        for (const ast of assistantsDB) {
            const fullName = (ast.prenom + ' ' + ast.nom).toLowerCase().trim();
            const reversedName = (ast.nom + ' ' + ast.prenom).toLowerCase().trim();
            cachedAssistants.set(fullName, ast.id);
            cachedAssistants.set(reversedName, ast.id);
        }

        for (const row of rawDataRows) {
            if (!row.dataJson) continue;

            const data = row.dataJson;
            const sheet = row.sheetName;

            // 1. Extraction flexible
            const matiereNom = (data['Matiere'] || data['Matière'] || data['Matiere '] || 'Matière Inconnue').trim();
            const profName = (data['Nom enseignant'] || data['Enseignant'] || data['COL_0'] || '').trim() || 'INCONNU';
            const promo = (data['Promo'] || data['Groupe'] || 'Groupe Inconnu').trim();
            const salle = (data['Nom salle'] || data['Salle'] || '').trim();
            let dateStr = data['Date debut'] || data['Date'] || ''; // Format "DD/MM/YYYY" freq
            let heureDebut = data['Heure debut'] || data['Heure'] || '';
            const tempsStr = data['Temps'] || data['Duree'] || '2';
            const astRaw = (data['Assistant'] || data['Assistants à'] || '').trim();

            // Normalisation Date
            // Ex: "26/03/2026"
            let parsedDate = new Date();
            if (dateStr) {
                // Check si format DD/MM/YYYY
                if (dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        let [d, m, y] = parts;
                        // Handle cases where the year is 2 digits 
                        if (y.length === 2) y = '20' + y;
                        // js Date takes (year, monthIndex, day)
                        parsedDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0); // midi msg avoid timezone offset issues
                    }
                } else {
                    parsedDate = new Date(dateStr);
                }
            }

            // Normalisation Heure
            // Ex: "08:30:00" => "08:30"
            if (heureDebut && heureDebut.length >= 5) {
                heureDebut = heureDebut.substring(0, 5); // Garde juste HH:MM
            } else {
                heureDebut = '08:00';
            }

            // Calcul heureFin
            const duree = parseFloat(tempsStr.replace(',', '.')) || 2;
            let [hD, mD] = heureDebut.split(':').map(Number);
            let totalMinutes = hD * 60 + mD + duree * 60;
            let hF = Math.floor(totalMinutes / 60);
            let mF = totalMinutes % 60;
            let heureFin = `${hF.toString().padStart(2, '0')}:${mF.toString().padStart(2, '0')}`;

            // 2. Création/Get Matiere
            let matiereId;
            if (cachedMatieres.has(matiereNom)) {
                matiereId = cachedMatieres.get(matiereNom);
            } else {
                // Chercher en base
                let dbMat = await prisma.matiere.findFirst({ where: { nom: matiereNom } });
                if (!dbMat) {
                    // Générer un code unique (max 20 chars) basé sur le nom + un suffixe aléatoire si collision
                    const baseCode = matiereNom.substring(0, 12).toUpperCase().replace(/[^A-Z0-9]/g, '_');
                    const uniqueCode = `${baseCode}_${Date.now().toString(36).toUpperCase().slice(-4)}`;
                    dbMat = await prisma.matiere.create({
                        data: {
                            nom: matiereNom,
                            code: uniqueCode.substring(0, 20)
                        }
                    });
                    stats.matieresCreated++;
                }
                matiereId = dbMat.id;
                cachedMatieres.set(matiereNom, dbMat.id);
            }

            // 3. Création/Get Prof
            let professeurId;
            if (cachedProfs.has(profName)) {
                professeurId = cachedProfs.get(profName);
            } else {
                // Le prof est lié à un User
                // Tentative de split nom/prénom (format "NOM Prénom" ou "Prénom NOM")
                const nameParts = profName.split(' ').filter(Boolean);
                const profNom = nameParts[0] || profName;
                const profPrenom = nameParts.slice(1).join(' ') || '';

                let dbProf = await prisma.professeur.findFirst({
                    where: {
                        OR: [
                            { nom: profNom },
                            { nom: profName }
                        ]
                    }
                });
                if (!dbProf) {
                    const pseudoEmail = `prof_${Date.now()}_${Math.floor(Math.random() * 9999)}@planning.local`;
                    const newUser = await prisma.user.create({
                        data: {
                            email: pseudoEmail,
                            password: 'locked_account_placeholder',
                            role: 'PROFESSEUR'
                        }
                    });
                    dbProf = await prisma.professeur.create({
                        data: {
                            userId: newUser.id,
                            nom: profNom,
                            prenom: profPrenom
                        }
                    });
                    stats.profsCreated++;
                }
                professeurId = dbProf.id;
                cachedProfs.set(profName, dbProf.id);
            }

            // 4. Création Séance
            try {
                const seance = await prisma.seance.create({
                    data: {
                        matiereId: matiereId,
                        professeurId: professeurId,
                        groupe: promo,
                        salle: salle,
                        date: isNaN(parsedDate) ? new Date() : parsedDate,
                        heureDebut,
                        heureFin,
                        nombreAssistantsRequis: 1
                    }
                });
                stats.seancesCreated++;

                // 5. Affectation ?
                if (astRaw && astRaw.toLowerCase() !== 'en soutenance') {
                    // Cherche match
                    const searchKey = astRaw.toLowerCase().trim();
                    let matchedAstId = cachedAssistants.get(searchKey);

                    // Recherche souple ?
                    if (!matchedAstId) {
                        for (let [k, v] of cachedAssistants.entries()) {
                            if (searchKey.includes(k) || k.includes(searchKey)) {
                                matchedAstId = v;
                                break;
                            }
                        }
                    }

                    if (matchedAstId) {
                        await prisma.affectation.create({
                            data: {
                                seanceId: seance.id,
                                assistantId: matchedAstId,
                                statut: 'VALIDEE',
                                heuresCount: duree
                            }
                        });
                        stats.affectationsCreated++;
                    }
                }
            } catch (err) {
                stats.errors.push(`Erreur ligne ${row.rowNumber} (${sheet}): ${err.message}`);
            }
        }

        // MàJ statut
        await prisma.planningImport.update({
            where: { id: importId },
            data: { status: 'TERMINE' }
        });

        res.json({ message: 'Normalisation terminée', stats });
    } catch (error) {
        console.error('Erreur normalisation:', error);
        res.status(500).json({ message: 'Erreur lors de la normalisation', error: error.message });
    }
});

export default router;
