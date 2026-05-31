const fs = require('fs');

function refactorFile(inFile, outFile, initName) {
    if (!fs.existsSync(inFile)) {
        console.log("File not found:", inFile);
        return;
    }
    let content = fs.readFileSync(inFile, 'utf8');
    
    if (inFile === 'training_module.js') {
        let inline = fs.readFileSync('training_inline.js', 'utf8');
        content = inline + "\n" + content;
    }

    // Remove Firebase init
    content = content.replace(/import \{ initializeApp[^\n]*\n/g, '');
    content = content.replace(/import \{ getAuth[^\n]*\n/g, '');
    content = content.replace(/import \{.*?initializeFirestore[^\n]*\n/gs, '');
    content = content.replace(/import \{.*?getFirestore[^\n]*\n/gs, '');
    content = content.replace(/\/\/ --- Firebase & Firestore Setup ---[\s\S]*?const db = initializeFirestore.*?\);/g, '');
    content = content.replace(/let FIREBASE_CONFIG = null;[\s\S]*?const auth = getAuth\(app\);/g, '');
    content = content.replace(/let FIREBASE_CONFIG;[\s\S]*?const db = getFirestore\(app\);/g, '');
    
    // Extract functions
    let functions = [];
    const fnRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
    let match;
    while ((match = fnRegex.exec(content)) !== null) {
        if (!functions.includes(match[1])) {
            functions.push(match[1]);
        }
    }
    
    // Replace DOMContentLoaded
    content = content.replace(/document\.addEventListener\(['"]DOMContentLoaded['"],\s*(?:async\s*)?\(\)\s*=>\s*\{([\s\S]*?)\}\);/g, `export async function ${initName}() {\n    const db = window.db;\n    const currentUser = window.currentUser;\n    $1\n`);
    
    // Convert onAuthStateChanged to just a data loading block
    content = content.replace(/onAuthStateChanged\(auth, async \(user\) => \{([\s\S]*?)\}\);/g, `
    // Auth state is managed by dashboard.html, just run the inner logic if user exists
    if (window.currentUser) {
        let user = window.currentUser;
        $1
    }
}`);

    // Fix missing imports
    let imports = `import { doc, getDoc, setDoc, deleteDoc, updateDoc, collection, getDocs, onSnapshot, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';\n`;

    // Append window bindings
    let windowBindings = '\n// Global bindings for inline HTML onclick\n';
    functions.forEach(fn => {
        windowBindings += `window.${fn} = ${fn};\n`;
    });
    
    // Ensure we don't declare let currentUser if it conflicts
    content = content.replace(/let currentUser = null;/g, '');

    fs.writeFileSync(outFile, imports + content + windowBindings);
    console.log("Refactored", inFile, "to", outFile);
}

refactorFile('quotation.js', 'quotation_refactored.js', 'initQuotationView');
refactorFile('training_module.js', 'training_refactored.js', 'initTrainingView');
console.log('Refactoring complete');
