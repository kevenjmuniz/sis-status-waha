// Gera public/config.js a partir de variáveis de ambiente.
// Usado no entrypoint do container — assim nenhum segredo fica embutido na imagem/no Git.
const fs = require("fs");
const path = require("path");

function envOr(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

let whatsappAccounts;
try {
  whatsappAccounts = JSON.parse(envOr("WHATSAPP_ACCOUNTS_JSON", "[]"));
} catch {
  console.error("WHATSAPP_ACCOUNTS_JSON inválido — precisa ser um JSON array. Usando lista vazia.");
  whatsappAccounts = [];
}

const config = {
  WEBHOOK_URL: envOr("WEBHOOK_URL", ""),
  APP_PASSWORD: envOr("APP_PASSWORD", ""),
  API_KEY: envOr("API_KEY", ""),
  SEND_DELAY_MS: Number(envOr("SEND_DELAY_MS", "1500")),
  WHATSAPP_ACCOUNTS: whatsappAccounts,
  SUPABASE_URL: envOr("SUPABASE_URL", ""),
  SUPABASE_ANON_KEY: envOr("SUPABASE_ANON_KEY", ""),
  SCHEDULE_API_KEY: envOr("SCHEDULE_API_KEY", ""),
};

const lines = Object.entries(config).map(
  ([key, value]) => `window.${key} = ${JSON.stringify(value)};`
);

const outPath = path.join(__dirname, "..", "public", "config.js");
fs.writeFileSync(outPath, lines.join("\n") + "\n");
console.log(`public/config.js gerado a partir de variáveis de ambiente.`);
