import { ADMIN_EMAIL, ADMIN_UID } from './firebase-config.js';
import { caminhoImagem, PLACEHOLDER } from './personagens-model.js';
import { lerPersonagensCSV } from './catalogo.js';

const $ = id => document.getElementById(id);
const form = $('character-form');
const field = name => form.elements.namedItem(name);
let personagens = [], editando = null, busy = false, dirty = false, catalogoPronto = false;
let auth, authSDK, store;

function status(text, type = '') {
    $('admin-status').textContent = text;
    $('admin-status').className = `admin-status ${type}`;
}

function erro(error) {
    console.error(error);
    const code = error.code || '';
    if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(code)) return 'Senha incorreta. Tente novamente.';
    if (code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    if (code === 'auth/operation-not-allowed') return 'Ative o método E-mail/senha no Authentication do Firebase.';
    if (code.includes('permission-denied')) return 'Permissão negada. Publique o arquivo firestore.rules na aba Regras do Cloud Firestore. Depois clique em Recarregar lista.';
    if (code.includes('network') || code.includes('unavailable')) return 'Não foi possível conectar ao Firebase. Confira a conexão e tente novamente.';
    return error.message || 'Não foi possível concluir a operação.';
}

function setBusy(value) {
    busy = value;
    $('editor-fields').disabled = value || !catalogoPronto;
    document.querySelectorAll('[data-write]').forEach(button => { button.disabled = value || !catalogoPronto; });
    $('import-button').disabled = value || !catalogoPronto || personagens.length > 0;
    $('reload-button').disabled = value;
    $('logout-button').disabled = value;
    document.querySelectorAll('#character-list button').forEach(button => { button.disabled = value; });
}

function atualizarIdade() {
    const known = $('age-kind').value === 'number';
    field('idade').disabled = !known;
    field('idade').required = known;
}

function preview() {
    try {
        const path = caminhoImagem(field('imagem').value);
        $('image-preview-status').textContent = path === PLACEHOLDER ? 'Imagem padrão' : path;
        $('image-preview').src = path;
    } catch (error) {
        $('image-preview-status').textContent = error.message;
        $('image-preview').src = PLACEHOLDER;
    }
}
$('image-preview').addEventListener('error', () => {
    if ($('image-preview').getAttribute('src') === PLACEHOLDER) return;
    $('image-preview-status').textContent = 'Imagem não encontrada. Confira o nome e a publicação no GitHub.';
    $('image-preview').src = PLACEHOLDER;
});

function editar(personagem = null) {
    if (dirty && !confirm('Descartar as alterações ainda não salvas?')) return;
    editando = personagem;
    form.reset();
    $('editor-title').textContent = personagem ? `Editar ${personagem.nome}` : 'Novo personagem';
    $('delete-button').hidden = !personagem;
    if (personagem) {
        for (const key of ['nome', 'genero', 'player', 'rpg', 'estado', 'participacoes', 'altura', 'imagem']) {
            field(key).value = personagem[key] ?? '';
        }
        $('age-kind').value = personagem.idade === null ? 'unknown' : personagem.idade === 'Indefinido' ? 'indefinite' : 'number';
        field('idade').value = typeof personagem.idade === 'number' ? personagem.idade : '';
    }
    atualizarIdade();
    preview();
    dirty = false;
}

function renderLista() {
    const search = $('character-search').value.trim().toLocaleLowerCase('pt-BR');
    $('character-list').replaceChildren();
    const filtrados = personagens.filter(p => `${p.nome} ${p.rpg} ${p.player}`.toLocaleLowerCase('pt-BR').includes(search));
    $('empty-list').hidden = filtrados.length > 0;
    $('character-count').textContent = personagens.length;
    for (const personagem of filtrados) {
        const item = document.createElement('li');
        const text = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = personagem.nome;
        const detail = document.createElement('small');
        detail.textContent = `${personagem.rpg} · ${personagem.player} · ${personagem.participacoes} participações`;
        text.append(title, detail);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'admin-button';
        button.textContent = 'Editar';
        button.setAttribute('aria-label', `Editar ${personagem.nome}`);
        button.disabled = busy;
        button.addEventListener('click', () => editar(personagem));
        item.append(text, button);
        $('character-list').append(item);
    }
    for (const [key, id] of [['player', 'player-options'], ['rpg', 'rpg-options']]) {
        $(id).replaceChildren();
        [...new Set(personagens.map(p => p[key]))].sort().forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            $(id).append(option);
        });
    }
}

async function recarregar() {
    personagens = await store.listarPersonagens();
    catalogoPronto = true;
    renderLista();
}

async function operar(action) {
    if (busy) return;
    setBusy(true);
    try { await action(); }
    catch (error) { status(erro(error), 'error'); }
    finally { setBusy(false); }
}

$('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    $('login-button').disabled = true;
    status('Conferindo senha…');
    try {
        await authSDK.signInWithEmailAndPassword(auth, ADMIN_EMAIL, $('admin-password').value);
    } catch (error) { status(erro(error), 'error'); }
    finally { $('admin-password').value = ''; $('login-button').disabled = false; }
});
$('logout-button').addEventListener('click', () => {
    if (dirty && !confirm('Sair e descartar alterações ainda não salvas?')) return;
    operar(async () => { await authSDK.signOut(auth); status('Você saiu do painel.'); });
});
$('new-button').addEventListener('click', () => editar());
$('cancel-button').addEventListener('click', () => editar());
$('character-search').addEventListener('input', renderLista);
$('age-kind').addEventListener('change', atualizarIdade);
form.addEventListener('input', () => { dirty = true; });
form.addEventListener('change', () => { dirty = true; });
field('imagem').addEventListener('input', preview);
$('participation-minus').addEventListener('click', () => { field('participacoes').stepDown(); dirty = true; });
$('participation-plus').addEventListener('click', () => { field('participacoes').stepUp(); dirty = true; });
window.addEventListener('beforeunload', event => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
});

$('reload-button').addEventListener('click', () => {
    if (dirty && !confirm('Recarregar a lista e descartar alterações ainda não salvas?')) return;
    operar(async () => {
        await recarregar();
        dirty = false; editar();
        status('Lista atualizada.', 'success');
    });
});

form.addEventListener('submit', event => {
    event.preventDefault();
    operar(async () => {
        const key = name => name.normalize('NFC').trim().toLocaleLowerCase('pt-BR');
        if (personagens.some(p => p.id !== editando?.id && key(p.nome) === key(field('nome').value))) {
            throw new Error('Já existe um personagem com esse nome. Use um nome que o diferencie no jogo.');
        }
        const kind = $('age-kind').value;
        const data = {
            nome: field('nome').value, genero: field('genero').value, player: field('player').value,
            rpg: field('rpg').value, estado: field('estado').value,
            participacoes: Number(field('participacoes').value),
            idade: kind === 'unknown' ? null : kind === 'indefinite' ? 'Indefinido' : Number(field('idade').value),
            altura: field('altura').value === '' ? null : Number(field('altura').value),
            imagem: field('imagem').value,
            ordem: editando ? editando.ordem : Math.max(-1, ...personagens.map(p => p.ordem)) + 1
        };
        await store.salvarPersonagem(data, editando);
        dirty = false; editar();
        status('Personagem salvo. As alterações aparecem ao recarregar o jogo e a biblioteca.', 'success');
        await recarregar();
    });
});

$('delete-button').addEventListener('click', () => {
    if (!editando || !confirm(`Excluir ${editando.nome}? O personagem será removido do jogo e da biblioteca. A imagem continuará no GitHub.`)) return;
    operar(async () => {
        await store.excluirPersonagem(editando);
        dirty = false; editar();
        status('Personagem excluído.', 'success');
        await recarregar();
    });
});

$('import-button').addEventListener('click', () => {
    if (dirty && !confirm('Descartar o formulário e iniciar a importação?')) return;
    if (!confirm('Importar os personagens do CSV atual para o banco? Esta importação inicial só pode ser feita uma vez.')) return;
    operar(async () => {
        status('Importando personagens…');
        const data = await lerPersonagensCSV();
        await store.importarCSV(data);
        dirty = false; editar();
        status(`${data.length} personagens importados. Você já pode editar pelo painel.`, 'success');
        await recarregar();
    });
});

async function iniciar() {
    try {
        const [client, sdk, repository] = await Promise.all([
            import('./firebase-client.js'),
            import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
            import('./personagens-store.js')
        ]);
        authSDK = sdk; store = repository;
        auth = sdk.getAuth(client.app);
        await sdk.setPersistence(auth, sdk.browserSessionPersistence);
        sdk.onAuthStateChanged(auth, async user => {
            const autorizado = user?.uid === ADMIN_UID;
            $('login-panel').hidden = autorizado;
            $('admin-panel').hidden = !autorizado;
            if (!autorizado) {
                personagens = []; editando = null; dirty = false; catalogoPronto = false;
                form.reset(); $('character-list').replaceChildren();
                if (user) { await sdk.signOut(auth); status('Esta conta não tem permissão administrativa.', 'error'); }
                else if (!$('admin-status').classList.contains('error')) status('');
                return;
            }
            await operar(async () => {
                status('Carregando personagens…');
                await recarregar();
                editar();
                status(personagens.length ? 'Painel pronto.' : 'Primeiro acesso: abra “Primeiro acesso e imagens” para importar o CSV.');
            });
        });
    } catch (error) { status(`Não foi possível abrir o painel. ${erro(error)}`, 'error'); }
}

iniciar();
