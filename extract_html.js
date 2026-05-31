const fs = require('fs');

function extractHtml(inFile, outHtml, outModals) {
    if (!fs.existsSync(inFile)) return;
    let content = fs.readFileSync(inFile, 'utf8');

    // Extract everything inside <main class="content-area"> or <main class="workspace">
    let mainMatch = content.match(/<main class="content-area">([\s\S]*?)<\/main>/i) || 
                    content.match(/<main class="content-area" id="contentArea">([\s\S]*?)<\/main>/i) ||
                    content.match(/<main class="workspace">([\s\S]*?)<\/main>/i);
    
    if (mainMatch) {
        fs.writeFileSync(outHtml, mainMatch[1]);
        console.log(`Extracted HTML from ${inFile}`);
    } else {
        console.log("Could not find <main class='content-area'> or <main class='workspace'> in", inFile);
    }

    // Extract modals
    let modals = "";
    if (content.includes('<!-- Modals -->')) {
        let parts = content.split('<!-- Modals -->');
        if (parts.length > 1) {
            modals = parts[1].split(/<script/i)[0];
        }
    } else if (content.includes('<!-- ================================================')) {
        let parts = content.split('<!-- ================================================');
        for (let i = 1; i < parts.length; i++) {
            if (parts[i].includes('MODALS') || parts[i].includes('Modals') || parts[i].includes('ALL MODALS')) {
                modals = '<!-- ================================================' + parts[i].split(/<script/i)[0];
                break;
            }
        }
    } 
    
    if (!modals && content.includes('<div class="modal-overlay"')) {
        let idx = content.indexOf('<div class="modal-overlay"');
        modals = content.substring(idx).split(/<script/i)[0];
    }
    
    fs.writeFileSync(outModals, modals);
}

extractHtml('quotation.html', 'quote_content.html', 'quote_modals.html');
extractHtml('external_training.html', 'training_content.html', 'training_modals.html');
