import { reportClientError } from "@/client/util/request_helpers";

export class UnsupportedWebGLError extends Error {
  constructor(message: string) {
    super(message);

    reportClientError("UnsupportedWebGLError", this);
  }
}
