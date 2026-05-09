const fs = require('fs');
const content = fs.readFileSync('public/js/whatsapp.js', 'utf8');
const lines = content.split('\n');
const stack = [];

for(let i=0; i<lines.length; i++) {
    let inString = false;
    let stringChar = '';
    let inLineComment = false;
    let inBlockComment = false;
    
    for(let j=0; j<lines[i].length; j++) {
        const char = lines[i][j];
        const nextChar = lines[i][j+1];
        
        if (!inString && !inLineComment && !inBlockComment) {
            if (char === '/' && nextChar === '/') {
                inLineComment = true;
                break;
            }
            if (char === '/' && nextChar === '*') {
                inBlockComment = true;
                j++;
                continue;
            }
            if (char === '\'' || char === '"' || char === '`') {
                inString = true;
                stringChar = char;
                continue;
            }
            if (char === '{') {
                stack.push(i + 1);
            }
            if (char === '}') {
                stack.pop();
            }
        } else if (inString) {
            if (char === '\\') {
                j++;
            } else if (char === stringChar) {
                inString = false;
            }
        } else if (inBlockComment) {
            if (char === '*' && nextChar === '/') {
                inBlockComment = false;
                j++;
            }
        }
    }
}
console.log('Unmatched { at lines:', stack);
