using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;

namespace WinstallerHubApp.Services;

public class OfficeToolService
{
    public async Task<bool> UninstallOfficeAsync()
    {
        string? tempScriptPath = null;
        try
        {
            string script = @"
$ErrorActionPreference = 'SilentlyContinue'
Write-Host '====================================================' -ForegroundColor Yellow
Write-Host '          TRINH GO BO OFFICE TOAN DIEN              ' -ForegroundColor Yellow
Write-Host '====================================================' -ForegroundColor Yellow
Write-Host ''

Write-Host '[1/3] Kiem tra va go bo Office tu Microsoft Store (Appx)...' -ForegroundColor Cyan
$officePackages = Get-AppxPackage -AllUsers | Where-Object { $_.Name -like '*Microsoft.Office*' -or $_.Name -like '*Office.Desktop*' -or $_.Name -like '*Microsoft.Office.OneNote*' }
if ($officePackages) {
    foreach ($pkg in $officePackages) {
        Write-Host "" -> Dang xoa: $($pkg.Name)""
        Remove-AppxPackage -Package $pkg.PackageFullName -AllUsers
    }
} else {
    Write-Host "" -> Khong tim thay goi Appx nao."" -ForegroundColor Gray
}

Write-Host ''
Write-Host '[2/3] Kiem tra va go bo Office Win32 (Click-To-Run)...' -ForegroundColor Cyan
$c2rPath = Join-Path ${env:ProgramFiles} 'Common Files\Microsoft Shared\ClickToRun\OfficeClickToRun.exe'
if (Test-Path $c2rPath) {
    Write-Host "" -> Tim thay OfficeClickToRun.exe. Dang khoi chay..."" -ForegroundColor Green
    Write-Host "" -> Vui long theo doi cua so cai dat cua Microsoft hien len."" -ForegroundColor Green
    Start-Process $c2rPath -ArgumentList ""scenario=install scenariosubtype=uninstall productstoremove=AllProducts displaylevel=true"" -Wait
} else {
    Write-Host "" -> Khong tim thay cong cu ClickToRun (Co the ban dang dung MSI hoac chua cai Office)."" -ForegroundColor Gray
}

Write-Host ''
Write-Host '[3/3] Quet Registry de tim cac dau vet con lai...' -ForegroundColor Cyan
$regPaths = @(
    ""HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"",
    ""HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall""
)
$found = $false
foreach ($path in $regPaths) {
    if (Test-Path $path) {
        $keys = Get-ChildItem -Path $path
        foreach ($key in $keys) {
            $dn = $key.GetValue('DisplayName')
            if ($dn -match 'Microsoft Office' -and $dn -notmatch 'Language Pack|Proofing|MUI') {
                $found = $true
                Write-Host "" -> Dang xoa MSI/UninstallString: $dn"" -ForegroundColor Yellow
                $uninstallString = $key.GetValue('QuietUninstallString')
                if (-not $uninstallString) { $uninstallString = $key.GetValue('UninstallString') }
                if ($uninstallString) {
                    Write-Host ""    Lenh: $uninstallString"" -ForegroundColor Gray
                    try {
                        if ($uninstallString -match '^(?<cmd>""[^""]+""|\S+)\s*(?<args>.*)$') {
                            $cmdPath = $Matches.cmd.Trim('""')
                            $cmdArgs = $Matches.args
                            Start-Process -FilePath $cmdPath -ArgumentList $cmdArgs -Wait
                        } else {
                            cmd.exe /c ""$uninstallString""
                        }
                    } catch {
                        Write-Host "" -> Khong the chay lenh xoa."" -ForegroundColor Red
                    }
                }
            }
        }
    }
}
if (-not $found) { Write-Host "" -> Khong tim thay dau vet nao trong Registry."" -ForegroundColor Gray }

Write-Host ''
Write-Host '====================================================' -ForegroundColor Green
Write-Host '        QUA TRINH XU LY HOAN TAT!                   ' -ForegroundColor Green
Write-Host '====================================================' -ForegroundColor Green
Write-Host 'Luu y: Neu Office van con, hay dung cong cu SaRA cua Microsoft.'
Write-Host 'Nhan phim bat ky de dong cua so nay...'
Read-Host
";

            tempScriptPath = Path.Combine(Path.GetTempPath(), $"UninstallOffice_{Guid.NewGuid():N}.ps1");
            await File.WriteAllTextAsync(tempScriptPath, script, System.Text.Encoding.UTF8);

            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -ExecutionPolicy Bypass -File \"{tempScriptPath}\"",
                UseShellExecute = true,
                Verb = "runas",
                CreateNoWindow = false
            };

            var process = Process.Start(psi);
            if (process != null)
            {
                await process.WaitForExitAsync();
                return true;
            }
            return false;
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Error uninstalling Office: {ex.Message}");
            return false;
        }
        finally
        {
            if (tempScriptPath != null && File.Exists(tempScriptPath))
            {
                try { File.Delete(tempScriptPath); } catch { /* Ignore */ }
            }
        }
    }
}
