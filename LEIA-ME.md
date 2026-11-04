# Convite Kauan & Karol: confirmação de presença

## Estrutura
- `index.html`: convite + botão "Confirmar presença"
- `admin.html`: lista de confirmações (protegida por senha)
- `api/confirmar.js`: recebe a confirmação (POST)
- `api/lista.js`: devolve a lista para o admin (GET, cabeçalho `x-senha`)
- `api/excluir.js`: exclui uma confirmação (POST, cabeçalho `x-senha`)
- `api/editar.js`: os noivos corrigem uma confirmação (POST, cabeçalho `x-senha`)
- `api/config.js`: limite de acompanhantes (GET público; POST com cabeçalho `x-senha`)
- `lib/auth.js`: verificação da senha do admin
- `lib/db.js`: conexão com o MongoDB
- `lib/validar.js`: regras de validação, as mesmas para o formulário e para a edição
- `lib/config.js`: leitura do limite de acompanhantes (coleção `config` no MongoDB)
- `logo-kk.png`: logo usado na lista de presença
- `presentes.html`: lista de presentes para os convidados (itens para a casa + cotas com Pix)
- `admin-presentes.html`: painel dos presentes (mesma senha do admin)
- `api/presentes.js`, `api/reservar.js`, `api/contribuir.js`, `api/gerenciar-presentes.js`, `api/imagem.js`: API da lista
- `lib/presentes.js`: regras da lista (validação, lista inicial, fotos, limites anti-abuso)
- `pix.js`: gera o Pix copia e cola (padrão do Banco Central) · `presentes-comum.js`: ícones e categorias
- `folhas-canto.webp`, `folhas-base.webp`: folhagens recortadas do convite, usadas na lista

## Como publicar
1. MongoDB Atlas: crie um cluster grátis (M0), um usuário e libere o acesso de rede `0.0.0.0/0`.
   Copie a connection string (`mongodb+srv://...`).
2. Vercel → Project → Settings → Environment Variables:
   - `MONGODB_URI` = sua connection string
   - `ADMIN_SENHA` = senha que os noivos vão usar no /admin.html
   - `MONGODB_DB` (opcional) = nome do banco (padrão: `casamento`)
3. Faça o deploy (pasta inteira). O Vercel instala o `mongodb` sozinho.
4. Troque `SEU-SITE.vercel.app` no `index.html` pelo domínio final (prévia do WhatsApp).

## Regras
- Prazo: até 20/11/2026 23:59 (Brasília). Depois disso a API recusa novos envios e o botão fica desativado.
- O mesmo WhatsApp confirmando de novo **atualiza** a resposta anterior, sem duplicar.
- Anti-spam: campo invisível (robôs preenchem, pessoas não).
- Quantidade: os noivos escolhem no admin quantos acompanhantes cada convite permite (de 0 a 9; padrão 2,
  ou seja, até 3 pessoas). O formulário mostra só as opções permitidas e a API recusa acima do limite.
  Com 0, o formulário nem pergunta quantas pessoas. Quem já confirmou antes de o limite diminuir continua valendo
  e aparece no admin com a marca "acima do limite".
- Acompanhantes: com 2 ou 3 pessoas, o nome de cada acompanhante é obrigatório (mín. 3 letras),
  no formulário e na API. Fica salvo no campo `acompanhantes` (lista de nomes; vazia para quem não vai).
  Os campos somem com "Não poderei ir" e voltam preenchidos se a pessoa abrir o formulário de novo.
- No admin: totais, busca, filtro Vão/Não vão e botão "Baixar planilha" (CSV que abre no Excel).
- A busca do admin acha pelo nome de quem confirmou ou de qualquer acompanhante, sem ligar para acentos.
  O CSV tem as colunas "Acompanhante 1" e "Acompanhante 2".
- Confirmações feitas antes dos acompanhantes existirem aparecem como "nome não informado".
- O formulário avisa que apenas 1 pessoa da família precisa preencher; os demais entram como acompanhantes.
- Botão "Lista de presença" no admin: baixa um Excel (.xlsx) com o logo K&K (`logo-kk.png`, na raiz) e duas abas:
  - **Lista de presença**: uma linha por convidado (quem confirmou em negrito e os acompanhantes logo abaixo),
    em ordem alfabética, com a coluna "Presença" (☐) para marcar na entrada. Pronta para imprimir em A4.
  - **Todas as respostas**: inclui quem não vai, os recados e a data de cada resposta.
  - O gerador (ExcelJS) é carregado da internet na hora do clique, então o admin precisa estar online.

## Música
- Coloque o arquivo de áudio na raiz com o nome **`musica.mp3`** (ao lado do `index.html`).
- Recomendado: MP3 de 128 kbps, entre 3 e 5 MB. Se for maior, o carregamento no 4G fica lento.
- O envelope espera o toque do convidado ("Toque para abrir o convite"). Esse toque abre o convite e
  dá a música, porque os navegadores bloqueiam áudio sem interação.
- O botão redondo no canto liga e desliga a música. A música pausa sozinha quando a pessoa sai da aba.
- Sem `musica.mp3`, o botão some e o resto funciona normalmente.

## Limite de acompanhantes
- No topo do admin, em "Acompanhantes por convite", escolha o número e toque em "Salvar".
- Vale na hora para quem abrir o convite depois disso.
- Na edição, os noivos podem abrir exceção acima do limite (até 10 pessoas no total).
- O CSV e o Excel criam quantas colunas "Acompanhante N" forem necessárias.

## Editar no admin
- Cada resposta tem o botão "Editar": dá para mudar nome, WhatsApp, se vai ou não, a quantidade de pessoas,
  os nomes dos acompanhantes e o recado. As regras são as mesmas do formulário (acompanhantes obrigatórios).
- Funciona também depois do prazo de 20/11.
- Não deixa trocar o WhatsApp para um número que já tem outra confirmação.
- A data da resposta do convidado é mantida; a lista mostra "editado pelos noivos" em quem foi alterado.

## Excluir no admin
- Cada resposta tem o botão "Excluir". O 1º toque pede confirmação, e o 2º (em até 4 s) exclui de vez.

## Lista de presentes
- Endereço: `/presentes.html` (o convite tem o botão "Lista de presentes" e o link aparece após confirmar presença).
- **Itens para a casa**: o convidado escolhe, informa o nome (e um recado, se quiser) e reserva. Cada item pode ter
  quantidade (ex.: 2 jogos de cama); a reserva é atômica, então duas pessoas não pegam a última unidade.
  Ele pode desistir depois em "Minhas escolhas" (só do aparelho em que reservou).
- **Cotas com Pix** (lua de mel etc.): o convidado escolhe quantas cotas ou outro valor, e a página gera na hora o
  QR code e o Pix copia e cola com o valor certo e um código (ex.: `KK4NAW3VJM`). Ao tocar em "Já fiz o Pix",
  a contribuição fica registrada como "a conferir".
- **Primeiro acesso**: a lista começa com os itens dos noivos (panelas, pratos e talheres, air fryer, mixer,
  ferro de passar roupa, mesa com 4 cadeiras) e 5 cotas de exemplo. Edite ou exclua tudo no painel.

### Painel dos presentes (`/admin-presentes.html`)
- Aba **Presentes**: adicionar/editar (nome, categoria, quantidade, preço aproximado, link, detalhes e foto),
  ver quem reservou e o recado, liberar uma reserva, excluir.
- Aba **Cotas e Pix recebidos**: criar/editar cotas (valor, meta, ícone ou foto) e conferir cada Pix pelo código
  no extrato do banco (botão "Conferido").
- Aba **Pix e WhatsApp**: chave Pix (tipo, chave, nome e cidade como aparecem no banco), WhatsApp dos noivos
  (botão "Avisar os noivos"), recado sobre a entrega e se mostra quanto cada cota já arrecadou.
  **Use "Testar Pix" e leia o QR no app do banco** para conferir o nome antes de divulgar.
- **Lista de agradecimentos**: Excel com o logo, quem deu o quê, recados e coluna para marcar o agradecimento.
- As fotos são reduzidas no celular (até 900 px) e guardadas no MongoDB (coleção `imagens`).

### Coleções novas no MongoDB (criadas sozinhas)
`presentes`, `reservas`, `cotas`, `contribuicoes`, `imagens` e o documento `presentes` dentro de `config`.

### Limite do Vercel
O plano Hobby aceita até 12 funções em `api/`. O projeto agora usa 10.
