export const PLACEHOLDER = 'images/placeholder.svg';
export const MAX_IMAGE_BYTES = 24 * 1024;
export const MAX_LEGACY_IMAGE_BYTES = 64 * 1024;
export const MAX_IMAGE_DATA_URL_LENGTH = 23 + 4 * Math.ceil(MAX_IMAGE_BYTES / 3);

export function imagemIncorporada(value) {
    return typeof value === 'string' && value.startsWith('data:');
}

export function validarImagemIncorporada(value, maxBytes = MAX_LEGACY_IMAGE_BYTES) {
    const limit = 23 + 4 * Math.ceil(maxBytes / 3);
    if (value.length > limit) throw new Error(`O retrato deve ter até ${maxBytes / 1024} KiB. Escolha o arquivo para reduzi-lo automaticamente.`);
    const match = /^data:image\/(jpeg|png|webp);base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/.exec(value);
    if (!match || !match[2]) throw new Error('Retrato incorporado inválido. Use uma imagem JPG, PNG ou WebP.');
    const payload = match[2];
    const bytes = payload.length / 4 * 3 - (payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0);
    if (bytes > maxBytes) throw new Error(`O retrato deve ter até ${maxBytes / 1024} KiB.`);
    return value;
}

export function caminhoImagem(value = '', maxBytes = MAX_LEGACY_IMAGE_BYTES) {
    const path = value.trim();
    if (!path) return PLACEHOLDER;
    if (imagemIncorporada(path)) return validarImagemIncorporada(path, maxBytes);
    if (path.length > 2000) throw new Error('O caminho da imagem é muito longo.');
    if (/^https:\/\//i.test(path)) {
        const url = new URL(path);
        if (url.username || url.password) throw new Error('URL de imagem inválida.');
        return url.href;
    }
    const local = path.replace(/^\.\//, '');
    if (local.includes('..') || /[\\<>:"?\x00-\x1f]/.test(local) || local.startsWith('/')) {
        throw new Error('Use o nome do arquivo em images/ ou uma URL https.');
    }
    return local.startsWith('images/') ? local : `images/${local}`;
}

// Aceita CRLF, BOM, vírgulas entre aspas, aspas escapadas e campos multilinha.
export function lerCSV(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (quoted && text[i + 1] === '"') { field += '"'; i++; }
            else quoted = !quoted;
        } else if (char === ',' && !quoted) {
            row.push(field.trim()); field = '';
        } else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && text[i + 1] === '\n') i++;
            row.push(field.trim());
            if (row.some(Boolean)) rows.push(row);
            row = []; field = '';
        } else field += char;
    }
    if (quoted) throw new Error('CSV com aspas não fechadas.');
    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);
    return rows;
}

export function parseCSV(text) {
    const [headers, ...rows] = lerCSV(text);
    if (!headers || !headers.includes('Personagem')) throw new Error('CSV sem a coluna Personagem.');
    return rows.map((values, ordem) => {
        const raw = Object.fromEntries(headers.map((key, index) => [key, values[index] || '']));
        const altura = raw.Altura || '';
        let cm = null;
        if (altura && !['Indefinido', 'Variável'].includes(altura)) {
            cm = altura.includes('cm') ? parseInt(altura, 10)
                : altura.includes('m') ? Math.round(parseFloat(altura.replace(',', '.')) * 100)
                    : parseInt(altura, 10);
            if (!Number.isFinite(cm)) cm = null;
        }
        const idade = raw.Idade === 'Indefinido' ? 'Indefinido' : /^\d+$/.test(raw.Idade) ? Number(raw.Idade) : null;
        return validarPersonagem({
            nome: raw.Personagem, genero: raw['Gênero'], player: raw.Player,
            rpg: raw.RPG, estado: raw.Status,
            participacoes: parseInt(raw['Participações'], 10) || 0,
            idade, altura: cm, imagem: raw.Imagem || '', ordem
        });
    });
}

export function validarPersonagem(input, { imagemAnterior = null } = {}) {
    const result = {};
    for (const key of ['nome', 'genero', 'player', 'rpg', 'estado']) {
        const value = String(input[key] ?? '').trim();
        if (!value || value.length > 160) throw new Error(`Preencha ${key} com até 160 caracteres.`);
        result[key] = value;
    }
    const integer = (value, label, max) => {
        if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new Error(`${label} deve ser um inteiro entre 0 e ${max}.`);
        return value;
    };
    result.participacoes = integer(input.participacoes, 'Participações', 1000000);
    result.idade = input.idade === null || input.idade === 'Indefinido' ? input.idade : integer(input.idade, 'Idade', 1000000000);
    result.altura = input.altura === null ? null : integer(input.altura, 'Altura em centímetros', 1000000);
    result.imagem = caminhoImagem(input.imagem,
        input.imagem === imagemAnterior ? MAX_LEGACY_IMAGE_BYTES : MAX_IMAGE_BYTES);
    result.ordem = integer(input.ordem, 'Ordem', 1000000000);
    return result;
}

export function paraJogo(personagem) {
    return {
        id: personagem.id, Nome: personagem.nome, 'Gênero': personagem.genero,
        Player: personagem.player, RPG: personagem.rpg, Estado: personagem.estado,
        'Participações': personagem.participacoes,
        Idade: personagem.idade === 'Indefinido' ? Infinity : personagem.idade,
        Altura: personagem.altura, Imagem: caminhoImagem(personagem.imagem)
    };
}
