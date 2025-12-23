// Library Mapping Database
// Maps React/Next.js libraries to Flutter/Dart packages

export const LIBRARY_MAPPINGS = {
  // Animation libraries
  'framer-motion': {
    category: 'animation',
    flutter: 'flutter_animate',
    pubspec: 'flutter_animate: ^4.5.0',
    conversion: 'automatic',
    notes: 'Use AnimatedContainer, Hero, or flutter_animate package',
    complexity: 'medium'
  },

  // Icon libraries
  'lucide-react': {
    category: 'icons',
    flutter: 'lucide_icons_flutter',
    pubspec: 'lucide_icons_flutter: ^0.0.1',
    conversion: 'automatic',
    notes: 'Direct port available',
    complexity: 'low'
  },
  'react-icons': {
    category: 'icons',
    flutter: 'flutter_icons',
    pubspec: 'flutter_icons: ^1.1.0',
    conversion: 'automatic',
    notes: 'Use flutter_icons package',
    complexity: 'low'
  },

  // Next.js specific
  'next/link': {
    category: 'routing',
    flutter: 'go_router',
    pubspec: 'go_router: ^13.0.0',
    conversion: 'manual',
    notes: 'Use GoRouter.navigate() instead of Link',
    complexity: 'medium'
  },
  'next/image': {
    category: 'media',
    flutter: 'cached_network_image',
    pubspec: 'cached_network_image: ^3.3.0',
    conversion: 'automatic',
    notes: 'Use CachedNetworkImage widget',
    complexity: 'low'
  },
  'next/router': {
    category: 'routing',
    flutter: 'go_router',
    pubspec: 'go_router: ^13.0.0',
    conversion: 'manual',
    notes: 'Use GoRouter for navigation',
    complexity: 'medium'
  },

  // Routing
  'react-router': {
    category: 'routing',
    flutter: 'go_router',
    pubspec: 'go_router: ^13.0.0',
    conversion: 'manual',
    notes: 'Use GoRouter for navigation',
    complexity: 'medium'
  },
  'react-router-dom': {
    category: 'routing',
    flutter: 'go_router',
    pubspec: 'go_router: ^13.0.0',
    conversion: 'manual',
    notes: 'Use GoRouter for navigation',
    complexity: 'medium'
  },

  // State management
  'zustand': {
    category: 'state',
    flutter: 'riverpod',
    pubspec: 'flutter_riverpod: ^2.4.0',
    conversion: 'manual',
    notes: 'Different API, requires refactoring',
    complexity: 'high'
  },
  'redux': {
    category: 'state',
    flutter: 'flutter_redux',
    pubspec: 'flutter_redux: ^0.10.0',
    conversion: 'manual',
    notes: 'Similar concepts but different API',
    complexity: 'high'
  },
  'mobx': {
    category: 'state',
    flutter: 'mobx',
    pubspec: 'mobx: ^2.0.7',
    conversion: 'automatic',
    notes: 'MobX has Flutter port',
    complexity: 'medium'
  },
  '@tanstack/react-query': {
    category: 'state',
    flutter: 'riverpod',
    pubspec: 'flutter_riverpod: ^2.4.0',
    conversion: 'manual',
    notes: 'Use Riverpod with async providers',
    complexity: 'high'
  },
  'react-query': {
    category: 'state',
    flutter: 'riverpod',
    pubspec: 'flutter_riverpod: ^2.4.0',
    conversion: 'manual',
    notes: 'Use Riverpod with async providers',
    complexity: 'high'
  },

  // Forms
  'react-hook-form': {
    category: 'forms',
    flutter: 'flutter_form_builder',
    pubspec: 'flutter_form_builder: ^9.1.0',
    conversion: 'manual',
    notes: 'Different validation API',
    complexity: 'high'
  },
  'formik': {
    category: 'forms',
    flutter: 'flutter_form_builder',
    pubspec: 'flutter_form_builder: ^9.1.0',
    conversion: 'manual',
    notes: 'Different validation API',
    complexity: 'high'
  },

  // HTTP
  'axios': {
    category: 'http',
    flutter: 'dio',
    pubspec: 'dio: ^5.4.0',
    conversion: 'automatic',
    notes: 'Similar API, mostly drop-in replacement',
    complexity: 'low'
  },
  'fetch': {
    category: 'http',
    flutter: 'http',
    pubspec: 'http: ^1.1.0',
    conversion: 'automatic',
    notes: 'Use http package (built-in)',
    complexity: 'low'
  },

  // Date/Time
  'date-fns': {
    category: 'utils',
    flutter: 'intl',
    pubspec: 'intl: ^0.19.0',
    conversion: 'manual',
    notes: 'Different API for date formatting',
    complexity: 'medium'
  },
  'moment': {
    category: 'utils',
    flutter: 'intl',
    pubspec: 'intl: ^0.19.0',
    conversion: 'manual',
    notes: 'Use intl package for date formatting',
    complexity: 'medium'
  },
  'dayjs': {
    category: 'utils',
    flutter: 'intl',
    pubspec: 'intl: ^0.19.0',
    conversion: 'manual',
    notes: 'Use intl package for date formatting',
    complexity: 'medium'
  },

  // Styling (special handling needed)
  'styled-components': {
    category: 'styling',
    flutter: null,
    pubspec: null,
    conversion: 'manual',
    notes: 'Convert to Flutter widgets with BoxDecoration, TextStyle, etc.',
    complexity: 'high'
  },
  'tailwindcss': {
    category: 'styling',
    flutter: null,
    pubspec: null,
    conversion: 'manual',
    notes: 'Analyze classes and convert to Flutter styling (colors, spacing, etc.)',
    complexity: 'high'
  },
  'css-modules': {
    category: 'styling',
    flutter: null,
    pubspec: null,
    conversion: 'manual',
    notes: 'Convert CSS to Flutter Theme or inline styles',
    complexity: 'high'
  },

  // UI Components
  'react-select': {
    category: 'ui',
    flutter: 'dropdown_button2',
    pubspec: 'dropdown_button2: ^2.3.5',
    conversion: 'manual',
    notes: 'Use DropdownButton or custom widget',
    complexity: 'medium'
  },
  'react-datepicker': {
    category: 'ui',
    flutter: 'flutter_datetime_picker',
    pubspec: 'flutter_datetime_picker: ^1.5.1',
    conversion: 'manual',
    notes: 'Use showDatePicker or flutter_datetime_picker',
    complexity: 'medium'
  },

  // Utilities
  'lodash': {
    category: 'utils',
    flutter: 'collection',
    pubspec: 'collection: ^1.18.0',
    conversion: 'manual',
    notes: 'Use Dart collection utilities or custom functions',
    complexity: 'medium'
  },
  'uuid': {
    category: 'utils',
    flutter: 'uuid',
    pubspec: 'uuid: ^4.2.1',
    conversion: 'automatic',
    notes: 'Direct port available',
    complexity: 'low'
  }
};

/**
 * Get library mapping for a package name
 * Handles scoped packages and package aliases
 */
export function getLibraryMapping(packageName) {
  // Handle scoped packages like @/components, @company/package
  if (packageName.startsWith('@/')) {
    // This is a path alias, not an external library
    return null;
  }

  // Check exact match first
  if (LIBRARY_MAPPINGS[packageName]) {
    return LIBRARY_MAPPINGS[packageName];
  }

  // Handle scoped packages like @company/package
  if (packageName.startsWith('@')) {
    const parts = packageName.split('/');
    if (parts.length > 1) {
      const scopedName = parts.slice(0, 2).join('/');
      if (LIBRARY_MAPPINGS[scopedName]) {
        return LIBRARY_MAPPINGS[scopedName];
      }
      // Try just the package name without scope
      const packageOnly = parts[1];
      if (LIBRARY_MAPPINGS[packageOnly]) {
        return LIBRARY_MAPPINGS[packageOnly];
      }
    }
  }

  // Try root package name (for sub-packages like react-router-dom)
  const rootPackage = packageName.split('/')[0];
  if (rootPackage !== packageName && LIBRARY_MAPPINGS[rootPackage]) {
    return LIBRARY_MAPPINGS[rootPackage];
  }

  return null;
}

/**
 * Get category for a library
 */
export function categorizeLibrary(packageName) {
  const mapping = getLibraryMapping(packageName);
  return mapping?.category || 'unknown';
}

/**
 * Get all available categories
 */
export function getAllCategories() {
  return [...new Set(Object.values(LIBRARY_MAPPINGS).map(m => m.category))];
}

/**
 * Get Flutter package name
 */
export function getFlutterPackage(packageName) {
  const mapping = getLibraryMapping(packageName);
  return mapping?.flutter || null;
}

/**
 * Get pubspec.yaml entry
 */
export function getPubspecEntry(packageName) {
  const mapping = getLibraryMapping(packageName);
  return mapping?.pubspec || null;
}

/**
 * Check if a package is mapped
 */
export function isMapped(packageName) {
  return getLibraryMapping(packageName) !== null;
}

/**
 * Extract root package name from import source
 * Handles scoped packages and path aliases
 */
export function extractRootPackage(importSource) {
  // Skip relative imports and path aliases
  if (importSource.startsWith('.') || importSource.startsWith('/') || importSource.startsWith('@/')) {
    return null;
  }

  // Handle scoped packages (@company/package)
  if (importSource.startsWith('@')) {
    const parts = importSource.split('/');
    if (parts.length >= 2) {
      return parts.slice(0, 2).join('/');
    }
    return parts[0];
  }

  // Regular package (package or package/submodule)
  return importSource.split('/')[0];
}

