#!/bin/bash

# Security Testing Script for KSYK Maps
# Tests various security measures and vulnerabilities

echo "🔒 KSYK Maps Security Testing Suite"
echo "===================================="
echo ""

BASE_URL="${1:-http://localhost:5000}"
echo "Testing against: $BASE_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local expected_status="$4"
    local headers="$5"
    
    echo -n "Testing: $name... "
    
    if [ -z "$headers" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H "$headers" "$BASE_URL$endpoint")
    fi
    
    if [ "$response" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: $response)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $response)"
        ((FAILED++))
    fi
}

# Function to test security header
test_header() {
    local name="$1"
    local header="$2"
    
    echo -n "Testing header: $name... "
    
    response=$(curl -s -I "$BASE_URL" | grep -i "$header")
    
    if [ -n "$response" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        echo "  $response"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (Header not found)"
        ((FAILED++))
    fi
}

echo "1. Testing Authentication & Authorization"
echo "=========================================="

# Test unauthenticated access to protected endpoints
test_endpoint "Unauthenticated access to /api/wilma/users" "GET" "/api/wilma/users" 401
test_endpoint "Unauthenticated access to /api/wilma/grades/123" "GET" "/api/wilma/grades/123" 401
test_endpoint "Unauthenticated access to /api/wilma/assignments/123" "GET" "/api/wilma/assignments/123" 401
test_endpoint "Unauthenticated access to /api/admin-settings" "GET" "/api/wilma/admin-settings" 200

echo ""
echo "2. Testing SQL Injection Prevention"
echo "===================================="

# Test SQL injection attempts
test_endpoint "SQL injection in query param" "GET" "/api/wilma/users?id=1' OR '1'='1" 400
test_endpoint "SQL injection with UNION" "GET" "/api/wilma/users?id=1 UNION SELECT * FROM users" 400
test_endpoint "SQL injection with DROP" "GET" "/api/wilma/users?id=1; DROP TABLE users" 400

echo ""
echo "3. Testing XSS Prevention"
echo "========================="

# Test XSS attempts
test_endpoint "XSS in query param" "GET" "/api/wilma/users?name=<script>alert('xss')</script>" 400

echo ""
echo "4. Testing Rate Limiting"
echo "========================"

echo "Testing login rate limiting (5 attempts allowed)..."
for i in {1..7}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/admin-login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"wrong"}')
    
    if [ $i -le 5 ]; then
        if [ "$response" -eq 401 ] || [ "$response" -eq 400 ]; then
            echo -e "  Attempt $i: ${GREEN}✓${NC} (Status: $response)"
        else
            echo -e "  Attempt $i: ${YELLOW}?${NC} (Status: $response)"
        fi
    else
        if [ "$response" -eq 429 ]; then
            echo -e "  Attempt $i: ${GREEN}✓ Rate limited${NC} (Status: $response)"
            ((PASSED++))
        else
            echo -e "  Attempt $i: ${RED}✗ Not rate limited${NC} (Status: $response)"
            ((FAILED++))
        fi
    fi
    
    sleep 0.5
done

echo ""
echo "5. Testing Security Headers"
echo "==========================="

test_header "X-Frame-Options" "X-Frame-Options"
test_header "X-Content-Type-Options" "X-Content-Type-Options"
test_header "X-XSS-Protection" "X-XSS-Protection"
test_header "Strict-Transport-Security" "Strict-Transport-Security"
test_header "Content-Security-Policy" "Content-Security-Policy"
test_header "Referrer-Policy" "Referrer-Policy"

echo ""
echo "6. Testing IDOR Prevention"
echo "=========================="

# These would need valid tokens to test properly
echo "Note: IDOR tests require valid authentication tokens"
echo "Manual testing required with different user accounts"

echo ""
echo "7. Testing Input Validation"
echo "==========================="

# Test invalid user ID formats
test_endpoint "Invalid user ID with special chars" "GET" "/api/wilma/users/../../etc/passwd" 400
test_endpoint "Invalid user ID with null bytes" "GET" "/api/wilma/users/test%00admin" 400

echo ""
echo "=========================================="
echo "Security Test Results"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All security tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some security tests failed. Please review.${NC}"
    exit 1
fi
