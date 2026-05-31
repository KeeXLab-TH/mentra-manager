const fs = require('fs');

function mergeIntoDashboard() {
    let dashboard = fs.readFileSync('dashboard.html', 'utf8');
    
    let quoteContent = fs.readFileSync('quote_content.html', 'utf8');
    let quoteModals = fs.readFileSync('quote_modals.html', 'utf8');
    
    let trainingContent = fs.readFileSync('training_content.html', 'utf8');
    let trainingModals = fs.readFileSync('training_modals.html', 'utf8');

    // 1. Insert content views right before </main>
    const insertionPointContent = '</main>';
    let newViews = `\n    <!-- Quotation View -->\n    <div class="page-view" id="view-quotation" style="display: none;">\n${quoteContent}\n    </div>\n\n    <!-- Training View -->\n    <div class="page-view" id="view-training" style="display: none;">\n${trainingContent}\n    </div>\n`;
    
    dashboard = dashboard.replace(insertionPointContent, newViews + '\n' + insertionPointContent);

    // 2. Insert modals right before <script type="module">
    // There are multiple script type module, let's look for jsPDF or autoTable
    let modalInsertion = '<!-- jsPDF & autoTable -->';
    if (!dashboard.includes(modalInsertion)) {
        modalInsertion = '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>';
    }
    
    if (dashboard.includes(modalInsertion)) {
        let newModals = `\n<!-- Quotation Modals -->\n${quoteModals}\n\n<!-- Training Modals -->\n${trainingModals}\n`;
        dashboard = dashboard.replace(modalInsertion, newModals + '\n    ' + modalInsertion);
    } else {
        // Just append before </body>
        let newModals = `\n<!-- Quotation Modals -->\n${quoteModals}\n\n<!-- Training Modals -->\n${trainingModals}\n`;
        dashboard = dashboard.replace('</body>', newModals + '\n</body>');
    }
    
    // 3. Add script imports
    const insertionPointScripts = '<script type="module">';
    let newScripts = `    <script type="module" src="quotation_refactored.js"></script>\n    <script type="module" src="training_refactored.js"></script>\n`;
    dashboard = dashboard.replace(insertionPointScripts, newScripts + '    ' + insertionPointScripts);

    fs.writeFileSync('dashboard.html', dashboard);
    console.log("Successfully merged HTML into dashboard.html");
}

mergeIntoDashboard();
