const fs = require('fs');
const csvText = fs.readFileSync('personagens.csv', 'utf8');
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}
function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const headers = parseCSVLine(lines[0]);
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(lines[i]);
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      let value = values[j] || '';
      let mappedHeader = header;
      if (header === 'Personagem') mappedHeader = 'Nome';
      if (header === 'Status') mappedHeader = 'Estado';
      if (mappedHeader === 'Imagem') {
        if (!value) value = 'images/placeholder.svg';
        else if (!value.startsWith('images/') && !value.startsWith('./images/')) value = 'images/' + value;
        obj[mappedHeader] = value;
        continue;
      }
      if (mappedHeader === 'Participações') {
        if (value === '20+') value = 20;
        else if (value === '' || value === 'Indefinido') value = 0;
        else value = parseInt(value, 10) || 0;
      } else if (mappedHeader === 'Idade') {
        if (value === 'Indefinido') value = Infinity;
        else if (value === 'Desconhecido' || value === '') value = null;
        else value = parseInt(value, 10) || null;
      } else if (mappedHeader === 'Altura') {
        if (value === '' || value === 'Indefinido' || value === 'Variável') value = null;
        else if (value.includes('cm')) value = parseInt(value.replace('cm', ''), 10) || 0;
        else if (value.includes('m')) {
          const metros = parseFloat(value.replace('m', '').replace(',', '.')) || 0;
          value = Math.round(metros * 100);
        } else value = parseInt(value, 10) || 0;
      }
      obj[mappedHeader] = value;
    }
    data.push(obj);
  }
  return data;
}
const data = parseCSV(csvText);
console.log('records:', data.length);
console.log('participacoes>=3:', data.filter(p => p.Participações >= 3).length);
console.log('alex search:', data.filter(p => p.Nome.toLowerCase().includes('alex')).map(p => p.Nome).join(', '));
console.log('alexandre exact:', data.find(p => p.Nome.toLowerCase() === 'alexandre'));
console.log('first record:', data[0]);
