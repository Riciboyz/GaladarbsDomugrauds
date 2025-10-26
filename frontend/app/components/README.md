# DomuGrauds Component Library

## 📚 Component Categories

### 🎨 UI Components
Basic, reusable UI elements that form the foundation of the design system.

```tsx
import { Button, Card, Input, Badge } from '@/app/components'

// Usage examples
<Button variant="primary" size="md">Click me</Button>
<Card padding="md" shadow="lg">Content here</Card>
<Input placeholder="Enter text..." />
<Badge variant="success">Active</Badge>
```

**Available Components:**
- `Button` - Interactive button with multiple variants
- `Card` - Container component with customizable styling
- `Input` - Text input field
- `Textarea` - Multi-line text input
- `Checkbox` - Checkbox input
- `Radio` - Radio button input
- `Switch` - Toggle switch
- `Badge` - Status indicator
- `Avatar` - User profile image
- `Progress` - Progress indicator
- `ProgressBar` - Animated progress bar
- `Skeleton` - Loading placeholder

### 🏗️ Layout Components
Components that define the overall structure and layout of pages.

```tsx
import { Sidebar, RightSidebar, Breadcrumb, Accordion } from '@/app/components'

// Usage examples
<Sidebar items={menuItems} />
<RightSidebar content={sidebarContent} />
<Breadcrumb items={breadcrumbItems} />
<Accordion items={accordionItems} />
```

**Available Components:**
- `Sidebar` - Main navigation sidebar
- `RightSidebar` - Secondary sidebar
- `Breadcrumb` - Navigation breadcrumb
- `Accordion` - Collapsible content sections
- `Drawer` - Slide-out drawer

### ⚡ Feature Components
Components specific to particular features or business logic.

#### Authentication
```tsx
import { AuthPage, AuthPageNew } from '@/app/components/features/auth'

<AuthPage mode="login" />
<AuthPageNew mode="register" />
```

#### Threads
```tsx
import { ThreadCard, CreateThread, Feed } from '@/app/components/features/threads'

<ThreadCard thread={threadData} />
<CreateThread onSubmit={handleSubmit} />
<Feed threads={threads} />
```

#### Groups
```tsx
import { Groups, GroupManagement, GroupChat } from '@/app/components/features/groups'

<Groups groups={groups} />
<GroupManagement group={group} />
<GroupChat groupId={groupId} />
```

#### Notifications
```tsx
import { Notifications, NotificationBell } from '@/app/components/features/notifications'

<Notifications notifications={notifications} />
<NotificationBell count={unreadCount} />
```

### 📝 Form Components
Components for building forms and handling user input.

```tsx
import { FormBuilder, MarkdownEditor, RichTextEditor } from '@/app/components/forms'

<FormBuilder schema={formSchema} />
<MarkdownEditor value={content} onChange={setContent} />
<RichTextEditor content={htmlContent} />
```

**Available Components:**
- `FormBuilder` - Dynamic form builder
- `HashtagInput` - Input with hashtag support
- `MarkdownEditor` - Markdown text editor
- `RichTextEditor` - Rich text editor
- `CodeEditor` - Code editor with syntax highlighting

### 🎬 Media Components
Components for displaying and handling media content.

```tsx
import { ImageGallery, VideoPlayer, FileUpload } from '@/app/components/media'

<ImageGallery images={imageList} />
<VideoPlayer src={videoUrl} />
<FileUpload onUpload={handleUpload} />
```

**Available Components:**
- `ImageGallery` - Image gallery with lightbox
- `VideoPlayer` - Video player component
- `AudioPlayer` - Audio player component
- `FileUpload` - File upload component
- `DragAndDrop` - Drag and drop interface

### 💬 Feedback Components
Components that provide feedback to users.

```tsx
import { Alert, Toast, LoadingState, ErrorBoundary } from '@/app/components/feedback'

<Alert type="success" message="Success!" />
<Toast message="Action completed" />
<LoadingState />
<ErrorBoundary fallback={<ErrorPage />}>
  <AppContent />
</ErrorBoundary>
```

**Available Components:**
- `Alert` - Alert messages
- `Toast` - Toast notifications
- `LoadingState` - Loading indicator
- `LoadingSkeleton` - Skeleton loading
- `ErrorBoundary` - Error boundary wrapper

### 🧭 Navigation Components
Components for navigating through the application.

```tsx
import { Pagination, Tabs, CommandPalette } from '@/app/components/navigation'

<Pagination current={page} total={totalPages} />
<Tabs items={tabItems} />
<CommandPalette commands={commands} />
```

**Available Components:**
- `Pagination` - Page navigation
- `Tabs` - Tab navigation
- `CommandPalette` - Command palette
- `QuickSearchBar` - Quick search input
- `Search` - Advanced search component

### 📊 Data Display Components
Components for displaying data in various formats.

```tsx
import { DataTable, Chart, Calendar } from '@/app/components/data-display'

<DataTable data={tableData} columns={columns} />
<Chart type="line" data={chartData} />
<Calendar events={events} />
```

**Available Components:**
- `DataTable` - Data table with sorting/filtering
- `Chart` - Chart component
- `Calendar` - Calendar component
- `KanbanBoard` - Kanban board
- `VirtualScroll` - Virtual scrolling
- `InfiniteScroll` - Infinite scroll
- `LazyLoad` - Lazy loading wrapper

### 🎭 Overlay Components
Components that appear on top of other content.

```tsx
import { Modal, Popover, Tooltip, Dropdown } from '@/app/components/overlay'

<Modal isOpen={isOpen} onClose={onClose}>
  <ModalContent />
</Modal>
<Popover content={<PopoverContent />}>
  <Trigger />
</Popover>
<Tooltip content="Tooltip text">
  <Button>Hover me</Button>
</Tooltip>
<Dropdown items={dropdownItems} />
```

**Available Components:**
- `Modal` - Modal dialog
- `Popover` - Popover component
- `Tooltip` - Tooltip component
- `Dropdown` - Dropdown menu
- `ContextMenu` - Context menu
- `Carousel` - Image/content carousel

### 🔧 Utility Components
Helper components and utilities that support other components.

```tsx
import { ThemeToggle, WeatherWidget, Settings } from '@/app/components/utility'

<ThemeToggle />
<WeatherWidget location="Riga" />
<Settings />
```

**Available Components:**
- `ThemeToggle` - Theme switcher
- `WeatherWidget` - Weather display
- `WeatherEffects` - Weather visual effects
- `GlobalWeatherTheme` - Global weather theming
- `KeyboardShortcuts` - Keyboard shortcuts
- `EmojiPicker` - Emoji picker
- `Settings` - Settings panel
- `RealtimeChat` - Real-time chat
- `RealtimeNotificationsProvider` - Real-time notifications

## 🚀 Usage Patterns

### Importing Components

```tsx
// Import specific components
import { Button, Card } from '@/app/components'

// Import from specific category
import { Button } from '@/app/components/ui'
import { AuthPage } from '@/app/components/features/auth'

// Import all from category
import * as UI from '@/app/components/ui'
import * as Features from '@/app/components/features'
```

### Component Composition

```tsx
import { Card, Button, Badge } from '@/app/components'

function UserCard({ user }) {
  return (
    <Card padding="md" hover>
      <div className="flex items-center space-x-3">
        <Avatar src={user.avatar} />
        <div>
          <h3>{user.name}</h3>
          <Badge variant={user.isActive ? 'success' : 'inactive'}>
            {user.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <Button size="sm" variant="outline">
          View Profile
        </Button>
      </div>
    </Card>
  )
}
```

## 📋 Best Practices

1. **Use semantic imports** - Import from the main index for commonly used components
2. **Category-specific imports** - Import from specific categories for better tree-shaking
3. **Consistent naming** - All components follow PascalCase naming convention
4. **TypeScript support** - All components are fully typed
5. **Accessibility** - Components include proper ARIA attributes
6. **Responsive design** - Components are mobile-first and responsive

## 🎨 Design System

All components follow the DomuGrauds design system with:
- Consistent spacing and typography
- Unified color palette
- Responsive breakpoints
- Dark/light theme support
- Accessibility standards
