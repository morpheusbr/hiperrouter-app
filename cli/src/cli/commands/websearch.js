const { pause } = require("../utils/input");
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

async function run(args) {
  const query = (args || []).join(" ").trim();
  let searchQuery = query;
  if (!searchQuery && process.stdin.isTTY) {
    searchQuery = await promptInput("Digite a busca na web: ");
  }

  if (!searchQuery) {
    console.log("❌ Busca vazia.\n");
    return 1;
  }

  console.log(`\n🌐 Buscando na web por: "${searchQuery}"...`);

  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    const html = await res.text();
    
    // Extrai links e títulos usando regex simples
    const matches = [...html.matchAll(/<a class="result__url" href="([^"]+)".*?>([\s\S]*?)<\/a>/g)];
    
    console.log(`\n🔎 RESULTADOS ENCONTRADOS:`);
    if (matches.length === 0) {
      console.log(`ℹ️  Nenhum link direto extraído. Verifique sua conectividade ou tente termos mais específicos.`);
    } else {
      matches.slice(0, 5).forEach((m, i) => {
        const url = m[1].replace(/^\/\/duckduckgo.com\/l\/\?uddg=/, "").split("&")[0];
        console.log(`  [${i + 1}] ${decodeURIComponent(url)}`);
      });
    }
    console.log("");
  } catch (e) {
    console.log(`❌ Erro na busca: ${e.message}\n`);
    await pause();
    return 1;
  }

  await pause();
  return 0;
}

module.exports = { run };
