using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace WinstallerHubApp.Services;

public record OfficeImageInfo(string Name, string FullPath, long SizeBytes);

public class OfficeImageService
{
    public List<OfficeImageInfo> GetImages(string directory)
    {
        if (string.IsNullOrWhiteSpace(directory) || !Directory.Exists(directory))
        {
            return [];
        }

        try
        {
            var dirInfo = new DirectoryInfo(directory);
            return dirInfo.GetFiles("*.*")
                .Where(f => f.Extension.Equals(".iso", StringComparison.OrdinalIgnoreCase) || 
                            f.Extension.Equals(".img", StringComparison.OrdinalIgnoreCase))
                .Select(f => new OfficeImageInfo(f.Name, f.FullName, f.Length))
                .OrderByDescending(f => f.Name)
                .ToList();
        }
        catch
        {
            return [];
        }
    }

    public async Task<string?> MountImageAsync(string imagePath)
    {
        try
        {
            // Escape single quotes for PowerShell
            string escapedPath = imagePath.Replace("'", "''");
            
            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -ExecutionPolicy Bypass -Command \"$mount = Mount-DiskImage -ImagePath '{escapedPath}' -PassThru; if ($mount) {{ ($mount | Get-Volume).DriveLetter }}\"",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null) return null;

            string output = await process.StandardOutput.ReadToEndAsync();
            await process.WaitForExitAsync();
            
            string driveLetter = output.Trim().ToUpper();
            return string.IsNullOrEmpty(driveLetter) ? null : driveLetter;
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Error mounting image: {ex.Message}");
            return null;
        }
    }

    public async Task UnmountImageAsync(string imagePath)
    {
        try
        {
            string escapedPath = imagePath.Replace("'", "''");
            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -ExecutionPolicy Bypass -Command \"Dismount-DiskImage -ImagePath '{escapedPath}'\"",
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process != null)
            {
                await process.WaitForExitAsync();
            }
        }
        catch
        {
            // Ignore unmount errors
        }
    }

    public bool RunSetup(string driveLetter)
    {
        if (string.IsNullOrWhiteSpace(driveLetter)) return false;
        
        string rootPath = $"{driveLetter}:\\";
        string setupPath = Path.Combine(rootPath, "setup.exe");
        
        if (!File.Exists(setupPath))
        {
            // Some Office ISOs might have setup.exe in a subfolder like /Office/setup.exe
            setupPath = Path.Combine(rootPath, "Office", "setup.exe");
        }

        if (!File.Exists(setupPath))
        {
            return false;
        }

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = setupPath,
                WorkingDirectory = Path.GetDirectoryName(setupPath),
                UseShellExecute = true
            });
            return true;
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Error running setup: {ex.Message}");
            return false;
        }
    }
}
