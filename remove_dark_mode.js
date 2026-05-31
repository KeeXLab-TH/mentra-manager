const fs = require('fs');
let content = fs.readFileSync('assets/js/app-ui.js', 'utf8');

// 1. Remove THEME_KEY and theme functions
content = content.replace(/const THEME_KEY = 'mentra_ui_theme';[\s\S]*?function injectThemeToggle\(\) \{[\s\S]*?\n    \}/, '');

// 2. Remove keyboard shortcut for theme
content = content.replace(/if \(e\.altKey && e\.key\.toLowerCase\(\) === 't'\) toggleTheme\(\);\n/, '');
content = content.replace(/console\.log\('  Alt\+T  : Toggle Theme'\);\n/, '');

// 3. Remove mobile theme button
content = content.replace(/\/\/ Create Right Container with Quick Dark Toggle[\s\S]*?rightDiv\.appendChild\(mThemeBtn\);/, '// Create Right Container (Empty, as dark mode button is removed)\n            const rightDiv = document.createElement(\'div\');\n            rightDiv.className = \'topbar-m-right\';');

content = content.replace(/\/\/ Set initial theme icon[\s\S]*?mThemeBtn\.innerHTML = initialTheme === 'dark' \? '☀️' : '🌙';/, '');

// 4. Remove injectThemeToggle() from boot()
content = content.replace(/        injectThemeToggle\(\);\n/, '');

// 5. Remove toggleTheme, applyTheme from window.MentraUI
content = content.replace(/,\s*toggleTheme,\s*applyTheme/, '');

fs.writeFileSync('assets/js/app-ui.js', content);
console.log('Removed dark mode from app-ui.js');
