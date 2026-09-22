const { selectMenu, pause } = require("../utils/input");
const { makeRequest } = require("../api/client");
const { maskKey } = require("../utils/format");
const readline = require("readline");

function promptInput(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function listKeys() {
  try {
    const res = await makeRequest("GET", "/api/providers");
    if (!res || !res.success) {
      console.log(`❌ Não foi possível listar provedores: ${res?.error || "Servidor indisponível"}`);
      return 1;
    }
    const providers = (res.data && Array.isArray(res.data.providers)) ? res.data.providers : [];
    if (providers.length === 0) {
      console.log("ℹ️  Nenhum provedor configurado.");
      return 0;
    }

    console.log("\n🔑 Provedores e Chaves de API Configurados:\n");
    console.log(" PROVEDOR             | STATUS    | CHAVE");
    console.log("----------------------+-----------+----------------------");
    for (const p of providers) {
      const name = (p.name || p.id).padEnd(20);
      const status = (p.enabled !== false ? "🟢 Ativo   " : "🔴 Inativo ");
      const key = p.apiKey ? maskKey(p.apiKey) : "(sem chave)";
      console.log(` ${name} | ${status} | ${key}`);
    }
    console.log();
    return 0;
  } catch (e) {
    console.log(`❌ Não foi possível listar provedores: ${e.message}`);
    return 1;
  }
}

async function run(args) {
  const [action, provider, key] = args || [];

  if (action === "list" || action === "ls") {
    return listKeys();
  }

  // If flags/arguments passed directly, execute immediately
  if (action === "set" || action === "add") {
    if (!provider || !key) {
      console.log("❌ Uso: hiperrouter key set <provedor> <chave>");
      return 1;
    }
    return setKey(provider, key);
  }
  if (action === "delete" || action === "rm") {
    if (!provider) {
      console.log("❌ Uso: hiperrouter key rm <provedor>");
      return 1;
    }
    return removeKey(provider);
  }

  // Interactive TUI Menu Loop
  while (true) {
    const res = await makeRequest("GET", "/api/providers");
    const providers = (res.data && Array.isArray(res.data.providers)) ? res.data.providers : [];

    const items = [
      { label: "➕ Adicionar / Atualizar Chave de Provedor", action: "add" },
      { label: "❌ Remover Chave de Provedor", action: "rm" },
      ...providers.map(p => ({
        label: `${p.name || p.id}: ${p.apiKey ? maskKey(p.apiKey) : "Não configurada"} (${p.enabled !== false ? "🟢 Ativo" : "🔴 Desativado"})`,
        action: "view",
        provider: p
      })),
      { label: "🚪 Voltar", action: "back" }
    ];

    const idx = await selectMenu("Gerenciador de Chaves de API", items, 0, "Use as setas para navegar ou digite para filtrar:");
    if (idx === -1 || items[idx].action === "back") break;

    const selected = items[idx];
    if (selected.action === "add") {
      const provName = await promptInput("Nome do Provedor (ex: openrouter, openai, anthropic): ");
      if (provName) {
        const apiKey = await promptInput(`Insira a API Key para '${provName}': `);
        if (apiKey) {
          await setKey(provName, apiKey);
          await pause();
        }
      }
    } else if (selected.action === "rm") {
      const provName = await promptInput("Nome do Provedor para remover (ex: openrouter): ");
      if (provName) {
        await removeKey(provName);
        await pause();
      }
    } else if (selected.action === "view") {
      console.log(`\n📌 Detalhes do Provedor: ${selected.provider.name || selected.provider.id}`);
      console.log(` Chave: ${selected.provider.apiKey ? maskKey(selected.provider.apiKey) : "N/A"}`);
      console.log(` Status: ${selected.provider.enabled !== false ? "Ativo" : "Desativado"}\n`);
      await pause();
    }
  }

  return 0;
}

async function setKey(provider, key) {
  console.log(`⏳ Atualizando chave para o provedor '${provider}'...`);
  const res = await makeRequest("POST", "/api/providers", { id: provider, apiKey: key, enabled: true });
  if (res.success || res.status === 200 || res.data) {
    console.log(`✅ Chave do provedor '${provider}' configurada com sucesso!`);
    return 0;
  } else {
    console.log(`❌ Erro ao salvar chave:`, res.error || "Falha na requisição");
    return 1;
  }
}

async function removeKey(provider) {
  console.log(`⏳ Removendo chave do provedor '${provider}'...`);
  const res = await makeRequest("DELETE", `/api/providers?id=${encodeURIComponent(provider)}`);
  if (res.success || res.status === 200) {
    console.log(`✅ Chave do provedor '${provider}' removida.`);
    return 0;
  } else {
    console.log(`❌ Erro ao remover chave:`, res.error || "Falha na requisição");
    return 1;
  }
}

module.exports = { run, maskKey };
