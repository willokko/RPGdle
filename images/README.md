# Pasta de Imagens dos Personagens

Esta pasta contém as imagens dos personagens do RPGdle.

## Como adicionar imagens

1. **Adicione a imagem** nesta pasta (`images/`)
   - Formatos aceitos: JPG, PNG, SVG, GIF, WebP
   - Recomendado: imagens quadradas (ex: 200x200px)
   - Nome sugerido: use o nome do personagem (ex: `arion.jpg`, `lirael.png`)

2. **Atualize o CSV** (`personagens.csv`)
   - Na coluna "Imagem", adicione **APENAS o nome do arquivo**
   - ✅ Correto: `"arion.jpg"` ou `"lirael.png"`
   - ❌ Errado: `"images/arion.jpg"` (não precisa do caminho!)
   - Se deixar vazio `""`, será usado o placeholder padrão

## Exemplo de linha no CSV

```csv
"Arion","Homem","Bruno","A Queda do Rei Sombrio","Ativo","35","28","185","arion.jpg"
```

**Nota:** O código adiciona automaticamente o prefixo `images/` para você!

## Placeholder

O arquivo `placeholder.svg` é usado automaticamente quando nenhuma imagem é especificada.
Você pode substituí-lo por sua própria imagem padrão.

## Dicas

- Use imagens de boa qualidade mas não muito pesadas (recomendado: < 500KB)
- Mantenha um padrão visual entre as imagens
- Imagens circulares ficam melhores na biblioteca
- Imagens quadradas ficam melhores no grid do jogo
