import chalk from 'chalk';

export class SSRHandler {
  constructor() {
    this.ssrPatterns = [
      'getServerSideProps',
      'getStaticProps',
      'getStaticPaths',
      'getInitialProps'
    ];
    
    this.csrPatterns = [
      'useRouter',
      'next/router',
      'next/link',
      'next/head',
      'next/image',
      'next/dynamic'
    ];
  }

  detectSSRCSRPatterns(content) {
    const detectedPatterns = {
      ssr: [],
      csr: [],
      hasDataFetching: false,
      hasRouting: false,
      hasHeadManagement: false,
      hasImageOptimization: false,
      hasDynamicImports: false
    };

    // Detect SSR patterns
    this.ssrPatterns.forEach(pattern => {
      if (content.includes(pattern)) {
        detectedPatterns.ssr.push(pattern);
        detectedPatterns.hasDataFetching = true;
      }
    });

    // Detect CSR patterns
    this.csrPatterns.forEach(pattern => {
      if (content.includes(pattern)) {
        detectedPatterns.csr.push(pattern);
        
        if (pattern.includes('router') || pattern.includes('link')) {
          detectedPatterns.hasRouting = true;
        }
        if (pattern.includes('head')) {
          detectedPatterns.hasHeadManagement = true;
        }
        if (pattern.includes('image')) {
          detectedPatterns.hasImageOptimization = true;
        }
        if (pattern.includes('dynamic')) {
          detectedPatterns.hasDynamicImports = true;
        }
      }
    });

    return detectedPatterns;
  }

  convertSSRToReactNative(content, fileName) {
    console.log(chalk.cyan(`🔄 Converting SSR/CSR patterns in ${fileName}...`));
    
    let convertedContent = content;
    const patterns = this.detectSSRCSRPatterns(content);
    
    if (patterns.ssr.length > 0 || patterns.csr.length > 0) {
      console.log(chalk.yellow(`  📋 Found ${patterns.ssr.length} SSR and ${patterns.csr.length} CSR patterns`));
    }

    // Convert SSR data fetching
    convertedContent = this.convertDataFetching(convertedContent, patterns);
    
    // Convert routing
    convertedContent = this.convertRouting(convertedContent, patterns);
    
    // Convert head management
    convertedContent = this.convertHeadManagement(convertedContent, patterns);
    
    // Convert image optimization
    convertedContent = this.convertImageOptimization(convertedContent, patterns);
    
    // Convert dynamic imports
    convertedContent = this.convertDynamicImports(convertedContent, patterns);

    return {
      content: convertedContent,
      convertedPatterns: patterns,
      additionalDependencies: this.getAdditionalDependencies(patterns)
    };
  }

  convertDataFetching(content, patterns) {
    // Convert getServerSideProps to useEffect with API calls
    content = content.replace(
      /export\s+async\s+function\s+getServerSideProps\s*\([^)]*\)\s*{[\s\S]*?return\s*{[\s\S]*?props:\s*([^}]*)}[\s\S]*?}/g,
      (match, propsContent) => {
        return `
// Converted from getServerSideProps
// Original SSR data fetching converted to client-side useEffect
const useFetchData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // TODO: Replace with your actual API endpoint
        const response = await fetch('YOUR_API_ENDPOINT');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};`;
      }
    );

    // Convert getStaticProps to useEffect
    content = content.replace(
      /export\s+async\s+function\s+getStaticProps\s*\([^)]*\)\s*{[\s\S]*?return\s*{[\s\S]*?props:\s*([^}]*)}[\s\S]*?}/g,
      `
// Converted from getStaticProps
// Original static generation converted to client-side data fetching
const useStaticData = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // TODO: Replace with your data source
    const loadStaticData = async () => {
      // This was originally generated at build time
      // Now loads on component mount
      const staticData = {}; // Your static data here
      setData(staticData);
    };
    
    loadStaticData();
  }, []);
  
  return data;
};`
    );

    // Update component to use hooks instead of props
    if (patterns.hasDataFetching) {
      content = content.replace(
        /export\s+default\s+function\s+(\w+)\s*\(\s*{\s*([^}]+)\s*}\s*\)/,
        (match, componentName, props) => {
          return `export default function ${componentName}() {
  const { data, loading, error } = useFetchData();
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>Error: {error.message}</Text>
      </View>
    );
  }`;
        }
      );
    }

    return content;
  }

  convertRouting(content, patterns) {
    // Convert next/router to React Navigation
    content = content.replace(
      /import\s+{\s*useRouter\s*}\s+from\s+['"]next\/router['"];?/g,
      `import { useNavigation, useRoute } from '@react-navigation/native';`
    );

    content = content.replace(
      /const\s+router\s*=\s*useRouter\(\);?/g,
      `const navigation = useNavigation();
  const route = useRoute();`
    );

    // Convert router.push to navigation.navigate
    content = content.replace(
      /router\.push\(['"`]([^'"`]+)['"`]\)/g,
      `navigation.navigate('$1')`
    );

    // Convert router.query to route.params
    content = content.replace(/router\.query/g, 'route.params');

    // Convert Link components
    content = content.replace(
      /import\s+Link\s+from\s+['"]next\/link['"];?/g,
      `import { TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';`
    );

    content = content.replace(
      /<Link\s+href=['"`]([^'"`]+)['"`][^>]*>([\s\S]*?)<\/Link>/g,
      (match, href, children) => {
        return `<TouchableOpacity onPress={() => navigation.navigate('${href}')}>
  ${children}
</TouchableOpacity>`;
      }
    );

    return content;
  }

  convertHeadManagement(content, patterns) {
    // Convert next/head to react-native-helmet-async or remove
    content = content.replace(
      /import\s+Head\s+from\s+['"]next\/head['"];?/g,
      `// Head management not needed in React Native
// Original Next.js Head component removed`
    );

    content = content.replace(
      /<Head>[\s\S]*?<\/Head>/g,
      `{/* Head content removed - not applicable in React Native */}`
    );

    return content;
  }

  convertImageOptimization(content, patterns) {
    // Convert next/image to expo-image or react-native Image
    content = content.replace(
      /import\s+Image\s+from\s+['"]next\/image['"];?/g,
      `import { Image } from 'expo-image';`
    );

    // Update Image props for React Native
    content = content.replace(
      /<Image\s+([^>]*?)src=['"`]([^'"`]+)['"`]([^>]*?)\/?>|<Image\s+([^>]*?)src=['"`]([^'"`]+)['"`]([^>]*?)>([\s\S]*?)<\/Image>/g,
      (match, props1, src1, props2, props3, src2, props4, children) => {
        const src = src1 || src2;
        const props = (props1 || '') + (props2 || '') + (props3 || '') + (props4 || '');
        
        // Extract width and height if present
        const widthMatch = props.match(/width={?(\d+)}?/);
        const heightMatch = props.match(/height={?(\d+)}?/);
        const altMatch = props.match(/alt=['"`]([^'"`]*)['"`]/);
        
        const width = widthMatch ? widthMatch[1] : '100';
        const height = heightMatch ? heightMatch[1] : '100';
        const alt = altMatch ? altMatch[1] : 'Image';

        return `<Image 
  source={{ uri: '${src}' }}
  style={{ width: ${width}, height: ${height} }}
  contentFit="cover"
  alt="${alt}"
/>`;
      }
    );

    return content;
  }

  convertDynamicImports(content, patterns) {
    // Convert next/dynamic to React.lazy
    content = content.replace(
      /import\s+dynamic\s+from\s+['"]next\/dynamic['"];?/g,
      `import React, { Suspense } from 'react';
import { View, ActivityIndicator } from 'react-native';`
    );

    content = content.replace(
      /const\s+(\w+)\s*=\s*dynamic\(\s*\(\)\s*=>\s*import\(['"`]([^'"`]+)['"`]\)[^)]*\);?/g,
      (match, componentName, importPath) => {
        return `const ${componentName} = React.lazy(() => import('${importPath}'));

const ${componentName}WithSuspense = (props) => (
  <Suspense fallback={
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  }>
    <${componentName} {...props} />
  </Suspense>
);`;
      }
    );

    return content;
  }

  getAdditionalDependencies(patterns) {
    const dependencies = {};

    if (patterns.hasDataFetching) {
      dependencies['@react-native-async-storage/async-storage'] = '^1.19.0';
    }

    if (patterns.hasRouting) {
      dependencies['@react-navigation/native'] = '^6.1.0';
      dependencies['@react-navigation/native-stack'] = '^6.9.0';
    }

    if (patterns.hasImageOptimization) {
      dependencies['expo-image'] = '^1.3.0';
    }

    return dependencies;
  }

  generateConversionReport(conversions) {
    const report = {
      totalFilesProcessed: conversions.length,
      ssrConversions: 0,
      csrConversions: 0,
      patternsSummary: {
        dataFetching: 0,
        routing: 0,
        headManagement: 0,
        imageOptimization: 0,
        dynamicImports: 0
      },
      recommendations: []
    };

    conversions.forEach(conversion => {
      if (conversion.convertedPatterns.ssr.length > 0) {
        report.ssrConversions++;
      }
      if (conversion.convertedPatterns.csr.length > 0) {
        report.csrConversions++;
      }
      
      if (conversion.convertedPatterns.hasDataFetching) {
        report.patternsSummary.dataFetching++;
      }
      if (conversion.convertedPatterns.hasRouting) {
        report.patternsSummary.routing++;
      }
      if (conversion.convertedPatterns.hasHeadManagement) {
        report.patternsSummary.headManagement++;
      }
      if (conversion.convertedPatterns.hasImageOptimization) {
        report.patternsSummary.imageOptimization++;
      }
      if (conversion.convertedPatterns.hasDynamicImports) {
        report.patternsSummary.dynamicImports++;
      }
    });

    // Generate recommendations
    if (report.patternsSummary.dataFetching > 0) {
      report.recommendations.push(
        'Review data fetching patterns: SSR/getStaticProps converted to useEffect. Consider implementing proper loading states and error handling.'
      );
    }

    if (report.patternsSummary.routing > 0) {
      report.recommendations.push(
        'Update navigation: Next.js routing converted to React Navigation. Test navigation flows and update deep linking if needed.'
      );
    }

    if (report.patternsSummary.headManagement > 0) {
      report.recommendations.push(
        'Head management removed: Next.js Head components are not applicable in React Native. Consider using Expo constants for app metadata.'
      );
    }

    return report;
  }
} 