// Estado do jogo
let personagens = [];
let personagemDoDia = null;
let tentativas = 0;
const MAX_TENTATIVAS = 10;
let palpitesFeitos = [];
let jogoTerminado = false;

// Elementos do DOM
const guessInput = document.getElementById('guess-input');
const guessButton = document.getElementById('guess-button');
const attemptsSpan = document.getElementById('attempts');
const guessesContainer = document.getElementById('guesses-container');
const messageDiv = document.getElementById('message');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalClose = document.getElementById('modal-close');
const autocompleteList = document.getElementById('autocomplete-list');

// Inicialização
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await carregarPersonagens();
    personagemDoDia = selecionarPersonagemDoDia();
    console.log('Personagem do dia (debug):', personagemDoDia.Nome); // Para debug
    
    setupEventListeners();
    carregarEstadoDoJogo();
}

// Carregar personagens do CSV
async function carregarPersonagens() {
    try {
        const response = await fetch('personagens.csv');
        const csvText = await response.text();
        personagens = parseCSV(csvText);
        console.log('Personagens carregados:', personagens.length);
        // Debug: mostrar primeiro personagem com imagem
        const comImagem = personagens.find(p => p.Imagem && p.Imagem !== 'images/placeholder.svg');
        if (comImagem) {
            console.log('Exemplo de personagem com imagem:', comImagem.Nome, comImagem.Imagem);
        }
    } catch (error) {
        console.error('Erro ao carregar personagens:', error);
        showMessage('Erro ao carregar dados do jogo!', 'error');
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
                } else if (!value.startsWith('images/') && !value.startsWith('./images/')) {
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

// Selecionar personagem do dia (baseado na data)
function selecionarPersonagemDoDia() {
    const hoje = new Date();
    const seed = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
    const index = seed % personagens.length;
    return personagens[index];
}

// Obter data atual (formato YYYY-MM-DD)
function getDataAtual() {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
}

// Carregar estado do jogo do localStorage
function carregarEstadoDoJogo() {
    const dataAtual = getDataAtual();
    const estadoSalvo = localStorage.getItem('rpgdle-estado');
    
    if (estadoSalvo) {
        const estado = JSON.parse(estadoSalvo);
        
        // Se for o mesmo dia, restaurar o estado
        if (estado.data === dataAtual) {
            tentativas = estado.tentativas;
            palpitesFeitos = estado.palpites;
            jogoTerminado = estado.jogoTerminado;
            
            // Restaurar palpites na tela
            palpitesFeitos.forEach(nomePalpite => {
                const personagem = personagens.find(p => p.Nome === nomePalpite);
                if (personagem) {
                    adicionarPalpiteAoGrid(personagem);
                }
            });
            
            atualizarTentativas();
            
            if (jogoTerminado) {
                desabilitarJogo();
            }
        } else {
            // Novo dia, limpar estado
            limparEstado();
        }
    }
}

// Salvar estado do jogo
function salvarEstadoDoJogo() {
    const estado = {
        data: getDataAtual(),
        tentativas: tentativas,
        palpites: palpitesFeitos,
        jogoTerminado: jogoTerminado
    };
    localStorage.setItem('rpgdle-estado', JSON.stringify(estado));
}

// Limpar estado
function limparEstado() {
    localStorage.removeItem('rpgdle-estado');
}

// Setup event listeners
function setupEventListeners() {
    guessButton.addEventListener('click', handleGuess);
    guessInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleGuess();
        }
    });
    
    // Autocomplete
    guessInput.addEventListener('input', handleAutocomplete);
    
    // Fechar autocomplete ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrapper')) {
            autocompleteList.innerHTML = '';
        }
    });
    
    // Modal
    modalClose.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Autocomplete
function handleAutocomplete() {
    const valor = guessInput.value.toLowerCase();
    autocompleteList.innerHTML = '';
    
    if (!valor || jogoTerminado) {
        return;
    }
    
    const sugestoes = personagens
        .filter(p => p.Nome.toLowerCase().includes(valor) && !palpitesFeitos.includes(p.Nome))
        .slice(0, 5);
    
    sugestoes.forEach(personagem => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        
        // Adicionar imagem
        const img = document.createElement('img');
        img.src = personagem.Imagem || 'images/placeholder.svg';
        img.alt = personagem.Nome;
        img.className = 'autocomplete-img';
        img.onerror = function() {
            this.src = 'images/placeholder.svg';
        };
        
        // Adicionar nome
        const span = document.createElement('span');
        span.textContent = personagem.Nome;
        
        div.appendChild(img);
        div.appendChild(span);
        
        div.addEventListener('click', () => {
            guessInput.value = personagem.Nome;
            autocompleteList.innerHTML = '';
        });
        autocompleteList.appendChild(div);
    });
}

// Função principal de palpite
function handleGuess() {
    if (jogoTerminado) {
        return;
    }
    
    const palpite = guessInput.value.trim();
    
    if (!palpite) {
        showMessage('Digite o nome de um personagem!', 'error');
        return;
    }
    
    // Verificar se o personagem existe
    const personagem = personagens.find(p => p.Nome.toLowerCase() === palpite.toLowerCase());
    
    if (!personagem) {
        showMessage('Personagem não encontrado! Verifique a biblioteca.', 'error');
        return;
    }
    
    // Verificar se já foi palpitado
    if (palpitesFeitos.includes(personagem.Nome)) {
        showMessage('Você já tentou este personagem!', 'error');
        return;
    }
    
    // Adicionar palpite
    tentativas++;
    palpitesFeitos.push(personagem.Nome);
    atualizarTentativas();
    
    // Adicionar ao grid
    adicionarPalpiteAoGrid(personagem);
    
    // Limpar input
    guessInput.value = '';
    autocompleteList.innerHTML = '';
    
    // Verificar vitória
    if (personagem.Nome === personagemDoDia.Nome) {
        vitoria();
    } else if (tentativas >= MAX_TENTATIVAS) {
        derrota();
    }
    
    // Salvar estado
    salvarEstadoDoJogo();
}

// Adicionar palpite ao grid
function adicionarPalpiteAoGrid(personagem) {
    const row = document.createElement('div');
    row.className = 'guess-row';
    
    // Adicionar célula da imagem
    const imgCell = document.createElement('div');
    imgCell.className = 'grid-cell img-cell';
    const img = document.createElement('img');
    img.src = personagem.Imagem || 'images/placeholder.svg';
    img.alt = personagem.Nome;
    img.className = 'character-img';
    img.onerror = function() {
        this.src = 'images/placeholder.svg';
    };
    imgCell.appendChild(img);
    row.appendChild(imgCell);
    
    // Adicionar célula do nome (sempre visível)
    const nameCell = document.createElement('div');
    nameCell.className = 'grid-cell name-cell';
    nameCell.textContent = personagem.Nome;
    
    // Verificar se é o personagem correto para estilizar
    if (personagem.Nome === personagemDoDia.Nome) {
        nameCell.classList.add('correto');
    } else {
        nameCell.classList.add('neutral');
    }
    
    row.appendChild(nameCell);
    
    // Comparar cada atributo
    const atributos = ['Gênero', 'Player', 'RPG', 'Estado', 'Participações', 'Idade', 'Altura'];
    
    atributos.forEach(atributo => {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        
        const valorPalpite = personagem[atributo];
        const valorCorreto = personagemDoDia[atributo];
        
        // Comparação
        if (valorPalpite === valorCorreto) {
            cell.classList.add('correto');
            cell.textContent = valorPalpite;
        } else {
            cell.classList.add('incorreto');
            
            // Para campos numéricos, adicionar setas
            if (typeof valorPalpite === 'number') {
                const textSpan = document.createElement('span');
                textSpan.textContent = valorPalpite;
                
                const arrowSpan = document.createElement('span');
                arrowSpan.className = 'arrow';
                
                if (valorCorreto > valorPalpite) {
                    arrowSpan.textContent = '⬆️';
                } else {
                    arrowSpan.textContent = '⬇️';
                }
                
                cell.appendChild(textSpan);
                cell.appendChild(arrowSpan);
            } else {
                cell.textContent = valorPalpite;
            }
        }
        
        row.appendChild(cell);
    });
    
    guessesContainer.appendChild(row);
}

// Atualizar contador de tentativas
function atualizarTentativas() {
    attemptsSpan.textContent = tentativas;
}

// Vitória
function vitoria() {
    jogoTerminado = true;
    desabilitarJogo();
    
    modalTitle.textContent = '🎉 Parabéns!';
    modalMessage.textContent = `Você acertou em ${tentativas} tentativa${tentativas > 1 ? 's' : ''}! O personagem era ${personagemDoDia.Nome}.`;
    modal.style.display = 'block';
    
    showMessage('Você venceu! 🎉', 'success');
    salvarEstadoDoJogo();
}

// Derrota
function derrota() {
    jogoTerminado = true;
    desabilitarJogo();
    
    modalTitle.textContent = '😔 Que pena!';
    modalMessage.textContent = `Você esgotou suas tentativas. O personagem era ${personagemDoDia.Nome}.`;
    modal.style.display = 'block';
    
    showMessage(`Fim de jogo! O personagem era ${personagemDoDia.Nome}.`, 'error');
    salvarEstadoDoJogo();
}

// Desabilitar jogo
function desabilitarJogo() {
    guessInput.disabled = true;
    guessButton.disabled = true;
}

// Mostrar mensagem
function showMessage(texto, tipo) {
    messageDiv.textContent = texto;
    messageDiv.className = `message ${tipo}`;
    
    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }, 3000);
}
