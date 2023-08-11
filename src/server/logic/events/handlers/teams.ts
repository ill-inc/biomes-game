import type { EventContext } from "@/server/logic/events/core";
import { makeEventHandler, newId } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { Delta, DeltaWith } from "@/shared/ecs/gen/delta";
import { ok } from "assert";

function joinTeam(
  player: Delta,
  team: DeltaWith<"team">,
  context: EventContext<{}>
) {
  const mutTeam = team.mutableTeam();
  mutTeam.pending_invites.delete(player.id);

  if (mutTeam.members.has(player.id)) {
    return;
  }

  mutTeam.members.set(player.id, {
    joined_at: secondsSinceEpoch(),
  });
  player.setPlayerCurrentTeam({
    team_id: team.id,
  });

  context.publish({
    kind: "joinedTeam",
    entityId: player.id,
    teamId: team.id,
  });
}

const createTeamEventHandler = makeEventHandler("createTeamEvent", {
  involves: (event) => ({
    player: q.player(event.id),
    newTeamId: newId(),
  }),
  apply: ({ player, newTeamId }, event, context) => {
    ok(!player.delta().playerCurrentTeam(), "Player is already in a team");
    context.create({
      id: newTeamId,
      label: {
        text: event.name,
      },
      team: {
        members: new Map([[player.id, { joined_at: secondsSinceEpoch() }]]),
        pending_invites: new Map(),
        color: undefined,
        hero_photo_id: undefined,
        icon: undefined,
        pending_requests: [],
      },
      created_by: {
        created_at: secondsSinceEpoch(),
        id: player.id,
      },
    });

    player.delta().setPlayerCurrentTeam({
      team_id: newTeamId,
    });
  },
});

const updateTeamMetadataEventHandler = makeEventHandler(
  "updateTeamMetadataEvent",
  {
    involves: (event) => ({
      player: q.player(event.id),
      team: q.id(event.team_id).with("team"),
    }),
    apply: ({ player, team }, event) => {
      ok(
        team.team().members.has(player.id),
        "Player is not a member of the team"
      );

      const mutTeam = team.mutableTeam();
      if (event.name) {
        team.mutableLabel().text = event.name;
      }

      if (event.color) {
        mutTeam.color = event.color;
      }

      if (event.hero_photo_id) {
        mutTeam.hero_photo_id = event.hero_photo_id;
      }

      if (event.icon) {
        mutTeam.icon = event.icon;
      }
    },
  }
);

const invitePlayerToTeamEventHandler = makeEventHandler(
  "invitePlayerToTeamEvent",
  {
    involves: (event) => ({
      inviter: q.player(event.id),
      invitee: q.player(event.player_id),
      team: q.id(event.team_id).with("team"),
    }),
    apply: ({ inviter, invitee, team }, _event, context) => {
      ok(inviter.delta().playerCurrentTeam()?.team_id === team.id);
      ok(!team.team().members.has(invitee.id));

      team.mutableTeam().pending_invites.set(invitee.id, {
        created_at: secondsSinceEpoch(),
        inviter_id: inviter.id,
        invitee_id: invitee.id,
      });

      context.publish({
        kind: "invitedToTeam",
        entityId: invitee.id,
        teamId: team.id,
        inviterId: inviter.id,
      });
    },
  }
);

const joinTeamEventHandler = makeEventHandler("joinTeamEvent", {
  involves: (event) => ({
    player: q.player(event.id),
    team: q.id(event.team_id).with("team"),
  }),
  apply: ({ player, team }, _event, context) => {
    const currentPending = team.team().pending_invites.get(player.id);
    ok(currentPending, "No pending invite");

    joinTeam(player.delta(), team, context);

    context.publish({
      kind: "inviteeAcceptedInvite",
      entityId: currentPending.inviter_id,
      inviteeId: player.id,
      teamId: team.id,
    });
  },
});

const quitTeamEventHandler = makeEventHandler("quitTeamEvent", {
  involves: (event) => ({
    player: q.player(event.id),
    team: q.id(event.team_id).with("team"),
  }),
  apply: ({ player, team }, _event, context) => {
    ok(team.team().members.has(player.id), "Player not in requested team");

    const mutTeam = team.mutableTeam();
    mutTeam.members.delete(player.id);

    if (mutTeam.members.size === 0) {
      context.delete(team.id);
    }

    player.delta().clearPlayerCurrentTeam();
  },
});

const declineTeamInviteEventHandler = makeEventHandler(
  "declineTeamInviteEvent",
  {
    involves: (event) => ({
      player: q.player(event.id),
      team: q.id(event.team_id).with("team"),
    }),
    apply: ({ player, team }) => {
      ok(team.team().pending_invites.has(player.id));

      const mutTeam = team.mutableTeam();
      mutTeam.pending_invites.delete(player.id);
    },
  }
);

const kickTeamMemberEventHandler = makeEventHandler("kickTeamMemberEvent", {
  involves: (event) => ({
    player: q.player(event.id),
    kickedPlayer: q.player(event.kicked_player_id),
    team: q.id(event.team_id).with("team"),
  }),
  apply: ({ player, kickedPlayer, team }) => {
    ok(team.team().members.has(player.id));
    ok(team.team().members.has(kickedPlayer.id));

    const mutTeam = team.mutableTeam();
    mutTeam.members.delete(kickedPlayer.id);
    kickedPlayer.delta().clearPlayerCurrentTeam();
  },
});

const cancelTeamInviteEventHandler = makeEventHandler("cancelTeamInviteEvent", {
  involves: (event) => ({
    player: q.player(event.id),
    invitee: q.player(event.invitee_id),
    team: q.id(event.team_id).with("team"),
  }),
  apply: ({ player, invitee, team }) => {
    ok(team.team().pending_invites.has(invitee.id));
    ok(team.team().members.has(player.id));

    const mutTeam = team.mutableTeam();
    mutTeam.pending_invites.delete(invitee.id);
  },
});

const requestToJoinTeamEventHandler = makeEventHandler(
  "requestToJoinTeamEvent",
  {
    involves: (event) => ({
      requester: q.player(event.entity_id),
      team: q.id(event.team_id).with("team"),
    }),
    apply: ({ requester, team }, _event, context) => {
      ok(requester?.delta().playerCurrentTeam() === undefined);
      const mutTeam = team.mutableTeam();
      ok(
        mutTeam.pending_requests.find(
          (request) => request.entity_id === requester.id
        ) === undefined
      );

      mutTeam.pending_requests.push({
        entity_id: requester.id,
        created_at: secondsSinceEpoch(),
      });

      context.publish({
        kind: "requestedToJoinTeam",
        entityId: requester.id,
        teamId: team.id,
      });
    },
  }
);

const cancelRequestToJoinTeamEventHandler = makeEventHandler(
  "cancelRequestToJoinTeamEvent",
  {
    involves: (event) => ({
      requester: q.player(event.entity_id),
      team: q.id(event.team_id).with("team"),
    }),
    apply: ({ requester, team }) => {
      ok(requester?.delta().playerCurrentTeam() === undefined);
      const mutTeam = team.mutableTeam();
      mutTeam.pending_requests = mutTeam.pending_requests.filter(
        (r) => r.entity_id !== requester.id
      );
    },
  }
);

const respondToJoinTeamRequestEventHandler = makeEventHandler(
  "respondToJoinTeamRequestEvent",
  {
    involves: (event) => ({
      // We includeIced() because the player may be offline.
      requester: q.player(event.entity_id).includeIced(),
      team: q.id(event.team_id).with("team"),
    }),
    apply: ({ requester, team }, event, context) => {
      ok(requester?.delta().playerCurrentTeam() === undefined);
      const mutTeam = team.mutableTeam();
      ok(
        mutTeam.pending_requests.find(
          (request) => request.entity_id === requester.id
        ) !== undefined
      );

      mutTeam.pending_requests = mutTeam.pending_requests.filter(
        (r) => r.entity_id !== requester.id
      );

      if (event.response === "accept") {
        joinTeam(requester.delta(), team, context);
        context.publish({
          kind: "requestToJoinTeamAccepted",
          entityId: requester.id,
          teamId: team.id,
        });
      }
    },
  }
);

export const allTeamEventHandlers = [
  createTeamEventHandler,
  updateTeamMetadataEventHandler,
  quitTeamEventHandler,
  joinTeamEventHandler,
  invitePlayerToTeamEventHandler,
  declineTeamInviteEventHandler,
  kickTeamMemberEventHandler,
  cancelTeamInviteEventHandler,
  requestToJoinTeamEventHandler,
  respondToJoinTeamRequestEventHandler,
  cancelRequestToJoinTeamEventHandler,
];
