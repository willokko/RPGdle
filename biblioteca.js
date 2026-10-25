import { carregarCatalogo, mostrarAvisoCatalogo } from './catalogo.js';

// Estado da biblioteca
let personagens = [];
let rpgSelecionado = 'todos';
let playerSelecionado = 'todos';

// Elementos do DOM
const rpgFilter = document.getElementById('rpg-filter');
const charactersContainer = document.getElementById('characters-container');
const noCharacters = document.getElementById('no-characters');
const playerFilter = document.getElementById('player-filter');

// Inicialização
document.addEventListener('DOMContentLoaded', init);

async function init() {
    if (!await carregarPersonagens()) return;
    popularFiltroRPG();
    popularFiltroPlayer();
    exibirPersonagens();
    setupEventListeners();
}

async function carregarPersonagens() {
    try {
        const catalogo = await carregarCatalogo();
        personagens = catalogo.personagens;
        mostrarAvisoCatalogo(catalogo.aviso);
        return true;
    } catch (error) {
        console.error('Erro ao carregar personagens:', error);
        mostrarAvisoCatalogo('Não foi possível carregar os personagens. Tente recarregar a página.');
        return false;
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

// Popular filtro de Players
function popularFiltroPlayer() {
    // Obter lista única de Players
    const players = [...new Set(personagens.map(p => p.Player))].sort();
    
    // Adicionar opções ao select
    players.forEach(player => {
        const option = document.createElement('option');
        option.value = player;
        option.textContent = player;
        playerFilter.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    rpgFilter.addEventListener('change', (e) => {
        rpgSelecionado = e.target.value;
        exibirPersonagens();
    });
    
    playerFilter.addEventListener('change', (e) => {
        playerSelecionado = e.target.value;
        exibirPersonagens();
    });
}

// Exibir personagens
function exibirPersonagens() {
    charactersContainer.innerHTML = '';
    
    // Filtrar personagens
    let personagensFiltrados = personagens;
    
    // Aplicar filtro de RPG
    if (rpgSelecionado !== 'todos') {
        personagensFiltrados = personagensFiltrados.filter(p => p.RPG === rpgSelecionado);
    }
    
    // Aplicar filtro de Player
    if (playerSelecionado !== 'todos') {
        personagensFiltrados = personagensFiltrados.filter(p => p.Player === playerSelecionado);
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

// Texto do banco é inserido como texto, sem interpretar HTML.
function criarCardPersonagem(personagem) {
    const card = document.createElement('div');
    card.className = 'character-card';
    const imageBox = document.createElement('div');
    imageBox.className = 'character-image';
    const image = document.createElement('img');
    image.src = personagem.Imagem;
    image.alt = personagem.Nome;
    image.loading = 'lazy';
    image.onerror = () => { image.onerror = null; image.src = 'images/placeholder.svg'; };
    imageBox.append(image);
    const title = document.createElement('h3');
    title.textContent = personagem.Nome;
    const info = document.createElement('div');
    info.className = 'character-info';
    const idade = personagem.Idade === Infinity ? 'Indefinido' : personagem.Idade ?? '?';
    const atributos = [
        ['Gênero', personagem.Gênero], ['Player', personagem.Player], ['RPG', personagem.RPG],
        ['Estado', personagem.Estado], ['Participações', personagem.Participações || '-'],
        ['Idade', idade], ['Altura', personagem.Altura > 0 ? `${personagem.Altura} cm` : '-']
    ];
    for (const [label, value] of atributos) {
        const row = document.createElement('div');
        row.className = 'info-row';
        const key = document.createElement('span');
        key.className = 'info-label';
        key.textContent = `${label}:`;
        const content = document.createElement('span');
        content.className = 'info-value';
        content.textContent = value;
        row.append(key, content);
        info.append(row);
    }
    card.append(imageBox, title, info);
    return card;
}
