# Claude Code UI

## Production Deployment

- Production runs on port 8000 via PM2
- To redeploy production, use: `npm run redeploy:prod`
- Do NOT kill port 8000 directly - use PM2 to manage the process
- PM2 commands: `pm2 list`, `pm2 logs claude-code-ui`, `pm2 restart claude-code-ui`
