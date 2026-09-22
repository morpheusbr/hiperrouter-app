const api = require("../api/client");
const { pause } = require("../utils/input");
const { DEFAULT_PORT } = require("../constants");
const { resolvePort } = require("../utils/lifecycle");
const { getEndpoint } = require("../utils/endpoint");

async function run(args) {
  console.log(`\n🌐 HiperRouter Tunnel & Remote Access Manager`);
  console.log(`=============================================\n`);

  const port = resolvePort();
  try {
    const { endpoint, tunnelEnabled } = await getEndpoint(port);
    if (tunnelEnabled) {
      console.log(`🟢 Status do Túnel: ATIVO`);
      console.log(`🔗 URL Pública (HTTPS): ${endpoint.replace(/\/v1$/, "")}`);
      console.log(`📡 Base API /v1:         ${endpoint}\n`);
    } else {
      console.log(`⚪ Status do Túnel: DESATIVADO (Acesso apenas local)`);
      console.log(`🔗 Local Endpoint: http://localhost:${port}/v1`);
      console.log(`💡 Dica: Para ativar o túnel seguro (Tailscale / Cloudflared), acesse o Dashboard Web ou rode 'hiperrouter menu' -> Settings -> Tunnel.\n`);
    }
  } catch (e) {
    console.log(`❌ Erro ao consultar status do túnel: ${e.message}\n`);
    return 1;
  }

  return 0;
}

module.exports = { run };
