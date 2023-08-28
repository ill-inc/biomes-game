---
sidebar_position: 1
---

# Overview

## Problem

Biomes is a [Next.js](https://nextjs.org/) app with a [Three.js](https://threejs.org/) renderer.
React uses react state to manage resources, and Three.js doesn't have an out-of-the-box solution for state management;
typically refreshing a Three.js app will reset the scene.

There are a few problems here:

1. How to persist Three.js game state.
2. How to update React state when the Three.js game state changes, triggering a re-render.
3. How to update the Three.js game state when the React state changes.

Moreover, there is the problem of defining dependencies between resources. For instance, we may want to change
the player's appearance if their health is below a certain point. How can we describe this dependency between the player's appearance
and their health?

## Resource System

The resource system was created to solve these problems and is composed of a few components, the main ones being:

1. `BiomesResourcesBuilder`: Used to define resources.
2. `TypedResourceDeps`: Used to define dependencies between resources, using [dependency injection](https://en.wikipedia.org/wiki/Dependency_injection).
3. `TypedResources`: Used to access resources.
4. `ReactResources`: Used to access resources from within React components.
5. `ResourcePaths`: Typed resource keys with paths that define arguments for lookups.
