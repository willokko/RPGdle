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

// Carregar personagens do JSON
async function carregarPersonagens() {
    try {
        const response = await fetch('personagens.json');
        personagens = await response.json();
    } catch (error) {
        console.error('Erro ao carregar personagens:', error);
        charactersContainer.innerHTML = '<p style="text-align: center; color: red;">Erro ao carregar personagens!</p>';
    }
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
