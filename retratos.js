import { MAX_IMAGE_BYTES, validarImagemIncorporada } from './personagens-model.js';

const MAX_DIMENSION = 512;
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
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    if (!longest || image.naturalWidth * image.naturalHeight > 40000000) throw new Error('Essa imagem tem dimensões muito grandes. Escolha uma versão menor.');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Este navegador não conseguiu preparar a imagem.');
    let dimension = Math.min(MAX_DIMENSION, longest);
    while (dimension >= 1) {
        const scale = dimension / longest;
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.86, 0.72, 0.58, 0.44, 0.30]) {
            const blob = await codificar(canvas, quality);
            if (blob.size <= MAX_IMAGE_BYTES) {
                return {
                    dataURL: validarImagemIncorporada(await lerDataURL(blob)),
                    bytes: blob.size, width: canvas.width, height: canvas.height
                };
            }
            // Browsers sem suporte a WebP retornam PNG e ignoram quality.
            if (blob.type !== 'image/webp') break;
        }
        dimension = Math.floor(dimension * 0.8);
    }
    throw new Error('Não foi possível reduzir esse retrato para 64 KiB. Escolha outra imagem.');
}
