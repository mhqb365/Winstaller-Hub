using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Win32;

namespace WinstallerHubApp.Services;

internal sealed record WingetStatus(
    bool IsReady,
    bool DesktopAppInstallerInstalled,
    string Version);

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

    internal Task<WingetStatus> GetWingetStatusAsync()
    {
        return Task.Run(GetWingetStatus);
    }

    internal IReadOnlyList<WingetTrendingApp> GetTrendingApps()
    {
        return TrendingApps;
    }

    internal Task<(bool Success, string Detail)> InstallOrRepairWingetAsync()
    {
        return Task.Run(InstallOrRepairWinget);
    }

    internal Task<(bool Success, string Detail)> InstallPackageAsync(string packageId, CancellationToken ct = default)
    {
        return Task.Run(() =>
        {
            if (string.IsNullOrWhiteSpace(packageId))
            {
                return (false, "Invalid package id.");
            }

            var result = RunProcess(
                "winget",
                [
                    "install",
                    "--id", packageId,
                    "--exact",
                    "--accept-package-agreements",
                    "--accept-source-agreements",
                    "--disable-interactivity"
                ],
                timeoutMs: 900_000,
                ct: ct);

            return result.ExitCode == 0
                ? (true, string.Empty)
                : (false, FirstNonEmptyLine(result.StdErr, result.StdOut));
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
            return new WingetStatus(
                true,
                true,
                FirstNonEmptyLine(versionResult.StdOut, versionResult.StdErr));
        }

        var packageVersion = GetDesktopAppInstallerVersion();
        var installed = !string.IsNullOrWhiteSpace(packageVersion);
        return new WingetStatus(
            false,
            installed,
            installed ? packageVersion : string.Empty);
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

            return result.ExitCode == 0
                ? (true, string.Empty)
                : (false, FirstNonEmptyLine(result.StdErr, result.StdOut));
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

    private static string BuildWingetInstallScript()
    {
        return """
            $ErrorActionPreference = "Stop"

            function Resolve-Architecture {
                try {
                    $archCode = (Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Architecture)
                    if ($archCode -eq 12) { return "arm64" }
                } catch {}

                if ([Environment]::Is64BitOperatingSystem) { return "x64" }
                return "x86"
            }

            function Download-File {
                param([string]$Url, [string]$Path)
                Invoke-WebRequest -Uri $Url -OutFile $Path -UseBasicParsing
            }

            function Install-AppxSafe {
                param([string]$Path)
                try {
                    Add-AppxPackage -Path $Path -ErrorAction Stop
                }
                catch {
                    # Ignore already installed dependencies.
                    $message = $_.Exception.Message
                    if ($message -match "0x80073D06" -or
                        $message -match "already" -or
                        $message -match "đã được cài") {
                        return
                    }
                    throw
                }
            }

            $arch = Resolve-Architecture
            $workingDir = Join-Path $env:TEMP ("WinstallerHub-Winget-" + [Guid]::NewGuid().ToString("N"))
            New-Item -ItemType Directory -Path $workingDir | Out-Null

            try {
                $vclibsUrl = switch ($arch) {
                    "arm64" { "https://aka.ms/Microsoft.VCLibs.arm64.14.00.Desktop.appx" }
                    "x86"   { "https://aka.ms/Microsoft.VCLibs.x86.14.00.Desktop.appx" }
                    default { "https://aka.ms/Microsoft.VCLibs.x64.14.00.Desktop.appx" }
                }

                $uiXamlUrl = switch ($arch) {
                    "arm64" { "https://aka.ms/Microsoft.UI.Xaml.2.8.arm64.appx" }
                    "x86"   { "https://aka.ms/Microsoft.UI.Xaml.2.8.x86.appx" }
                    default { "https://aka.ms/Microsoft.UI.Xaml.2.8.x64.appx" }
                }

                $wingetBundleUrl = "https://aka.ms/getwinget"

                $vclibsPath = Join-Path $workingDir "Microsoft.VCLibs.Desktop.appx"
                $uiXamlPath = Join-Path $workingDir "Microsoft.UI.Xaml.appx"
                $wingetBundlePath = Join-Path $workingDir "Microsoft.DesktopAppInstaller.msixbundle"

                Download-File -Url $vclibsUrl -Path $vclibsPath
                Download-File -Url $uiXamlUrl -Path $uiXamlPath
                Download-File -Url $wingetBundleUrl -Path $wingetBundlePath

                Install-AppxSafe -Path $vclibsPath
                Install-AppxSafe -Path $uiXamlPath
                Install-AppxSafe -Path $wingetBundlePath

                Start-Sleep -Seconds 2

                $pkg = Get-AppxPackage -Name Microsoft.DesktopAppInstaller -ErrorAction SilentlyContinue
                if (-not $pkg) {
                    throw "Desktop App Installer installation did not complete."
                }

                Write-Output "Winget installed successfully."
                exit 0
            }
            finally {
                try {
                    if (Test-Path $workingDir) {
                        Remove-Item -Path $workingDir -Recurse -Force -ErrorAction SilentlyContinue
                    }
                } catch {}
            }
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
        foreach (var value in values)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            var line = value
                .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(line))
            {
                return line.Trim();
            }
        }

        return string.Empty;
    }

    private readonly record struct ProcessResult(int ExitCode, string StdOut, string StdErr);
}
