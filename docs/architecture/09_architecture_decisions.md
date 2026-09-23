# Architecture Decisions

Short records of decisions that are not obvious from the code. Newest first.

## ADR-004: The frontend is organized by feature

**Status:** accepted

**Context:** The application had grown into a single 1771-line `AppNew.tsx`
holding every screen, the API calls, the localStorage access and the
formatting helpers. Any change touched the same file, and shared logic was
copied between screens rather than reused.

**Decision:** Split by feature (`src/features/<feature>/`), with pure logic in
`utils/`, data access in `api.ts`, React state in hooks, and components that
only render. See [Building Block View](05_building_block_view.md#level-2-frontend).

**Consequences:** More files, but each has one reason to change; the dashboard
and the monitor now share one polling hook and one health function instead of
two similar implementations.

## ADR-003: One derived aggregated health value, shown in both screens

**Status:** accepted

**Context:** The dashboard's System health card was a constant - it always read
"Healthy / All systems operational", whatever the connectors reported. The
monitor computed its own overall health with a different rule, partly based on
how many recommendations happened to be on screen.

**Decision:** A single pure function, `computeSystemHealth()`, folds the
reported phases into `empty | critical | warning | deploying | healthy`, and
both cards call it. No placeholder values in a status position.

**Consequences:** The two screens cannot disagree. Changing the severity order
is a one-line change in one file. The rules are documented in
[Concepts](08_concepts.md#status-and-health-model).

## ADR-002: The browser polls; the backend does not schedule

**Status:** accepted

**Context:** Component health has to reflect the cluster, which changes without
the console being involved. Options were a backend scheduler writing status
into the database, a push channel (SSE/WebSocket), or client polling.

**Decision:** Health is computed on request, and the browser polls
`GET /api/components` every 60 seconds. No scheduler, no push channel.

**Consequences:** No background load when nobody is watching, and no extra
infrastructure. The cost is a delay of up to one interval before a change
appears, and each open tab creates its own load. If the number of components
grows, a push channel becomes the next step.

## ADR-001: Last good deployment state is cached in the browser

**Status:** accepted

**Context:** A single failed poll should not blank the tables an operator is
reading.

**Decision:** Every successful answer is written to `localStorage`; a failed
poll falls back to it and raises a stale-data banner. An authentication failure
clears the cache instead.

**Consequences:** The screen can show data that is older than the sync stamp
next to it, which is why the stamp is only updated on a successful poll.

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- Copyright (c) 2026 ARENA2036 e.V.
- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/edc-management-console
