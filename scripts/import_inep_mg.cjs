const fs = require('fs');
const path = require('path');
const readline = require('readline');

const inputFile = path.join(__dirname, '../ARQUIVO/Análise - Tabela da lista das escolas - Detalhado.csv');
const outputFile = path.join(__dirname, '../supabase/seed_inep_mg.sql');

console.log('Iniciando processamento do CSV do INEP sem dependências externas...');

const results = [];
let isFirstLine = true;
let headers = [];

const rl = readline.createInterface({
  input: fs.createReadStream(inputFile, { encoding: 'utf8' }),
  crlfDelay: Infinity
});

// Expressão regular para dar split por vírgula mas ignorando as vírgulas dentro de aspas duplas
const splitCsv = (line) => {
  const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
  // Se quisermos tratar corretamente, o split comum com regex ajuda, 
  // mas para esse dataset podemos usar uma abordagem manual simples:
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current); // push last chunk
  return result;
};

rl.on('line', (line) => {
  const row = splitCsv(line);
  
  if (isFirstLine) {
    headers = row;
    isFirstLine = false;
    return;
  }
  
  // Mapear colunas baseado nos headers
  const data = {};
  headers.forEach((h, i) => {
    data[h.trim()] = row[i] ? row[i].trim() : '';
  });
  
  // UF == MG ou Minas Gerais
  if (data['UF'] === 'MG' || data['UF'] === 'Minas Gerais') {
    results.push(data);
  }
});

rl.on('close', () => {
  console.log(`Leitura concluída. ${results.length} escolas de MG encontradas.`);
  
  const chunkSize = 500;
  const maxRecordsPerFile = 5000;
  let fileIndex = 1;
  let currentFileRecords = 0;
  
  let currentOutputFile = path.join(__dirname, `../supabase/seed_inep_mg_parte${fileIndex}.sql`);
  let sqlOutput = `-- Arquivo parte ${fileIndex} gerado automaticamente\n\n`;
  
  for (let i = 0; i < results.length; i += chunkSize) {
    const chunk = results.slice(i, i + chunkSize);
    
    sqlOutput += `INSERT INTO public.crm_leads_escolas (codigo_inep, nome_escola, uf, municipio, dependencia_adm, localizacao, endereco, telefone) VALUES\n`;
    
    const values = chunk.map(r => {
      const inep = (r['Código INEP'] || '').replace(/'/g, "''").substring(0, 20);
      const nome = (r['Escola'] || '').replace(/'/g, "''").substring(0, 255);
      const uf = (r['UF'] || '').replace(/'/g, "''").substring(0, 2);
      const municipio = (r['Município'] || '').replace(/'/g, "''").substring(0, 100);
      const dep = (r['Dependência Administrativa'] || '').replace(/'/g, "''").substring(0, 50);
      const loc = (r['Localização'] || '').replace(/'/g, "''").substring(0, 50);
      const end = (r['Endereço'] || '').replace(/'/g, "''");
      const tel = (r['Telefone'] || '').replace(/'/g, "''").substring(0, 50);
      
      return `('${inep}', '${nome}', '${uf}', '${municipio}', '${dep}', '${loc}', '${end}', '${tel}')`;
    });
    
    sqlOutput += values.join(',\n') + `\nON CONFLICT (codigo_inep) DO NOTHING;\n\n`;
    currentFileRecords += chunk.length;
    
    // Se atingiu o limite por arquivo, salva e cria o próximo
    if (currentFileRecords >= maxRecordsPerFile || i + chunkSize >= results.length) {
      fs.writeFileSync(currentOutputFile, sqlOutput);
      console.log(`Script SQL salvo: seed_inep_mg_parte${fileIndex}.sql`);
      
      fileIndex++;
      currentFileRecords = 0;
      currentOutputFile = path.join(__dirname, `../supabase/seed_inep_mg_parte${fileIndex}.sql`);
      sqlOutput = `-- Arquivo parte ${fileIndex} gerado automaticamente\n\n`;
    }
  }
});
