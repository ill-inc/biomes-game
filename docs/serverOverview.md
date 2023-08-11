---
title: Server Overview
description: What our servers do and how they talk to each other
order: 20
---

Biomes server functions are divided across multiple microservices, to be able to scale efficiently according to demand.

![Server Architecture](images/biomes-server-architecture.png)

- When a player loads the game, they load a client from the `web` server.
- The client then loads assets from the `asset` server, and establishes a connection with the `sync` server to fetch ECS data local to their player's position.
- Players' interactions primarily send ECS events to the `logic` server, but can also make calls to `web`, `chat`, `oob`, and `map` directly.
- Interactions are relayed to players primarily through ECS updates, which are synced to the client with the `sync` server
- Other servers are not directly player driven, but changes are made to ECS components that are synced similarly through the `sync` server. An example is the `newton` moving dropped items independently from any player interactions. `trigger`, `task`, `newton`, `anima`, and `gaia` all fall into the pattern.

When running locally, you can specify a subset of servers that you're interested in running by specifying the server names, i.e. `./b web trigger`. Servers will automatically start any servers they depend upon to run correctly.

# [Servers](https://github.com/{{ site.ghrepo }}/tree/main/src/server)

## [Web](https://github.com/{{ site.ghrepo }}/tree/main/src/server/web)
- NextJS based Web server
- Serves all API endpoints, the main splash page, and the admin site
- Stateless

## [Logic](https://github.com/{{ site.ghrepo }}/tree/main/src/server/logic)
- Runs high-level events for players, typically those that edit terrain

Most player events will create logic server events through [ECS](ecs.md).

Logic server events are defined by ECS event handlers in [`server/logic/events/all.ts`](https://github.com/{{ site.ghrepo }}/blob/main/src/server/logic/events/all.ts)

If you are intending to modify or add player-facing game interactions or logic, this is likely the place to start.

## [Asset](https://github.com/{{ site.ghrepo }}/tree/main/src/server/asset)
- Is just another copy of the Web server
- Different tier of servers as they have different characteristics due to running Python
- Generates the player mesh

## [Trigger](https://github.com/{{ site.ghrepo }}/tree/main/src/server/trigger)
- Listens to the Firehose, and has a time-based processor - both are inputs to triggers
- Triggers produce game updates, they:
    - Unlock recipes
    - Handle quest progression
    - Handle expiry / icing / timeouts

## [Chat](https://github.com/{{ site.ghrepo }}/tree/main/src/server/chat)
- Uses a distributed lock to maintain a single instance
- Distributes chat messages to sync servers
- Processes a pub-sub feed of chats to guarantee distribution and storage
- Publishes firehose events around DMs

## [Task](https://github.com/{{ site.ghrepo }}/tree/main/src/server/task)
- Processes long-lived asynchronous tasks
- Interacts with Firestore, produces Game events, interacts with crypto
- API is indirect, you schedule tasks by creating them in Firestore

## [Sync](https://github.com/{{ site.ghrepo }}/tree/main/src/server/sync)
- WebSocket termination endpoint for clients
- Maintains a copy of the entire world as a replica, serves the relevant parts of this to clients connected to it
- Publishes, on behalf of clients, game events

## [OOB](https://github.com/{{ site.ghrepo }}/tree/main/src/server/oob)
- Copy of sync server for directly serving individual entities out of band
- Used for loading distant data to clients

## [Newton](https://github.com/{{ site.ghrepo }}/tree/main/src/server/newton)
- Handles drops, their physics and when they get picked up

## [Anima](https://github.com/{{ site.ghrepo }}/tree/main/src/server/anima)
- Handles the AI for NPCs in the world, is sharded so each server only handles a subset

## [Map](https://github.com/{{ site.ghrepo }}/tree/main/src/server/map)
- Periodically generates the top-down rendering of the world for the map

## [Replica](https://github.com/{{ site.ghrepo }}/tree/main/src/server/replica)
- To eliminate the fan-out cost being directly impacting on the game, anyone who needs a copy of the world shall subscribe to a replica tier
- Maintains a copy of the world, subscribes directly to the World
- Supports the subscription part of the current Game API

## [Gaia](https://github.com/{{ site.ghrepo }}/tree/main/src/server/gaia_v2)
Gaia authoritively controls all "natural" game simulation in game:
- Lighting
- Muck Creep
- Plant growth and regrowth
- Farming

## [Redis / Redis Bridge](https://github.com/{{ site.ghrepo }}/tree/main/src/redis)
- Main storage for the world data, and an ability to provide transactions ontop of it.
- Bridge component maps updates that occur in Redis to the Firehose, only one bridge is running at a time.

## ETCD
- Distributed locks are maintained using a running etcd server
