#!/bin/bash

###############################################################################
# ARENA2036-X EDC Deployment Script
# 
# This script automates the EDC connector deployment process by orchestrating
# backend API calls for:
# - Submodel service deployment
# - Submodel service registration  
# - EDC connector creation
#
# Usage:
#   ./scripts/deploy_edc.sh
#
# Environment Variables (required):
#   KEYCLOAK_TOKEN  - Keycloak JWT Bearer token for authentication
#   API_URL         - Backend API URL (default: http://localhost:8008)
#
# Example:
#   export KEYCLOAK_TOKEN="your-jwt-token-here"
#   export API_URL="http://localhost:8008"
#   ./scripts/deploy_edc.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:8008}"
KEYCLOAK_TOKEN="${KEYCLOAK_TOKEN:-}"

# Check prerequisites
if [ -z "$KEYCLOAK_TOKEN" ]; then
    echo -e "${RED}Error: KEYCLOAK_TOKEN environment variable is not set${NC}"
    echo "Please set your Keycloak JWT token:"
    echo "  export KEYCLOAK_TOKEN=\"your-token-here\""
    exit 1
fi

# Helper function for API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $KEYCLOAK_TOKEN" \
            -H "Content-Type: application/json" \
            "${API_URL}${endpoint}"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $KEYCLOAK_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${API_URL}${endpoint}"
    fi
}

# Function to check health
check_health() {
    echo -e "${YELLOW}Checking backend health...${NC}"
    response=$(api_call "GET" "/api/health")
    
    if echo "$response" | grep -q "ok"; then
        echo -e "${GREEN}✓ Backend is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Backend health check failed${NC}"
        echo "$response"
        exit 1
    fi
}

# Function to deploy submodel service
deploy_submodel() {
    local url=$1
    local api_key=$2
    
    echo -e "${YELLOW}Deploying submodel service...${NC}"
    
    data="{\"url\":\"$url\",\"apiKey\":\"$api_key\",\"type\":\"submodel-service\"}"
    response=$(api_call "POST" "/api/submodel/deploy" "$data")
    
    if echo "$response" | grep -q "deployed"; then
        echo -e "${GREEN}✓ Submodel service deployed successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ Submodel deployment failed${NC}"
        echo "$response"
        return 1
    fi
}

# Function to register submodel service
register_submodel() {
    local url=$1
    local bpn=$2
    
    echo -e "${YELLOW}Registering submodel service...${NC}"
    
    data="{\"url\":\"$url\",\"bpn\":\"$bpn\"}"
    response=$(api_call "POST" "/api/submodel/register" "$data")
    
    if echo "$response" | grep -q "registered"; then
        echo -e "${GREEN}✓ Submodel service registered successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ Submodel registration failed${NC}"
        echo "$response"
        return 1
    fi
}

# Function to create EDC connector
create_connector() {
    local name=$1
    local url=$2
    local bpn=$3
    local version=$4
    
    echo -e "${YELLOW}Creating EDC connector...${NC}"
    
    data="{\"name\":\"$name\",\"url\":\"$url\",\"bpn\":\"$bpn\",\"config\":{\"version\":\"$version\"}}"
    response=$(api_call "POST" "/api/connectors" "$data")
    
    if echo "$response" | grep -q "created"; then
        echo -e "${GREEN}✓ EDC connector created successfully${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        return 0
    else
        echo -e "${RED}✗ EDC connector creation failed${NC}"
        echo "$response"
        return 1
    fi
}

# Main deployment flow
main() {
    echo -e "${GREEN}=== ARENA2036-X EDC Deployment ===${NC}\n"
    
    # Step 1: Health check
    check_health
    echo ""
    
    # Step 2: Interactive prompts for deployment configuration
    read -p "Enter Submodel Service URL: " SUBMODEL_URL
    read -p "Enter Submodel API Key (optional, press enter to skip): " SUBMODEL_API_KEY
    read -p "Enter BPN Number: " BPN
    read -p "Enter EDC Connector Name: " EDC_NAME
    read -p "Enter EDC Connector URL: " EDC_URL
    read -p "Enter EDC Version (default: 0.6.0): " EDC_VERSION
    EDC_VERSION="${EDC_VERSION:-0.6.0}"
    
    echo ""
    
    # Step 3: Deploy submodel (if API key provided)
    if [ -n "$SUBMODEL_API_KEY" ]; then
        deploy_submodel "$SUBMODEL_URL" "$SUBMODEL_API_KEY"
        echo ""
    else
        echo -e "${YELLOW}Skipping submodel deployment (no API key provided)${NC}\n"
    fi
    
    # Step 4: Register submodel
    register_submodel "$SUBMODEL_URL" "$BPN"
    echo ""
    
    # Step 5: Create EDC connector
    create_connector "$EDC_NAME" "$EDC_URL" "$BPN" "$EDC_VERSION"
    echo ""
    
    echo -e "${GREEN}=== Deployment Complete ===${NC}"
}

# Run main function
main
