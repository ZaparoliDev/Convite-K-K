# Convite Kauan & Karol: confirmação de presença

## Estrutura
- `index.html`: convite + botão "Confirmar presença"
- `admin.html`: lista de confirmações (protegida por senha)
- `api/confirmar.js`: recebe a confirmação (POST)
- `api/lista.js`: devolve a lista para o admin (GET, cabeçalho `x-senha`)
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
