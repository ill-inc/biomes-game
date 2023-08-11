import { getSecret } from "@/server/shared/secrets";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { captchaCheck } from "@/server/web/util/captcha";
import { z } from "zod";

export const zWaitlistSignupRequest = z.object({
  email: z.string().email(),
  captchaValue: z.string(),
});

export type WaitlistSignupRequest = z.infer<typeof zWaitlistSignupRequest>;

export default biomesApiHandler(
  {
    auth: "optional",
    body: zWaitlistSignupRequest,
  },
  async ({ context: { db }, body: { email, captchaValue }, unsafeRequest }) => {
    okOrAPIError(
      await captchaCheck(
        getSecret("splash-recaptcha-server-secret"),
        captchaValue
      ),
      "invalid_request",
      "Failed captcha"
    );

    const existing = await db.collection("waitlist").doc(email).get();
    if (existing.exists) {
      return;
    }
    await db
      .collection("waitlist")
      .doc(email)
      .set({
        createdAt: Date.now(),
        origin: "splash-waitlist",
        ua: unsafeRequest.headers["user-agent"] ?? "",
      });
  }
);
