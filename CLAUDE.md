@AGENTS.md

## Claude Code

- For work in the backoffice client, use the user-level `umbraco-backoffice-ui-developer` agent. The
  project facts it needs are under "Backoffice client facts" in AGENTS.md.
- A gitignored `CLAUDE.local.md` at the checkout root, when it exists, imports the maintainer's
  private brief and handoff and says where planning issues live. At the start of a session, read the
  handoff it points to: it holds the current state and the gotchas from the last session. Never
  reference those issues from this repository: no issue numbers in commits, code or docs.
