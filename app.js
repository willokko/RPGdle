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
const normalModeButton = document.getElementById('normal-mode-button');
const easyModeButton = document.getElementById('easy-mode-button');
const modeDescription = document.getElementById('mode-description');

let modo = 'normal';
const estadosPorModo = { normal: null, facil: null };
const MIN_PARTICIPACOES_FACIL = 3;
const ESTADO_KEY_BASE = 'rpgdle-estado';
const ESTADO_KEY_NORMAL = `${ESTADO_KEY_BASE}-normal`;
const ESTADO_KEY_FACIL = `${ESTADO_KEY_BASE}-facil`;
const HISTORICO_KEY_NORMAL = 'rpgdle-historico-personagens';
const HISTORICO_KEY_FACIL = 'rpgdle-historico-personagens-facil';
const RECENTE_DIAS = 100;

// Inicialização
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await carregarPersonagens();

    if (!personagens.length) {
        showMessage('Nenhum personagem disponível para o jogo!', 'error');
        return;
    }

    const estadoSalvoHoje = carregarEstadoDoJogo();

    try {
        personagemDoDia = await selecionarPersonagemDoDia();
        console.log('Personagem do dia (debug):', personagemDoDia?.Nome);
    } catch (error) {
        console.error('Erro ao selecionar personagem do dia:', error);
        showMessage('Erro ao definir o personagem do dia!', 'error');
        return;
    }

    setupEventListeners();
    updateModeUI();

    if (estadoSalvoHoje) {
        restaurarEstado(estadoSalvoHoje);
    } else {
        resetEstadoAtual();
        salvarEstadoDoJogo();
    }
}

// Carregar personagens do CSV
async function carregarPersonagens() {
    try {
        const response = await fetch('personagens.csv');
        const csvText = await response.text();
        personagens = parseCSV(csvText);
        console.log('Personagens carregados:', personagens.length);

        const comImagem = personagens.find(p => p.Imagem && p.Imagem !== 'images/placeholder.svg');
        if (comImagem) {
            console.log('Exemplo de personagem com imagem:', comImagem.Nome, comImagem.Imagem);
        }
    } catch (error) {
        console.error('Erro ao carregar personagens:', error);
        showMessage('Erro ao carregar dados do jogo!', 'error');
    }
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const data = [];
    const headers = parseCSVLine(lines[0]);

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
                if (!value) {
                    value = 'images/placeholder.svg';
                } else if (!value.startsWith('images/') && !value.startsWith('./images/')) {
                    value = 'images/' + value;
                }
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
                if (value === '' || value === 'Indefinido' || value === 'Variável') {
                    value = null;
                } else if (value.includes('cm')) {
                    value = parseInt(value.replace('cm', ''), 10) || 0;
                } else if (value.includes('m')) {
                    const metros = parseFloat(value.replace('m', '').replace(',', '.')) || 0;
                    value = Math.round(metros * 100);
                } else {
                    value = parseInt(value, 10) || 0;
                }
            }

            obj[mappedHeader] = value;
        }

        data.push(obj);
    }

    return data;
}

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

function getHistoricoKey() {
    return modo === 'facil' ? HISTORICO_KEY_FACIL : HISTORICO_KEY_NORMAL;
}

function getEstadoKey(modoAlvo = modo) {
    return modoAlvo === 'facil' ? ESTADO_KEY_FACIL : ESTADO_KEY_NORMAL;
}

function getPersonagensParaModo() {
    return modo === 'facil'
        ? personagens.filter(p => p.Participações >= MIN_PARTICIPACOES_FACIL)
        : personagens;
}

async function selecionarPersonagemDoDia() {
    const pool = getPersonagensParaModo();

    if (!Array.isArray(pool) || pool.length === 0) {
        throw new Error('Nenhum personagem disponível para a seleção do dia neste modo');
    }

    const dataAtual = getDataAtual();
    const historico = limparHistoricoAntigo(carregarHistoricoPersonagensUsados());
    const registroHoje = historico.find(entry => entry.data === dataAtual);

    if (registroHoje) {
        const personagemExistente = pool.find(p => p.Nome === registroHoje.nome);
        if (personagemExistente) {
            return personagemExistente;
        }
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(`${dataAtual}:${modo}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);

    const seed = (
        (hashArray[0] << 24) |
        (hashArray[1] << 16) |
        (hashArray[2] << 8) |
        (hashArray[3])
    ) >>> 0;

    let index = seed % pool.length;
    const nomesRecentes = new Set(historico.map(entry => entry.nome));
    let personagemSelecionado = pool[index];

    if (nomesRecentes.has(personagemSelecionado.Nome) && nomesRecentes.size < pool.length) {
        for (let offset = 1; offset < pool.length; offset++) {
            const i = (index + offset) % pool.length;
            const candidato = pool[i];
            if (!nomesRecentes.has(candidato.Nome)) {
                personagemSelecionado = candidato;
                break;
            }
        }
    }

    historico.push({ data: dataAtual, nome: personagemSelecionado.Nome });
    salvarHistoricoPersonagensUsados(limparHistoricoAntigo(historico));

    return personagemSelecionado;
}

function getDataAtual() {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
}

function carregarHistoricoPersonagensUsados() {
    try {
        const raw = localStorage.getItem(getHistoricoKey());
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.warn('Histórico de personagens usado inválido, reiniciando.', error);
        return [];
    }
}

function salvarHistoricoPersonagensUsados(historico) {
    localStorage.setItem(getHistoricoKey(), JSON.stringify(historico));
}

function limparHistoricoAntigo(historico) {
    const limite = new Date();
    limite.setDate(limite.getDate() - RECENTE_DIAS);
    const limiteStr = limite.toISOString().split('T')[0];
    return historico.filter(entry => entry.data >= limiteStr);
}

function carregarEstadoDoJogo(modoAlvo = modo) {
    const estadoCache = estadosPorModo[modoAlvo];
    if (estadoCache && estadoCache.data === getDataAtual()) {
        return estadoCache;
    }

    try {
        const raw = localStorage.getItem(getEstadoKey(modoAlvo));
        if (!raw) {
            const legacyRaw = localStorage.getItem(ESTADO_KEY_BASE);
            if (!legacyRaw) return null;

            const estado = JSON.parse(legacyRaw);
            if (estado && estado.data === getDataAtual()) {
                const estadoMigrado = {
                    data: estado.data,
                    modo: estado.modo || modoAlvo,
                    tentativas: estado.tentativas || 0,
                    palpites: Array.isArray(estado.palpites) ? estado.palpites : [],
                    jogoTerminado: Boolean(estado.jogoTerminado)
                };
                localStorage.setItem(getEstadoKey(estadoMigrado.modo), JSON.stringify(estadoMigrado));
                localStorage.removeItem(ESTADO_KEY_BASE);
                estadosPorModo[estadoMigrado.modo] = estadoMigrado;
                return estadoMigrado;
            }

            localStorage.removeItem(ESTADO_KEY_BASE);
            return null;
        }

        const estado = JSON.parse(raw);
        if (estado.data === getDataAtual()) {
            estadosPorModo[modoAlvo] = estado;
            return estado;
        }

        localStorage.removeItem(getEstadoKey(modoAlvo));
        estadosPorModo[modoAlvo] = null;
        return null;
    } catch (error) {
        console.warn('Estado do jogo inválido, reiniciando.', error);
        localStorage.removeItem(getEstadoKey(modoAlvo));
        estadosPorModo[modoAlvo] = null;
        return null;
    }
}

function restaurarEstado(estado) {
    if (!estado || estado.data !== getDataAtual()) return;

    estadosPorModo[modo] = estado;
    guessesContainer.innerHTML = '';
    tentativas = estado.tentativas || 0;
    palpitesFeitos = Array.isArray(estado.palpites) ? estado.palpites : [];
    jogoTerminado = Boolean(estado.jogoTerminado);

    for (let i = palpitesFeitos.length - 1; i >= 0; i--) {
        const nomePalpite = palpitesFeitos[i];
        const personagem = personagens.find(p => p.Nome === nomePalpite);
        if (personagem) {
            adicionarPalpiteAoGrid(personagem, true);
        }
    }

    atualizarTentativas();
    habilitarJogo();
    guessInput.value = '';
    autocompleteList.innerHTML = '';

    if (jogoTerminado) {
        desabilitarJogo();
    }
}

function salvarEstadoDoJogo() {
    const estado = {
        data: getDataAtual(),
        modo: modo,
        tentativas: tentativas,
        palpites: palpitesFeitos,
        jogoTerminado: jogoTerminado
    };
    localStorage.setItem(getEstadoKey(), JSON.stringify(estado));
    estadosPorModo[modo] = estado;
}

function resetEstadoAtual() {
    tentativas = 0;
    palpitesFeitos = [];
    jogoTerminado = false;
    guessesContainer.innerHTML = '';
    atualizarTentativas();
    habilitarJogo();
    estadosPorModo[modo] = {
        data: getDataAtual(),
        modo: modo,
        tentativas: 0,
        palpites: [],
        jogoTerminado: false
    };
}

function limparEstado() {
    localStorage.removeItem(getEstadoKey());
    resetEstadoAtual();
}

function setupEventListeners() {
    guessButton.addEventListener('click', handleGuess);
    guessInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleGuess();
        }
    });

    normalModeButton.addEventListener('click', () => handleModeChange('normal'));
    easyModeButton.addEventListener('click', () => handleModeChange('facil'));

    guessInput.addEventListener('input', handleAutocomplete);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrapper')) {
            autocompleteList.innerHTML = '';
        }
    });

    modalClose.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function handleAutocomplete() {
    const valor = guessInput.value.toLowerCase();
    autocompleteList.innerHTML = '';

    if (!valor || jogoTerminado) {
        return;
    }

    const pool = getPersonagensParaModo();
    const sugestoes = pool
        .filter(p => p.Nome.toLowerCase().includes(valor) && !palpitesFeitos.includes(p.Nome))
        .slice(0, 20);

    sugestoes.forEach(personagem => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';

        const img = document.createElement('img');
        img.src = personagem.Imagem || 'images/placeholder.svg';
        img.alt = personagem.Nome;
        img.className = 'autocomplete-img';
        img.onerror = function() {
            this.src = 'images/placeholder.svg';
        };

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

function handleGuess() {
    if (jogoTerminado) {
        return;
    }

    const palpite = guessInput.value.trim();
    if (!palpite) {
        showMessage('Digite o nome de um personagem!', 'error');
        return;
    }

    const pool = getPersonagensParaModo();
    const personagem = pool.find(p => p.Nome.toLowerCase() === palpite.toLowerCase());
    if (!personagem) {
        showMessage('Personagem não encontrado! Verifique a biblioteca.', 'error');
        return;
    }

    if (palpitesFeitos.includes(personagem.Nome)) {
        showMessage('Você já tentou este personagem!', 'error');
        return;
    }

    tentativas++;
    palpitesFeitos.push(personagem.Nome);
    atualizarTentativas();

    adicionarPalpiteAoGrid(personagem, true);
    guessInput.value = '';
    autocompleteList.innerHTML = '';

    if (personagem.Nome === personagemDoDia.Nome) {
        vitoria();
    } else if (tentativas >= MAX_TENTATIVAS) {
        derrota();
    }

    salvarEstadoDoJogo();
}

function formatarValorParaExibicao(valor, atributo) {
    if (valor === Infinity) {
        return 'Indefinido';
    }
    if (valor === null) {
        return '?';
    }
    if (atributo === 'Altura' && typeof valor === 'number' && valor > 0) {
        return valor + 'cm';
    }
    return valor;
}

function adicionarPalpiteAoGrid(personagem, insertFirst = false) {
    const row = document.createElement('div');
    row.className = 'guess-row';

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

    const nameCell = document.createElement('div');
    nameCell.className = 'grid-cell name-cell';
    nameCell.textContent = personagem.Nome;
    if (personagem.Nome === personagemDoDia.Nome) {
        nameCell.classList.add('correto');
    } else {
        nameCell.classList.add('neutral');
    }
    row.appendChild(nameCell);

    const atributos = ['Gênero', 'Player', 'RPG', 'Estado', 'Participações', 'Idade', 'Altura'];
    atributos.forEach(atributo => {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';

        const valorPalpite = personagem[atributo];
        const valorCorreto = personagemDoDia[atributo];

        if (valorPalpite === valorCorreto) {
            cell.classList.add('correto');
            cell.textContent = formatarValorParaExibicao(valorPalpite, atributo);
        } else {
            cell.classList.add('incorreto');
            if (typeof valorPalpite === 'number' && valorCorreto !== null && valorPalpite !== null) {
                const textSpan = document.createElement('span');
                textSpan.textContent = formatarValorParaExibicao(valorPalpite, atributo);
                const arrowSpan = document.createElement('span');
                arrowSpan.className = 'arrow';
                arrowSpan.textContent = valorCorreto > valorPalpite ? '⬆️' : '⬇️';
                cell.appendChild(textSpan);
                cell.appendChild(arrowSpan);
            } else {
                cell.textContent = formatarValorParaExibicao(valorPalpite, atributo);
            }
        }

        row.appendChild(cell);
    });

    if (insertFirst && guessesContainer.firstChild) {
        guessesContainer.insertBefore(row, guessesContainer.firstChild);
    } else {
        guessesContainer.appendChild(row);
    }
}

function atualizarTentativas() {
    if (attemptsSpan) {
        attemptsSpan.textContent = tentativas;
    }
}

function vitoria() {
    jogoTerminado = true;
    desabilitarJogo();
    modalTitle.textContent = '🎉 Parabéns!';
    modalMessage.textContent = `Você acertou em ${tentativas} tentativa${tentativas > 1 ? 's' : ''}! O personagem era ${personagemDoDia.Nome}.`;
    modal.style.display = 'block';
    showMessage('Você venceu! 🎉', 'success');
    salvarEstadoDoJogo();
}

function updateModeUI() {
    if (modo === 'facil') {
        normalModeButton.classList.remove('active');
        easyModeButton.classList.add('active');
        modeDescription.textContent = 'Versão Fácil: apenas personagens com 3 ou mais participações entram no sorteio diário.';
    } else {
        easyModeButton.classList.remove('active');
        normalModeButton.classList.add('active');
        modeDescription.textContent = 'Modo Normal: todos os personagens entram no sorteio diário.';
    }
}

async function handleModeChange(novoModo) {
    if (modo === novoModo) return;

    salvarEstadoDoJogo();
    modo = novoModo;
    updateModeUI();

    try {
        personagemDoDia = await selecionarPersonagemDoDia();
        const estadoSalvo = carregarEstadoDoJogo(novoModo);

        if (estadoSalvo) {
            restaurarEstado(estadoSalvo);
        } else {
            resetEstadoAtual();
            salvarEstadoDoJogo();
        }

        console.log('Personagem do dia (debug):', personagemDoDia?.Nome);
    } catch (error) {
        console.error('Erro ao selecionar personagem do dia:', error);
        showMessage('Erro ao definir o personagem do dia!', 'error');
    }
}

function derrota() {
    jogoTerminado = true;
    desabilitarJogo();
    modalTitle.textContent = '😔 Que pena!';
    modalMessage.textContent = `Você esgotou suas tentativas. O personagem era ${personagemDoDia.Nome}.`;
    modal.style.display = 'block';
    showMessage(`Fim de jogo! O personagem era ${personagemDoDia.Nome}.`, 'error');
    salvarEstadoDoJogo();
}

function habilitarJogo() {
    guessInput.disabled = false;
    guessButton.disabled = false;
}

function desabilitarJogo() {
    guessInput.disabled = true;
    guessButton.disabled = true;
}

function showMessage(texto, tipo) {
    messageDiv.textContent = texto;
    messageDiv.className = `message ${tipo}`;
    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }, 3000);
}
