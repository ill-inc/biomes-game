import { exec } from "child-process-promise";

export async function getGitEmail() {
  return (await exec("git config user.email")).stdout.trim();
}
