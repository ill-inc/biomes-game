---
title: Bikkie
description: Static content definitions
order: 40
---

[Bikkie](https://github.com/{{ site.ghrepo }}/blob/main/src/shared/bikkie) is a unified system for static content definition, computation, and editing.

When running locally, our admin interface can be found at [`localhost:3000/admin`](http://localhost:3000/admin) and has many functions that assist in modifying Bikkie.

Each content item is a "Biscuit", and has a unique ID with a collection of `attributes`, which include things such as `action`, `sellPrice`, and even complex behavior such as `farming`.

Important to note is that Bikkie only controls static content, such as item definitions. Anything dynamic, such as player inventory, terrain, or muckling position, can be based on biscuit definitions, but instead live in `ECS`.

# Biscuit Editor
![admin page](assets/images/admin-page.png)

The primary admin page is the general Biscuit editor. From here, you can find any biscuit in Biomes and inspect, add, delete, or modify any attributes on them.


![stone](assets/images/admin-stone.png)

Filtering Biscuits to `/blocks` shows us only block Biscuits in the game, and searching for `stone` shows us different types of stone blocks.

On the biscuit editor, you can see some attributes, including the `drop` attribute, which controls the items that are created in a drop when the block is broken.

Each attribute has a domain-specific editor, which can be edited. Here, I'm changing the 100% drop rate of a `stone` to a 20% drop rate of a `stick`.

![stone edit](assets/images/admin-stone-edit.png)

Modifying these attributes will allow you to save their updates. Changes made locally are not shared to prod, but instead kept as a local modification. Any modification is near-instantly live for the environment it's modified in.

## Domain-specific editors
In addition to the general Biscuit editor, which is sufficient for simpler biscuits, such as blocks and items, we have the quests, item check, and particle editors, available in the navigation bar.

# Biscuit Schemas
Biscuit schemas are defined in [shared/bikkie/schema/biomes.ts](https://github.com/{{ site.ghrepo }}/blob/main/src/shared/bikkie/schema/biomes.ts), with attributes defined in [shared/bikkie/schema/attributes.ts](https://github.com/{{ site.ghrepo }}/blob/main/src/shared/bikkie/schema/attributes.ts)

Admin UIs are defined in [client/components/admin/bikkie/attributes/AttributeValueEditor.tsx](https://github.com/{{ site.ghrepo }}/blob/main/src/client/components/admin/bikkie/attributes/AttributeValueEditor.tsx)

The most common usage of a Biscuit is to look up attribute values. This can be accomplished a number of ways, but a common method is to use the Biscuit as an item:

```ts
const val = anItem(BISCUIT_ID).attribute
```



