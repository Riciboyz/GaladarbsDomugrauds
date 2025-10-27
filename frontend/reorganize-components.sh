#!/bin/bash

# Navigate to components directory
cd "$(dirname "$0")/app/components"

echo "🔄 Starting component reorganization..."

# Step 1: Move feature-specific components
echo "📦 Moving feature components..."

# Topics
mkdir -p features/topics
mv legacy/DailyTopicBanner.tsx features/topics/ 2>/dev/null
mv legacy/TopicDays.tsx features/topics/ 2>/dev/null
mv legacy/TopicSubmission.tsx features/topics/ 2>/dev/null

# Notifications
mkdir -p features/notifications
mv legacy/RealtimeNotificationsProvider.tsx features/notifications/ 2>/dev/null
mv legacy/Notifications.tsx features/notifications/ 2>/dev/null
mv legacy/NotificationBell.tsx features/notifications/ 2>/dev/null
mv legacy/NotificationDropdown.tsx features/notifications/ 2>/dev/null
mv legacy/NotificationsWidget.tsx features/notifications/ 2>/dev/null

# Search
mkdir -p features/search
mv legacy/Search.tsx features/search/ 2>/dev/null
mv legacy/QuickSearchBar.tsx features/search/ 2>/dev/null

# Weather
mkdir -p features/weather
mv legacy/WeatherWidget.tsx features/weather/ 2>/dev/null
mv legacy/WeatherEffects.tsx features/weather/ 2>/dev/null
mv legacy/GlobalWeatherTheme.tsx features/weather/ 2>/dev/null

# Settings
mkdir -p features/settings
mv legacy/Settings.tsx features/settings/ 2>/dev/null
mv legacy/ThemeToggle.tsx features/settings/ 2>/dev/null

# Step 2: Move UI components that don't exist in ui/
echo "🎨 Moving UI components..."

mv legacy/Alert.tsx ui/ 2>/dev/null
mv legacy/Modal.tsx overlay/ 2>/dev/null
mv legacy/Toast.tsx feedback/ 2>/dev/null
mv legacy/Toast-simple.tsx feedback/ 2>/dev/null
mv legacy/Tooltip.tsx overlay/ 2>/dev/null
mv legacy/Popover.tsx overlay/ 2>/dev/null
mv legacy/Tabs.tsx navigation/ 2>/dev/null
mv legacy/Dropdown.tsx navigation/ 2>/dev/null
mv legacy/ContextMenu.tsx navigation/ 2>/dev/null
mv legacy/CommandPalette.tsx navigation/ 2>/dev/null

# Data display
mv legacy/DataTable.tsx data-display/ 2>/dev/null
mv legacy/Chart.tsx data-display/ 2>/dev/null
mv legacy/Calendar.tsx data-display/ 2>/dev/null

# Media
mv legacy/AudioPlayer.tsx media/ 2>/dev/null
mv legacy/VideoPlayer.tsx media/ 2>/dev/null
mv legacy/ImageGallery.tsx media/ 2>/dev/null
mv legacy/Carousel.tsx media/ 2>/dev/null

# Forms
mv legacy/FileUpload.tsx forms/ 2>/dev/null
mv legacy/EmojiPicker.tsx forms/ 2>/dev/null

# Utility
mv legacy/InfiniteScroll.tsx utility/ 2>/dev/null
mv legacy/VirtualScroll.tsx utility/ 2>/dev/null
mv legacy/LazyLoad.tsx utility/ 2>/dev/null
mv legacy/DragAndDrop.tsx utility/ 2>/dev/null
mv legacy/LoadingSkeleton.tsx utility/ 2>/dev/null
mv legacy/LoadingState.tsx utility/ 2>/dev/null
mv legacy/Pagination.tsx utility/ 2>/dev/null
mv legacy/KeyboardShortcuts.tsx utility/ 2>/dev/null
mv legacy/KanbanBoard.tsx utility/ 2>/dev/null

# Step 3: Move modals
echo "📝 Moving modals..."
mv legacy/CreatePostModal.tsx features/threads/ 2>/dev/null

# Step 4: Move chat (if unique)
mv legacy/RealtimeChat.tsx features/groups/ 2>/dev/null

# Step 5: Delete duplicate UI components from legacy
echo "🗑️  Removing duplicates..."
rm -f legacy/Accordion.tsx
rm -f legacy/Avatar.tsx
rm -f legacy/Badge.tsx
rm -f legacy/Breadcrumb.tsx
rm -f legacy/Button.tsx
rm -f legacy/Card.tsx
rm -f legacy/Checkbox.tsx
rm -f legacy/Drawer.tsx
rm -f legacy/Input.tsx
rm -f legacy/Progress.tsx
rm -f legacy/ProgressBar.tsx
rm -f legacy/Radio.tsx
rm -f legacy/RightSidebar.tsx
rm -f legacy/Sidebar.tsx
rm -f legacy/Skeleton.tsx
rm -f legacy/Switch.tsx
rm -f legacy/Textarea.tsx
rm -f legacy/CodeEditor.tsx
rm -f legacy/FormBuilder.tsx

# Step 6: Delete duplicates that exist in features
echo "🗑️  Removing feature duplicates..."
rm -f legacy/AdminPanel.tsx
rm -f legacy/AuthPage.tsx
rm -f legacy/Profile.tsx
rm -f legacy/Feed.tsx
rm -f legacy/ThreadCard.tsx
rm -f legacy/CreateThread.tsx
rm -f legacy/SimpleCreateThread.tsx
rm -f legacy/Groups.tsx
rm -f legacy/GroupChat.tsx
rm -f legacy/SimpleGroupChat.tsx
rm -f legacy/GroupManagement.tsx
rm -f legacy/GroupMembers.tsx
rm -f legacy/GroupPosts.tsx

# Step 7: Check if legacy folder is empty
if [ -z "$(ls -A legacy/)" ]; then
   echo "✅ Legacy folder is empty, removing it..."
   rmdir legacy/
else
   echo "⚠️  Legacy folder still contains files:"
   ls legacy/
fi

echo "✅ Component reorganization complete!"
echo "📝 Don't forget to update imports!"
