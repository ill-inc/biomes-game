import type { MailMan } from "@/client/game/chat/mailman";

// Known bad extensions.

// Take the extension IDs from:
// https://github.com/z0ccc/extension-fingerprints/blob/main/src/utils/extensions.js

const EXTENSIONS = {
  "Méliuz: Cashback e cupons em suas compras": {
    id: "jdcfmebflppkljibgpdlboifpcaalolg",
    file: "images/activated-cashback.gif",
  },
};

type ExtensionType = keyof typeof EXTENSIONS;
type CheckedExtension = {
  name: ExtensionType;
  id: string;
  detected: boolean;
};

async function canFetch(url: string) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

async function detectedExtensions(): Promise<CheckedExtension[]> {
  const extensionsChecked: Promise<CheckedExtension>[] = Object.entries(
    EXTENSIONS
  ).map(async ([key, { id, file }]) => ({
    name: key as ExtensionType,
    detected: await canFetch(`chrome-extension://${id}/${file}`),
    id,
  }));
  return (await Promise.all(extensionsChecked)).filter((e) => e.detected);
}

export function warnAboutBadExtensions(mailman: MailMan) {
  void (async () => {
    const extensions = await detectedExtensions();
    if (extensions.length > 0) {
      const names = extensions.map((e) => e.name).join(", ");
      mailman.showChatError(
        `You have browser extensions that might interfere with the game: ${names}`
      );
    }
  })();
}
