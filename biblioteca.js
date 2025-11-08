// Estado da biblioteca
let personagens = [];
let rpgSelecionado = 'todos';

// Elementos do DOM
const rpgFilter = document.getElementById('rpg-filter');
const charactersContainer = document.getElementById('characters-container');
const noCharacters = document.getElementById('no-characters');

// Inicialização
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await carregarPersonagens();
    popularFiltroRPG();
    exibirPersonagens();
    setupEventListeners();
}

// Carregar personagens do CSV
async function carregarPersonagens() {
    try {
        const response = await fetch('personagens.csv');
        const csvText = await response.text();
        personagens = parseCSV(csvText);
    } catch (error) {
        console.error('Erro ao carregar personagens:', error);
        charactersContainer.innerHTML = '<p style="text-align: center; color: red;">Erro ao carregar personagens!</p>';
    }
}

// Função para parsear CSV
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const data = [];
    
    // Parsear primeira linha (cabeçalhos)
    const headers = parseCSVLine(lines[0]);
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // Pular linhas vazias
        
        const values = parseCSVLine(lines[i]);
        const obj = {};
        
        for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            let value = values[j] || '';
            
            // Mapear nomes de colunas do CSV para o formato esperado
            let mappedHeader = header;
            if (header === 'Personagem') mappedHeader = 'Nome';
            if (header === 'Status') mappedHeader = 'Estado';
            
            // Processar campo Imagem
            if (mappedHeader === 'Imagem') {
                // Se vazio, usar placeholder
                if (!value || value === '') {
                    value = 'images/placeholder.svg';
                } else if (!value.startsWith('images/')) {
                    value = 'images/' + value;
                }
                obj[mappedHeader] = value;
                continue;
            }
            
            // Processar valores específicos
            if (mappedHeader === 'Participações') {
                // Converter "20+" para número ou deixar vazio como 0
                if (value === '20+') value = 20;
                else if (value === '' || value === 'Indefinido') value = 0;
                else value = parseInt(value) || 0;
            } else if (mappedHeader === 'Idade') {
                // Converter idade, tratar "Indefinido" e vazios
                if (value === '' || value === 'Indefinido') value = 0;
                else value = parseInt(value) || 0;
            } else if (mappedHeader === 'Altura') {
                // Converter altura de "1,77m" ou "2m" para centímetros
                if (value === '' || value === 'Indefinido') {
                    value = 0;
                } else if (value.includes('cm')) {
                    value = parseInt(value.replace('cm', '')) || 0;
                } else if (value.includes('m')) {
                    const metros = parseFloat(value.replace('m', '').replace(',', '.')) || 0;
                    value = Math.round(metros * 100);
                } else {
                    value = parseInt(value) || 0;
                }
            }
            
            obj[mappedHeader] = value;
        }
        
        data.push(obj);
    }
    
    return data;
}

// Função auxiliar para parsear linha CSV com aspas
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Popular filtro de RPG
function popularFiltroRPG() {
    // Obter lista única de RPGs
    const rpgs = [...new Set(personagens.map(p => p.RPG))].sort();
    
    // Adicionar opções ao select
    rpgs.forEach(rpg => {
        const option = document.createElement('option');
        option.value = rpg;
        option.textContent = rpg;
        rpgFilter.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    rpgFilter.addEventListener('change', (e) => {
        rpgSelecionado = e.target.value;
        exibirPersonagens();
    });
}

// Exibir personagens
function exibirPersonagens() {
    charactersContainer.innerHTML = '';
    
    // Filtrar personagens
    let personagensFiltrados = personagens;
    
    if (rpgSelecionado !== 'todos') {
        personagensFiltrados = personagens.filter(p => p.RPG === rpgSelecionado);
    }
    
    // Verificar se há personagens
    if (personagensFiltrados.length === 0) {
        noCharacters.style.display = 'block';
        return;
    }
    
    noCharacters.style.display = 'none';
    
    // Criar cards
    personagensFiltrados.forEach(personagem => {
        const card = criarCardPersonagem(personagem);
        charactersContainer.appendChild(card);
    });
}

// Criar card de personagem
function criarCardPersonagem(personagem) {
    const card = document.createElement('div');
    card.className = 'character-card';
    
    card.innerHTML = `
        <div class="character-image">
            <img src="${personagem.Imagem || 'images/placeholder.svg'}" alt="${personagem.Nome}">
        </div>
        <h3>${personagem.Nome}</h3>
        <div class="character-info">
            <div class="info-row">
                <span class="info-label">Gênero:</span>
                <span class="info-value">${personagem.Gênero}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Player:</span>
                <span class="info-value">${personagem.Player}</span>
            </div>
            <div class="info-row">
                <span class="info-label">RPG:</span>
                <span class="info-value">${personagem.RPG}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Estado:</span>
                <span class="info-value">${personagem.Estado}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Participações:</span>
                <span class="info-value">${personagem.Participações}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Idade:</span>
                <span class="info-value">${personagem.Idade}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Altura:</span>
                <span class="info-value">${personagem.Altura} cm</span>
            </div>
        </div>
    `;
    
    return card;
}
