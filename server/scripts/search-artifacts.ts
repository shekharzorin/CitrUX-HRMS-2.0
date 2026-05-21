import * as fs from 'fs';
import * as path from 'path';

function searchDirectory(dir: string, pattern: string) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory does not exist: ${dir}`);
    return;
  }
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDirectory(fullPath, pattern);
    } else if (file.endsWith('.txt') || file.endsWith('.json') || file.endsWith('.log')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.toLowerCase().includes(pattern.toLowerCase())) {
          console.log(`🔍 Found match in: ${fullPath}`);
          // Print matching line or context
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(pattern.toLowerCase())) {
              console.log(`  Line ${index + 1}: ${line.trim().substring(0, 150)}`);
            }
          });
        }
      } catch (err: any) {
        // ignore read errors
      }
    }
  }
}

const artifactsDir = "C:\\Users\\DELL\\.gemini\\antigravity\\brain\\1ed29f40-c196-4200-b4a1-b1c1276e6817";
searchDirectory(artifactsDir, "isnap.online");
