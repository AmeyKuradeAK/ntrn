import { callGeminiAPI } from './geminiClient.js';
import { generateSuggestionPrompt } from './perfectPrompts.js';

export class SuggestionResolver {
  constructor() {
    this.implementedSuggestions = new Map();
  }

  // Automatically implement all quality suggestions
  async implementSuggestions(code, fileName, suggestions, projectContext) {
    if (!suggestions || suggestions.length === 0) {
      return { code, implementedCount: 0, improvements: [] };
    }

    console.log(`🔧 Implementing ${suggestions.length} suggestions for ${fileName}...`);
    
    let improvedCode = code;
    const improvements = [];
    let implementedCount = 0;

    // Group similar suggestions for batch processing
    const groupedSuggestions = this.groupSuggestions(suggestions);
    
    for (const [category, categorySuggestions] of Object.entries(groupedSuggestions)) {
      try {
        console.log(`  📋 Processing ${category} suggestions (${categorySuggestions.length} items)`);
        
        const categoryResult = await this.implementSuggestionCategory(
          improvedCode, 
          fileName, 
          categorySuggestions, 
          projectContext
        );
        
        if (categoryResult.success) {
          improvedCode = categoryResult.code;
          improvements.push({
            category,
            suggestions: categorySuggestions,
            implemented: true
          });
          implementedCount += categorySuggestions.length;
          console.log(`  ✅ Implemented ${categorySuggestions.length} ${category} suggestions`);
        } else {
          console.log(`  ⚠️ Failed to implement ${category} suggestions: ${categoryResult.error}`);
        }
      } catch (error) {
        console.log(`  ❌ Error implementing ${category} suggestions:`, error.message);
      }
    }

    return {
      code: improvedCode,
      implementedCount,
      improvements,
      totalSuggestions: suggestions.length
    };
  }

  // Group suggestions by category
  groupSuggestions(suggestions) {
    const groups = {
      imports: [],
      components: [],
      styling: [],
      navigation: [],
      other: []
    };

    suggestions.forEach(suggestion => {
      const lowerSuggestion = suggestion.toLowerCase();
      
      if (lowerSuggestion.includes('import')) {
        groups.imports.push(suggestion);
      } else if (lowerSuggestion.includes('component') || lowerSuggestion.includes('text')) {
        groups.components.push(suggestion);
      } else if (lowerSuggestion.includes('style')) {
        groups.styling.push(suggestion);
      } else if (lowerSuggestion.includes('navigation')) {
        groups.navigation.push(suggestion);
      } else {
        groups.other.push(suggestion);
      }
    });

    // Remove empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([_, suggestions]) => suggestions.length > 0)
    );
  }

  // Implement suggestions for a specific category
  async implementSuggestionCategory(code, fileName, suggestions, projectContext) {
    try {
      // Generate category-specific prompt
      const prompt = generateSuggestionPrompt(code, fileName, suggestions);
      
      // Get improved code from AI
      const response = await callGeminiAPI(prompt, fileName, projectContext);
      
      if (response && response.code) {
        return {
          success: true,
          code: response.code
        };
      } else {
        return {
          success: false,
          error: 'No improved code returned from AI'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Quick suggestion resolution
export async function quickResolveSuggestions(code, fileName, suggestions, projectContext) {
  const resolver = new SuggestionResolver();
  return await resolver.implementSuggestions(code, fileName, suggestions, projectContext);
} 