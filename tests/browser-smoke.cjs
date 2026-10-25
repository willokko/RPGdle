// Teste local: SDK real, regras reais no emulador e login simulado.
// Não usa senhas nem escreve no projeto de produção.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const emulator = 'http://127.0.0.1:8087';
const uid = 'wdhM824nJ9V7u2AHYXxz3CaG5VJ2';
const project = 'demo-rpgdle';
const password = 'senha-apenas-do-teste-local';
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.csv': 'text/csv', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const server = http.createServer(async (request, response) => {
    try {
        const url = new URL(request.url, 'http://localhost');
        const relative = decodeURIComponent(url.pathname).replace(/^\/RPGdle\//, '');
        const file = path.resolve(root, relative);
        if (!file.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
        const data = await fs.readFile(file);
        response.setHeader('Content-Type', mime[path.extname(file)] || 'text/plain');
        response.end(data);
    } catch { response.writeHead(404).end(); }
});

(async () => {
    const reset = await fetch(`${emulator}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    assert.equal(reset.status, 200);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/RPGdle/`;
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const context = await browser.newContext();
    const errors = [];
    context.on('page', page => {
        page.on('pageerror', error => errors.push(error.message));
        page.on('dialog', dialog => dialog.accept());
    });
    try {
        await context.route('**/firebase-config.js', route => route.fulfill({ contentType: 'application/javascript', body:
            `export const firebaseConfig = {apiKey:'local-test-key',projectId:'${project}',appId:'local-test-app'};
             export const ADMIN_EMAIL='admin@example.com'; export const ADMIN_UID='${uid}';` }));
        await context.route('**/firebase-client.js', async route => {
            const source = await fs.readFile(path.join(root, 'firebase-client.js'), 'utf8');
            await route.fulfill({ contentType: 'application/javascript', body: source +
                `\nimport { connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
                connectFirestoreEmulator(db,'127.0.0.1',8087,{mockUserToken:{sub:'${uid}'}});` });
        });
        await context.route('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js', route => route.fulfill({ contentType: 'application/javascript', body:
            `let listener;
             export const getAuth=()=>({}); export const browserSessionPersistence={};
             export const setPersistence=async()=>{};
             export function onAuthStateChanged(auth,callback){listener=callback;setTimeout(()=>callback(sessionStorage.getItem('test-login')?{uid:'${uid}'}:null),0);}
             export async function signInWithEmailAndPassword(auth,email,password){if(password!=='${password}')throw Object.assign(new Error('Senha incorreta'),{code:'auth/invalid-credential'});sessionStorage.setItem('test-login','yes');setTimeout(()=>listener({uid:'${uid}'}),0);}
             export async function signOut(){sessionStorage.removeItem('test-login');listener(null);}` }));
        // Nenhum serviço Firebase externo, além da CDN oficial, deve ser acessado.
        await context.route(/https:\/\/(?!www\.gstatic\.com\/).*(googleapis\.com|firebaseio\.com)/, route => {
            errors.push(`Tentativa de acessar serviço externo: ${route.request().url()}`);
            return route.abort();
        });

        const page = await context.newPage();
        page.setDefaultTimeout(20000);
        await page.goto(`${base}admin.html`);
        await page.locator('#login-panel').waitFor({ state: 'visible' });
        await page.locator('#admin-password').fill('incorreta');
        await page.locator('#login-button').click();
        await page.getByText('Senha incorreta. Tente novamente.', { exact: true }).waitFor();
        await page.locator('#admin-password').fill(password);
        await page.locator('#login-button').click();
        await page.locator('#admin-panel').waitFor({ state: 'visible' });
        await page.locator('#new-button').waitFor({ state: 'visible' });
        await page.waitForFunction(() => !document.getElementById('new-button').disabled);
        assert.equal(await page.locator('#character-count').innerText(), '0');
        await page.locator('summary').click();
        await page.locator('#import-button').click();
        await page.getByText('288 personagens importados. Você já pode editar pelo painel.', { exact: true }).waitFor();
        await page.waitForFunction(() => document.getElementById('character-count').textContent === '288');
        assert.equal(await page.locator('#import-button').isDisabled(), true);
        console.log('OK: senha, importação inicial, 288 registros e bloqueio de reimportação.');

        const jogo = await context.newPage();
        await jogo.goto(`${base}index.html`);
        await jogo.waitForFunction(() => !document.getElementById('guess-input').disabled);
        assert.equal(await jogo.locator('#catalogo-aviso').isHidden(), true);
        await jogo.locator('#guess-input').fill('Adam');
        await jogo.getByText('Adam', { exact: true }).click();
        await jogo.locator('#guess-button').click();
        assert.equal(await jogo.locator('.guess-row').count(), 1);
        await jogo.reload();
        await jogo.locator('.guess-row').waitFor();
        await jogo.locator('#easy-mode-button').click();
        await jogo.waitForFunction(() => document.querySelector('#easy-mode-button.active'));
        console.log('OK: carregamento remoto, palpite, restauração de progresso e modo fácil.');

        await page.locator('#new-button').click();
        const values = { nome: 'Teste <b>seguro</b>', genero: 'Mulher', player: 'Teste', rpg: 'Campanha de teste', estado: 'Ativo', participacoes: '5', altura: '181' };
        for (const [name, value] of Object.entries(values)) await page.locator(`[name="${name}"]`).fill(value);
        await page.locator('#age-kind').selectOption('number');
        await page.locator('[name="idade"]').fill('19');
        await page.getByRole('button', { name: 'Salvar personagem', exact: true }).click();
        await page.waitForFunction(() => document.getElementById('character-count').textContent === '289');
        await page.locator('#character-search').fill('Teste <b>');
        await page.getByRole('button', { name: 'Editar Teste <b>seguro</b>', exact: true }).click();
        await page.locator('#participation-plus').click();
        await page.locator('#age-kind').selectOption('indefinite');
        await page.getByRole('button', { name: 'Salvar personagem', exact: true }).click();
        await page.waitForFunction(() => document.getElementById('character-list').textContent.includes('6 participações'));

        const biblioteca = await context.newPage();
        await biblioteca.goto(`${base}biblioteca.html`);
        await biblioteca.waitForFunction(() => document.querySelectorAll('.character-card').length === 289);
        assert.equal(await biblioteca.locator('h3').filter({ hasText: 'Teste <b>seguro</b>' }).count(), 1);
        assert.equal(await biblioteca.locator('.character-card b').count(), 0);
        await biblioteca.locator('#rpg-filter').selectOption('Campanha de teste');
        assert.equal(await biblioteca.locator('.character-card').count(), 1);
        assert.ok((await biblioteca.locator('.character-card').innerText()).includes('Indefinido'));
        console.log('OK: cadastro, edição, participações, idade indefinida, filtro e texto seguro.');

        // Duas abas editam a mesma versão: a segunda gravação deve ser rejeitada.
        await page.getByRole('button', { name: 'Editar Teste <b>seguro</b>', exact: true }).click();
        const segunda = await context.newPage();
        await segunda.goto(`${base}admin.html`);
        await segunda.locator('#login-panel').waitFor({ state: 'visible' });
        await segunda.locator('#admin-password').fill(password);
        await segunda.locator('#login-button').click();
        await segunda.waitForFunction(() => document.getElementById('character-count').textContent === '289');
        await segunda.locator('#character-search').fill('Teste <b>');
        await segunda.getByRole('button', { name: 'Editar Teste <b>seguro</b>', exact: true }).click();
        await segunda.locator('#participation-plus').click();
        await segunda.getByRole('button', { name: 'Salvar personagem', exact: true }).click();
        await segunda.waitForFunction(() => document.getElementById('character-list').textContent.includes('7 participações'));
        await page.locator('#participation-plus').click();
        await page.getByRole('button', { name: 'Salvar personagem', exact: true }).click();
        await page.getByText('Este personagem foi alterado em outra aba. Recarregue a lista antes de editar novamente.', { exact: true }).waitFor();
        await page.locator('#reload-button').click();
        await page.getByText('Lista atualizada.', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Editar Teste <b>seguro</b>', exact: true }).click();
        await page.locator('#delete-button').click();
        await page.waitForFunction(() => document.getElementById('character-count').textContent === '288');
        await page.locator('#logout-button').click();
        await page.locator('#login-panel').waitFor({ state: 'visible' });
        console.log('OK: conflito entre abas, exclusão confirmada e saída.');

        // Uma falha remota usa o CSV com aviso explícito.
        const fallback = await context.newPage();
        await fallback.route('**/personagens-store.js', route => route.abort());
        await fallback.goto(`${base}biblioteca.html`);
        await fallback.locator('#catalogo-aviso').waitFor({ state: 'visible' });
        await fallback.waitForFunction(() => document.querySelectorAll('.character-card').length === 288);
        console.log('OK: falha de conexão mantém CSV de reserva com aviso.');

        // Coleção vazia após leitura bem-sucedida não recupera personagens do CSV.
        const empty = await context.newPage();
        await empty.route('**/personagens-store.js', route => route.fulfill({ contentType: 'application/javascript', body: 'export const listarPersonagens = async () => [];' }));
        await empty.goto(`${base}biblioteca.html`);
        await empty.getByText('Nenhum personagem publicado no momento.', { exact: true }).waitFor();
        assert.equal(await empty.locator('.character-card').count(), 0);

        const mobile = await context.newPage();
        await mobile.setViewportSize({ width: 390, height: 844 });
        await mobile.goto(`${base}admin.html`);
        await mobile.locator('#login-panel').waitFor({ state: 'visible' });
        await mobile.locator('#admin-password').fill(password);
        await mobile.locator('#login-button').click();
        await mobile.waitForFunction(() => document.getElementById('character-count').textContent === '288');
        assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        if (process.env.SCREENSHOT_DIR) {
            await fs.mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
            await mobile.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'admin-mobile.png'), fullPage: true });
            await mobile.setViewportSize({ width: 1366, height: 1000 });
            await mobile.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'admin-desktop.png'), fullPage: true });
        }
        assert.deepEqual(errors, []);
        console.log('OK: lista vazia, layout móvel sem overflow e nenhum erro JavaScript.');
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
