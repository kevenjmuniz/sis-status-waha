# sis-status-post

Página de upload de imagens que envia para um Webhook do n8n, onde um workflow usa o WAHA para publicar cada imagem como **Status do WhatsApp**.

## Estrutura

- `public/index.html` — gate de senha + formulário de upload (múltiplas imagens, reordenar, remover, preview).
- `public/app.js` — comprime as imagens no navegador e envia uma requisição por imagem para `WEBHOOK_URL`, em sequência, com delay entre elas.
- `public/config.js` — URL do webhook, senha da página, chave de API e delay entre envios.
- `server.js` — servidor estático simples para rodar a página localmente.

## Rodando localmente (sem Docker)

```bash
cp public/config.example.js public/config.js
# edite public/config.js com seus valores reais
npm run dev
```

Acesse http://localhost:8080.

`public/config.js` **não é versionado** (está no `.gitignore`) — cada ambiente (sua máquina, o container, etc.) tem o seu próprio, gerado a partir do `config.example.js` ou de variáveis de ambiente.

## Rodando em container Docker (Ubuntu)

O `Dockerfile` usa `ubuntu:22.04` como base. Nenhuma chave fica dentro da imagem — o container gera `public/config.js` a partir de variáveis de ambiente no start (`scripts/generate-config.js`), então a mesma imagem serve para qualquer ambiente.

```bash
cp .env.example .env
# edite .env com seus valores reais

docker compose up --build
```

Ou sem docker-compose:

```bash
docker build -t sis-status-post .
docker run -p 8080:8080 --env-file .env sis-status-post
```

Variáveis de ambiente aceitas (ver `.env.example`): `WEBHOOK_URL`, `APP_PASSWORD`, `API_KEY`, `SEND_DELAY_MIN_MS`, `SEND_DELAY_MAX_MS`, `WHATSAPP_ACCOUNTS_JSON` (JSON array), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SCHEDULE_API_KEY`.

## 1. Configurar `public/config.js`

```js
window.WEBHOOK_URL = "https://SEU-N8N.exemplo.com/webhook/status-post";
window.APP_PASSWORD = "escolha-uma-senha";
window.API_KEY = "escolha-uma-chave-longa-e-aleatoria";
window.SEND_DELAY_MIN_MS = 15000;
window.SEND_DELAY_MAX_MS = 45000;
```

- `APP_PASSWORD` é uma proteção básica só no navegador (evita acesso casual). **Não é segurança real** — qualquer um que veja o JS consegue ler o valor.
- `API_KEY` é a proteção que importa de verdade: é enviada no header `X-API-Key` em toda requisição e validada pelo próprio node Webhook do n8n (Header Auth, passo 1 abaixo).
- `SEND_DELAY_MIN_MS` / `SEND_DELAY_MAX_MS` definem o intervalo (em ms) entre a publicação de cada imagem: a cada envio, um valor aleatório é sorteado dentro dessa faixa. Isso evita um padrão de tempo fixo e previsível entre posts, o que reduz o risco de a conta ser sinalizada como automação pelo WhatsApp. Quanto maior a faixa e o mínimo, mais "humano" o ritmo — para lotes grandes de imagens, considere valores ainda maiores (ex.: 60000–180000).

## 2. Montar o workflow no n8n

1. **Webhook** (trigger)
   - Method: `POST`
   - Path: `status-post`
   - Em Options, habilite **Binary Data** (senão o arquivo não chega, só o `caption`)
   - Settings → Respond: **When Last Node Finishes** (importante: garante que a página só manda a próxima imagem depois que o status anterior foi realmente publicado, preservando a ordem)
   - **Authentication**: `Header Auth` → crie uma credencial com **Name** `X-API-Key` e **Value** igual ao `window.API_KEY` do `config.js`. Isso faz o n8n rejeitar (401) qualquer requisição sem a chave certa, sem precisar de node extra.

2. **Move file to base64 string** (categoria "Extract from File")
   - Binary Property: `image`
   - Isso gera `$json.data` com a imagem em base64 (necessário porque `$binary.image.data` não fica acessível direto em expressões nesta versão do n8n)

3. **WAHA — Send Image Status** (node comunitário `n8n-nodes-waha`)
   - Resource: `Status`
   - Operation: `Send Image Status`
   - Session, em modo Expression: `{{ $('Webhook').item.json.body.session }}` (vem do seletor de conta na página — ver seção "Múltiplas contas" abaixo)
   - Campo **File**, em modo Expression:
     ```
     {{ { mimetype: $('Webhook').item.binary.image.mimeType, filename: $('Webhook').item.binary.image.fileName, data: $json.data } }}
     ```
     (troque `'Webhook'` pelo nome exato do node Webhook, se for diferente)
   - Campo **Caption**: `{{ $('Webhook').item.json.body.caption }}`

4. Ative o workflow (toggle "Active" + salvar) e use a **Production URL** no `config.js`.

> Pré-requisito: instância WAHA com sessão autenticada (`WORKING`) e o node comunitário do WAHA instalado no n8n (`n8n-nodes-waha`).

## Comportamento da página

- Aceita várias imagens de uma vez; cada uma pode ser removida ou reordenada antes de publicar.
- Cada imagem pode ter sua **própria legenda**, digitada abaixo da miniatura na lista; se deixada em branco, usa a legenda padrão do campo principal.
- Cada imagem é comprimida no navegador (máx. 1600px, JPEG ~82% de qualidade) antes do upload, para acelerar o envio.
- As imagens são enviadas **uma de cada vez**, respeitando a ordem da lista, com um intervalo **aleatório** (`SEND_DELAY_MIN_MS`–`SEND_DELAY_MAX_MS`) entre elas — reduz o risco de a conta ser identificada como automação/banida por postar rápido e em ritmo constante demais.
- Barra de progresso mostra quantas já foram publicadas.
- Botão **Cancelar** aparece durante a publicação: interrompe antes da próxima imagem (inclusive durante a espera do intervalo anti-ban). Imagens já publicadas continuam publicadas — cancelar só impede o restante do lote.
- Seção **Publicados recentemente** lista os últimos status publicados (imagem, conta, data/hora), com botão "Já apaguei" para tirar da lista depois que você apagar manualmente no WhatsApp. Usa a tabela `posted_history` no mesmo projeto Supabase do agendamento — também é alimentada automaticamente quando um post agendado é enviado pelo n8n.

## Múltiplas contas

Em `public/config.js`, liste as contas/sessões disponíveis:

```js
window.WHATSAPP_ACCOUNTS = [
  { id: "default", label: "Conta Principal" },
  { id: "conta2", label: "Conta Secundária" },
];
```

- `id` precisa ser **exatamente** o nome da sessão WAHA daquela conta (a mesma que aparece no WAHA Dashboard/API para a sessão autenticada).
- `label` é só o texto exibido no seletor da página.

A página manda o `id` escolhido no campo `session` do `FormData`, e o node WAHA usa esse valor via `{{ $('Webhook').item.json.body.session }}` no campo Session — não precisa duplicar o workflow por conta.

## Agendamento de posts

Além de publicar na hora, a página permite **agendar** (uma vez ou recorrente por dias da semana). Isso usa um projeto Supabase (Postgres) separado do webhook de publicação imediata:

- Projeto: `sis-status-post` (região `ca-central-1`)
- URL: `https://lhtcvmpvdoqelhfdbldn.supabase.co`
- Tabela `scheduled_posts` guarda cada imagem agendada (em base64), legenda, conta, tipo de agendamento e status (`pending` / `sent` / `failed` / `canceled`)

`public/config.js` já tem `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SCHEDULE_API_KEY` configurados. A anon key sozinha não é suficiente: as policies de INSERT/SELECT e a função `cancel_scheduled_post` exigem também o header `X-Schedule-Key` batendo com `SCHEDULE_API_KEY` — sem ele, mesmo tendo a anon key, não dá para inserir, listar ou cancelar posts agendados. As funções usadas só pelo workflow do n8n (`get_due_scheduled_posts`, `mark_scheduled_post_sent`, `mark_scheduled_post_failed`) não são executáveis por `anon`/`authenticated` — só pelo `service_role`.

### Como funciona

1. Ao escolher "Agendar", a página comprime a imagem, converte pra base64 no navegador e insere uma linha em `scheduled_posts` diretamente via API REST do Supabase (não passa pelo webhook do n8n).
2. Um **segundo workflow no n8n** (independente do webhook de publicação imediata) roda de tempo em tempo, busca os posts que já venceram e publica via WAHA.
3. A seção "Agendados" na página lista os posts pendentes (lidos direto do Supabase) com botão para cancelar.

### Montando o 2º workflow no n8n (executor do agendamento)

Pegue a **service_role key** do projeto em Supabase → Project Settings → API → "service_role secret" (não é a mesma chave usada no navegador — essa tem acesso total e só deve ficar no n8n).

1. **Schedule Trigger** — intervalo de 1 minuto.

2. **HTTP Request** — busca os posts que venceram
   - Method: `POST`
   - URL: `https://lhtcvmpvdoqelhfdbldn.supabase.co/rest/v1/rpc/get_due_scheduled_posts`
   - Headers: `apikey: SUA_SERVICE_ROLE_KEY`, `Authorization: Bearer SUA_SERVICE_ROLE_KEY`, `Content-Type: application/json`
   - Body: `{}`
   - Em Options, habilite "Split Into Items" (ou adicione um node **Split Out** depois) para processar um post por vez.

3. **WAHA — Send Image Status**
   - Session (Expression): `{{ $json.account_id }}`
   - Campo **File** (Expression): `{{ { mimetype: $json.image_mimetype, filename: $json.image_filename, data: $json.image_data } }}`
   - Campo **Caption**: `{{ $json.caption }}`

4. **HTTP Request** — marca como enviado (rode só se o WAHA acima teve sucesso)
   - Method: `POST`
   - URL: `https://lhtcvmpvdoqelhfdbldn.supabase.co/rest/v1/rpc/mark_scheduled_post_sent`
   - Headers: iguais ao passo 2
   - Body: `{ "post_id": "{{ $('HTTP Request').item.json.id }}" }` (ajuste o nome do node de referência conforme o passo 2)

- Posts **"Uma vez"** somem da lista de pendentes depois de enviados (status vira `sent`).
- Posts **recorrentes** continuam `pending` para sempre — o `last_sent_at` impede que sejam reenviados duas vezes no mesmo dia, mas eles disparam de novo automaticamente no próximo dia/horário configurado.
- Se o WAHA falhar (sessão caiu, etc.), o item simplesmente não é marcado como enviado e é tentado de novo no próximo minuto — para parar de tentar, chame `mark_scheduled_post_failed` com `post_id` e `error_message` num branch de erro do WAHA (opcional).

## Trocando o destino (foto de perfil / canal / grupo)

Se no futuro quiser trocar a ação, basta trocar a Operation do node WAHA no n8n:
- Foto de perfil: `Set Profile Picture`
- Canal/Grupo: `Send Image` (resource `Chatting`, informando o `chatId`)

Não é necessário mexer no frontend — ele só envia imagem + legenda para o webhook.
