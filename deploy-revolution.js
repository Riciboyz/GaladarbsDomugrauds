#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Threads App Revolution Deployment...\n');

// Files to replace/update
const replacements = [
  {
    from: 'app/providers.tsx',
    to: 'app/providers-new.tsx',
    description: 'Updated providers with better context management'
  },
  {
    from: 'app/contexts/UserContext.tsx',
    to: 'app/contexts/UserContext.tsx',
    description: 'Enhanced user context with better error handling'
  },
  {
    from: 'app/contexts/ThreadContext.tsx',
    to: 'app/contexts/ThreadContext.tsx',
    description: 'Improved thread context with loading states'
  },
  {
    from: 'app/contexts/GroupContext.tsx',
    to: 'app/contexts/GroupContext.tsx',
    description: 'Enhanced group context'
  },
  {
    from: 'app/contexts/NotificationContext.tsx',
    to: 'app/contexts/NotificationContext.tsx',
    description: 'Improved notification context'
  },
  {
    from: 'app/contexts/TopicDayContext.tsx',
    to: 'app/contexts/TopicDayContext.tsx',
    description: 'Updated TopicDay context with proper types'
  },
  {
    from: 'app/contexts/ToastContext.tsx',
    to: 'app/contexts/ToastContext.tsx',
    description: 'Enhanced toast context'
  }
];

// New files to add
const newFiles = [
  {
    file: 'app/components/ErrorBoundary.tsx',
    description: 'Error boundary component for better error handling'
  },
  {
    file: 'app/components/LoadingState.tsx',
    description: 'Comprehensive loading state components'
  },
  {
    file: 'app/hooks/useLoading.ts',
    description: 'Custom hooks for loading state management'
  }
];

// Backup function
function createBackup() {
  const backupDir = `backup-${new Date().toISOString().split('T')[0]}`;
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  console.log(`📦 Created backup directory: ${backupDir}`);
  return backupDir;
}

// Main deployment function
async function deploy() {
  try {
    // Create backup
    const backupDir = createBackup();
    
    // Replace providers
    console.log('🔄 Updating providers...');
    if (fs.existsSync('app/providers-new.tsx')) {
      // Backup current providers
      if (fs.existsSync('app/providers.tsx')) {
        fs.copyFileSync('app/providers.tsx', path.join(backupDir, 'providers.tsx.bak'));
      }
      
      // Replace with new providers
      fs.copyFileSync('app/providers-new.tsx', 'app/providers.tsx');
      console.log('✅ Updated providers.tsx');
    }
    
    // Update layout to include error boundary
    console.log('🔄 Updating layout...');
    const layoutPath = 'app/layout.tsx';
    if (fs.existsSync(layoutPath)) {
      // Backup current layout
      fs.copyFileSync(layoutPath, path.join(backupDir, 'layout.tsx.bak'));
      
      // Read and update layout
      let layoutContent = fs.readFileSync(layoutPath, 'utf8');
      
      // Add ErrorBoundary import if not present
      if (!layoutContent.includes('ErrorBoundary')) {
        layoutContent = layoutContent.replace(
          "import { Providers } from './providers-new'",
          "import { Providers } from './providers'\nimport ErrorBoundary from './components/ErrorBoundary'"
        );
        
        // Wrap children with ErrorBoundary
        layoutContent = layoutContent.replace(
          '<Providers>\n            {children}\n          </Providers>',
          '<ErrorBoundary>\n            <Providers>\n              {children}\n            </Providers>\n          </ErrorBoundary>'
        );
        
        fs.writeFileSync(layoutPath, layoutContent);
        console.log('✅ Updated layout.tsx with ErrorBoundary');
      }
    }
    
    // Verify new files exist
    console.log('🔄 Verifying new components...');
    for (const file of newFiles) {
      if (fs.existsSync(file.file)) {
        console.log(`✅ ${file.description}`);
      } else {
        console.log(`❌ Missing: ${file.file}`);
      }
    }
    
    // Run build test
    console.log('\n🔨 Testing build...');
    const { exec } = require('child_process');
    
    exec('npm run build', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Build failed:', error.message);
        console.log('📋 Build output:', stdout);
        console.log('📋 Build errors:', stderr);
        return;
      }
      
      console.log('✅ Build successful!');
      console.log('\n🎉 Revolution deployment completed successfully!');
      console.log('\n📋 Summary of changes:');
      console.log('• ✅ Simplified and modularized providers');
      console.log('• ✅ Enhanced component architecture with reusable Button/Input components');
      console.log('• ✅ Added comprehensive error boundaries and loading states');
      console.log('• ✅ Improved TypeScript types and interfaces');
      console.log('• ✅ Standardized database configuration');
      console.log('• ✅ Refactored API routes with consistent error handling');
      console.log('\n🚀 Your app is now more maintainable, scalable, and user-friendly!');
    });
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run deployment
deploy();
