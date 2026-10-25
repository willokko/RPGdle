# 🎲 RPGdle

Jogo diário de adivinhação dos personagens de RPG do grupo. Cada jogador tem dez tentativas e recebe pistas sobre gênero, player, campanha, estado, participações, idade e altura.

O site usa HTML, CSS e JavaScript sem etapa de build e continua hospedado no GitHub Pages.

## Jogo e biblioteca

- Modo normal com todos os personagens e modo fácil com personagens com três ou mais participações.
- Progresso salvo no navegador, separado por modo.
- Biblioteca com filtros por campanha e player.
- Personagens carregados do Cloud Firestore; imagens na pasta `images/` ou em URLs HTTPS.
- CSV original usado como reserva com aviso quando o banco estiver indisponível. Alterações pelo painel não atualizam esse CSV.

## Painel administrativo

Acesse `admin.html` diretamente. Não há link nos menus públicos. O painel solicita somente a senha da conta administrativa já criada no Firebase e permite:

- Importar os 288 personagens do CSV uma única vez.
- Buscar, cadastrar, editar e excluir personagens.
- Ajustar participações com os botões do formulário e salvar.
- Editar atributos e conferir a prévia de imagens já publicadas no GitHub.

O Firebase Authentication valida a senha e as regras do Firestore autorizam alterações somente ao UID administrativo. O endereço do painel e a configuração pública do Firebase não são mecanismos de proteção.

**Para ativar o painel, publique as regras e faça a importação seguindo [FIREBASE.md](FIREBASE.md).** Não é necessário Firebase Storage.

## Executar localmente

Com Node.js instalado:

```sh
node tmp_server.js
```

Abra `http://localhost:8000/index.html`, `http://localhost:8000/biblioteca.html` ou `http://localhost:8000/admin.html`. Use um servidor HTTP; módulos JavaScript não funcionam abrindo os arquivos diretamente por `file://`.

## Arquivos principais

| Arquivo | Função |
| --- | --- |
| `index.html`, `app.js` | Jogo diário |
| `biblioteca.html`, `biblioteca.js` | Biblioteca e filtros |
| `admin.html`, `admin.js`, `admin.css` | Painel administrativo |
| `firebase-config.js`, `firebase-client.js` | Configuração pública e conexão |
| `personagens-model.js` | Importação CSV, validação e adaptação para o jogo |
| `personagens-store.js` | Leitura, gravação e transações no Firestore |
| `catalogo.js` | Carregamento público e reserva em CSV |
| `firestore.rules` | Permissões e validação do banco |
| `personagens.csv`, `images/` | Base original e imagens do GitHub Pages |

Para novas imagens, publique o arquivo em `images/` e depois informe seu nome no painel. Os detalhes sobre primeiro acesso, regras, sorteio e verificações locais estão em [FIREBASE.md](FIREBASE.md).