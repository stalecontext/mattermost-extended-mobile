#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FASTLANE_DIR="$PROJECT_ROOT/fastlane"

# App Store Connect URLs (APP_STORE_APP_ID can be set in .env.ios.testflight)
APP_STORE_CONNECT_URL="https://appstoreconnect.apple.com/apps"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_error() {
    echo -e "${RED}Error: $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

print_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --build-only     Only build the IPA, don't deploy to TestFlight"
    echo "  --deploy-only    Only deploy existing IPA to TestFlight (requires --ipa)"
    echo "  --ipa <path>     Path to existing IPA file (for --deploy-only)"
    echo "  --skip-setup     Skip npm clean/install (use existing node_modules)"
    echo "  --no-open        Don't open App Store Connect in browser"
    echo "  --no-increment   Skip build number increment (use current build number)"
    echo "  --help           Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  VERSION          Set app version (e.g., VERSION=2.38.0 $0)"
    echo ""
    echo "Examples:"
    echo "  $0                          # Full build and deploy (auto-increments build number)"
    echo "  $0 --skip-setup             # Build and deploy without reinstalling deps"
    echo "  $0 --build-only             # Only build the IPA"
    echo "  $0 --deploy-only --ipa ./Mattermost+.ipa  # Deploy existing IPA"
    echo "  VERSION=2.38.0 $0           # Set version and deploy"
}

# Check prerequisites
check_prerequisites() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "This script must be run on macOS"
        exit 1
    fi

    if ! command -v bundle &> /dev/null; then
        print_error "Bundler is not installed. Run: gem install bundler"
        exit 1
    fi

    # Check for required config files
    if [[ ! -f "$FASTLANE_DIR/.env.ios.testflight" ]]; then
        print_error "Missing fastlane/.env.ios.testflight"
        echo "Copy fastlane/.env.ios.testflight.example and fill in your values"
        exit 1
    fi

    if [[ ! -f "$FASTLANE_DIR/api_key.json" ]]; then
        print_error "Missing fastlane/api_key.json"
        echo "Copy fastlane/api_key.json.example and fill in your App Store Connect API key"
        exit 1
    fi
}

# Open App Store Connect pages
open_appstore_connect() {
    if [[ "$NO_OPEN" == "true" ]]; then
        return
    fi

    echo ""
    print_success "Opening App Store Connect..."

    # Use app-specific URL if APP_STORE_APP_ID is set, otherwise open general apps page
    if [[ -n "$APP_STORE_APP_ID" ]]; then
        local testflight_url="https://appstoreconnect.apple.com/apps/${APP_STORE_APP_ID}/testflight"
        open "$testflight_url"
        echo "  TestFlight: $testflight_url"
    else
        open "$APP_STORE_CONNECT_URL"
        echo "  App Store Connect: $APP_STORE_CONNECT_URL"
        echo "  (Set APP_STORE_APP_ID in .env.ios.testflight for direct TestFlight link)"
    fi
}

# Load API key for deployment
load_api_key() {
    local api_key_file="$FASTLANE_DIR/api_key.json"

    if [[ ! -f "$api_key_file" ]]; then
        print_error "API key file not found: $api_key_file"
        exit 1
    fi

    # Extract the private key from the JSON file
    IOS_API_KEY=$(python3 -c "
import json
with open('$api_key_file') as f:
    data = json.load(f)
    print(data.get('key', ''))
" 2>/dev/null || cat "$api_key_file" | grep -o '"key"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/"key"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

    export IOS_API_KEY
}

# Build the IPA
build_ipa() {
    cd "$FASTLANE_DIR"

    # Step 1: Update version/build numbers
    if [[ "$NO_INCREMENT" != "true" ]] || [[ -n "$VERSION" ]]; then
        echo ""
        print_success "=== Updating Version/Build Numbers ==="
        echo ""

        # Set version number if VERSION env var is provided
        if [[ -n "$VERSION" ]]; then
            print_success "Setting app version to $VERSION"
            VERSION_NUMBER="$VERSION" bundle exec fastlane ios set_app_version --env ios.testflight
        fi

        # Auto-increment build number unless --no-increment is specified
        if [[ "$NO_INCREMENT" != "true" ]]; then
            print_success "Incrementing build number..."
            INCREMENT_BUILD_NUMBER=true bundle exec fastlane ios set_app_build_number --env ios.testflight
        fi
    fi

    # Step 2: Build the IPA
    echo ""
    print_success "=== Building iOS App for TestFlight ==="
    echo ""

    local build_cmd="bundle exec fastlane ios build --env ios.testflight"

    if [[ "$SKIP_SETUP" == "true" ]]; then
        print_warning "Skipping setup (using existing node_modules)"
        SKIP_SETUP=1 $build_cmd
    else
        $build_cmd
    fi

    cd "$PROJECT_ROOT"

    # Find the built IPA
    IPA_PATH=$(find "$PROJECT_ROOT" -maxdepth 1 -name "*.ipa" -type f -print -quit 2>/dev/null)

    if [[ -z "$IPA_PATH" ]]; then
        print_error "IPA file not found after build"
        exit 1
    fi

    print_success "Build complete: $IPA_PATH"
}

# Deploy to TestFlight
deploy_testflight() {
    local ipa_file="$1"

    if [[ ! -f "$ipa_file" ]]; then
        print_error "IPA file not found: $ipa_file"
        exit 1
    fi

    echo ""
    print_success "=== Deploying to TestFlight ==="
    echo ""

    load_api_key

    cd "$FASTLANE_DIR"

    # Use absolute path for the IPA
    local abs_ipa_path
    abs_ipa_path=$(cd "$(dirname "$ipa_file")" && pwd)/$(basename "$ipa_file")

    GIT_BRANCH=main IOS_API_KEY="$IOS_API_KEY" bundle exec fastlane ios deploy file:"$abs_ipa_path" --env ios.testflight

    cd "$PROJECT_ROOT"

    print_success "Successfully uploaded to TestFlight!"
    echo ""
    echo "The build is now processing on App Store Connect."
    echo "It may take a few minutes before it appears in TestFlight."

    # Open App Store Connect to monitor the build
    open_appstore_connect
}

# Parse arguments
BUILD_ONLY=false
DEPLOY_ONLY=false
SKIP_SETUP=false
NO_OPEN=false
NO_INCREMENT=false
IPA_PATH=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --deploy-only)
            DEPLOY_ONLY=true
            shift
            ;;
        --ipa)
            IPA_PATH="$2"
            shift 2
            ;;
        --skip-setup)
            SKIP_SETUP=true
            shift
            ;;
        --no-open)
            NO_OPEN=true
            shift
            ;;
        --no-increment)
            NO_INCREMENT=true
            shift
            ;;
        --help)
            print_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Validate arguments
if [[ "$DEPLOY_ONLY" == "true" && -z "$IPA_PATH" ]]; then
    print_error "--deploy-only requires --ipa <path>"
    print_usage
    exit 1
fi

# Main execution
check_prerequisites

if [[ "$DEPLOY_ONLY" == "true" ]]; then
    deploy_testflight "$IPA_PATH"
elif [[ "$BUILD_ONLY" == "true" ]]; then
    build_ipa
    echo ""
    echo "IPA built at: $IPA_PATH"
    echo "To deploy later, run: $0 --deploy-only --ipa \"$IPA_PATH\""
else
    build_ipa
    deploy_testflight "$IPA_PATH"
fi

print_success "Done!"
