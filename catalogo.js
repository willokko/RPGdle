import { parseCSV, paraJogo } from './personagens-model.js';

export async function lerPersonagensCSV() {
    const response = await fetch(new URL('./personagens.csv', import.meta.url), { cache: 'no-cache' });
    if (!response.ok) throw new Error('Não foi possível abrir personagens.csv.');
    return parseCSV(await response.text());
}

// O import dinâmico permite abrir o CSV se o Firebase/CDN estiver indisponível.
export async function carregarCatalogo() {
    let timeout;
    try {
        const remoto = async () => {
            const { listarPersonagens } = await import('./personagens-store.js');
            return (await listarPersonagens()).map(paraJogo);
        };
        const personagens = await Promise.race([
            remoto(), new Promise((_, reject) => {
                timeout = setTimeout(() => reject(new Error('Tempo de conexão esgotado.')), 8000);
            })
        ]);
        // Uma coleção vazia é válida; não ressuscitar personagens removidos.
        return { personagens, aviso: personagens.length ? '' : 'Nenhum personagem publicado no momento.' };
    } catch (error) {
        console.warn('Catálogo remoto indisponível. Usando CSV de reserva.', error);
        return {
            personagens: (await lerPersonagensCSV()).map(paraJogo),
            aviso: 'Não foi possível consultar as atualizações. Exibindo a lista de reserva do site; ela pode estar desatualizada.'
        };
    } finally {
        clearTimeout(timeout);
    }
}

export function mostrarAvisoCatalogo(text) {
    const aviso = document.getElementById('catalogo-aviso');
    if (aviso) { aviso.textContent = text; aviso.hidden = !text; }
}
