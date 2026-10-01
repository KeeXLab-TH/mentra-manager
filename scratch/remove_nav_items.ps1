$files = @(
    'd:\MT-Developer\mentra-manager\pages\schedule\tasks.html',
    'd:\MT-Developer\mentra-manager\pages\schedule\internship_journal.html',
    'd:\MT-Developer\mentra-manager\pages\schedule\external_training.html',
    'd:\MT-Developer\mentra-manager\pages\schedule\calendar.html',
    'd:\MT-Developer\mentra-manager\pages\purchasing\products.html',
    'd:\MT-Developer\mentra-manager\pages\purchasing\materials_purchasing_company.html',
    'd:\MT-Developer\mentra-manager\pages\purchasing\materials_purchasing.html',
    'd:\MT-Developer\mentra-manager\pages\admin\developer.html',
    'd:\MT-Developer\mentra-manager\pages\admin\company_settings.html',
    'd:\MT-Developer\mentra-manager\pages\admin\business_card.html',
    'd:\MT-Developer\mentra-manager\pages\admin\bidding.html',
    'd:\MT-Developer\mentra-manager\pages\accounting\sales_documents.html',
    'd:\MT-Developer\mentra-manager\pages\accounting\quotation.html'
)

# The exact block to remove (id="nav-items" button)
$blockToRemove = '<button type="button" class="sec-nav-item" onclick="typeof navigateTo === ''function'' ? navigateTo(''items'') : window.location.href=''../admin/dashboard.html?view=items''" id="nav-items">
                    <div class="sec-nav-item-left">
                        <i class=''bx bx-purchase-tag-alt''></i>
                        <span>' + [char]0x0E23 + [char]0x0E32 + [char]0x0E04 + [char]0x0E32 + [char]0x0E17 + [char]0x0E38 + [char]0x0E19 + ' / ' + [char]0x0E2A + [char]0x0E34 + [char]0x0E48 + [char]0x0E07 + [char]0x0E02 + [char]0x0E2D + [char]0x0E07 + '</span>
                    </div>
                </button>'

foreach ($file in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $content = [System.Text.Encoding]::UTF8.GetString($bytes)
    
    # Use regex to remove the nav-items button block (handles varying whitespace)
    $pattern = '(?s)\s*<button[^>]*id="nav-items"[^>]*>.*?</button>'
    $newContent = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, '')
    
    if ($content -ne $newContent) {
        $newBytes = [System.Text.Encoding]::UTF8.GetBytes($newContent)
        [System.IO.File]::WriteAllBytes($file, $newBytes)
        Write-Host "Updated: $file"
    } else {
        Write-Host "No change: $file"
    }
}
Write-Host "Done."
