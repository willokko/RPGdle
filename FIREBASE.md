# Administração do RPGdle

O site continua no GitHub Pages. Os dados ficam no Cloud Firestore `(default)` do projeto `rpgdle`, região `nam5`. Retratos podem ser enviados pelo painel e incorporados ao documento do personagem. Imagens da pasta `images/` e URLs HTTPS continuam funcionando. Não é necessário ativar Storage, Analytics ou Cloud Functions.

## Ativar a integração

1. No Firebase, confirme que **Authentication → Método de login → E-mail/senha** está ativo e que a conta administrativa informada existe. O painel usa seu e-mail internamente e solicita somente a senha. Nunca coloque a senha no código.
2. Abra **Firestore Database → Regras**, substitua o conteúdo pelo arquivo [firestore.rules](firestore.rules) e clique em **Publicar**. As regras liberam leitura pública dos personagens e da marca de importação (somente total e data), e escrita somente para o UID administrativo. Estar logado em outra conta não dá acesso. Se já publicou a versão anterior das regras, publique novamente para habilitar retratos incorporados.
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
- Para novas imagens, use **Enviar retrato do dispositivo**, confira a prévia e clique em **Salvar personagem**. O navegador reduz JPG, PNG ou WebP para até 320 pixels no maior lado, buscando 16 KiB e respeitando o limite de 24 KiB, preservando a proporção. Quando precisa recomprimir, usa WebP e ajusta qualidade e resolução até atingir a meta. Arquivos já pequenos são reaproveitados para evitar perda repetida de qualidade. O arquivo original pode ter até 15 MiB. A gravação só é confirmada depois que o Firestore aceita a transação.
- Em **Primeiro acesso e imagens → Compactar retratos existentes**, é possível otimizar os retratos incorporados no banco. A operação pede confirmação, processa um personagem por vez e salva somente versões menores. O resumo mostra quantos retratos foram alterados, a economia de texto Base64 e eventuais falhas. Não baixa nem altera imagens do GitHub ou URLs externas. Se outra aba editar um personagem durante a compactação, a transação não sobrescreve essa edição. Em caso de falha parcial, rode novamente: os retratos já otimizados não são regravados.
- Também pode continuar publicando imagens em `images/` pelo GitHub e informar `Adam.jpg`, `images/Adam.jpg` ou uma URL HTTPS. Digitar um caminho substitui o retrato selecionado. **Remover imagem** usa o placeholder ao salvar. Alterações de imagem são mantidas apenas no formulário até serem salvas; a prévia não confirma gravação na nuvem.
- Excluir um personagem exige confirmação e não remove sua imagem do GitHub. A imagem pode ser reutilizada por outros personagens.
- Edições concorrentes no mesmo personagem são rejeitadas para evitar sobrescrever alterações de outra aba. Recarregue a lista e edite novamente.
- A sessão administrativa dura a sessão da aba. Use **Sair** em computadores compartilhados.

O painel não aparece nos menus do jogo ou da biblioteca. O endereço não é segredo: a proteção efetiva está nas regras do Firestore. O e-mail, o UID e o `firebaseConfig` são configurações públicas, não senhas. Caso troque a conta administrativa, atualize o UID tanto em `firebase-config.js` quanto em `firestore.rules`, e publique ambos.

## Sorteio e disponibilidade

A ordem inicial do CSV é preservada pelo campo `ordem`. Editar atributos não reordena personagens. Cadastros, exclusões, renomeações e mudanças de participação podem afetar o sorteio e os históricos existentes, especialmente no modo fácil. Prefira esses ajustes entre os dias de jogo. A lógica anterior de sorteio e histórico local foi mantida.

Enquanto o banco estiver vazio e a primeira importação não tiver sido concluída, o jogo e a biblioteca continuam mostrando os 288 personagens originais do CSV, com aviso de catálogo em preparação. A marca pública `configuracao/importacao` distingue esse caso de uma exclusão intencional de todos os personagens depois da migração.

Se o Firebase estiver sem conexão, com regras ainda bloqueadas ou demorar mais de oito segundos, o jogo e a biblioteca tentam abrir o CSV antigo e mostram um aviso de que a lista pode estar desatualizada. O CSV não recebe as edições feitas no painel. Se a leitura do banco funcionar, a importação já tiver sido concluída e a lista estiver vazia, a página mostra que não há personagens; não recupera personagens excluídos do CSV.

O painel nunca grava no CSV de reserva nem tenta salvar alterações offline. Erros de permissão ou conexão são exibidos, e o formulário fica disponível para tentar de novo. Sem conseguir ler a lista inicial, os cadastros ficam bloqueados para evitar iniciar uma base parcial.

## Retratos incorporados e índices

O retrato é salvo como uma Data URL Base64 no campo `imagem`, sem duplicá-lo em campos adicionais. A meta de 16 KiB e o limite de 24 KiB valem para o arquivo comprimido; a codificação Base64 ocupa até aproximadamente 32 KiB no documento, contra cerca de 86 KiB do limite anterior. Isso fica abaixo do [limite de 1 MiB por documento](https://firebase.google.com/docs/firestore/quotas), mas conta nas cotas de armazenamento e transferência. A prévia informa o tamanho do texto que será salvo no banco. O catálogo lê os retratos junto dos personagens ao abrir cada página. Compactar imagens não reduz a quantidade de leituras dos documentos.

As regras aceitam novas Data URLs somente de JPEG, PNG e WebP e limitam o texto a 32.791 caracteres. Retratos antigos de até 87.407 caracteres continuam legíveis e podem ser preservados sem alterações ao editar outros campos; copiar ou substituir uma imagem exige respeitar o novo limite. O formulário também compacta automaticamente o retrato incorporado ao salvar o personagem. SVG incorporado, HTML e textos maiores são rejeitados. O navegador valida Base64 e o tamanho decodificado antes de salvar. Os caminhos e URLs antigos continuam limitados a 2.000 caracteres. Publique novamente o arquivo de regras para aplicar o limite menor no servidor.

O arquivo [firestore.indexes.json](firestore.indexes.json) desativa índices automáticos somente do campo `imagem` da coleção `personagens`, seguindo a [recomendação para campos de texto grandes que não são consultados](https://firebase.google.com/docs/firestore/best-practices). Essa otimização pode ser publicada com `firebase deploy --only firestore:indexes --project rpgdle`, ou configurada no console como uma isenção de índice de campo único para `personagens.imagem`. Ela não é necessária para exibir os retratos.

## Verificações locais

- Modelo e importação: `node --test tests/personagens-model.test.mjs`.
- Regras: execute o emulador do Firestore no projeto fictício `demo-rpgdle` e porta `8087`, usando `firestore.rules`. Depois execute `node --test tests/firestore-rules.test.mjs`. O teste se recusa a usar qualquer host externo ou outro projeto.
- Navegador: com Playwright disponível e Chrome instalado, execute `node tests/browser-smoke.cjs` enquanto o emulador estiver aberto. Opcionalmente configure `PLAYWRIGHT_MODULE` com o caminho da biblioteca e `SCREENSHOT_DIR` para salvar capturas. Esse teste usa o SDK oficial e o emulador, com login simulado e sem credenciais reais. Não rode simultaneamente com o teste de regras: ambos limpam somente o banco fictício local.
- Para abrir as páginas localmente: `node tmp_server.js`, depois acesse `http://localhost:8000/admin.html`. Abrir o HTML diretamente como `file://` não funciona com módulos JavaScript.

Os testes de regras usam somente o emulador e não acessam o banco real.
