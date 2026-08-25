const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = path.join(__dirname, 'public', 'assistants TP 2025-2026.xlsx');

if (!fs.existsSync(filePath)) {
    console.error('File does not exist!');
    process.exit(1);
}

const wb = XLSX.readFile(filePath, { cellDates: true, cellNF: true, cellText: true });

const report = {
    nbSheets: wb.SheetNames.length,
    sheets: []
};

for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn];
    const ref = ws['!ref'];
    if (!ref) {
        report.sheets.push({ name: sn, empty: true });
        continue;
    }

    const range = XLSX.utils.decode_range(ref);
    const nbRows = range.e.r - range.s.r + 1;
    const nbCols = range.e.c - range.s.c + 1;

    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
        const ca = XLSX.utils.encode_cell({ r: range.s.r, c });
        const cell = ws[ca];
        headers.push(cell ? String(cell.v ?? '').trim() : '');
    }

    const samples = [];
    for (let r = range.s.r + 1; r <= Math.min(range.s.r + 5, range.e.r); r++) {
        const row = {};
        for (let c = range.s.c; c <= range.e.c; c++) {
            const ca = XLSX.utils.encode_cell({ r, c });
            const cell = ws[ca];
            row[headers[c - range.s.c] || 'COL_' + c] = cell ? String(cell.w ?? cell.v ?? '') : '';
        }
        samples.push(row);
    }

    let nec = 0;
    for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
            const ca = XLSX.utils.encode_cell({ r, c });
            if (ws[ca] && ws[ca].v !== undefined && ws[ca].v !== '') nec++;
        }
    }

    const allHeaders = headers.filter(h => h);

    report.sheets.push({
        name: sn,
        nbRows,
        nbCols,
        totalCells: nbRows * nbCols,
        nonEmptyCells: nec,
        headers: headers.map((h, i) => h || `[Col${i}]`),
        samples
    });
}

const outPath = path.join(__dirname, 'analyze_output.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
console.log('Saved to analyze_output.json');
