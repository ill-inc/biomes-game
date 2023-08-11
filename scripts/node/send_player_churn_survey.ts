import { bootstrapGlobalSecrets, getSecret } from "@/server/shared/secrets";
import * as postmark from "postmark";

// Recipient list generated from this query:
//   https://console.cloud.google.com/bigquery?sq=336371362626:2e4a770557814a26b4b350a34fa4c082
const RECIPIENTS = [
  "prinz.eugen04042007@gmail.com",
  "vcrawford01@student.dasd.org",
  "suilucille@gmail.com",
  "sam.c123.li@gmail.com",
  "sheldonducharme89@gmail.com",
  "crislobodemango@gmail.com",
  "jasonnguyenm101@gmail.com",
  "snugglebunnymonkey@gmail.com",
  "miley.zakhary@stu.ocsb.ca",
  "janet.tao@student.tdsb.on.ca",
  "launcher960@gmail.com",
  "fritznoah11@gmail.com",
  "1093164@lcps.org",
  "christina41583@gmail.com",
  "vosihoangms137@gmail.com",
  "daey@uci.edu",
  "mrtimmy096@gmail.com",
  "hadleywright5@gmail.com",
  "summerkat05@gmail.com",
  "gletisonjr@gmail.com",
  "smagee6146@chinooksd.ca",
  "joshualinville13@outlook.com",
];

async function sendEmail(client: postmark.ServerClient, to: string) {
  await client.sendEmail({
    To: to,
    From: "Andrew Top <top@biomes.gg>",
    Subject: "How Can We Improve Biomes?",
    HtmlBody: `
<p>Hi there,</p>

<p>Andrew, engineer from the Biomes team here. Thanks for checking out the game; we saw that your adventure was shorter than expected! Would you mind telling us why? Feel free to reply directly to this e-mail, or through <a href="https://forms.gle/zSfe7XxrgxDZmS9T9">this link</a>.</p>

<p>Thanks!</p>

<p>-Andrew Top</p>
`,
    MessageStream: "outbound",
  });

  console.log(`Sent e-mail to ${to}`);
}

async function main() {
  await bootstrapGlobalSecrets("postmark-auth-transactional");

  const client = new postmark.ServerClient(
    getSecret("postmark-auth-transactional")
  );

  await Promise.all(RECIPIENTS.map((x) => sendEmail(client, x)));
}

main();
