# RPGdle - Instruções de Uso

## ✅ Correções Implementadas

### 1. Sistema de Imagens
- Coluna "Imagem" adicionada ao CSV
- Suporte para imagens nos personagens
- Fallback automático para placeholder quando imagem não carrega
- Tratamento de erro em todas as imagens

### 2. Layout Responsivo Corrigido
- Grid ajustado para incluir coluna de imagem (80px)
- Responsividade melhorada para mobile e desktop
- Scroll horizontal funcional em telas pequenas
- Tamanhos adaptáveis:
  - Desktop: Imagem 60x60px
  - Tablet (768px): Imagem 50x50px
  - Mobile (480px): Imagem 45x45px

### 3. Estrutura do Grid
```
Desktop: [Imagem 80px] [Nome 120px] [7 colunas de 90px cada]
Tablet:  [Imagem 70px] [Nome 100px] [7 colunas de 85px cada]
Mobile:  [Imagem 60px] [Nome 90px]  [7 colunas de 75px cada]
```

## 🧪 Como Testar

### Teste Rápido de Imagens
1. Abra `test.html` no navegador
2. Verifique se:
   - Placeholder SVG aparece
   - Imagem joao.jpg carrega
   - Mensagem de status aparece

### Teste do Jogo
1. Abra `index.html` no navegador
2. Abra o Console (F12)
3. Verifique os logs:
   - "Personagens carregados: X"
   - "Exemplo de personagem com imagem: Emanuelle images/joao.jpg"
4. Digite "Emanuelle" no campo de busca
5. A imagem deve aparecer no autocomplete
6. Faça o palpite e veja a imagem no grid

### Teste da Biblioteca
1. Abra `biblioteca.html`
2. Verifique se a imagem aparece no card de Emanuelle
3. Teste o hover - a imagem deve dar zoom

## 📝 Como Adicionar Novas Imagens

1. **Coloque a imagem na pasta `images/`**
   ```
   images/
   ├── joao.jpg
   ├── maria.png
   └── placeholder.svg
   ```

2. **Atualize o CSV (APENAS o nome do arquivo!)**
   ```csv
   "Emanuelle","Mulher","Will","Promessa de Galli","Ativo","","25","1,85m","joao.jpg"
   "Maria","Mulher","Ana","RPG X","Ativo","10","30","1,70m","maria.png"
   ```
   
   ⚠️ **IMPORTANTE:** Não coloque `"images/joao.jpg"`, apenas `"joao.jpg"`!
   O código adiciona o caminho automaticamente.

3. **Formatos aceitos**: JPG, PNG, SVG, GIF, WebP

## 🔧 Solução de Problemas

### Imagem não aparece?
1. Verifique se o arquivo existe em `images/`
2. Verifique o nome no CSV (case-sensitive)
3. Abra o Console e veja se há erros
4. Teste com `test.html`

### Layout quebrado?
1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Verifique se o CSS foi atualizado
3. Teste em modo anônimo

### Grid não rola em mobile?
1. O grid deve ter scroll horizontal automático
2. Veja a seta → indicando que pode rolar
3. Arraste horizontalmente

## 📱 Responsividade

O site agora funciona perfeitamente em:
- ✅ Desktop (1200px+)
- ✅ Tablet (768px - 1024px)
- ✅ Mobile (480px - 768px)
- ✅ Mobile pequeno (< 480px)

Todas as imagens se adaptam automaticamente ao tamanho da tela.
