const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Marcela/TESIS/ventilab-web/src/features/ensenanza/shared/data/lessons';
const targetDirs = ['mecanica', 'ventylab'];

function validateJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const errors = [];

    // Check module title
    if (!data.title || data.title.trim() === '') {
      errors.push('Missing or empty title at root');
    }

    if (data.sections && Array.isArray(data.sections)) {
      data.sections.forEach((s, idx) => {
        if (!s.title || s.title.trim() === '') {
          errors.push(`Section ${idx+1} [${s.id}] missing title`);
        }
        
        let hasContent = false;
        
        // Handle normal markdown content
        if (s.content && s.content.markdown && s.content.markdown.trim() !== '') {
          hasContent = true;
        }

        // Handle interactive or media blocks
        if (s.blocks && Array.isArray(s.blocks) && s.blocks.length > 0) {
          hasContent = true;
        }

        if (!hasContent) {
          errors.push(`Section ${idx+1} [${s.id}] has empty/blank content`);
        }
      });
    }

    if (errors.length > 0) {
      console.log(`\n❌ Validation Failed: ${filePath}`);
      errors.forEach(e => console.log(`   - ${e}`));
    }
  } catch (err) {
    console.log(`\n🚨 Error parsing ${filePath}: ${err.message}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'pathologies') walkDir(fullPath);
    } else if (fullPath.endsWith('.json') && file !== 'metadata.json') {
      validateJson(fullPath);
    }
  }
}

targetDirs.forEach(td => {
  const full = path.join(baseDir, td);
  if (fs.existsSync(full)) {
    walkDir(full);
  }
});

console.log('\nValidation complete.');
