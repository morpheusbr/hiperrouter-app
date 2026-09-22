const { DEFAULT_PORT } = require("../constants");
const { resolvePort } = require("../utils/lifecycle");
const { pause } = require("../utils/input");

async function run(args) {
  const port = (args && args[0]) ? parseInt(args[0], 10) || resolvePort() : resolvePort();
  console.log(`\n🔌 HiperRouter Proxy Endpoint Configurator & Ping Tester`);
  console.log(`=========================================================\n`);

  console.log(` 🌐 Base URL:                http://localhost:${port}`);
  console.log(` 💬 OpenAI Compatible URL:  http://localhost:${port}/v1/chat/completions`);
  console.log(` 🤖 Anthropic Messages URL: http://localhost:${port}/v1/messages`);
  console.log(` 🔑 API Key:                hiperrouter-local-key`);

  console.log(`\n⏳ Testando tempo de resposta do servidor (Ping)...`);

  const start = Date.now();
  let exitCode = 0;
  try {
    const res = await fetch(`http://localhost:${port}/api/status`);
    const elapsed = Date.now() - start;
    if (res.ok) {
      console.log(` ✅ Status: 200 OK — Resposta obtida em ${elapsed}ms!`);
    } else {
      console.log(` ⚠️ Status: ${res.status} — Servidor ativo.`);
    }
  } catch (e) {
    console.log(` ❌ Erro na conexão: ${e.message}`);
    exitCode = 1;
  }

  console.log(`\n=========================================================\n`);
  await pause();
  return exitCode;
}

module.exports = { run };
