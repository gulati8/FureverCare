#!/bin/bash
# Seed production database with sample data
#
# This script runs the seed command on the AWS EC2 instance via SSM
# Prerequisites:
# - AWS CLI configured with appropriate credentials
# - AWS SSM Session Manager plugin installed
# - Access to EC2 instance i-021ca6be74a5d9b16

set -e

INSTANCE_ID="i-021ca6be74a5d9b16"
REGION="us-east-1"

echo "🌱 Seeding FureverCare production database..."
echo "   Instance: $INSTANCE_ID"
echo "   Region: $REGION"
echo ""

# Run the seed command inside the backend container
COMMAND='cd /srv/furevercare && docker compose -f docker-compose.prod.yml exec -T backend npm run db:seed'

echo "📤 Sending seed command to EC2..."

# Send command via SSM
COMMAND_ID=$(aws ssm send-command \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters commands="$COMMAND" \
  --output text \
  --query "Command.CommandId")

echo "   Command ID: $COMMAND_ID"
echo ""
echo "⏳ Waiting for command to complete..."

# Wait for the command to complete
aws ssm wait command-executed \
  --region "$REGION" \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID" 2>/dev/null || true

# Get command output
echo ""
echo "📋 Command Output:"
echo "─────────────────────────────────────────────────────"

aws ssm get-command-invocation \
  --region "$REGION" \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID" \
  --query "StandardOutputContent" \
  --output text

# Check for errors
ERROR_OUTPUT=$(aws ssm get-command-invocation \
  --region "$REGION" \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID" \
  --query "StandardErrorContent" \
  --output text)

if [ -n "$ERROR_OUTPUT" ] && [ "$ERROR_OUTPUT" != "None" ]; then
  echo ""
  echo "⚠️  Errors:"
  echo "$ERROR_OUTPUT"
fi

# Check status
STATUS=$(aws ssm get-command-invocation \
  --region "$REGION" \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID" \
  --query "Status" \
  --output text)

echo ""
echo "─────────────────────────────────────────────────────"

if [ "$STATUS" = "Success" ]; then
  echo "✅ Seed completed successfully!"
else
  echo "❌ Seed failed with status: $STATUS"
  exit 1
fi
