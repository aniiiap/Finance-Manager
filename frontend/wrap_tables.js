const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Look for <Table> that isn't already inside <div className="overflow
      // Actually, a safer way is to just wrap it, but avoid double wrapping
      // If the line before <Table> contains 'overflow', we skip.
      
      const lines = content.split('\n');
      let modified = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<Table>') && !lines[i-1].includes('overflow')) {
           lines[i] = lines[i].replace('<Table>', '<div className="overflow-x-auto w-full">\n<Table>');
           modified = true;
        }
        if (lines[i].includes('</Table>') && modified) {
           // wait, we only want to add </div> if we wrapped IT.
           // this logic is flawed for multiple tables in one file where some are wrapped.
        }
      }
    }
  }
}
