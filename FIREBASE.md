# Administração do RPGdle

O site continua no GitHub Pages. Os dados ficam no Cloud Firestore `(default)` do projeto `rpgdle`, região `nam5`. As imagens continuam na pasta `images/`. Não é necessário ativar Storage, Analytics ou Cloud Functions.

## Ativar a integração

1. No Firebase, confirme que **Authentication → Método de login → E-mail/senha** está ativo e que a conta administrativa informada existe. O painel usa seu e-mail internamente e solicita somente a senha. Nunca coloque a senha no código.
2. Abra **Firestore Database → Regras**, substitua o conteúdo pelo arquivo [firestore.rules](firestore.rules) e clique em **Publicar**. As regras liberam leitura pública somente dos personagens e escrita somente para o UID administrativo. Estar logado em outra conta não dá acesso.
3. Publique os arquivos deste projeto no GitHub Pages pelo fluxo habitual. A integração usa módulos JavaScript e o SDK oficial via CDN; não exige build ou instalação de pacotes.
4. Acesse `https://willokko.github.io/RPGdle/admin.html` e entre com a senha definida no Firebase.
5. Antes de cadastrar personagens novos, abra **Primeiro acesso e imagens** e clique em **Importar personagens do CSV**. Confirme a importação. Os 288 personagens são importados em uma única transação, na mesma ordem do CSV. Se houver erro, a transação inteira é desfeita. A importação só pode ser concluída uma vez e exige uma coleção vazia.
6. Abra o jogo e a biblioteca para conferir os dados. Eles consultam o Firestore ao carregar a página. Páginas já abertas precisam ser recarregadas para receber alterações.

As regras também podem ser publicadas por quem tem acesso ao projeto usando a Firebase CLI: `firebase deploy --only firestore:rules --project rpgdle`. Isso publica somente as regras, sem alterar a hospedagem do GitHub Pages.

## Administrar personagens

- Use a busca por nome, RPG ou player e clique em **Editar**.
- O botão **+1** ajusta participações no formulário; clique em **Salvar personagem** para publicar.
- **Novo personagem** abre um cadastro. Nomes devem ser únicos, pois o jogo identifica palpites e histórico pelo nome.
- Idade pode ser conhecida, desconhecida ou indefinida. Altura é cadastrada em centímetros, ou pode ficar vazia. A importação mantém o significado de `Indefinido`, `Desconhecido`, `Variável` e `20+` usado no CSV original.
- Para novas imagens, envie o arquivo à pasta `images/` do repositório e aguarde a publicação do GitHub Pages. Informe `Adam.jpg` ou `images/Adam.jpg`. A prévia ajuda a conferir o caminho. Também é possível informar uma URL HTTPS.
- Excluir um personagem exige confirmação e não remove sua imagem do GitHub. A imagem pode ser reutilizada por outros personagens.
- Edições concorrentes no mesmo personagem são rejeitadas para evitar sobrescrever alterações de outra aba. Recarregue a lista e edite novamente.
- A sessão administrativa dura a sessão da aba. Use **Sair** em computadores compartilhados.

O painel não aparece nos menus do jogo ou da biblioteca. O endereço não é segredo: a proteção efetiva está nas regras do Firestore. O e-mail, o UID e o `firebaseConfig` são configurações públicas, não senhas. Caso troque a conta administrativa, atualize o UID tanto em `firebase-config.js` quanto em `firestore.rules`, e publique ambos.

## Sorteio e disponibilidade

A ordem inicial do CSV é preservada pelo campo `ordem`. Editar atributos não reordena personagens. Cadastros, exclusões, renomeações e mudanças de participação podem afetar o sorteio e os históricos existentes, especialmente no modo fácil. Prefira esses ajustes entre os dias de jogo. A lógica anterior de sorteio e histórico local foi mantida.

Se o Firebase estiver sem conexão, com regras ainda bloqueadas ou demorar mais de oito segundos, o jogo e a biblioteca tentam abrir o CSV antigo e mostram um aviso de que a lista pode estar desatualizada. O CSV não recebe as edições feitas no painel. Se a leitura do banco funcionar e a lista estiver vazia, a página mostra que não há personagens; não recupera personagens excluídos do CSV.

O painel nunca grava no CSV de reserva nem tenta salvar alterações offline. Erros de permissão ou conexão são exibidos, e o formulário fica disponível para tentar de novo. Sem conseguir ler a lista inicial, os cadastros ficam bloqueados para evitar iniciar uma base parcial.

## Verificações locais

- Modelo e importação: `node --test tests/personagens-model.test.mjs`.
- Regras: execute o emulador do Firestore no projeto fictício `demo-rpgdle` e porta `8087`, usando `firestore.rules`. Depois execute `node --test tests/firestore-rules.test.mjs`. O teste se recusa a usar qualquer host externo ou outro projeto.
- Navegador: com Playwright disponível e Chrome instalado, execute `node tests/browser-smoke.cjs` enquanto o emulador estiver aberto. Opcionalmente configure `PLAYWRIGHT_MODULE` com o caminho da biblioteca e `SCREENSHOT_DIR` para salvar capturas. Esse teste usa o SDK oficial e o emulador, com login simulado e sem credenciais reais. Não rode simultaneamente com o teste de regras: ambos limpam somente o banco fictício local.
- Para abrir as páginas localmente: `node tmp_server.js`, depois acesse `http://localhost:8000/admin.html`. Abrir o HTML diretamente como `file://` não funciona com módulos JavaScript.

Os testes de regras usam somente o emulador e não acessam o banco real.
