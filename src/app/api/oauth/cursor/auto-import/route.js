import { NextResponse } from "next/server";
import { access, constants } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import Database from "better-sqlite3";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const ACCESS_TOKEN_KEYS = ["cursorAuth/accessToken", "cursorAuth/token"];
const MACHINE_ID_KEYS = [
  "storage.serviceMachineId",
  "storage.machineId",
  "telemetry.machineId",
];

const normalize = (value) => {
  if (typeof value !== "string") return value;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "string" ? parsed : value;
  } catch {
    return value;
  }
};

/**
 * Extract tokens via sqlite3 CLI.
 * Fallback when better-sqlite3 native bindings are unavailable.
 */
async function extractTokensViaCLI(dbPath) {
  const query = async (sql) => {
    const { stdout } = await execFileAsync("sqlite3", [dbPath, sql], {
      timeout: 10000,
    });
    return stdout.trim();
  };

  let accessToken = null;
  for (const key of ACCESS_TOKEN_KEYS) {
    try {
      const raw = await query(
        `SELECT value FROM itemTable WHERE key='${key}' LIMIT 1`,
      );
      if (raw) {
        accessToken = normalize(raw);
        break;
      }
    } catch {
      /* try next */
    }
  }

  let machineId = null;
  for (const key of MACHINE_ID_KEYS) {
    try {
      const raw = await query(
        `SELECT value FROM itemTable WHERE key='${key}' LIMIT 1`,
      );
      if (raw) {
        machineId = normalize(raw);
        break;
      }
    } catch {
      /* try next */
    }
  }

  return { accessToken, machineId };
}

/**
 * GET /api/oauth/cursor/auto-import
 * Auto-detect and extract Cursor tokens from local SQLite database.
 */
export async function GET() {
  try {
    const platform = process.platform;
    let dbPath;

    if (platform === "darwin") {
      // macOS: probe multiple locations (standard + Insiders)
      const userHome = homedir();
      const candidateDbPaths = [
        join(
          userHome,
          "Library/Application Support/Cursor/User/globalStorage/state.vscdb",
        ),
        join(
          userHome,
          "Library/Application Support/Cursor - Insiders/User/globalStorage/state.vscdb",
        ),
      ];

      for (const path of candidateDbPaths) {
        try {
          await access(path, constants.R_OK);
          dbPath = path;
          break;
        } catch {
          // Continue probing next candidate.
        }
      }

      if (!dbPath) {
        return NextResponse.json({
          found: false,
          error:
            "Cursor database not found in known macOS locations. Make sure Cursor IDE is installed and opened at least once.",
        });
      }
    } else if (platform === "linux") {
      dbPath = join(homedir(), ".config/Cursor/User/globalStorage/state.vscdb");
    } else if (platform === "win32") {
      dbPath = join(
        process.env.APPDATA || "",
        "Cursor/User/globalStorage/state.vscdb",
      );
    } else {
      return NextResponse.json(
        { error: "Unsupported platform", found: false },
        { status: 400 },
      );
    }

    // Try to open database via better-sqlite3
    let db;
    try {
      db = new Database(dbPath, { readonly: true, fileMustExist: true });
    } catch (error) {
      if (platform === "darwin") {
        return NextResponse.json({
          found: false,
          error: `Found Cursor database at ${dbPath} but could not open it: ${error.message}`,
        });
      }

      // If better-sqlite3 native bindings failed, try sqlite3 CLI fallback
      if (
        error.message &&
        (error.message.includes("GLIBC") ||
          error.message.includes("bindings") ||
          error.code === "MODULE_NOT_FOUND")
      ) {
        try {
          const cliTokens = await extractTokensViaCLI(dbPath);
          if (cliTokens.accessToken && cliTokens.machineId) {
            return NextResponse.json({
              found: true,
              accessToken: cliTokens.accessToken,
              machineId: cliTokens.machineId,
            });
          }
        } catch {
          // Ignore CLI fallback failure and continue to not-found error
        }
      }

      return NextResponse.json({
        found: false,
        error:
          "Cursor database not found. Make sure Cursor IDE is installed and you are logged in.",
      });
    }

    try {
      const desiredKeys = [...ACCESS_TOKEN_KEYS, ...MACHINE_ID_KEYS];
      const rows = db
        .prepare(
          `SELECT key, value FROM itemTable WHERE key IN (${desiredKeys.map(() => "?").join(",")})`,
        )
        .all(...desiredKeys);

      const tokens = {};
      for (const row of rows || []) {
        if (ACCESS_TOKEN_KEYS.includes(row.key) && !tokens.accessToken) {
          tokens.accessToken = normalize(row.value);
        } else if (MACHINE_ID_KEYS.includes(row.key) && !tokens.machineId) {
          tokens.machineId = normalize(row.value);
        }
      }

      // Fuzzy fallback for newer/changed key names (macOS only, where the
      // issue was originally reported; other platforms use exact keys).
      if (platform === "darwin" && (!tokens.accessToken || !tokens.machineId)) {
        const fallbackRows = db
          .prepare(
            "SELECT key, value FROM itemTable WHERE key LIKE '%cursorAuth/%' OR key LIKE '%machineId%' OR key LIKE '%serviceMachineId%'",
          )
          .all();

        for (const row of fallbackRows || []) {
          const key = row.key || "";
          const value = normalize(row.value);

          if (!tokens.accessToken && key.toLowerCase().includes("accesstoken")) {
            tokens.accessToken = value;
          }

          if (!tokens.machineId && key.toLowerCase().includes("machineid")) {
            tokens.machineId = value;
          }
        }
      }

      db.close();

      // Validate tokens exist
      if (!tokens.accessToken || !tokens.machineId) {
        return NextResponse.json({
          found: false,
          error: "Tokens not found in database. Please login to Cursor IDE first.",
        });
      }

      return NextResponse.json({
        found: true,
        accessToken: tokens.accessToken,
        machineId: tokens.machineId,
      });
    } catch (error) {
      db?.close();
      return NextResponse.json({
        found: false,
        error: `Failed to read database: ${error.message}`,
      });
    }
  } catch (error) {
    console.log("Cursor auto-import error:", error);
    return NextResponse.json(
      { found: false, error: error.message },
      { status: 500 },
    );
  }
}
