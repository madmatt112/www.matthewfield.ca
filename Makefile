# Local spec-workflow MCP dashboard.
#
# The dashboard is a single shared instance on port 5000, run from the LOCAL
# build at $(SPEC_WORKFLOW_DIR)/dist. The server runs from dist/, not the TS
# source — rebuild after editing the MCP server source or you'll run stale code:
#   cd $(SPEC_WORKFLOW_DIR) && npm run build
SPEC_WORKFLOW_DIR := /home/mcf/reference/spec-workflow-mcp
DASHBOARD_PORT := 5000

.PHONY: dashboard
# Free the port (kills ANY dashboard holding it — local dist, npx, or global
# install), then start the local build's dashboard (foreground).
dashboard:
	-fuser -k $(DASHBOARD_PORT)/tcp 2>/dev/null
	sleep 1
	node $(SPEC_WORKFLOW_DIR)/dist/index.js --dashboard --port $(DASHBOARD_PORT)
