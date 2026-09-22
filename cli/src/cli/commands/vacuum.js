const fs = require("fs");
const path = require("path");
const { getCliDataDir } = require("../constants");
const { pause } = require("../utils/input");

async function run(args) {
  console.log(`\n🧹 HiperRouter SQLite Database Vacuum & Cleaner`);
  console.log(`===============================================\n`);

  const dbPath = path.join(getCliDataDir(), "db", "data.sqlite");
  if (!fs.existsSync(dbPath)) {
    console.log(`❌ Banco de dados não encontrado em ${dbPath}`);
    return 1;
  }

  const initialSize = fs.statSync(dbPath).size;
  console.log(` 📊 Tamanho atual do banco: ${(initialSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(` ⏳ Otimizando páginas e executando VACUUM no SQLite...`);

  try {
    let executed = false;
    try {
      const Database = require("better-sqlite3");
      const db = new Database(dbPath);
      db.exec("VACUUM;");
      db.close();
      executed = true;
    } catch (errDb) {
      try {
        const { execSync } = require("child_process");
        execSync(`sqlite3 "${dbPath}" "VACUUM;"`, { stdio: "ignore" });
        executed = true;
      } catch (errCli) {
        console.log(` ❌ Falha ao executar VACUUM: ${errDb.message || errCli.message}\n`);
        await pause();
        return 1;
      }
    }

    if (executed) {
      const finalSize = fs.statSync(dbPath).size;
      console.log(` ✅ Banco otimizado com sucesso!`);
      console.log(` 📉 Novo tamanho: ${(finalSize / 1024 / 1024).toFixed(2)} MB\n`);
    }
  } catch (err) {
    console.log(` ❌ Erro inesperado: ${err.message}\n`);
    await pause();
    return 1;
  }

  await pause();
  return 0;
}

module.exports = { run };
