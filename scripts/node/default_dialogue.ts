import {
  migrateEntities,
  scanEntities,
} from "@/../scripts/node/abstract_migrate_script";
import { loadBikkieForScript } from "@/../scripts/node/helpers/bikkie";
import { determineEmployeeUserId } from "@/server/shared/bootstrap/sync";
import {
  SecretKey,
  bootstrapGlobalSecrets,
  getSecret,
} from "@/server/shared/secrets";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { DefaultDialog } from "@/shared/ecs/gen/components";
import { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { BiomesId } from "@/shared/ids";
import { relevantBiscuitForEntity } from "@/shared/npc/bikkie";
import { compact, sample, uniq } from "lodash";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { createInterface } from "readline";

function askQuestion(query: string) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>((resolve) =>
    rl.question(query, (ans: string) => {
      rl.close();
      resolve(ans);
    })
  );
}

function isValidEntity(entity: ReadonlyEntity) {
  const b = relevantBiscuitForEntity(entity);
  return Boolean(b?.isQuestGiver && !b?.isRobot);
}

function isCrappyDialogue(entity: ReadonlyEntity) {
  return (
    !entity?.default_dialog?.text ||
    entity?.default_dialog.text.includes("I'm a little busy")
  );
}

async function doIt() {
  const [backupFile] = process.argv.slice(2);

  const newDialog = new Map<BiomesId, string>();
  const sampleDialogue: [string, string][] = [];
  const runningInProd = !process.env.BIOMES_OVERRIDE_SYNC;
  const additionalSecrets: SecretKey[] = runningInProd
    ? ["untrusted-apply-token"]
    : [];
  await bootstrapGlobalSecrets(...additionalSecrets);
  await loadBikkieForScript();
  await loadVoxeloo();

  console.log("Performing first backup scan to get sample dialogue");
  await scanEntities(backupFile, async (entity) => {
    if (
      entity.label?.text &&
      !isCrappyDialogue(entity) &&
      isValidEntity(entity)
    ) {
      sampleDialogue.push([entity.label.text, entity.default_dialog!.text]);
    }
  });

  let isFirstEntity = true;
  let skipAll = false;

  console.log("Performing second backup scan to assess dialogue");
  // Manually reset the state of NPCs with a bad state.
  await scanEntities(backupFile, async (entity) => {
    if (skipAll) {
      return;
    }
    if (!isValidEntity(entity) || !isCrappyDialogue(entity)) {
      return;
    }

    const key = getSecret("openai-api-key").trim();
    if (!key) {
      return;
    }

    const configuration = new Configuration({
      apiKey: key,
    });
    const openai = new OpenAIApi(configuration);
    const samples = compact(
      uniq([
        sample(sampleDialogue),
        sample(sampleDialogue),
        sample(sampleDialogue),
        sample(sampleDialogue),
        sample(sampleDialogue),
        sample(sampleDialogue),
        sample(sampleDialogue),
        sample(sampleDialogue),
      ])
    );

    async function doTry() {
      const sampleStr = samples
        .map((e) => `A NPC named '${e[0]}': ${e[1]}`)
        .join("\n\n");

      const messages: ChatCompletionRequestMessage[] = [
        {
          role: "system",
          content: `
You are a NPC in an online video game called Biomes. The theme is an organic world where a catalysm occured and creatures named muckers took over. We are generating default dialog which is what you will say to players interact with you without a quest. Make it short, sweet and punny. Do not use the word Biomes. At most two sentences. Your name is ${
            entity.label?.text ?? "unknown"
          }. Here are some examples of what other NPCs say:

${sampleStr}

Now it's your turn. What do you say to players who interact with you?`.trim(),
        },
        {
          role: "assistant",
          content: `A NPC named '${entity.label?.text ?? "unknown"}':`,
        },
      ];

      if (isFirstEntity) {
        console.log("Calling openai with prompt", messages[0].content);
        isFirstEntity = false;
      } else {
        console.log("Generating for NPC", entity.label?.text);
      }
      const completion = await openai.createChatCompletion(
        {
          model: "gpt-3.5-turbo",
          messages,
        },
        {}
      );

      const nextMessage = completion.data.choices[0];
      const nextMessageContent = nextMessage.message?.content ?? "";
      const answer = await askQuestion(
        `Dialogue for ${entity.label?.text}: '${nextMessageContent}' -- Y [yes] / S [skip] / A [skip all] / R [retry]?\n`
      );
      if (answer.toLowerCase() === "y") {
        newDialog.set(entity.id, nextMessageContent);
        console.log("Accepted");
        return true;
      } else if (answer.toLowerCase() === "s") {
        console.log("Skip");
        return false;
      } else if (answer.toLowerCase() === "a") {
        console.log("Skip all");
        skipAll = true;
        return false;
      } else {
        console.log("Trying again");
        return undefined;
      }
    }

    while (true) {
      try {
        const ret = await doTry();
        if (ret !== undefined) {
          return;
        }
      } catch (error: any) {
        console.error("OpenAI error", error);
      }
    }
  });

  const userId = await determineEmployeeUserId();
  console.log("About to migrate");
  await migrateEntities(
    backupFile,
    (entity) => {
      if (!newDialog.has(entity.id)) {
        return false;
      }
      return entity.default_dialog?.text !== (newDialog.get(entity.id) ?? "");
    },
    (entity) => {
      if (newDialog.has(entity.id)) {
        entity.setDefaultDialog(
          DefaultDialog.create({
            text: newDialog.get(entity.id) ?? "",
            modified_at: secondsSinceEpoch(),
            modified_by: userId,
          })
        );
      }
    }
  );
}

doIt();
