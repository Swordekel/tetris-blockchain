#!/bin/bash

# 🛡️ Tetris Game - Create First Admin Account
# This script creates an admin account with predefined credentials

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Admin credentials
ADMIN_EMAIL="admin12345@gmail.com"
ADMIN_PASSWORD="admin12345"
ADMIN_USERNAME="admin12345"
SECRET_KEY="TETRIS_ADMIN_SECRET_2024"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🛡️  Tetris Game - Admin Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if project ID is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./create-admin.sh <SUPABASE_PROJECT_ID>${NC}"
    echo ""
    echo "Example: ./create-admin.sh abcdefghijklmnop"
    echo ""
    echo -e "${YELLOW}Find your Project ID at:${NC}"
    echo "https://app.supabase.com/project/YOUR_PROJECT_ID"
    echo ""
    exit 1
fi

PROJECT_ID=$1
BASE_URL="https://${PROJECT_ID}.supabase.co/functions/v1/make-server-7fcff8d3"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "Project ID: $PROJECT_ID"
echo "Admin Email: $ADMIN_EMAIL"
echo "Admin Password: $ADMIN_PASSWORD"
echo "Admin Username: $ADMIN_USERNAME"
echo ""

# Step 1: Create user account
echo -e "${YELLOW}Step 1: Creating user account...${NC}"
SIGNUP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${BASE_URL}/signup" \
  -H 'Content-Type: application/json' \
  -d "{
    \"email\": \"${ADMIN_EMAIL}\",
    \"password\": \"${ADMIN_PASSWORD}\",
    \"username\": \"${ADMIN_USERNAME}\"
  }")

HTTP_CODE=$(echo "$SIGNUP_RESPONSE" | tail -n1)
SIGNUP_BODY=$(echo "$SIGNUP_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ User account created successfully${NC}"
elif echo "$SIGNUP_BODY" | grep -q "already registered"; then
    echo -e "${GREEN}✓ User already exists, continuing...${NC}"
else
    echo -e "${RED}✗ Failed to create account${NC}"
    echo -e "${RED}Response: $SIGNUP_BODY${NC}"
    exit 1
fi

echo ""

# Step 2: Promote to admin
echo -e "${YELLOW}Step 2: Promoting user to admin...${NC}"
PROMOTE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${BASE_URL}/promote-admin" \
  -H 'Content-Type: application/json' \
  -d "{
    \"email\": \"${ADMIN_EMAIL}\",
    \"secretKey\": \"${SECRET_KEY}\"
  }")

HTTP_CODE=$(echo "$PROMOTE_RESPONSE" | tail -n1)
PROMOTE_BODY=$(echo "$PROMOTE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ User promoted to admin successfully${NC}"
else
    echo -e "${RED}✗ Failed to promote to admin${NC}"
    echo -e "${RED}Response: $PROMOTE_BODY${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 ADMIN ACCOUNT CREATED SUCCESSFULLY!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📋 Login Credentials:${NC}"
echo "Email:    $ADMIN_EMAIL"
echo "Password: $ADMIN_PASSWORD"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Go to your Tetris app"
echo "2. Login with the credentials above"
echo "3. Look for the Shield icon (🛡️) in the header"
echo "4. Click the shield to access Admin Panel"
echo ""
echo -e "${GREEN}✨ Happy administering!${NC}"
echo ""
