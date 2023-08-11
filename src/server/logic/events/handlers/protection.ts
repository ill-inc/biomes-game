import { makeEventHandler } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { log } from "@/shared/logging";
import { ok } from "assert";

export const updateProjectedRestorationEventHandler = makeEventHandler(
  "updateProjectedRestorationEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      player: event.id,
      entity: q.id(event.entity_id),
    }),
    apply: ({ entity, player }, event, _context) => {
      const creator = entity.createdBy()?.id;
      if (creator !== player.id) {
        log.error("Cannot modify an entity you didn't create");
        return;
      }

      const projectsProtection = entity.mutableProjectsProtection();
      ok(
        projectsProtection.restoration,
        "Expected restoration to be present on entity being updated."
      );

      if (event.restore_delay_s !== undefined) {
        projectsProtection.restoration.restore_delay_s = event.restore_delay_s;
      }
    },
  }
);
