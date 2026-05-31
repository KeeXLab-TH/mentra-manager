const fs = require('fs');

function scopeCSS(inFile, outFile, scopeClass) {
    if (!fs.existsSync(inFile)) return;
    let css = fs.readFileSync(inFile, 'utf8');

    // Remove :root, body, html, .sidebar, .sidebar-overlay, .hamburger, .main-content declarations
    // This is a naive regex approach. It removes top-level blocks.
    const blocksToRemove = ['html', 'body', ':root', '.sidebar', '.sidebar-overlay', '.hamburger', '.main-content'];
    
    // Split CSS into blocks
    let newCss = [];
    let insideMedia = false;
    
    // We can use a simple regex to replace selectors, but it's tricky.
    // Instead of full parsing, we can prepend scope to lines with '{' that are not @media or @keyframes
    const lines = css.split('\n');
    let output = [];
    
    let isKeyframes = false;
    
    for (let line of lines) {
        if (line.includes('@keyframes')) {
            isKeyframes = true;
            output.push(line);
            continue;
        }
        if (isKeyframes && line.includes('}')) {
            // naive check for end of keyframes block if it's the only closing brace on the line
            if (line.trim() === '}') isKeyframes = false;
            output.push(line);
            continue;
        }
        if (isKeyframes) {
            output.push(line);
            continue;
        }

        // Check if line is a selector (contains { but not @)
        if (line.includes('{') && !line.includes('@')) {
            // Scope it
            let selectors = line.split('{')[0].split(',');
            let scopedSelectors = selectors.map(s => {
                s = s.trim();
                if (!s) return '';
                if (blocksToRemove.some(b => s.startsWith(b))) return '/* REMOVED ' + s + ' */';
                if (s === scopeClass) return s; // already scoped
                return `${scopeClass} ${s}`;
            });
            let cleanSelectors = scopedSelectors.filter(s => s && !s.startsWith('/* REMOVED')).join(', ');
            if (cleanSelectors) {
                output.push(`${cleanSelectors} {`);
            } else {
                output.push(`/* REMOVED BLOCK */ {`); // this will break, but we'll manually clean it up or just let it apply to nothing
            }
        } else {
            output.push(line);
        }
    }

    fs.writeFileSync(outFile, output.join('\n'));
    console.log(`Scoped ${inFile} to ${outFile}`);
}

scopeCSS('quote_styles.css', 'quote_scoped.css', '#view-quotation');
scopeCSS('training_styles.css', 'training_scoped.css', '#view-training');
