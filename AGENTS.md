# Architecture rules

- The signup club directory uses a public read-only SQL function exposing only club IDs, names and cities, called through a publishable server client; this supports signed-out registration without exposing club owners or widening table access.
- Each sidebar destination has a dedicated content route and an entry in the shared menu registry, so navigation and access-level configuration stay aligned.