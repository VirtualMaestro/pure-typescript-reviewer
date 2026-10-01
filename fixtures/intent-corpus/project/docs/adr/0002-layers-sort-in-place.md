# 2. Layers are sorted in place

Status: accepted

## Context

The renderer holds one `Layer[]` for the lifetime of a scene and draws it every frame. Layers
change depth rarely, so the array is almost always already in order.

## Decision

`sortLayers` sorts the caller's array in place. It does not return a sorted copy: the renderer
keeps the array between frames, and a copy per frame would allocate for an order that is
already right.

## Consequences

Callers must not rely on the order they inserted layers in once `sortLayers` has run.
