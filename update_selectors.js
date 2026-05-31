const fs = require('fs');
let css = fs.readFileSync('assets/css/app-theme.css', 'utf8');

const mediaQueryStart = css.indexOf('Flawless Mobile Card Tables');
if (mediaQueryStart === -1) {
    console.error('Could not find start of mobile tables block');
    process.exit(1);
}

let topPart = css.substring(0, mediaQueryStart - 10);
let bottomPart = css.substring(mediaQueryStart - 10);

// Replace selectors
bottomPart = bottomPart.replace(/\.table-wrap table/g, '.table-wrap table, .table-responsive table');
bottomPart = bottomPart.replace(/\.table-wrap \{/g, '.table-wrap, .table-responsive {');

fs.writeFileSync('assets/css/app-theme.css', topPart + bottomPart);
console.log('Successfully updated CSS selectors for mobile tables.');
