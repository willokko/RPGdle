import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCSV, MAX_IMAGE_BYTES, MAX_LEGACY_IMAGE_BYTES } from '../personagens-model.js';

// Destino fixo e fictício: nunca usar credenciais nem o projeto de produção.
const host = 'http://127.0.0.1:8087';
const project = 'demo-rpgdle';
const base = `${host}/v1/projects/${project}/databases/(default)/documents`;
const prefix = `projects/${project}/databases/(default)/documents`;
const adminUid = 'wdhM824nJ9V7u2AHYXxz3CaG5VJ2';
const now = Math.floor(Date.now() / 1000);
function token(uid) {
    const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: uid, user_id: uid, aud: project,
        iss: `https://securetoken.google.com/${project}`, iat: now, exp: now + 3600,
        firebase: { sign_in_provider: 'password' } })}.`;
}
function fields(data) {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
        value === null ? { nullValue: null } : typeof value === 'number' ? { integerValue: String(value) }
            : { stringValue: value }
    ]));
}
function write(id, data, create = true) {
    return {
        update: { name: `${prefix}/${id}`, fields: fields(data) },
        updateTransforms: ['updatedAt', ...(create ? ['createdAt'] : [])].map(fieldPath => ({ fieldPath, setToServerValue: 'REQUEST_TIME' }))
    };
}
async function request(path, uid, method = 'GET', body) {
    return fetch(path, { method, headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer ${token(uid)}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
}
async function commit(writes, uid) { return request(`${base}:commit`, uid, 'POST', { writes }); }

test('regras protegem o banco e aceitam a importação real inteira', async () => {
    const reset = await fetch(`${host}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    assert.equal(reset.status, 200, 'Inicie primeiro o emulador local com firestore.rules.');
    const data = parseCSV(await readFile(new URL('../personagens.csv', import.meta.url), 'utf8'));
    const sample = data[0];
    const denied = async promise => {
        const response = await promise;
        assert.equal(response.status, 403, await response.text());
    };
    const accepted = async promise => {
        const response = await promise;
        assert.equal(response.status, 200, await response.text());
    };
    await denied(commit([write('personagens/anonimo', sample)]));
    await denied(commit([write('personagens/intruso', sample)], 'outra-conta'));
    await denied(commit([write('personagens/invalido', { ...sample, participacoes: -1 })], adminUid));
    await denied(commit([write('personagens/invalido', { ...sample, idade: 'abc' })], adminUid));
    await denied(commit([write('personagens/invalido', { ...sample, extra: 'campo não permitido' })], adminUid));
    await denied(commit([write('personagens/invalido', { ...sample, imagem: 'javascript:alert(1)' })], adminUid));
    await denied(commit([write('outros/documento', sample)], adminUid));
    const retrato = `data:image/webp;base64,${Buffer.alloc(MAX_IMAGE_BYTES).toString('base64')}`;
    await denied(commit([write('personagens/retrato', { ...sample, imagem: retrato })]));
    await denied(commit([write('personagens/retrato', { ...sample, imagem: retrato })], 'outra-conta'));
    await denied(commit([write('personagens/retrato', { ...sample, imagem: 'data:image/svg+xml;base64,PHN2Zz4=' })], adminUid));
    await denied(commit([write('personagens/retrato', { ...sample, imagem: `${retrato}AAAA` })], adminUid));
    await accepted(commit([write('personagens/retrato', { ...sample, imagem: retrato })], adminUid));
    const publicImage = await request(`${base}/personagens/retrato`);
    assert.equal((await publicImage.json()).fields.imagem.stringValue, retrato);
    await accepted(commit([{ delete: `${prefix}/personagens/retrato` }], adminUid));
    const legacy = `data:image/webp;base64,${Buffer.alloc(MAX_LEGACY_IMAGE_BYTES).toString('base64')}`;
    await denied(commit([write('personagens/legado', { ...sample, imagem: legacy })], adminUid));
    // Apenas o emulador aceita 'owner' para simular um documento anterior à regra nova.
    const seedLegacy = await fetch(`${base}:commit`, { method: 'POST', headers: {
        'Content-Type': 'application/json', Authorization: 'Bearer owner'
    }, body: JSON.stringify({ writes: [write('personagens/legado', { ...sample, imagem: legacy })] }) });
    assert.equal(seedLegacy.status, 200);
    const legacyDoc = await (await request(`${base}/personagens/legado`)).json();
    const legacyEdit = { update: { name: legacyDoc.name, fields: { ...legacyDoc.fields, participacoes: { integerValue: '9' } } },
        updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] };
    await accepted(commit([legacyEdit], adminUid));
    await denied(commit([{ ...legacyEdit, update: { ...legacyEdit.update, fields: { ...legacyEdit.update.fields,
        imagem: { stringValue: legacy.replace(/A/, 'B') } } } }], adminUid));
    await accepted(commit([{ ...legacyEdit, update: { ...legacyEdit.update, fields: { ...legacyEdit.update.fields,
        imagem: { stringValue: retrato } } } }], adminUid));
    await accepted(commit([{ delete: `${prefix}/personagens/legado` }], adminUid));

    const imports = data.map((p, index) => write(`personagens/csv-${String(index + 1).padStart(4, '0')}`, p));
    imports.push({ update: { name: `${prefix}/configuracao/importacao`, fields: fields({ total: data.length }) },
        updateTransforms: [{ fieldPath: 'importedAt', setToServerValue: 'REQUEST_TIME' }] });
    await accepted(commit(imports, adminUid));
    const read = await request(`${base}/personagens/csv-0001`);
    assert.equal(read.status, 200, 'O jogo precisa de leitura pública.');
    const stored = await read.json();
    const edit = { update: { name: stored.name, fields: { ...stored.fields, participacoes: { integerValue: '42' } } },
        updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] };
    await denied(commit([edit]));
    await denied(commit([edit], 'outra-conta'));
    await accepted(commit([edit], adminUid));
    assert.equal((await (await request(`${base}/personagens/csv-0001`)).json()).fields.participacoes.integerValue, '42');

    await denied(commit([{ ...edit, update: { ...edit.update, fields: { ...edit.update.fields, ordem: { integerValue: '500' } } } }], adminUid));
    await denied(commit([{ ...edit, updateTransforms: [] }], adminUid));
    await accepted(request(`${base}/configuracao/importacao`));
    await accepted(request(`${base}/configuracao/importacao`, 'outra-conta'));
    await denied(request(`${base}/configuracao/outra`));
    await accepted(request(`${base}/configuracao/importacao`, adminUid));
    await denied(commit([imports.at(-1)], adminUid));
    // Uma gravação válida no personagem também é revertida se a marca já existir.
    await denied(commit([{ ...edit, update: { ...edit.update, fields: {
        ...edit.update.fields, participacoes: { integerValue: '43' }
    } } }, imports.at(-1)], adminUid));
    assert.equal((await (await request(`${base}/personagens/csv-0001`)).json()).fields.participacoes.integerValue, '42', 'Reimportação rejeitada não pode desfazer edições.');
    const deletion = { delete: `${prefix}/personagens/csv-0001` };
    await denied(commit([deletion]));
    await denied(commit([deletion], 'outra-conta'));
    await accepted(commit([deletion], adminUid));
    let pageToken = '', count = 0;
    do {
        const snapshot = await request(`${base}/personagens?pageSize=1000&pageToken=${encodeURIComponent(pageToken)}`);
        assert.equal(snapshot.status, 200);
        const page = await snapshot.json();
        count += (page.documents || []).length;
        pageToken = page.nextPageToken;
    } while (pageToken);
    assert.equal(count, 287);
});
