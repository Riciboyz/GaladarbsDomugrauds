#!/usr/bin/env node

/**
 * Component Migration Script
 * Automatically updates import statements to use new component structure
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Component mapping from old to new structure
const componentMappings = {
  // UI Components
  'Button': 'ui',
  'Card': 'ui',
  'Input': 'ui',
  'Textarea': 'ui',
  'Checkbox': 'ui',
  'Radio': 'ui',
  'Switch': 'ui',
  'Badge': 'ui',
  'Avatar': 'ui',
  'Progress': 'ui',
  'ProgressBar': 'ui',
  'Skeleton': 'ui',

  // Layout Components
  'Sidebar': 'layout',
  'RightSidebar': 'layout',
  'Breadcrumb': 'layout',
  'Accordion': 'layout',
  'Drawer': 'layout',

  // Auth Components
  'AuthPage': 'features/auth',
  'AuthPage-new': 'features/auth',

  // Thread Components
  'ThreadCard': 'features/threads',
  'CreateThread': 'features/threads',
  'SimpleCreateThread': 'features/threads',
  'Feed': 'features/threads',

  // Group Components
  'Groups': 'features/groups',
  'GroupManagement': 'features/groups',
  'GroupMembers': 'features/groups',
  'GroupPosts': 'features/groups',
  'GroupChat': 'features/groups',
  'SimpleGroupChat': 'features/groups',

  // Notification Components
  'Notifications': 'features/notifications',
  'NotificationBell': 'features/notifications',
  'NotificationDropdown': 'features/notifications',
  'NotificationsWidget': 'features/notifications',

  // Topic Components
  'TopicDays': 'features/topics',
  'TopicSubmission': 'features/topics',
  'DailyTopicBanner': 'features/topics',

  // Profile Components
  'Profile': 'features/profile',

  // Admin Components
  'AdminPanel': 'features/admin',

  // Form Components
  'FormBuilder': 'forms',
  'HashtagInput': 'forms',
  'MarkdownEditor': 'forms',
  'RichTextEditor': 'forms',
  'CodeEditor': 'forms',

  // Media Components
  'ImageGallery': 'media',
  'VideoPlayer': 'media',
  'AudioPlayer': 'media',
  'FileUpload': 'media',
  'DragAndDrop': 'media',

  // Feedback Components
  'Alert': 'feedback',
  'Toast': 'feedback',
  'Toast-simple': 'feedback',
  'LoadingState': 'feedback',
  'LoadingSkeleton': 'feedback',
  'ErrorBoundary': 'feedback',

  // Navigation Components
  'Pagination': 'navigation',
  'Tabs': 'navigation',
  'CommandPalette': 'navigation',
  'QuickSearchBar': 'navigation',
  'Search': 'navigation',

  // Data Display Components
  'DataTable': 'data-display',
  'Chart': 'data-display',
  'Calendar': 'data-display',
  'KanbanBoard': 'data-display',
  'VirtualScroll': 'data-display',
  'InfiniteScroll': 'data-display',
  'LazyLoad': 'data-display',

  // Overlay Components
  'Modal': 'overlay',
  'Popover': 'overlay',
  'Tooltip': 'overlay',
  'Dropdown': 'overlay',
  'ContextMenu': 'overlay',
  'Carousel': 'overlay',

  // Utility Components
  'ThemeToggle': 'utility',
  'WeatherWidget': 'utility',
  'WeatherEffects': 'utility',
  'GlobalWeatherTheme': 'utility',
  'KeyboardShortcuts': 'utility',
  'EmojiPicker': 'utility',
  'Settings': 'utility',
  'RealtimeChat': 'utility',
  'RealtimeNotificationsProvider': 'utility'
};

class ComponentMigrator {
  constructor() {
    this.processedFiles = 0;
    this.updatedFiles = 0;
    this.errors = [];
  }

  async migrate() {
    console.log('🚀 Starting component migration...');
    
    try {
      // Find all TypeScript/JavaScript files
      const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
        cwd: process.cwd(),
        ignore: ['node_modules/**', '.next/**', 'dist/**']
      });

      console.log(`📁 Found ${files.length} files to process`);

      for (const file of files) {
        await this.processFile(file);
      }

      this.printSummary();

    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }

  async processFile(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Skip if file doesn't contain component imports
      if (!this.hasComponentImports(content)) {
        return;
      }

      const updatedContent = this.updateImports(content, filePath);
      
      if (updatedContent !== content) {
        fs.writeFileSync(fullPath, updatedContent);
        this.updatedFiles++;
        console.log(`✅ Updated: ${filePath}`);
      }

      this.processedFiles++;

    } catch (error) {
      this.errors.push({ file: filePath, error: error.message });
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  hasComponentImports(content) {
    // Check if file imports any components from the old structure
    return Object.keys(componentMappings).some(component => {
      const importPattern = new RegExp(`import.*${component}.*from.*['"]@/app/components/${component}['"]`, 'g');
      return importPattern.test(content);
    });
  }

  updateImports(content, filePath) {
    let updatedContent = content;

    // Group imports by category
    const categoryImports = {};
    const individualImports = [];

    // Find all component imports
    Object.keys(componentMappings).forEach(component => {
      const importPattern = new RegExp(`import\\s+([^\\s]+)\\s+from\\s+['"]@/app/components/${component}['"]`, 'g');
      let match;

      while ((match = importPattern.exec(content)) !== null) {
        const importName = match[1];
        const category = componentMappings[component];
        
        if (!categoryImports[category]) {
          categoryImports[category] = [];
        }
        categoryImports[category].push(importName);
      }
    });

    // Remove old imports
    Object.keys(componentMappings).forEach(component => {
      const importPattern = new RegExp(`import\\s+[^\\s]+\\s+from\\s+['"]@/app/components/${component}['"];?\\s*\\n?`, 'g');
      updatedContent = updatedContent.replace(importPattern, '');
    });

    // Add new category imports
    Object.keys(categoryImports).forEach(category => {
      const components = categoryImports[category];
      const importStatement = `import { ${components.join(', ')} } from '@/app/components/${category}';`;
      
      // Find the best place to insert the import
      const insertPosition = this.findImportInsertPosition(updatedContent);
      updatedContent = updatedContent.slice(0, insertPosition) + 
                     importStatement + '\n' + 
                     updatedContent.slice(insertPosition);
    });

    return updatedContent;
  }

  findImportInsertPosition(content) {
    // Find the last import statement
    const importRegex = /^import\s+.*$/gm;
    const imports = content.match(importRegex);
    
    if (!imports || imports.length === 0) {
      return 0;
    }

    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    return lastImportIndex + lastImport.length + 1;
  }

  printSummary() {
    console.log('\n📊 Migration Summary:');
    console.log(`   Files processed: ${this.processedFiles}`);
    console.log(`   Files updated: ${this.updatedFiles}`);
    console.log(`   Errors: ${this.errors.length}`);

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(({ file, error }) => {
        console.log(`   ${file}: ${error}`);
      });
    }

    if (this.updatedFiles > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('📝 Please review the changes and test your application.');
    } else {
      console.log('\n✅ No files needed updating.');
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrator = new ComponentMigrator();
  migrator.migrate();
}

module.exports = ComponentMigrator;
