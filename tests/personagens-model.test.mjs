import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCSV, lerCSV, caminhoImagem, validarPersonagem, paraJogo } from '../personagens-model.js';

const csv = await readFile(new URL('../personagens.csv', import.meta.url), 'utf8');
const personagens = parseCSV(csv);

test('importa o catálogo completo, preservando nomes, imagens e ordem original', () => {
    assert.equal(personagens.length, 288);
    const rows = lerCSV(csv).slice(1);
    personagens.forEach((p, index) => {
        assert.equal(p.nome, rows[index][0]);
        assert.equal(p.ordem, index);
        assert.equal(p.imagem, caminhoImagem(rows[index][8]));
        assert.deepEqual(validarPersonagem(p), p);
    });
    assert.equal(personagens[0].altura, 169);
});

test('conserva os valores especiais que o jogo já utiliza', () => {
    for (const row of lerCSV(csv).slice(1)) {
        const p = personagens.find(p => p.nome === row[0]);
        const jogo = paraJogo(p);
        if (row[5] === '20+') assert.equal(jogo.Participações, 20);
        if (row[6] === 'Indefinido') assert.equal(jogo.Idade, Infinity);
        if (row[6] === 'Desconhecido' || row[6] === '') assert.equal(jogo.Idade, null);
        if (['Variável', 'Indefinido', ''].includes(row[7])) assert.equal(jogo.Altura, null);
    }
    assert.ok(personagens.some(p => p.idade === 'Indefinido'));
});

test('CSV aceita aspas escapadas, campos multilinha, vírgulas e BOM', () => {
    const parsed = lerCSV('\uFEFFPersonagem,RPG\r\n"A ""B""","Uma, campanha\nlonga"\r\n');
    assert.deepEqual(parsed, [['Personagem', 'RPG'], ['A "B"', 'Uma, campanha\nlonga']]);
    assert.throws(() => lerCSV('"aspas abertas'), /aspas/);
});

test('imagens aceitam caminhos do GitHub Pages e HTTPS, rejeitando caminhos inseguros', () => {
    assert.equal(caminhoImagem('Adam.jpg'), 'images/Adam.jpg');
    assert.equal(caminhoImagem('./images/Adam.jpg'), 'images/Adam.jpg');
    assert.equal(caminhoImagem(''), 'images/placeholder.svg');
    assert.equal(caminhoImagem('https://example.com/a.png'), 'https://example.com/a.png');
    for (const invalid of ['../a.png', '/a.png', 'javascript:alert(1)', 'data:image/svg+xml,a', 'x" onerror="a', 'https://user:secret@example.com/a.png']) {
        assert.throws(() => caminhoImagem(invalid));
    }
});

test('validação impede dados incompletos, números inválidos e idades negativas', () => {
    const original = personagens[0];
    for (const change of [{ nome: '' }, { estado: '' }, { participacoes: -1 }, { idade: -1 }, { altura: NaN }, { participacoes: 1.5 }, { ordem: Infinity }]) {
        assert.throws(() => validarPersonagem({ ...original, ...change }));
    }
    assert.equal(validarPersonagem({ ...original, idade: 0 }).idade, 0);
});
