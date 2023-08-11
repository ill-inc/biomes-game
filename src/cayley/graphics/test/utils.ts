import { positionHash } from "@/cayley/graphics/utils";
import test from "ava";

test("positionHash", (t) => {
  t.is(positionHash([-3, 123, -90123]), 4272051975);
  t.is(positionHash([3, -123, 90123]), 453495664);
  t.is(positionHash([0, 0, 0]), 0);
  t.is(positionHash([0, 0, 1]), 604019821);
  t.is(positionHash([0, 1, 0]), 1492470133);
  t.is(positionHash([1, 0, 0]), 1753845952);
});
