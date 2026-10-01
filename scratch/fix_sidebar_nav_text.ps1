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
    'd:\MT-Developer\mentra-manager\pages\accounting\sales_documents.html',
    'd:\MT-Developer\mentra-manager\pages\accounting\quotation.html'
)

foreach ($file in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $content = [System.Text.Encoding]::UTF8.GetString($bytes)

    $old1 = '<span class="rail-tooltip">' + [char]0x0E42 + [char]0x0E04 + [char]0x0E23 + [char]0x0E07 + [char]0x0E01 + [char]0x0E32 + [char]0x0E23 + [char]0x0E17 + [char]0x0E31 + [char]0x0E49 + [char]0x0E07 + [char]0x0E2B + [char]0x0E21 + [char]0x0E14 + ' (Projects)</span>'
    $new1 = '<span class="rail-tooltip">' + [char]0x0E07 + [char]0x0E32 + [char]0x0E19 + [char]0x0E1B + [char]0x0E23 + [char]0x0E30 + [char]0x0E21 + [char]0x0E39 + [char]0x0E25 + ' (Bidding)</span>'

    $old2 = '<span>' + [char]0x0E42 + [char]0x0E04 + [char]0x0E23 + [char]0x0E07 + [char]0x0E01 + [char]0x0E32 + [char]0x0E23 + [char]0x0E17 + [char]0x0E31 + [char]0x0E49 + [char]0x0E07 + [char]0x0E2B + [char]0x0E21 + [char]0x0E14 + '</span>'
    $new2 = '<span>' + [char]0x0E07 + [char]0x0E32 + [char]0x0E19 + [char]0x0E1B + [char]0x0E23 + [char]0x0E30 + [char]0x0E21 + [char]0x0E39 + [char]0x0E25 + ' (Bidding)</span>'

    $newContent = $content.Replace($old1, $new1).Replace($old2, $new2)

    if ($content -ne $newContent) {
        $newBytes = [System.Text.Encoding]::UTF8.GetBytes($newContent)
        [System.IO.File]::WriteAllBytes($file, $newBytes)
        Write-Host "Updated: $file"
    } else {
        Write-Host "No change: $file"
    }
}
Write-Host "Done."
