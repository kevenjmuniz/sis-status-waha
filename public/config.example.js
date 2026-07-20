// Copie este arquivo para public/config.js e preencha com seus valores reais.
// public/config.js NÃO é versionado (está no .gitignore).

// URL do Webhook do n8n que recebe a imagem e aciona o nó do WAHA.
window.WEBHOOK_URL = "https://SEU-N8N.exemplo.com/webhook/status-post";

// Senha simples para acessar a página (proteção básica no navegador).
// Isso NÃO substitui a validação no n8n abaixo.
window.APP_PASSWORD = "escolha-uma-senha";

// Chave enviada no header X-API-Key em toda requisição ao webhook.
// Configure o MESMO valor num node de validação no n8n (ver README).
window.API_KEY = "escolha-uma-chave-longa-e-aleatoria";

// Intervalo aleatório (ms) entre o envio de cada imagem — um valor sorteado entre
// MIN e MAX a cada imagem, para não postar em ritmo constante/rápido demais
// (padrão que serviços de detecção de bot reconhecem). Recomendado manter
// pelo menos alguns segundos de diferença entre MIN e MAX.
window.SEND_DELAY_MIN_MS = 15000;
window.SEND_DELAY_MAX_MS = 45000;

// Contas/sessões WAHA disponíveis para escolher na página.
// "id" deve ser exatamente o nome da sessão configurada no WAHA/n8n.
window.WHATSAPP_ACCOUNTS = [
  { id: "default", label: "Conta Principal" },
];

// Supabase — usado só para o AGENDAMENTO de posts (guardar/cancelar posts pendentes).
// Chave "publishable"/anon: segura para expor no navegador, o acesso é restrito por RLS.
window.SUPABASE_URL = "";
window.SUPABASE_ANON_KEY = "";

// Segredo exigido pelas policies de scheduled_posts (header X-Schedule-Key) para
// inserir/listar/cancelar posts agendados. Sem ele, a anon key sozinha não basta.
window.SCHEDULE_API_KEY = "";
