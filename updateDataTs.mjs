import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';
import csv from 'csv-parser';

const DATA_FILE = './data.ts';
const CSV_FILE = './Hiztegia - Hoja 21 (1).csv';

function loadCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', data => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function updateDataTs() {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(DATA_FILE);

  const exportVar = sourceFile.getVariableDeclaration('euskaraWords');
  if (!exportVar) {
    throw new Error('No se encontró la variable exportada euskaraWords.');
  }

  const initializer = exportVar.getInitializer();
  if (!initializer || !initializer.getKindName().includes('Array')) {
    throw new Error('El contenido de euskaraWords no es un array.');
  }

  const arrayLiteral = initializer;
  const existingBasqueWords = new Set();

  arrayLiteral.getElements().forEach(e => {
    const obj = e.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const basqueProp = obj.getProperty('basque');
    if (basqueProp?.getKindName() === 'PropertyAssignment') {
      const value = basqueProp.getFirstChildByKind(SyntaxKind.StringLiteral)?.getLiteralValue();
      if (value) existingBasqueWords.add(value.trim());
    }
  });

  const currentMaxId = Math.max(
    ...arrayLiteral.getElements().map(e => {
      const obj = e.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
      const idProp = obj.getProperty('id');
      const idValue = idProp?.getFirstChildByKind(SyntaxKind.NumericLiteral)?.getLiteralValue();
      return parseInt(idValue || '0', 10);
    })
  );

  const csvData = await loadCSV(CSV_FILE);
  const newEntries = [];
  let nextId = currentMaxId + 1;

  for (const row of csvData) {
    const basque = row.basque?.trim();
    const spanish = row.spanish?.trim();
    if (basque && spanish && !existingBasqueWords.has(basque)) {
      newEntries.push({ id: nextId++, basque, spanish });
    }
  }

  if (newEntries.length === 0) {
    console.log('No hay palabras nuevas para añadir.');
    return;
  }

  for (const entry of newEntries) {
    arrayLiteral.addElement(`{
        id: ${entry.id},
        basque: "${entry.basque.replace(/"/g, '\\"')}",
        spanish: "${entry.spanish.replace(/"/g, '\\"')}"
    }`);
  }

  await sourceFile.save();
  console.log(`${newEntries.length} palabra(s) añadida(s) con éxito a data.ts.`);
}

updateDataTs().catch(console.error);
