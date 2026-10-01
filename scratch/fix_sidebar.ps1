$files = @(
    'd:\MT-Developer\mentra-manager\pages\schedule\tasks.html',
    'd:\MT-Developer\mentra-manager\pages\schedule\internship_journal.html',
    'd:\MT-Developer\mentra-manager\pages\schedule\external_training.html',
    'd:\MT-Developer\mentra-manager\pages\schedule\calendar.html',
    'd:\MT-Developer\mentra-manager\pages\purchasing\products.html',
    'd:\MT-Developer\mentra-manager\pages\purchasing\materials_purchasing_company.html',
    'd:\MT-Developer\mentra-manager\pages\purchasing\materials_purchasing.html',
    'd:\MT-Developer\mentra-manager\pages\admin\company_settings.html',
    'd:\MT-Developer\mentra-manager\pages\admin\business_card.html',
    'd:\MT-Developer\mentra-manager\pages\admin\bidding.html',
    'd:\MT-Developer\mentra-manager\pages\accounting\quotation.html'
)

foreach ($file in $files) {
    $content = Get-Content $file -Raw -Encoding UTF8
    $newContent = $content -replace '--sidebar-w: 260px;', '--sidebar-w: 328px;'
    if ($content -ne $newContent) {
        Set-Content $file $newContent -Encoding UTF8 -NoNewline
        Write-Host "Updated: $file"
    } else {
        Write-Host "No change: $file"
    }
}

# Also fix dashboard.html which uses var(--sidebar-w, 260px)
$dashFile = 'd:\MT-Developer\mentra-manager\pages\admin\dashboard.html'
$dashContent = Get-Content $dashFile -Raw -Encoding UTF8
$newDash = $dashContent -replace 'var\(--sidebar-w, 260px\)', 'var(--sidebar-w, 328px)'
if ($dashContent -ne $newDash) {
    Set-Content $dashFile $newDash -Encoding UTF8 -NoNewline
    Write-Host "Updated dashboard.html"
}

Write-Host "Done."
