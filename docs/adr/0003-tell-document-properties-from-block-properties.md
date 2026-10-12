# 0003 Tell document properties from block properties by the property dataset's entity type

Status: accepted (2026-10-12)

## Context

The drawer reads a stored value by document key and property alias. A property inside a block (block list, block
grid, rich text blocks) has neither: its value lives inside the parent block property's JSON. The drawer must
tell the two apart, and the brief left open which context identifies a block property.

## Decision

Use the nearest `UMB_PROPERTY_DATASET_CONTEXT`. Its `getEntityType()` is `document` for a document property
(`UmbDocumentPropertyDatasetContext`) and `element` for a property inside a block
(`UmbBlockElementManager.getEntityType()`, used by `UmbBlockElementPropertyDatasetContext`), whether the block
is edited in its modal or inline. `getUnique()` is then the document key or the block's content key.

Only `document` gets the Stored and Diff tabs; any other entity type shows the Editor tab alone.

## Consequences

- Media and member properties (entity types `media`, `member`) fall into the "Editor only" path for free, in
  line with documents being the only supported stored source.
