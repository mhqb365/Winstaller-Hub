param(
    [ValidateSet("x64", "arm64", "both")]
    [string]$Arch = "x64"
)

$ErrorActionPreference = "Stop"

$profiles = switch ($Arch) {
    "x64"   { @("Portable-win-x64") }
    "arm64" { @("Portable-win-arm64") }
    default { @("Portable-win-x64", "Portable-win-arm64") }
}

foreach ($profile in $profiles) {
    Write-Host "Publishing profile: $profile"
    dotnet publish -c Release -p:PublishProfile=$profile
    if ($LASTEXITCODE -ne 0) {
        throw "Publish failed for profile $profile"
    }
}

Write-Host "Done."
Write-Host "Portable output:"
if ($Arch -eq "arm64") {
    Write-Host "  bin\\Publish\\portable-win-arm64\\"
}
elseif ($Arch -eq "both") {
    Write-Host "  bin\\Publish\\portable-win-x64\\"
    Write-Host "  bin\\Publish\\portable-win-arm64\\"
}
else {
    Write-Host "  bin\\Publish\\portable-win-x64\\"
}
Write-Host "Note: Use the folder in bin\\Publish (do not use bin\\Debug)."
