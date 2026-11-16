# Architecture rules

- The signup club directory uses a public read-only SQL function exposing only club IDs, names and cities, called through a publishable server client; this supports signed-out registration without exposing club owners or widening table access.
- Each sidebar destination has a dedicated content route and an entry in the shared menu registry, so navigation and access-level configuration stay aligned.
- Member awards use recipient-scoped reads and explicit laurear view/create/edit permissions in RLS; edits preserve original attribution and automatically record the latest editor and timestamp, while deletion stays blocked.
- Events, clubs and missions SELECT policies require an active approved member or a server-verified administrator; signed-out signup uses only the minimal club-directory function to avoid exposing full records.
- Profile award sections reuse LionsAwards with the viewed recipient ID; database visibility rules remain authoritative so visiting a profile does not widen award access.- Poll votes are readable only by the voter; members see totals through a security-definer results function, and the vote insert policy enforces the poll's start/end window so results stay anonymous and timing can't be bypassed.
