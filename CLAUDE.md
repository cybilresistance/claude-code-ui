# Claude Code UI

## Development

- When running the development server, always run it in the background using `run_in_background: true` so you can test the functionality while it's running

## Production Deployment

- Production runs on port 8000 with automatic PM2 detection
- To redeploy production, use: `npm run build && npm start`
- The start script automatically detects PM2 availability and restarts existing processes or starts new ones
- PM2 commands: `pm2 list`, `pm2 logs claude-code-ui`, `pm2 restart claude-code-ui`

## Workflow Instructions

- When work is completed, commit and push changes to the repository
- After committing and pushing, ask the user if they'd like to reboot production to deploy the changes
