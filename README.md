# 🎲 RPGdle

Um jogo de adivinhação diário inspirado em Wordle, Pokedle e Loldle, onde você tenta adivinhar um personagem de RPG secreto baseado em seus atributos!

## 📋 Sobre o Projeto

RPGdle é um jogo web interativo onde os jogadores têm 10 tentativas para adivinhar o personagem de RPG do dia. A cada palpite, o jogo fornece feedback visual comparando os atributos do personagem palpitado com o personagem secreto.

## ✨ Funcionalidades

### 🎮 Página do Jogo (index.html)
- **Personagem Diário**: Um novo personagem é selecionado automaticamente a cada dia
- **Sistema de Tentativas**: 10 tentativas para adivinhar o personagem correto
- **Autocomplete Inteligente**: Sugestões de personagens conforme você digita
- **Feedback Visual**:
  - 🟢 **Verde**: Atributo correto
  - 🔴 **Vermelho**: Atributo incorreto
  - ⬆️ **Seta para cima**: O valor correto é maior
  - ⬇️ **Seta para baixo**: O valor correto é menor
- **Persistência de Estado**: Seu progresso é salvo automaticamente
- **Modal de Vitória/Derrota**: Feedback ao final do jogo

### 📚 Biblioteca de Personagens (biblioteca.html)
- **Visualização Completa**: Veja todos os personagens disponíveis
- **Filtro por RPG**: Filtre personagens por campanha
- **Cards Informativos**: Todos os atributos exibidos de forma clara
- **Design Responsivo**: Funciona perfeitamente em dispositivos móveis

## 🎯 Atributos Comparados

1. **Gênero** (Categórico)
2. **Player** (Categórico)
3. **RPG** (Categórico)
4. **Estado** (Categórico)
5. **Participações** (Numérico - com setas)
6. **Idade** (Numérico - com setas)
7. **Altura** (Numérico - com setas)

## 🚀 Como Usar

1. **Abra o arquivo `index.html`** em seu navegador
2. **Digite o nome de um personagem** no campo de entrada
3. **Clique em "Adivinhar"** ou pressione Enter
4. **Analise o feedback** para fazer seu próximo palpite
5. **Visite a Biblioteca** para estudar os personagens disponíveis

## 📁 Estrutura de Arquivos

```
RPGdle/
├── index.html          # Página principal do jogo
├── biblioteca.html     # Página da biblioteca de personagens
├── style.css          # Estilos globais
├── app.js             # Lógica do jogo
├── biblioteca.js      # Lógica da biblioteca
├── personagens.json   # Base de dados dos personagens
└── README.md          # Este arquivo
```

## 🎨 Tecnologias Utilizadas

- **HTML5**: Estrutura semântica
- **CSS3**: Estilização moderna com gradientes e animações
- **JavaScript (Vanilla)**: Lógica do jogo sem dependências
- **LocalStorage**: Persistência de dados do jogo

## 📝 Formato do JSON

```json
[
  {
    "id": 1,
    "Nome": "Arion",
    "Gênero": "Homem",
    "Player": "Bruno",
    "RPG": "A Queda do Rei Sombrio",
    "Estado": "Ativo",
    "Participações": 35,
    "Idade": 28,
    "Altura": 185
  }
]
```

## 🔧 Personalização

Para adicionar seus próprios personagens, edite o arquivo `personagens.json` seguindo o formato acima. O jogo carregará automaticamente os novos dados.

## 🎲 Como Funciona o Personagem do Dia

O personagem do dia é selecionado usando a data atual como seed, garantindo que:
- Todos os jogadores vejam o mesmo personagem no mesmo dia
- Um novo personagem seja selecionado automaticamente à meia-noite
- A seleção seja determinística e consistente

## 📱 Responsividade

O jogo é totalmente responsivo e se adapta a diferentes tamanhos de tela:
- Desktop: Layout completo com grid de 7 colunas
- Mobile: Layout otimizado com células menores

## 🎯 Dicas para Jogar

1. Visite a **Biblioteca** antes de jogar para conhecer os personagens
2. Preste atenção nas **setas** dos valores numéricos
3. Use o **autocomplete** para evitar erros de digitação
4. Analise os **padrões** entre os palpites anteriores

## 🏆 Objetivo

Adivinhe o personagem correto em até 10 tentativas usando a lógica dedutiva baseada nos feedbacks visuais!

---

**Divirta-se jogando RPGdle! 🎮✨**