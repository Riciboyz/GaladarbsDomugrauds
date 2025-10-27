#!/bin/bash

cd "$(dirname "$0")/app"

echo "🔄 Updating imports..."

# Update layout imports
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/Sidebar['\"]|from '../layout/Sidebar'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/RightSidebar['\"]|from '../layout/RightSidebar'|g" {} +

# Update feature imports - threads
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/Feed['\"]|from '../features/threads/Feed'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/ThreadCard['\"]|from '../features/threads/ThreadCard'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/CreateThread['\"]|from '../features/threads/CreateThread'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/SimpleCreateThread['\"]|from '../features/threads/SimpleCreateThread'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/CreatePostModal['\"]|from '../features/threads/CreatePostModal'|g" {} +

# Update feature imports - groups
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/Groups['\"]|from '../features/groups/Groups'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/GroupChat['\"]|from '../features/groups/GroupChat'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/SimpleGroupChat['\"]|from '../features/groups/SimpleGroupChat'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/GroupManagement['\"]|from '../features/groups/GroupManagement'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/GroupMembers['\"]|from '../features/groups/GroupMembers'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/GroupPosts['\"]|from '../features/groups/GroupPosts'|g" {} +

# Update feature imports - profile
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/Profile['\"]|from '../features/profile/Profile'|g" {} +

# Update feature imports - auth
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/AuthPage['\"]|from '../features/auth/AuthPage'|g" {} +

# Update feature imports - admin
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/AdminPanel['\"]|from '../features/admin/AdminPanel'|g" {} +

# Update feature imports - search
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/Search['\"]|from '../features/search/Search'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/QuickSearchBar['\"]|from '../features/search/QuickSearchBar'|g" {} +

# Update feature imports - topics
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/DailyTopicBanner['\"]|from '../features/topics/DailyTopicBanner'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/TopicSubmission['\"]|from '../features/topics/TopicSubmission'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/TopicDays['\"]|from '../features/topics/TopicDays'|g" {} +

# Update feature imports - notifications
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/RealtimeNotificationsProvider['\"]|from '../features/notifications/RealtimeNotificationsProvider'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/Notifications['\"]|from '../features/notifications/Notifications'|g" {} +

# Update feature imports - weather
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/WeatherWidget['\"]|from '../features/weather/WeatherWidget'|g" {} +
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/GlobalWeatherTheme['\"]|from '../features/weather/GlobalWeatherTheme'|g" {} +

# Update utility imports
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/KeyboardShortcuts['\"]|from '../utility/KeyboardShortcuts'|g" {} +

# Update UI imports
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s|from ['\"].*legacy/ErrorBoundary['\"]|from '../feedback/ErrorBoundary'|g" {} +

echo "✅ Import updates complete!"
echo "🔍 Checking for remaining legacy imports..."
grep -r "from.*legacy" . --include="*.tsx" --include="*.ts" | wc -l
