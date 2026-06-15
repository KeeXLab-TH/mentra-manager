const fs = require('fs');

const extHtml = fs.readFileSync('d:/Mentra_Solution/mentra-manager/external_training.html', 'utf8');
const prodHtml = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// Get the full <style> block from external_training.html
const styleMatch = extHtml.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) {
    console.error("No style block found in external_training.html");
    process.exit(1);
}
let baseStyle = styleMatch[1];

// The Product CSS we need to add
const productCss = `
        /* ===== PRODUCT CARDS ===== */
        .product-card {
            background: var(--bg-card);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-sm);
            overflow: hidden;
            transition: transform var(--t-fast), box-shadow var(--t-fast);
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(0,0,0,0.03);
            cursor: pointer;
        }

        .product-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-md);
            border-color: var(--border);
        }

        .product-card-img-container {
            width: 100%;
            height: 220px;
            background: #f8fafc;
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-bottom: 1px solid var(--border);
        }

        .product-card-img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 4px 12px rgba(0,0,0,0.08));
        }

        .product-card-body {
            padding: 20px;
            display: flex;
            flex-direction: column;
            flex: 1;
        }

        .product-card-title {
            font-size: 16px;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 4px;
            line-height: 1.4;
        }

        .product-card-mfg {
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .product-card-price {
            font-size: 18px;
            font-weight: 800;
            color: var(--primary);
            margin-top: auto;
        }

        .product-card-actions {
            display: flex;
            gap: 8px;
            margin-top: 16px;
        }

        .btn-view, .btn-edit {
            flex: 1;
            padding: 8px;
            border-radius: var(--radius-sm);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: background var(--t-fast), color var(--t-fast);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .btn-view {
            background: var(--bg);
            color: var(--text);
        }

        .btn-view:hover {
            background: #e2e8f0;
        }

        .btn-edit {
            background: var(--primary-light);
            color: var(--primary-dark);
        }

        .btn-edit:hover {
            background: var(--primary);
            color: white;
        }

        /* ===== BUTTONS ===== */
        .btn-add-product {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            padding: 10px 20px;
            border-radius: var(--radius-sm);
            font-size: 14.5px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px var(--primary-glow);
            transition: transform var(--t-fast), box-shadow var(--t-fast);
        }

        .btn-add-product:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(26, 111, 191, 0.3);
        }
`;

// Replace the entire style block in products.html
const newStyleBlock = `<style>\n${baseStyle}\n${productCss}\n    </style>`;
const newHtml = prodHtml.replace(/<style>[\s\S]*?<\/style>/, newStyleBlock);

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', newHtml);
console.log("Replaced CSS in products.html successfully.");
