# FureverCare - Claude Instructions

## Issue Triage Workflow

When starting a session, check for new GitHub issues:

```bash
gh issue list --repo gulati8/FureverCare --state open
```

For each new issue:

1. **Read and understand** - What is the user asking for?
2. **Research** - Check the codebase, understand feasibility
3. **Respond** - Comment with:
   - Acknowledgment
   - Clarifying questions (if needed)
   - Proposed approach (if clear)
   - Estimate complexity: small/medium/large
4. **Label** - Apply appropriate label: `bug`, `feature`, or `question`
5. **Implement or queue** - Small fixes can be done immediately; larger work gets planned

## Deployment

- CI/CD runs on push to `main`
- Uses AWS SSM (no SSH needed)
- Images pushed to ghcr.io
- Deployed to EC2 instance `i-021ca6be74a5d9b16`

## Key Commands

```bash
# Check issues
gh issue list --repo gulati8/FureverCare --state open

# Comment on issue
gh issue comment <number> --repo gulati8/FureverCare --body "message"

# Close issue
gh issue close <number> --repo gulati8/FureverCare

# Run command on EC2
aws ssm send-command --region us-east-1 --instance-ids i-021ca6be74a5d9b16 --document-name "AWS-RunShellScript" --parameters commands="<command>"
```
