import { authLinksBy } from "@/server/shared/auth/auth_link";
import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { createBdb, createStorageBackend } from "@/server/shared/storage";
import { BiomesId } from "@/shared/ids";
import { MultiMap } from "@/shared/util/collections";

const PAGE_SIZE = 100;

function normalizeEmail(email: string) {
  const [username, rest] = email.split("@", 2);
  return (
    username.replaceAll(".", "").replace(/\+.*$/, "").toLowerCase() +
    "@" +
    rest.toLowerCase()
  );
}

async function cleanUsers() {
  await bootstrapGlobalSecrets();

  const storage = await createStorageBackend("firestore");
  const db = createBdb(storage);

  console.log("Identifying users by email cluster...");
  const emails = new Set<string>();
  const userByEmail = new MultiMap<string, BiomesId>();
  let offset = 0;
  while (true) {
    const batch = await authLinksBy(db, "email", offset, PAGE_SIZE + 1);
    offset += PAGE_SIZE;
    const links = batch.slice(0, PAGE_SIZE);

    for (const link of links) {
      if (!link.profile.email) {
        continue;
      }
      const email = String(link.profile.email);
      emails.add(email);
      userByEmail.add(normalizeEmail(email), link.userId);
    }

    if (batch.length <= PAGE_SIZE) {
      break;
    }
  }

  for (const [email, users] of userByEmail) {
    if (users.length === 1) {
      continue;
    }
    console.log(
      `${email}: [${users.length} users] - ${
        emails.has(email) ? "exists normalized" : "no normalized candidate"
      }`
    );
  }

  console.log("All done.");
}

cleanUsers();
