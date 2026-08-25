import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Using xlsx from local node_modules
const xlsx = await import('xlsx');
const XLSX = xlsx.default || xlsx;

const filePath = 'c:/Users/beulg/Downloads/Assistants TP 2025-2026.xlsx';
const workbook = XLSX.readFile(filePath, { cellDates: true, cellNF: true, cellText: true });

const report = {
    nbSheets: workbook.SheetNames.length,
    sheets: []
};

for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const ref = ws['!ref'];
    if (!ref) {
        report.sheets.push({ name: sheetName, empty: true });
        continue;
    }

    const range = XLSX.utils.decode_range(ref);
    const nbRows = range.e.r - range.s.r + 1;
    const nbCols = range.e.c - range.s.c + 1;

    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r: range.s.r, c });
        const cell = ws[cellAddr];
        headers.push({ col: XLSX.utils.encode_col(c), val: cell ? String(cell.v ?? '') : '' });
    }

    const sampleRows = [];
    for (let r = range.s.r + 1; r <= Math.min(range.s.r + 5, range.e.r); r++) {
        const row = {};
        for (let c = range.s.c; c <= range.e.c; c++) {
            const cellAddr = XLSX.utils.encode_cell({ r, c });
            const cell = ws[cellAddr];
            const headerKey = headers[c - range.s.c]?.val || `COL_${c}`;
            row[headerKey] = cell ? String(cell.w ?? cell.v ?? '') : '';
        }
        sampleRows.push(row);
    }

    let nonEmptyCells = 0;
    for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
            const cellAddr = XLSX.utils.encode_cell({ r, c });
            if (ws[cellAddr] && ws[cellAddr].v !== undefined && ws[cellAddr].v !== '') nonEmptyCells++;
        }
    }

    report.sheets.push({
        name: sheetName,
        ref,
        nbRows,
        nbCols,
        totalCells: nbRows * nbCols,
        nonEmptyCells,
        headers,
        sampleRows
    });
}

console.log(JSON.stringify(report, null, 2));
