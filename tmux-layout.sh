#!/usr/bin/env bash
#
# Launch a tmux session with three panes:
#   ┌───────────┬───────────┐
#   │   top-L   │   top-R   │   (each 50% width, ~70% height)
#   ├───────────┴───────────┤
#   │        bottom         │   (full width, 30% height)
#   └───────────────────────┘
#
set -euo pipefail

SESSION="${1:-dev}"

# Connect to the session: switch-client if we're already inside tmux
# (attach refuses to nest), otherwise attach.
connect() {
  if [ -n "${TMUX:-}" ]; then
    exec tmux switch-client -t "$SESSION"
  else
    exec tmux attach-session -t "$SESSION"
  fi
}

# Always start clean: kill any existing session with this name so a
# half-built or stale layout can't be reattached by mistake.
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Create a detached session (this is the first/top-left pane).
tmux new-session -d -s "$SESSION"

# Split off the bottom pane taking 30% of the height.
tmux split-window -v -l 30% -t "$SESSION"

# Go back to the top pane and split it down the middle (two panes, 50/50).
tmux select-pane -t "$SESSION".0
tmux split-window -h -l 50% -t "$SESSION".0

# Start focused on the top-left pane and connect.
tmux select-pane -t "$SESSION".0
connect
