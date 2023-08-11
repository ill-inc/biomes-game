import type { Change } from "@/shared/ecs/change";
import {
  applyProposedChange,
  changedBiomesId,
  mergeChange,
} from "@/shared/ecs/change";
import { SerializeForServer } from "@/shared/ecs/gen/json_serde";
import { ChangeSerde } from "@/shared/ecs/serde";
import { generateTestId } from "@/shared/test_helpers";
import assert from "assert";

const TEST_ID = generateTestId();

describe("ECS Changes", () => {
  it("Can extract Entity ID", () => {
    assert.equal(
      changedBiomesId({
        kind: "create",
        entity: {
          id: TEST_ID,
        },
      }),
      TEST_ID
    );

    assert.equal(
      changedBiomesId({
        kind: "update",
        entity: {
          id: TEST_ID,
        },
      }),
      TEST_ID
    );

    assert.equal(
      changedBiomesId({
        kind: "delete",
        id: TEST_ID,
      }),
      TEST_ID
    );
  });
});

describe("Changes can be merged", () => {
  it("Create on undefined", () => {
    assert.deepEqual(
      mergeChange(undefined, {
        kind: "create",
        tick: 1,
        entity: {
          id: TEST_ID,
          label: {
            text: "TEST_ID",
          },
        },
      }),
      {
        kind: "create",
        tick: 1,
        entity: {
          id: TEST_ID,
          label: {
            text: "TEST_ID",
          },
        },
      }
    );
  });

  it("Create on create", () => {
    assert.deepEqual(
      mergeChange(
        {
          kind: "create",
          tick: 1,
          entity: {
            id: TEST_ID,
            label: {
              text: "bar",
            },
            remote_connection: {},
          },
        },
        {
          kind: "create",
          tick: 3,
          entity: {
            id: TEST_ID,
            label: {
              text: "TEST_ID",
            },
          },
        }
      ),
      {
        kind: "create",
        tick: 3,
        entity: {
          id: TEST_ID,
          label: {
            text: "TEST_ID",
          },
        },
      }
    );
  });

  it("Create on delete", () => {
    assert.deepEqual(
      mergeChange(
        {
          kind: "delete",
          tick: 1,
          id: TEST_ID,
        },
        {
          kind: "create",
          tick: 2,
          entity: {
            id: TEST_ID,
            label: {
              text: "TEST_ID",
            },
          },
        }
      ),
      {
        kind: "create",
        tick: 2,
        entity: {
          id: TEST_ID,
          label: {
            text: "TEST_ID",
          },
        },
      }
    );
  });

  it("Create on update", () => {
    assert.deepEqual(
      mergeChange(
        {
          kind: "update",
          tick: 3,
          entity: {
            id: TEST_ID,
            label: {
              text: "zip",
            },
            remote_connection: {},
          },
        },
        {
          kind: "create",
          tick: 5,
          entity: {
            id: TEST_ID,
            label: {
              text: "TEST_ID",
            },
          },
        }
      ),
      {
        kind: "create",
        tick: 5,
        entity: {
          id: TEST_ID,
          label: {
            text: "TEST_ID",
          },
        },
      }
    );
  });

  it("Update on undefined", () => {
    assert.deepEqual(
      mergeChange(undefined, {
        kind: "update",
        tick: 1,
        entity: {
          id: TEST_ID,
          label: {
            text: "TEST_ID",
          },
        },
      }),
      {
        kind: "update",
        tick: 1,
        entity: {
          id: TEST_ID,
          label: {
            text: "TEST_ID",
          },
        },
      }
    );
  });

  it("Update on create", () => {
    assert.deepEqual(
      mergeChange(
        {
          kind: "create",
          tick: 4,
          entity: {
            id: TEST_ID,
            label: {
              text: "bar",
            },
          },
        },
        {
          kind: "update",
          tick: 1,
          entity: {
            id: TEST_ID,
            label: null,
            remote_connection: {},
          },
        }
      ),
      {
        kind: "create",
        tick: 4,
        entity: {
          id: TEST_ID,
          label: {
            text: "bar",
          },
        },
      }
    );

    assert.deepEqual(
      mergeChange(
        {
          kind: "create",
          tick: 1,
          entity: {
            id: TEST_ID,
            label: {
              text: "bar",
            },
          },
        },
        {
          kind: "update",
          tick: 4,
          entity: {
            id: TEST_ID,
            label: null,
            remote_connection: {},
          },
        }
      ),
      {
        kind: "create",
        tick: 4,
        entity: {
          id: TEST_ID,
          remote_connection: {},
        },
      }
    );
  });

  it("Update on delete", () => {
    assert.deepEqual(
      mergeChange(
        {
          kind: "delete",
          tick: 1,
          id: TEST_ID,
        },
        {
          kind: "update",
          tick: 3,
          entity: {
            id: TEST_ID,
            label: {
              text: "TEST_ID",
            },
          },
        }
      ),
      {
        kind: "update",
        tick: 3,
        entity: {
          id: TEST_ID,
          label: {
            text: "TEST_ID",
          },
        },
      }
    );
  });

  it("Update on update", () => {
    assert.deepEqual(
      mergeChange(
        {
          kind: "update",
          tick: 2,
          entity: {
            id: TEST_ID,
            label: undefined,
            remote_connection: {},
          },
        },
        {
          kind: "update",
          tick: 4,
          entity: {
            id: TEST_ID,
            label: {
              text: "TEST_ID",
            },
            remote_connection: undefined,
          },
        }
      ),
      {
        kind: "update",
        tick: 4,
        entity: {
          id: TEST_ID,
          label: {
            text: "TEST_ID",
          },
          remote_connection: undefined,
        },
      }
    );
  });

  it("Delete on undefined", () => {
    assert.deepEqual(
      mergeChange(undefined, {
        kind: "delete",
        tick: 1,
        id: TEST_ID,
      }),
      {
        kind: "delete",
        tick: 1,
        id: TEST_ID,
      }
    );
  });

  it("Delete on create", () => {
    assert.deepEqual(
      mergeChange(
        {
          kind: "create",
          tick: 3,
          entity: {
            id: TEST_ID,
            label: {
              text: "bar",
            },
            remote_connection: {},
          },
        },
        {
          kind: "delete",
          tick: 4,
          id: TEST_ID,
        }
      ),
      {
        kind: "delete",
        tick: 4,
        id: TEST_ID,
      }
    );
  });

  it("Delete on delete", () => {
    assert.deepEqual(
      mergeChange(
        {
          kind: "delete",
          tick: 2,
          id: TEST_ID,
        },
        {
          kind: "delete",
          tick: 3,
          id: TEST_ID,
        }
      ),
      {
        kind: "delete",
        tick: 3,
        id: TEST_ID,
      }
    );
  });

  it("Delete on update", () => {
    assert.deepEqual(
      mergeChange(
        {
          kind: "update",
          tick: 2,
          entity: {
            id: TEST_ID,
            label: {
              text: "zip",
            },
            remote_connection: {},
          },
        },
        {
          kind: "delete",
          tick: 5,
          id: TEST_ID,
        }
      ),
      {
        kind: "delete",
        tick: 5,
        id: TEST_ID,
      }
    );
  });
});

describe("Changes can be applied", () => {
  it("Can create", () => {
    assert.deepEqual(
      applyProposedChange(
        {
          id: TEST_ID,
          label: {
            text: "zip",
          },
        },
        {
          kind: "create",
          entity: {
            id: TEST_ID,
            remote_connection: {},
          },
        }
      ),
      {
        id: TEST_ID,
        remote_connection: {},
      }
    );
  });
  it("Can update", () => {
    assert.deepEqual(
      applyProposedChange(
        {
          id: TEST_ID,
          label: {
            text: "zip",
          },
        },
        {
          kind: "update",
          entity: {
            id: TEST_ID,
            label: {
              text: "zap",
            },
          },
        }
      ),
      {
        id: TEST_ID,
        label: {
          text: "zap",
        },
      }
    );

    assert.deepEqual(
      applyProposedChange(
        {
          id: TEST_ID,
          label: {
            text: "zip",
          },
        },
        {
          kind: "update",
          entity: {
            id: TEST_ID,
            label: null,
            remote_connection: {},
          },
        }
      ),
      {
        id: TEST_ID,
        remote_connection: {},
      }
    );

    assert.deepEqual(
      applyProposedChange(
        {
          id: TEST_ID,
          label: {
            text: "zip",
          },
        },
        {
          kind: "update",
          entity: {
            id: TEST_ID,
            label: null,
            remote_connection: {},
          },
        }
      ),
      {
        id: TEST_ID,
        remote_connection: {},
      }
    );
  });
  it("Can delete", () => {
    assert.deepEqual(
      applyProposedChange(
        {
          id: TEST_ID,
        },
        {
          kind: "delete",
          id: TEST_ID,
        }
      ),
      undefined
    );
  });
});

describe("Changes can be serialized", () => {
  const serialize = (change: Change) =>
    JSON.stringify(ChangeSerde.serialize(SerializeForServer, change));
  const deserialize = (change: string) =>
    ChangeSerde.deserialize(JSON.parse(change));

  const assertRoundtrips = (change: Change) => {
    assert.deepEqual(deserialize(serialize(change)), change);
  };
  it("Create roundtrips", () => {
    assertRoundtrips({
      kind: "create",
      tick: 23,
      entity: {
        id: TEST_ID,
        label: {
          text: "bar",
        },
      },
    });
    assert.deepEqual(
      deserialize(
        serialize({
          kind: "create",
          tick: 23,
          entity: {
            id: TEST_ID,
            remote_connection: undefined,
          },
        })
      ),
      {
        kind: "create",
        tick: 23,
        entity: {
          id: TEST_ID,
        },
      }
    );
  });

  it("Update roundtrips", () => {
    assertRoundtrips({
      kind: "update",
      tick: 25,
      entity: {
        id: TEST_ID,
        remote_connection: null,
        label: {
          text: "bar",
        },
      },
    });
  });

  it("Delete roundtrips", () => {
    assertRoundtrips({
      kind: "delete",
      tick: 28,
      id: TEST_ID,
    });
  });
});
