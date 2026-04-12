const fs = require('fs');
const path = require('path');

const basePath = 'c:/Marcela/TESIS/ventilab-web/src/features/ensenanza';
const dirsToCreate = [
  'curriculum/shared/conexion/hooks',
  'curriculum/shared/conexion/services',
  'curriculum/shared/contexts',
  'curriculum/shared/modulos',
  'curriculum/shared/evaluation',
  'curriculum/shared/clinical',
  'curriculum/shared/media',
  'curriculum/shared/navigation',
  'curriculum/shared/data',
  'curriculum/shared/utils',
  'curriculum/shared/pages',
  'progreso/components',
  'dashboard/components'
];

dirsToCreate.forEach(dir => {
  const fullPath = path.join(basePath, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

function moveDirContents(srcSub, destSub) {
  const srcDir = path.join(basePath, srcSub);
  const destDir = path.join(basePath, destSub);
  if (!fs.existsSync(srcDir)) return;
  const items = fs.readdirSync(srcDir);
  items.forEach(item => {
    fs.renameSync(path.join(srcDir, item), path.join(destDir, item));
  });
}

function moveFile(srcSub, destSub) {
  const srcFile = path.join(basePath, srcSub);
  const destFile = path.join(basePath, destSub);
  if (fs.existsSync(srcFile)) {
    fs.renameSync(srcFile, destFile);
  }
}

// Move contexts
moveDirContents('contexts', 'curriculum/shared/contexts');
// Move data
moveDirContents('data', 'curriculum/shared/data');
// Move utils
moveDirContents('utils', 'curriculum/shared/utils');
// Move hooks
moveDirContents('hooks', 'curriculum/shared/conexion/hooks');
// Move services
moveDirContents('services', 'curriculum/shared/conexion/services');
// Move pages
moveDirContents('pages', 'curriculum/shared/pages');

// Move specific components directories
moveDirContents('components/progress', 'progreso/components');
moveDirContents('components/dashboard', 'dashboard/components');
moveDirContents('components/ai', 'curriculum/shared/ai');
moveDirContents('components/curriculum', 'curriculum/shared/modulos');
moveDirContents('components/evaluation', 'curriculum/shared/evaluation');
moveDirContents('components/clinical', 'curriculum/shared/clinical');
moveDirContents('components/media', 'curriculum/shared/media');
moveDirContents('components/navigation', 'curriculum/shared/navigation');

// Move specific files from root of ensenanza
moveFile('ProgressTracker.jsx', 'progreso/ProgressTracker.jsx');
moveFile('FlashcardDashboardPage.jsx', 'dashboard/FlashcardDashboardPage.jsx');
moveFile('FlashcardSystem.jsx', 'curriculum/shared/modulos/FlashcardSystem.jsx');
moveFile('ContentGeneratorPanel.jsx', 'curriculum/shared/ai/ContentGeneratorPanel.jsx');
moveFile('TeachingModule.jsx', 'curriculum/shared/pages/TeachingModule.jsx');

console.log('Move operations completed.');
