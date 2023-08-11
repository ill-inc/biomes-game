import type { EventContext } from "@/server/logic/events/core";
import {
  makeEventHandler,
  newId,
  RollbackError,
} from "@/server/logic/events/core";

import { q } from "@/server/logic/events/query";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { Delta } from "@/shared/ecs/gen/delta";
import { patternAsBag } from "@/shared/game/inventory";
import { itemBagToString } from "@/shared/game/items_serde";
import type { BiomesId } from "@/shared/ids";
import { ok } from "assert";

function deleteTrade(
  tradeId: BiomesId,
  player1: Delta | undefined,
  player2: Delta | undefined,
  context: EventContext<{}>
) {
  const mut1Trades = player1?.mutableActiveTrades();
  const mut2Trades = player2?.mutableActiveTrades();

  if (mut1Trades) {
    mut1Trades.trades = mut1Trades.trades.filter((e) => e.trade_id !== tradeId);
  }

  if (mut2Trades) {
    mut2Trades.trades = mut2Trades.trades.filter((e) => e.trade_id !== tradeId);
  }
  context.delete(tradeId);
}

const beginTradeEventHandler = makeEventHandler("beginTradeEvent", {
  involves: (event) => ({
    player1: q.player(event.id),
    player2: q.player(event.id2),
    newTradeId: newId(),
  }),
  apply: ({ player1, player2, newTradeId }, event, context) => {
    ok(player1.id !== player2.id);
    context.create({
      id: newTradeId,
      trade: {
        trader1: {
          id: player1.id,
          accepted: false,
          offer_assignment: [],
        },
        trader2: {
          id: player2.id,
          accepted: false,
          offer_assignment: [],
        },
        trigger_at: secondsSinceEpoch() + 60 * 60 * 24,
      },
    });

    const mutActive1 = player1.delta().mutableActiveTrades();
    const mutActive2 = player2.delta().mutableActiveTrades();

    mutActive1.trades.push({
      trade_id: newTradeId,
      id1: player1.id,
      id2: player2.id,
    });

    mutActive2.trades.push({
      trade_id: newTradeId,
      id1: player1.id,
      id2: player2.id,
    });

    context.publish({
      kind: "beginTrade",
      entityId: player1.id,
      entity2Id: player2.id,
      tradeId: newTradeId,
    });
  },
});

const acceptTradeHandler = makeEventHandler("acceptTradeEvent", {
  involves: (event) => ({
    player: q.player(event.id),
    otherTraderPlayer: q.player(event.other_trader_id),
    trade: q.id(event.trade_id).with("trade"),
  }),
  apply: ({ player, trade, otherTraderPlayer }, event, context) => {
    const mutTrade = trade.mutableTrade();
    ok(player.id === mutTrade.trader1.id || player.id === mutTrade.trader2.id);
    ok(
      otherTraderPlayer.id === mutTrade.trader1.id ||
        otherTraderPlayer.id === mutTrade.trader2.id
    );
    ok(otherTraderPlayer.id !== player.id);

    const playerTrader =
      player.id === mutTrade.trader1.id ? mutTrade.trader1 : mutTrade.trader2;
    const otherTrader =
      otherTraderPlayer.id === mutTrade.trader1.id
        ? mutTrade.trader1
        : mutTrade.trader2;

    playerTrader.accepted = true;

    if (playerTrader.accepted && otherTrader.accepted) {
      // First try an exact match, fallback to taking from any slot

      for (const [player1, trader1, player2, trader2] of [
        [player, playerTrader, otherTraderPlayer, otherTrader],
        [otherTraderPlayer, otherTrader, player, playerTrader],
      ] as const) {
        const offer1Bag = patternAsBag(trader1.offer_assignment);
        const offer2Bag = patternAsBag(trader2.offer_assignment);
        if (player1.inventory.canTake(trader1.offer_assignment)) {
          player1.inventory.take(trader1.offer_assignment);
          player2.inventory.giveWithInventoryOverflow(offer1Bag);
        } else if (player1.inventory.tryTakeBag(offer1Bag)) {
          player1.inventory.giveWithInventoryOverflow(offer1Bag);
        } else {
          throw new RollbackError(
            `Trade failed due to offer not in inventory of ${player1.id}`
          );
        }
        context.publish({
          kind: "userCompletedTrade",
          entityId: player1.id,
          sentItems: itemBagToString(offer1Bag),
          otherEntityId: player2.id,
          receivedItems: itemBagToString(offer2Bag),
          tradeId: trade.id,
        });
      }

      deleteTrade(trade.id, player.delta(), otherTraderPlayer.delta(), context);
    }
  },
});

const changeTradeOfferHandler = makeEventHandler("changeTradeOfferEvent", {
  involves: (event) => ({
    player: q.player(event.id),
    trade: q.id(event.trade_id).with("trade"),
  }),
  apply: ({ player, trade }, event) => {
    const mutTrade = trade.mutableTrade();
    ok(player.id === mutTrade.trader1.id || player.id === mutTrade.trader2.id);
    ok(player.inventory.canTake(event.offer));

    const trader =
      player.id === mutTrade.trader1.id ? mutTrade.trader1 : mutTrade.trader2;
    const otherTrader =
      player.id === mutTrade.trader1.id ? mutTrade.trader2 : mutTrade.trader1;
    trader.offer_assignment = event.offer;
    trader.accepted = false;
    otherTrader.accepted = false;
  },
});

const expireTradeEventHandler = makeEventHandler("expireTradeEvent", {
  prepareInvolves: (event) => ({
    trade: q.id(event.id).with("trade"),
  }),
  prepare: ({ trade }) => ({
    player1Id: trade.trade.trader1.id,
    player2Id: trade.trade.trader2.id,
  }),
  involves: (event, { player1Id, player2Id }) => ({
    trade: q.id(event.id).with("trade"),
    player1: q.player(player1Id).optional(),
    player2: q.player(player2Id).optional(),
  }),
  apply: ({ trade, player1, player2 }, event, context) => {
    deleteTrade(trade.id, player1?.delta(), player2?.delta(), context);
  },
});

export const allTradeEventHandlers = [
  beginTradeEventHandler,
  acceptTradeHandler,
  changeTradeOfferHandler,
  expireTradeEventHandler,
];
