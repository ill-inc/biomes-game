import { getGCloudAccount } from "@/server/shared/google_adc";
import { Attachment, createIssue } from "@/server/shared/linear";
import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { readdir, readFile } from "fs/promises";
import { lookup as mime } from "mime-types";
import path from "path";

async function halp(message?: string) {
  await bootstrapGlobalSecrets();

  const attachments: Attachment[] = [];
  const [email, files] = await Promise.all([
    getGCloudAccount(),
    readdir(".b", { withFileTypes: true }),
  ]);
  await Promise.all(
    files.map(async (file) => {
      if (!file.isFile() || file.name.startsWith(".")) {
        return;
      }
      attachments.push({
        title: file.name,
        filename: file.name,
        mimeType: mime(file.name) || "text/plain",
        data: await readFile(path.join(".b", file.name)),
      });
    })
  );

  const id = await createIssue({
    title: `${email} needs help`,
    labels: ["Halp"],
    description: (message ?? "").trim() || "I'm just stuck.",
    attachments,
  });
  console.log(`Created Linear Task: https://linear.app/ill-inc/issue/${id}`);
  console.log("Post it to #halp-zone");
}

const [message] = process.argv.slice(2);
halp(message);
