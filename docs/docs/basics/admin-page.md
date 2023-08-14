---
sidebar_position: 2
---

# Admin Page

Our admin page can be found at [`localhost:3000/admin`](http://localhost:3000/admin) when running servers locally.

Local modifications are not shared to prod.

Our admin pages are a mix of static and dynamic content inspectors and editors.

- Static content is driven by [Bikkie](./bikkie.md), and is the default landing admin page.
- Dynamic content is driven by [ECS](./ecs.md)

## Pages

### User Pages

You can search for users, inspect, and modify their state by using the "Search Username or ID" search box on the top left of the admin page.
![Admin User](/img/admin-user.png)

### ECS Entities

You can search for an ECS entity by ID and inspect its contents by using the "Search ECS Entity" search box on the top left of the admin page.
![Admin ECS](/img/admin-ecs.png)

Additionally, while in-game as an Admin account, you can bring up the in-game ECS editor to have a simplified editor, as well as inspect IDs by using the Tilde (\`) key.
![In-game ECS](/img/admin-ingame-ecs.png)

### Bikkie

Our general [Bikkie](./bikkie.md) editor, and default admin landing page)
![Bikkie](/img/admin-page.png)

### Quests

Our nodegraph showing quest progression. This is a specialized Bikkie editor.
![Quests](/img/admin-quests.png)

### Robots

Shows claimed areas of land.
![Robots](/img/admin-robots.png)

### Metaquests

An unfinished page on Metaquests, which are multi-player cooperative quests. Currently, these can only reset scores.

### Players

Lists all players registered in-game

### Player Presets

Presets are an internal testing feature to save and load specific player state.
![Presets](/img/admin-presets.png)

### Invites

Biomes was invite-only, so this created and tracked the usage of invite codes.

### Source Maps

When we see a crash or error in prod, client code has been minified. We use this tool to map to actual source code from a minified callstack.
![Source Map](/img/admin-source-map.png)

### Bikkie Log

Logs updates to Bikkie

### Item Check

A collection of scripts to identify Biscuits with potential problems
![Item Check](/img/admin-item-check.png)

### Image Selector

Selects images made by players to display on the front page
![Image Selector](/img/admin-image-selector.png)

### Particle Editor

Create and modify particles used in game
![Particle Editor](/img/admin-particle-editor.png)

## In-game editors and tweaks

Admin players have access to a number of in-game windows to inspect and administrate the game.

The primary editor can be accessed by hitting Tilde (\`), and has tweaks, and simplified Bikkie and ECS editors.
![In-game ECS](/img/admin-ingame-ecs.png)

## Art editor

We have a separate Art page at [localhost:3000/art](http://localhost:3000/art) that allows us to use new textures for new blocks, glass, and flora.
![Art Editor](/img/admin-art.png)
