import { log } from "@/shared/logging";
import { createHash } from "crypto";
import { readFile } from "fs/promises";

const luaScriptCache = new Map<string, string>();

async function loadLuaFile(scriptName: string) {
  let lua = luaScriptCache.get(scriptName);
  if (!lua) {
    lua = await readFile(
      `./src/server/shared/world/lua/scripts/${scriptName}`,
      "utf8"
    );
    log.info(
      `Loaded ${scriptName}, ${lua.length} bytes / SHA1 ${createHash("sha1")
        .update(lua)
        .digest("hex")}`
    );
    luaScriptCache.set(scriptName, lua);
  }
  return lua;
}

async function handleIncludes(lua: string) {
  const includeRegex = /--\s*include\s*:\s*(\S+)\s*/g;
  let match;
  while ((match = includeRegex.exec(lua))) {
    lua = lua.replace(match[0], await loadLuaFile(match[1]));
  }
  return lua;
}

export async function getLuaScript(scriptName: string): Promise<string> {
  let script = await loadLuaFile(scriptName);
  for (let depth = 0; depth < 3; ++depth) {
    const newScript = await handleIncludes(script);
    if (newScript === script) {
      return script;
    }
    script = newScript;
  }
  throw new Error(`Too many levels of includes in Lua script: ${scriptName}`);
}
