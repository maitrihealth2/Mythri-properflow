---
name: push-daily-logs
description: >-
  Pushes the contents of the `fareed_logs` folder to the separate Daily-logs GitHub repository (https://github.com/maitrihealth2/Daily-logs.git) without affecting the main project repository.
---

# Push Daily Logs

## Overview
This skill pushes the user's daily development logs stored in the `fareed_logs/` folder to a separate GitHub repository (`Daily-logs.git`) so they are safely backed up without cluttering the main `maitri-v7.2` repository.

## Workflow
When the user asks to "push my logs to repo", "backup my logs", or "push fareed logs", execute the following PowerShell command in the workspace root (`d:\Maitri V5`).

This command automatically creates a temporary git repository, copies the `fareed_logs` folder into it, commits the files, force-pushes them to the Daily-logs repository, and cleans up the temporary folder. 

```powershell
mkdir temp_log_repo; cd temp_log_repo; git init; Copy-Item ..\fareed_logs . -Recurse; git add .; git commit -m "Update daily logs"; git remote add origin https://github.com/maitrihealth2/Daily-logs.git; git branch -M main; git push -u -f origin main; cd ..; Remove-Item -Recurse -Force temp_log_repo
```

Use the `run_command` tool to execute this one-liner. You do not need to ask the user for the repository URL, it is hardcoded above.
