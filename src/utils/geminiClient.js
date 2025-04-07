import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function callGeminiAPI(sourceCode, fileName) {
  const prompt = `
You're an expert React Native developer.

Convert the following Next.js file named "${fileName}" into a fully working React Native (Expo) component.
- If it's a layout.tsx, convert it to App.tsx.
- Replace Next.js imports with React Native or Expo equivalents.
- Convert Tailwind classes to NativeWind classes (if used).
- Ensure navigation works with React Navigation.
- Respond with the converted code.
- Then provide required npm packages like this:

\`\`\`json
{
  "dependencies": {
    "package-name": "^version"
  }
}
\`\`\`

Code:
\`\`\`tsx
${sourceCode}
\`\`\`
`;

  try {
    const res = await axios.post(
      `${GEMINI_ENDPOINT}?key=${API_KEY}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const content = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) throw new Error('No content returned from Gemini');

    const [codeBlock, packageBlock] = content.split('```json');
    const code = codeBlock.replace(/```[a-z]*\n?/g, '').trim();
    let dependencies = {};

    if (packageBlock) {
      try {
        const json = JSON.parse(packageBlock.replace(/```/g, '').trim());
        dependencies = json.dependencies || {};
        dependencies = Object.fromEntries(
          Object.entries(dependencies).filter(
            ([pkg, version]) =>
              typeof pkg === 'string' &&
              pkg.trim() &&
              typeof version === 'string' &&
              version.startsWith('^')
          )
        );
      } catch (err) {
        console.warn('⚠️ Failed to parse dependencies block.', err);
      }
    }

    return { code, dependencies };
  } catch (err) {
    console.error('❌ Error calling Gemini API:', err.response?.data || err.message);
    return {
      code: `// Error converting ${fileName}\n// ${err.message}`,
      dependencies: {},
    };
  }
}
