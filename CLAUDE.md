# FureverCare - Claude Instructions

## Issue Triage Workflow

When starting a session, check for new GitHub issues:

```bash
gh issue list --repo gulati8/FureverCare --state open
```

**Work issues in priority order: High → Medium → Low**

For each new issue:

1. **Read and understand** - What is the user asking for?
2. **Research** - Check the codebase, understand feasibility
3. **Ask clarifying questions** - ALWAYS ask questions before implementing. Don't assume. Ensure you understand exactly what the user wants. Examples:
   - "Should this also work on mobile?"
   - "Do you want this behind authentication?"
   - "Should it notify other owners?"
   - "What should happen if X fails?"
4. **Wait for answers** - Don't proceed with implementation until questions are answered
5. **Propose approach** - Once clear, describe what you'll build
6. **Label** - Apply: `bug`, `feature`, or `question`
7. **Implement** - Build it right the first time because you asked first

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
