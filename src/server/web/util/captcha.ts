import { jsonFetch } from "@/shared/util/fetch_helpers";

export type CaptchaResponse = {
  success: boolean;
};

export async function captchaCheck(siteSecret: string, userKey: string) {
  const response = await jsonFetch<CaptchaResponse>(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${siteSecret}&response=${userKey}` as any,
    }
  );

  return !!response.success;
}
