const fs = require('fs');
const path = require('path');

// We will load the file as text to avoid ESM import issues with the JSONs.
// Wait, actually the file is ESM export `export const curriculumData = { ... }`.
// I can do some regex processing, or I can just use a babel transform, but simpler:
// For the new files, I will just write them out using JS regex or write them manually.
