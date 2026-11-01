# Convite Kauan & Karol: confirmação de presença

## Estrutura
- `index.html`: convite + botão "Confirmar presença"
- `admin.html`: lista de confirmações (protegida por senha)
- `api/confirmar.js`: recebe a confirmação (POST)
- `api/lista.js`: devolve a lista para o admin (GET, cabeçalho `x-senha`)
- `api/excluir.js`: exclui uma confirmação (POST, cabeçalho `x-senha`)
- `lib/auth.js`: verificação da senha do admin
- `lib/db.js`: conexão com o MongoDB

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
- No admin: totais, busca, filtro Vão/Não vão e botão "Baixar planilha" (CSV que abre no Excel).

## Música
- Coloque o arquivo de áudio na raiz com o nome **`musica.mp3`** (ao lado do `index.html`).
- Recomendado: MP3 de 128 kbps, entre 3 e 5 MB. Se for maior, o carregamento no 4G fica lento.
- O envelope espera o toque do convidado ("Toque para abrir o convite"). Esse toque abre o convite e
  dá a música, porque os navegadores bloqueiam áudio sem interação.
- O botão redondo no canto liga e desliga a música. A música pausa sozinha quando a pessoa sai da aba.
- Sem `musica.mp3`, o botão some e o resto funciona normalmente.

## Excluir no admin
- Cada resposta tem o botão "Excluir". O 1º toque pede confirmação, e o 2º (em até 4 s) exclui de vez.
