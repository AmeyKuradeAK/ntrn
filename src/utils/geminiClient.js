import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

// Get __dirname workaround for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY not found in .env");
  process.exit(1);
}

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Function to call Gemini API
export async function callGeminiAPI(sourceCode, fileName) {
  const prompt = `
You're an expert React Native developer.

Convert the following Next.js file named "${fileName}" into a fully working React Native (Expo) component.
- If it's a layout.tsx, convert it to work as App.tsx (root layout).
- If it's a page.tsx, convert it into a functional screen component.
- Replace all Next.js specific imports (like 'next/head', 'Image') with React Native or Expo equivalents.
- Convert Tailwind or className styles to NativeWind classes (if used).
- Ensure navigation (if any) works with React Navigation.
- Respond with final converted code.
- Additionally, provide a list of required npm packages in this format after the code:

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
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const content = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) throw new Error("No content returned from Gemini");

    const [codeBlock, packageBlock] = content.split("```json");

    const code = codeBlock.replace(/```[a-z]*\n?/g, "").trim();
    let dependencies = {};

    if (packageBlock) {
      try {
        const json = JSON.parse(packageBlock.replace(/```/g, "").trim());
        dependencies = json.dependencies || {};

        // Filter dependencies to remove invalid ones
        dependencies = Object.fromEntries(
          Object.entries(dependencies).filter(([pkg, version]) =>
            typeof pkg === 'string' && pkg.trim() && typeof version === 'string' && version.startsWith('^')
          )
        );
      } catch (err) {
        console.warn("⚠️ Failed to parse dependencies block.", err);
      }
    }

    return { code, dependencies };
  } catch (err) {
    console.error("❌ Error calling Gemini API:", err.response?.data || err.message);
    return { code: `// Error converting ${fileName}\n// ${err.message}`, dependencies: {} };
  }
}

// Function to update package.json with 'latest' version
export function updatePackageJson(projectPath, newDeps) {
  const packageJsonPath = path.join(projectPath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    console.warn("⚠️ package.json not found, skipping dependency update.");
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  packageJson.dependencies = packageJson.dependencies || {};

  let added = 0;
  for (const [pkg] of Object.entries(newDeps)) {
    if (!packageJson.dependencies[pkg]) {
      // Set the version to 'latest'
      packageJson.dependencies[pkg] = "latest";
      added++;
    }
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  if (added > 0) {
    console.log(`📦 Added ${added} new dependencies to package.json with 'latest' version.`);
  } else {
    console.log("✅ No new dependencies to add.");
  }
}

// Function to install dependencies using npm @latest version
export function installDependenciesLatest(rnProjectPath, dependencies) {
  const installPromises = Object.keys(dependencies).map(pkg => {
    const command = `npm install ${pkg}@latest`;
    return new Promise((resolve, reject) => {
      exec(command, (err, stdout, stderr) => {
        if (err) {
          reject(`Error installing ${pkg}: ${stderr}`);
        } else {
          console.log(`Successfully installed ${pkg}@latest`);
          resolve(stdout);
        }
      });
    });
  });

  return Promise.all(installPromises)
    .then(() => console.log("📦 All dependencies installed!"))
    .catch((error) => console.error(error));
}
