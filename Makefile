# Local spec-workflow MCP dashboard.
#
# The dashboard is a single shared instance on port 5000, run from the latest
# published npm package via npx.
SPEC_WORKFLOW_PKG := @madmatt112org/spec-workflow-mcp@latest
DASHBOARD_PORT := 5000

.PHONY: dashboard
# Free the port (kills ANY dashboard holding it — local dist, npx, or global
# install), then start the latest package's dashboard (foreground).
dashboard:
	-fuser -k $(DASHBOARD_PORT)/tcp 2>/dev/null
	sleep 1
	npx -y $(SPEC_WORKFLOW_PKG) --dashboard --port $(DASHBOARD_PORT)

.PHONY: dev
# Velite in watch mode alongside Next on port 3013. Content edits under
# content/ re-validate and hot-reload.
dev:
	pnpm dev
