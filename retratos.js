import { MAX_IMAGE_BYTES, validarImagemIncorporada } from './personagens-model.js';

export const MAX_IMAGE_DIMENSION = 320;
export const TARGET_IMAGE_BYTES = 16 * 1024;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function carregarImagem(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
        image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível abrir essa imagem. Escolha outro arquivo JPG, PNG ou WebP.')); };
        image.src = url;
    });
}

function codificar(canvas, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Não foi possível reduzir a imagem.')), 'image/webp', quality);
    });
}

function lerDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Não foi possível preparar o retrato.'));
        reader.readAsDataURL(blob);
    });
}

// Cada tentativa parte da imagem original, sem acumular perdas de compressão.
export async function prepararRetrato(file) {
    if (!INPUT_TYPES.has(file.type)) throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
    if (!file.size || file.size > MAX_INPUT_BYTES) throw new Error('Escolha um arquivo de imagem com até 15 MiB.');
    const image = await carregarImagem(file);
    return compactar(image, file);
}

export async function compactarRetratoExistente(dataURL) {
    validarImagemIncorporada(dataURL);
    const response = await fetch(dataURL);
    return prepararRetrato(await response.blob());
}

async function compactar(image, file) {
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    if (!longest || image.naturalWidth * image.naturalHeight > 40000000) throw new Error('Essa imagem tem dimensões muito grandes. Escolha uma versão menor.');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Este navegador não conseguiu preparar a imagem.');
    // Não recomprimir repetidamente um retrato que já está dentro da meta.
    if (longest <= MAX_IMAGE_DIMENSION && file.size <= TARGET_IMAGE_BYTES) {
        return resultado(await lerDataURL(file), file.size, image.naturalWidth, image.naturalHeight, file.size);
    }
    let dimension = Math.min(MAX_IMAGE_DIMENSION, longest);
    let candidate = null;
    while (dimension >= 1) {
        const scale = dimension / longest;
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.80, 0.70, 0.60, 0.50]) {
            const blob = await codificar(canvas, quality);
            if (blob.size <= MAX_IMAGE_BYTES) {
                candidate = { blob, width: canvas.width, height: canvas.height };
                if (blob.size <= TARGET_IMAGE_BYTES) {
                    const dataURL = await lerDataURL(blob);
                    return resultado(dataURL, blob.size, canvas.width, canvas.height, file.size);
                }
            }
            // Browsers sem suporte a WebP retornam PNG e ignoram quality.
            if (blob.type !== 'image/webp') break;
        }
        dimension = Math.floor(dimension * 0.8);
    }
    if (candidate) {
        const { blob, width, height } = candidate;
        return resultado(await lerDataURL(blob), blob.size, width, height, file.size);
    }
    throw new Error('Não foi possível reduzir esse retrato para 24 KiB. Escolha outra imagem.');
}

function resultado(dataURL, bytes, width, height, sourceBytes) {
    return { dataURL: validarImagemIncorporada(dataURL, MAX_IMAGE_BYTES), bytes, width, height,
        sourceBytes, storedBytes: dataURL.length };
}
