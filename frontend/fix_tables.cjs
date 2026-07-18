const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    if (content.includes('`n<Table>')) {
        content = content.replace(/`n<Table>/g, '\n<Table>');
        modified = true;
    }
    if (content.includes('</Table>`n</div>')) {
        content = content.replace(/<\/Table>`n<\/div>/g, '</Table>\n</div>');
        modified = true;
    }
    
    if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Fixed ${file}`);
    }
});
