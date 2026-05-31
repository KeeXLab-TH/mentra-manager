const fs = require('fs');
let css = fs.readFileSync('app-theme.css', 'utf8');

// The corrupted block:
// .bottom-nav-item.active {
//     color: var(--primary);
// }
//     align-items: center;
//     gap: 6px;
//     font-size: 13px;
//     color: var(--muted-fg);
// }

let corruptedRegex = /\.bottom-nav-item\.active\s*\{\s*color:\s*var\(--primary\);\s*\}\s*align-items:\s*center;\s*gap:\s*6px;\s*font-size:\s*13px;\s*color:\s*var\(--muted-fg\);\s*\}/m;

let fix = `.bottom-nav-item.active {
    color: var(--primary);
}

.breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--muted-fg);
}`;

if (corruptedRegex.test(css)) {
    css = css.replace(corruptedRegex, fix);
    fs.writeFileSync('app-theme.css', css);
    console.log("Fixed CSS syntax error!");
} else {
    console.log("Regex didn't match.");
}
