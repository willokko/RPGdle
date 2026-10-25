import {
    collection, query, orderBy, getDocsFromServer, doc, runTransaction,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase-client.js';
import { validarPersonagem } from './personagens-model.js';

const personagensRef = collection(db, 'personagens');

export async function listarPersonagens() {
    const snapshot = await getDocsFromServer(query(personagensRef, orderBy('ordem')));
    return snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
}

export async function salvarPersonagem(input, anterior = null) {
    const data = validarPersonagem(input);
    const ref = anterior ? doc(personagensRef, anterior.id) : doc(personagensRef);
    await runTransaction(db, async transaction => {
        const atual = await transaction.get(ref);
        if (anterior) {
            if (!atual.exists() || !atual.data().updatedAt.isEqual(anterior.updatedAt)) {
                throw new Error('Este personagem foi alterado em outra aba. Recarregue a lista antes de editar novamente.');
            }
            transaction.update(ref, { ...data, updatedAt: serverTimestamp() });
        } else {
            transaction.set(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        }
    });
    return ref.id;
}

export async function excluirPersonagem(anterior) {
    await runTransaction(db, async transaction => {
        const ref = doc(personagensRef, anterior.id);
        const atual = await transaction.get(ref);
        if (!atual.exists() || !atual.data().updatedAt.isEqual(anterior.updatedAt)) {
            throw new Error('Este personagem foi alterado em outra aba. Recarregue a lista.');
        }
        transaction.delete(ref);
    });
}

// Uma transação importa a base inteira e marca a migração de forma atômica.
// A marca impede reimportações que sobrescreveriam edições posteriores.
export async function importarCSV(personagens) {
    if (!personagens.length || personagens.length > 450) throw new Error('A importação aceita entre 1 e 450 personagens.');
    if ((await listarPersonagens()).length) throw new Error('A importação inicial só pode ser feita com a lista vazia.');
    const data = personagens.map(validarPersonagem);
    await runTransaction(db, async transaction => {
        const marker = doc(db, 'configuracao', 'importacao');
        if ((await transaction.get(marker)).exists()) throw new Error('O CSV inicial já foi importado.');
        data.forEach((personagem, index) => {
            transaction.set(doc(personagensRef, `csv-${String(index + 1).padStart(4, '0')}`), {
                ...personagem, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
            });
        });
        transaction.set(marker, { total: data.length, importedAt: serverTimestamp() });
    });
}
