import { NextResponse } from "next/server";
import { getApiKeys, createApiKey } from "@/lib/localDb";
import { getConsistentMachineId } from "@/shared/utils/machineId";

export const dynamic = "force-dynamic";

const KEYS_RESPONSE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

function maskApiKey(fullKey) {
  if (!fullKey || fullKey.length <= 10) return fullKey || "";
  return fullKey.slice(0, 6) + "•".repeat(Math.max(0, fullKey.length - 10)) + fullKey.slice(-4);
}

// GET /api/keys - List API keys
export async function GET(request) {
  try {
    const keys = await getApiKeys();
    const shouldMask = request?.nextUrl?.searchParams?.get("masked") === "true" ||
      (request?.url && new URL(request.url).searchParams.get("masked") === "true");

    const payload = shouldMask
      ? keys.map((k) => ({ ...k, key: maskApiKey(k.key) }))
      : keys;

    return NextResponse.json({ keys: payload }, { headers: KEYS_RESPONSE_HEADERS });
  } catch (error) {
    console.log("Error fetching keys:", error);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}

// POST /api/keys - Create new API key
export async function POST(request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Always get machineId from server
    const machineId = await getConsistentMachineId();
    const apiKey = await createApiKey(name, machineId);

    return NextResponse.json({
      key: apiKey.key,
      name: apiKey.name,
      id: apiKey.id,
      machineId: apiKey.machineId,
    }, { status: 201 });
  } catch (error) {
    console.log("Error creating key:", error);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}
