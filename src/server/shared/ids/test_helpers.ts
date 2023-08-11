import type { IdGenerator } from "@/server/shared/ids/generator";
import type { BiomesId } from "@/shared/ids";
import { generateTestId } from "@/shared/test_helpers";

export class TestIdGenerator implements IdGenerator {
  async next(): Promise<BiomesId> {
    return generateTestId();
  }

  async batch(count: number): Promise<BiomesId[]> {
    const ids = [];
    for (let i = 0; i < count; i++) {
      ids.push(await this.next());
    }
    return ids;
  }
}
