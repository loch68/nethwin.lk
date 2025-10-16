# PowerShell script to automatically install charts in admin dashboard

Write-Host "📊 Installing Real-Time Analytics Charts..." -ForegroundColor Cyan
Write-Host ""

# File paths
$dashboardFile = "html\admin-dashboard.html"
$chartsSection = Get-Content "html\admin-charts-section.html" -Raw
$chartsScript = '<script src="../javascript/admin-charts.js"></script>'

# Read the dashboard file
$content = Get-Content $dashboardFile -Raw

# Check if charts are already installed
if ($content -match "Real-Time Analytics Dashboard") {
    Write-Host "⚠️  Charts section already exists in dashboard!" -ForegroundColor Yellow
    Write-Host "Skipping installation..." -ForegroundColor Yellow
    exit 0
}

# Find the insertion point (before Analytics Export Section)
$insertionMarker = "<!-- Analytics Export Section -->"
$insertionIndex = $content.IndexOf($insertionMarker)

if ($insertionIndex -eq -1) {
    Write-Host "❌ Could not find insertion point in dashboard file!" -ForegroundColor Red
    Write-Host "Please manually add the charts section." -ForegroundColor Red
    exit 1
}

# Insert charts section
$beforeSection = $content.Substring(0, $insertionIndex)
$afterSection = $content.Substring($insertionIndex)
$newContent = $beforeSection + $chartsSection + "`n`n                        " + $afterSection

# Check if script tag already exists
if (-not ($newContent -match "admin-charts.js")) {
    # Find </body> tag and insert script before it
    $bodyCloseIndex = $newContent.LastIndexOf("</body>")
    if ($bodyCloseIndex -ne -1) {
        $beforeBody = $newContent.Substring(0, $bodyCloseIndex)
        $afterBody = $newContent.Substring($bodyCloseIndex)
        $newContent = $beforeBody + "    " + $chartsScript + "`n" + $afterBody
    }
}

# Write back to file
$newContent | Set-Content $dashboardFile -NoNewline

Write-Host "✅ Charts section added to dashboard!" -ForegroundColor Green
Write-Host "✅ JavaScript file linked!" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Installation complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your server: npm start" -ForegroundColor White
Write-Host "2. Open admin dashboard" -ForegroundColor White
Write-Host "3. Enjoy your real-time analytics charts! 📊" -ForegroundColor White
Write-Host ""
