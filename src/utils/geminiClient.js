import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import prompts from 'prompts';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute path to .env in the package root
const envPath = path.resolve(__dirname, '../../.env');

// Check if .env exists; if not, ask and create it
if (!fs.existsSync(envPath)) {
  const response = await prompts({
    type: 'text',
    name: 'key',
    message: '🔐 Enter your Gemini API Key:',
    validate: value => value.trim().length > 10 || 'API key too short',
  });

  if (!response.key) {
    console.error('❌ No API key provided. Exiting.');
    process.exit(1);
  }

  fs.writeFileSync(envPath, `GEMINI_API_KEY=${response.key.trim()}\n`);
  console.log('✅ Gemini API Key saved successfully!\n');
}

// Load the saved key from .env
dotenv.config({ path: envPath });
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

Convert the following Next.js file named "${fileName}" into a fully working React Native (Expo) component or screen.

Make sure to:
- Convert Tailwind CSS to NativeWind if present.
- Replace any Next.js or web-only packages with equivalent React Native-compatible ones.
- Fix all imports:
  - Replace all "@/components" imports with "../components" or "./components" based on usage.
  - Use only valid relative import paths compatible with React Native.
- Ensure the output is valid React Native code.
- Do NOT return extra explanation or context. Just the code and dependencies.

Return the React Native code first as a code block.

Then return required dependencies like:

\`\`\`json
{
  "dependencies": {
    "package-name": "^version"
  }
}
\`\`\`

Here is the code to convert:
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
