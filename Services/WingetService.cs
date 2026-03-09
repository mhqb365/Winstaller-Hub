using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Net.Http;
using Microsoft.Win32;

namespace WinstallerHubApp.Services;

internal sealed record WingetStatus(
    bool IsReady,
    bool DesktopAppInstallerInstalled,
    string Version,
    bool IsOutdated = false,
    string? LatestVersion = null);

internal sealed record WingetTrendingApp(
    string Id,
    string Name,
    string Description);

internal sealed record InstalledApplication(
    string Name,
    string Publisher,
    string Version);

internal sealed record WingetSearchPackage(
    string Id,
    string Name,
    string Version);

internal sealed class WingetService
{
    private static readonly IReadOnlyList<WingetTrendingApp> TrendingApps =
    [
        new("Google.Chrome", "Google Chrome", "Web browser"),
        new("Mozilla.Firefox", "Mozilla Firefox", "Web browser"),
        new("Microsoft.VisualStudioCode", "Visual Studio Code", "Code editor"),
        new("7zip.7zip", "7-Zip", "File archiver"),
        new("VideoLAN.VLC", "VLC media player", "Media player"),
        new("Notepad++.Notepad++", "Notepad++", "Text editor"),
        new("Git.Git", "Git", "Version control"),
        new("Docker.DockerDesktop", "Docker Desktop", "Containers"),
        new("Discord.Discord", "Discord", "Chat and community"),
        new("Spotify.Spotify", "Spotify", "Music streaming")
    ];

    internal async Task<WingetStatus> GetWingetStatusAsync()
    {
        var localStatus = await Task.Run(GetWingetStatus).ConfigureAwait(false);
        var latestVersion = await GetLatestWingetVersionAsync().ConfigureAwait(false);
        
        return localStatus with { LatestVersion = latestVersion };
    }

    private static async Task<string?> GetLatestWingetVersionAsync()
    {
        try
        {
            using var client = new HttpClient();
            // GitHub requires a User-Agent
            client.DefaultRequestHeaders.Add("User-Agent", "WinstallerHubApp");
            
            // We use the redirect URL for the latest release which is faster and more reliable than the full API for simple version checking
            var response = await client.GetAsync("https://github.com/microsoft/winget-cli/releases/latest", HttpCompletionOption.ResponseHeadersRead).ConfigureAwait(false);
            
            // The URL will be something like .../releases/tag/v1.9.2521
            var absoluteUrl = response.RequestMessage?.RequestUri?.ToString();
            if (string.IsNullOrWhiteSpace(absoluteUrl)) return null;

            var tagIndex = absoluteUrl.LastIndexOf("/tag/", StringComparison.OrdinalIgnoreCase);
            if (tagIndex > 0)
            {
                var version = absoluteUrl.Substring(tagIndex + 5);
                return version.Trim();
            }
        }
        catch { }
        return null;
    }

    internal IReadOnlyList<WingetTrendingApp> GetTrendingApps()
    {
        return TrendingApps;
    }

    internal Task<(bool Success, string Detail)> InstallOrRepairWingetAsync()
    {
        return Task.Run(InstallOrRepairWinget);
    }

    internal Task<(bool Success, string Detail)> RemoveWingetAsync()
    {
        return Task.Run(RemoveWinget);
    }

    internal Task<(bool Success, string Detail)> InstallPackageAsync(string packageId, CancellationToken ct = default)
    {
        return Task.Run(() =>
        {
            if (string.IsNullOrWhiteSpace(packageId))
            {
                return (false, "Invalid package id.");
            }

            var status = GetWingetStatus();
            var args = new List<string> { "install", "--id", packageId, "--exact" };

            // Flags supported in newer versions
            if (status.Version != null && !status.IsOutdated)
            {
                args.Add("--accept-package-agreements");
                args.Add("--accept-source-agreements");
            }
            else
            {
                // For older versions, try at least source agreement
                args.Add("--accept-source-agreements");
            }
            
            args.Add("--disable-interactivity");

            var result = RunProcess(
                "winget",
                args.ToArray(),
                timeoutMs: 900_000,
                ct: ct);

            if (result.ExitCode == 0) return (true, string.Empty);

            var errorMsg = FirstNonEmptyLine(result.StdErr, result.StdOut);
            if (string.IsNullOrWhiteSpace(errorMsg))
            {
                errorMsg = $"Lỗi hệ thống (Mã: {result.ExitCode})";
            }
            else if (!errorMsg.Contains(result.ExitCode.ToString()))
            {
                errorMsg = $"{errorMsg} (Mã: {result.ExitCode:X})";
            }

            return (false, errorMsg);
        }, ct);
    }

    internal Task<(bool Success, string Detail)> UninstallPackageAsync(string packageIdOrName, CancellationToken ct = default)
    {
        return Task.Run(() =>
        {
            if (string.IsNullOrWhiteSpace(packageIdOrName))
            {
                return (false, "Invalid package.");
            }

            var status = GetWingetStatus();
            var args = new List<string> { "uninstall" };
            args.Add(packageIdOrName.Contains('.') ? "--id" : "--name");
            args.Add(packageIdOrName);
            args.Add("--exact");
            
            if (status.Version != null && !status.IsOutdated)
            {
                args.Add("--accept-source-agreements");
            }
            
            args.Add("--disable-interactivity");

            var result = RunProcess(
                "winget",
                args.ToArray(),
                timeoutMs: 900_000,
                ct: ct);

            if (result.ExitCode == 0) return (true, string.Empty);

            var errorMsg = FirstNonEmptyLine(result.StdErr, result.StdOut);
            if (string.IsNullOrWhiteSpace(errorMsg))
            {
                errorMsg = $"Lỗi gỡ cài đặt (Mã: {result.ExitCode})";
            }
            else
            {
                errorMsg = $"{errorMsg} (Mã: {result.ExitCode:X})";
            }

            return (false, errorMsg);
        }, ct);
    }

    internal Task<List<InstalledApplication>> GetInstalledApplicationsAsync()
    {
        return Task.Run(GetInstalledApplications);
    }

    internal Task<List<WingetSearchPackage>> SearchPackagesAsync(string query, int maxResults = 20)
    {
        return Task.Run(() => SearchPackages(query, maxResults));
    }

    private static WingetStatus GetWingetStatus()
    {
        var versionResult = RunProcess("winget", ["--version"], timeoutMs: 15_000);
        if (versionResult.ExitCode == 0)
        {
            var versionString = FirstNonEmptyLine(versionResult.StdOut, versionResult.StdErr);
            var isOutdated = IsVersionOutdated(versionString);

            return new WingetStatus(
                true,
                true,
                versionString,
                isOutdated);
        }

        var packageVersion = GetDesktopAppInstallerVersion();
        var installed = !string.IsNullOrWhiteSpace(packageVersion);
        return new WingetStatus(
            false,
            installed,
            installed ? packageVersion : string.Empty,
            installed && IsVersionOutdated(packageVersion));
    }

    private static bool IsVersionOutdated(string version)
    {
        if (string.IsNullOrWhiteSpace(version)) return true;

        var cleanVersion = version.Trim().TrimStart('v').Trim();
        
        try
        {
            // We now recommend v1.6+ for best compatibility
            if (Version.TryParse(cleanVersion, out var v))
            {
                return v < new Version(1, 6);
            }

            // Fallback for weird formats (1.1, 1.2, 1.3, 1.4, 1.5)
            if (cleanVersion.StartsWith("1.0.") || 
                cleanVersion.StartsWith("1.1.") || 
                cleanVersion.StartsWith("1.2.") || 
                cleanVersion.StartsWith("1.3.") ||
                cleanVersion.StartsWith("1.4.") ||
                cleanVersion.StartsWith("1.5."))
            {
                return true;
            }
        }
        catch { }

        return false;
    }

    private static (bool Success, string Detail) InstallOrRepairWinget()
    {
        var scriptPath = string.Empty;
        try
        {
            scriptPath = Path.Combine(
                Path.GetTempPath(),
                $"winstaller-winget-{Guid.NewGuid():N}.ps1");

            File.WriteAllText(scriptPath, BuildWingetInstallScript(), Encoding.UTF8);

            var result = RunProcess(
                "powershell",
                [
                    "-NoProfile",
                    "-ExecutionPolicy", "Bypass",
                    "-File", scriptPath
                ],
                timeoutMs: 900_000);

            if (result.ExitCode == 0) return (true, string.Empty);

            var errorDetail = FirstNonEmptyLine(result.StdErr, result.StdOut);
            if (string.IsNullOrWhiteSpace(errorDetail))
            {
                errorDetail = $"Tiến trình cài đặt thoát với mã lỗi {result.ExitCode}.";
            }
            else
            {
                errorDetail = $"{errorDetail} (Mã lỗi: {result.ExitCode})";
            }

            return (false, errorDetail);
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
        finally
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(scriptPath) && File.Exists(scriptPath))
                {
                    File.Delete(scriptPath);
                }
            }
            catch
            {
            }
        }
    }

    private static (bool Success, string Detail) RemoveWinget()
    {
        var scriptPath = string.Empty;
        try
        {
            scriptPath = Path.Combine(
                Path.GetTempPath(),
                $"winstaller-winget-remove-{Guid.NewGuid():N}.ps1");

            File.WriteAllText(scriptPath, BuildWingetRemoveScript(), Encoding.UTF8);

            var result = RunProcess(
                "powershell",
                [
                    "-NoProfile",
                    "-ExecutionPolicy", "Bypass",
                    "-File", scriptPath
                ],
                timeoutMs: 300_000);

            if (result.ExitCode == 0) return (true, string.Empty);

            var errorDetail = FirstNonEmptyLine(result.StdErr, result.StdOut);
            if (string.IsNullOrWhiteSpace(errorDetail))
            {
                errorDetail = $"Tiến trình gỡ cài đặt thoát với mã lỗi {result.ExitCode}.";
            }
            else
            {
                errorDetail = $"{errorDetail} (Mã lỗi: {result.ExitCode})";
            }

            return (false, errorDetail);
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
        finally
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(scriptPath) && File.Exists(scriptPath))
                {
                    File.Delete(scriptPath);
                }
            }
            catch
            {
            }
        }
    }

    private static string BuildWingetRemoveScript()
    {
        return """
            $ErrorActionPreference = "SilentlyContinue"
            $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
            
            Write-Output "Removing Winget (DesktopAppInstaller)..."
            if ($isAdmin) {
                Get-AppxPackage Microsoft.DesktopAppInstaller -AllUsers | Remove-AppxPackage -AllUsers
                Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -eq "Microsoft.DesktopAppInstaller" } | Remove-AppxProvisionedPackage -Online
            } else {
                Get-AppxPackage Microsoft.DesktopAppInstaller | Remove-AppxPackage
            }
            
            Write-Output "Removing Microsoft Store..."
            if ($isAdmin) {
                Get-AppxPackage Microsoft.WindowsStore -AllUsers | Remove-AppxPackage -AllUsers
                Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -eq "Microsoft.WindowsStore" } | Remove-AppxProvisionedPackage -Online
            } else {
                Get-AppxPackage Microsoft.WindowsStore | Remove-AppxPackage
            }
            
            Write-Output "Cleaning caches..."
            Remove-Item "$env:LOCALAPPDATA\Packages\Microsoft.DesktopAppInstaller*" -Recurse -Force
            Remove-Item "$env:LOCALAPPDATA\Packages\Microsoft.WindowsStore*" -Recurse -Force
            Remove-Item "$env:LOCALAPPDATA\Microsoft\WindowsApps\winget*" -Force
            
            Write-Output "Verifying..."
            $winget = Get-Command winget -ErrorAction SilentlyContinue
            if ($winget) {
                Write-Output "Winget still exists: $($winget.Source)"
                exit 1
            }
            
            Write-Output "Winget removed successfully."
            exit 0
            """;
    }

    private static string BuildWingetInstallScript()
    {
        return """
            $ErrorActionPreference = "Stop"

            Write-Output "Installing Winget..."
            try {
                Add-AppxPackage -Path "https://aka.ms/getwinget" -ForceApplicationShutdown -ErrorAction Stop
            }
            catch {
                $message = $_.Exception.Message
                if ($message -match "0x80073D06" -or $message -match "already" -or $message -match "đã được cài" -or $message -match "nới hơn") {
                    Write-Output "Winget is already at a newer or same version."
                    try {
                        $pkg = Get-AppxPackage -Name Microsoft.DesktopAppInstaller
                        if ($pkg) {
                            $manifest = Join-Path $pkg.InstallLocation "AppxManifest.xml"
                            Add-AppxPackage -Path $manifest -Register -DisableDevelopmentMode -ForceApplicationShutdown
                        }
                    } catch {
                        Write-Warning "Failed to register existing DesktopAppInstaller: $($_.Exception.Message)"
                    }
                } else {
                    Write-Error "Failed to install Winget: $message"
                    throw
                }
            }

            Start-Sleep -Seconds 3

            # Final verification
            $wingetPath = Get-Command winget -ErrorAction SilentlyContinue
            if (-not $wingetPath) {
                $userPath = "$env:LOCALAPPDATA\Microsoft\WindowsApps\winget.exe"
                if (Test-Path $userPath) {
                    Write-Output "Winget found in user path."
                } else {
                    $pkg = Get-AppxPackage -Name Microsoft.DesktopAppInstaller -ErrorAction SilentlyContinue
                    if (-not $pkg) {
                        throw "Cài đặt thất bại. Không tìm thấy gói Microsoft.DesktopAppInstaller."
                    }
                    throw "Đã cài Desktop App Installer nhưng lệnh 'winget' vẫn chưa có trong PATH. Hãy thử khởi động lại máy."
                }
            }

            Write-Output "Winget installed successfully."
            exit 0
            """;
    }

    private static string GetDesktopAppInstallerVersion()
    {
        var result = RunProcess(
            "powershell",
            [
                "-NoProfile",
                "-ExecutionPolicy", "Bypass",
                "-Command",
                "$pkg = Get-AppxPackage -Name Microsoft.DesktopAppInstaller -ErrorAction SilentlyContinue; if ($pkg) { $pkg.Version.ToString() }"
            ],
            timeoutMs: 15_000);

        if (result.ExitCode != 0)
        {
            return string.Empty;
        }

        return FirstNonEmptyLine(result.StdOut, result.StdErr);
    }

    private static List<InstalledApplication> GetInstalledApplications()
    {
        var apps = new List<InstalledApplication>();

        ReadUninstallKey(RegistryHive.LocalMachine, RegistryView.Registry64, apps);
        ReadUninstallKey(RegistryHive.LocalMachine, RegistryView.Registry32, apps);
        ReadUninstallKey(RegistryHive.CurrentUser, RegistryView.Default, apps);

        return apps
            .GroupBy(a => $"{a.Name}|{a.Publisher}", StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .OrderBy(a => a.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static List<WingetSearchPackage> SearchPackages(string query, int maxResults)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return [];
        }

        var result = RunProcess(
            "winget",
            [
                "search",
                "--query", query.Trim(),
                "--source", "winget",
                "--accept-source-agreements",
                "--disable-interactivity"
            ],
            timeoutMs: 60_000);

        if (result.ExitCode != 0)
        {
            throw new InvalidOperationException(FirstNonEmptyLine(result.StdErr, result.StdOut, "winget search failed."));
        }

        if (result.StdOut.Contains("No package found matching input criteria.", StringComparison.OrdinalIgnoreCase))
        {
            return [];
        }

        var parsed = ParseSearchOutputByHeader(result.StdOut);
        if (parsed.Count == 0)
        {
            parsed = ParseSearchOutputFallback(result.StdOut);
        }

        return parsed
            .GroupBy(p => p.Id, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .OrderBy(p => p.Name, StringComparer.OrdinalIgnoreCase)
            .Take(Math.Max(1, maxResults))
            .ToList();
    }

    private static List<WingetSearchPackage> ParseSearchOutputByHeader(string output)
    {
        if (string.IsNullOrWhiteSpace(output))
        {
            return [];
        }

        var lines = output
            .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .ToList();
        if (lines.Count == 0)
        {
            return [];
        }

        var headerIndex = lines.FindIndex(l =>
            l.Contains("Name", StringComparison.OrdinalIgnoreCase) &&
            l.Contains("Id", StringComparison.OrdinalIgnoreCase));

        if (headerIndex < 0 || headerIndex >= lines.Count - 1)
        {
            return [];
        }

        var header = lines[headerIndex];
        var idIndex = header.IndexOf("Id", StringComparison.OrdinalIgnoreCase);
        var versionIndex = header.IndexOf("Version", StringComparison.OrdinalIgnoreCase);
        var matchIndex = header.IndexOf("Match", StringComparison.OrdinalIgnoreCase);
        var sourceIndex = header.IndexOf("Source", StringComparison.OrdinalIgnoreCase);

        if (idIndex <= 0 || versionIndex <= idIndex)
        {
            return [];
        }

        var versionEnd = versionIndex < 0
            ? header.Length
            : header.Length;

        if (matchIndex > versionIndex)
        {
            versionEnd = matchIndex;
        }
        else if (sourceIndex > versionIndex)
        {
            versionEnd = sourceIndex;
        }

        var dataLines = lines
            .Skip(headerIndex + 1)
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .Where(l => !l.Trim().StartsWith('-'))
            .Where(l => !l.Contains("No package found", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var results = new List<WingetSearchPackage>();
        foreach (var line in dataLines)
        {
            var id = Slice(line, idIndex, versionIndex);
            if (!LooksLikePackageId(id))
            {
                continue;
            }

            var name = Slice(line, 0, idIndex);
            var version = Slice(line, versionIndex, versionEnd);
            if (string.IsNullOrWhiteSpace(version))
            {
                version = "-";
            }

            results.Add(new WingetSearchPackage(id, name, version));
        }

        return results;
    }

    private static List<WingetSearchPackage> ParseSearchOutputFallback(string output)
    {
        if (string.IsNullOrWhiteSpace(output))
        {
            return [];
        }

        var lines = output
            .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(l => !l.Trim().StartsWith('-'))
            .Where(l => !l.Contains("No package found", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var results = new List<WingetSearchPackage>();
        var pattern = new Regex(@"^(?<name>.+?)\s{2,}(?<id>[\w\.\-]+)\s{2,}(?<version>[^\s]+)(?:\s{2,}.+)?$");

        foreach (var line in lines)
        {
            var match = pattern.Match(line.Trim());
            if (!match.Success)
            {
                continue;
            }

            var id = match.Groups["id"].Value.Trim();
            if (!LooksLikePackageId(id))
            {
                continue;
            }

            var name = match.Groups["name"].Value.Trim();
            var version = match.Groups["version"].Value.Trim();
            if (string.IsNullOrWhiteSpace(version))
            {
                version = "-";
            }

            results.Add(new WingetSearchPackage(id, name, version));
        }

        return results;
    }

    private static string Slice(string value, int startIndex, int endIndexExclusive)
    {
        if (string.IsNullOrWhiteSpace(value) || startIndex >= value.Length)
        {
            return string.Empty;
        }

        var safeEnd = Math.Min(value.Length, endIndexExclusive);
        if (safeEnd <= startIndex)
        {
            return string.Empty;
        }

        return value.Substring(startIndex, safeEnd - startIndex).Trim();
    }

    private static bool LooksLikePackageId(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        if (value.Length < 3)
        {
            return false;
        }

        return value.Any(char.IsLetter) && value.Contains('.');
    }

    private static void ReadUninstallKey(
        RegistryHive hive,
        RegistryView view,
        List<InstalledApplication> applications)
    {
        try
        {
            using var baseKey = RegistryKey.OpenBaseKey(hive, view);
            using var uninstallKey = baseKey.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall");
            if (uninstallKey == null)
            {
                return;
            }

            foreach (var subKeyName in uninstallKey.GetSubKeyNames())
            {
                using var appKey = uninstallKey.OpenSubKey(subKeyName);
                if (appKey == null)
                {
                    continue;
                }

                var name = ToSafeText(appKey.GetValue("DisplayName"));
                if (string.IsNullOrWhiteSpace(name))
                {
                    continue;
                }

                if (ToInt(appKey.GetValue("SystemComponent")) == 1)
                {
                    continue;
                }

                var releaseType = ToSafeText(appKey.GetValue("ReleaseType"));
                if (releaseType.Contains("Update", StringComparison.OrdinalIgnoreCase) ||
                    releaseType.Contains("Hotfix", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var publisher = ToSafeText(appKey.GetValue("Publisher"));
                var version = ToSafeText(appKey.GetValue("DisplayVersion"));

                applications.Add(new InstalledApplication(
                    name.Trim(),
                    string.IsNullOrWhiteSpace(publisher) ? "N/A" : publisher.Trim(),
                    string.IsNullOrWhiteSpace(version) ? "N/A" : version.Trim()));
            }
        }
        catch
        {
            // Ignore registry branch read failures.
        }
    }

    private static string ToSafeText(object? value)
    {
        return value?.ToString() ?? string.Empty;
    }

    private static int ToInt(object? value)
    {
        if (value == null)
        {
            return 0;
        }

        if (value is int numeric)
        {
            return numeric;
        }

        if (int.TryParse(value.ToString(), out var parsed))
        {
            return parsed;
        }

        return 0;
    }

    private static ProcessResult RunProcess(string fileName, IReadOnlyList<string> arguments, int timeoutMs, CancellationToken ct = default)
    {
        try
        {
            using var process = new Process
            {
                StartInfo = new ProcessStartInfo(fileName)
                {
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8
                }
            };

            foreach (var argument in arguments)
            {
                process.StartInfo.ArgumentList.Add(argument);
            }

            process.Start();

            var stdoutTask = process.StandardOutput.ReadToEndAsync(ct);
            var stderrTask = process.StandardError.ReadToEndAsync(ct);

            var registration = ct.Register(() =>
            {
                try { process.Kill(entireProcessTree: true); } catch { }
            });

            using (registration)
            {
                if (!process.WaitForExit(timeoutMs))
                {
                    try
                    {
                        process.Kill(entireProcessTree: true);
                    }
                    catch
                    {
                    }

                    return new ProcessResult(-1, string.Empty, "Process timeout.");
                }

                if (ct.IsCancellationRequested)
                {
                    throw new OperationCanceledException(ct);
                }
            }

            Task.WaitAll([stdoutTask, stderrTask], 5000);

            return new ProcessResult(
                process.ExitCode,
                stdoutTask.Result.Trim(),
                stderrTask.Result.Trim());
        }
        catch (Exception ex)
        {
            return new ProcessResult(-1, string.Empty, ex.Message);
        }
    }

    private static string FirstNonEmptyLine(params string[] values)
    {
        var allLines = new List<string>();
        foreach (var value in values)
        {
            if (string.IsNullOrWhiteSpace(value)) continue;
            allLines.AddRange(value.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).Select(l => l.Trim()));
        }

        var filtered = allLines
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .Where(l => !l.StartsWith("Windows Package Manager", StringComparison.OrdinalIgnoreCase))
            .Where(l => !l.StartsWith("Copyright", StringComparison.OrdinalIgnoreCase))
            .Where(l => !l.StartsWith("--", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (filtered.Count > 0)
        {
            // Pick the first line that doesn't look like a progress bar or header
            return filtered[0];
        }

        // Fallback to the very first non-empty line if everything was filtered out
        return allLines.FirstOrDefault(l => !string.IsNullOrWhiteSpace(l)) ?? string.Empty;
    }

    private readonly record struct ProcessResult(int ExitCode, string StdOut, string StdErr);
}
