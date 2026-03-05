using System;
using System.Collections.Generic;
using System.Globalization;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Management;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace WinstallerHubApp.Services;

internal static class DiskHardwareService
{
    private static readonly TimeSpan SmartCtlCacheTtl = TimeSpan.FromSeconds(45);
    private static readonly TimeSpan SmartCtlRetryInterval = TimeSpan.FromSeconds(2);
    private static List<SmartCtlDiskInfo>? _cachedSmartCtlDiskInfos;
    private static DateTime _cachedSmartCtlUpdatedUtc = DateTime.MinValue;

    private static readonly string[] MetricPalette =
    {
        "#A96AF3",
        "#1EA0F0",
        "#0F86D4",
        "#2FC16D",
        "#4486F5",
        "#F59E0B"
    };

    internal static List<GaugeMetric> GetDiskCards()
    {
        var cards = new List<GaugeMetric>();

        try
        {
            var drives = DriveInfo.GetDrives()
                .Where(d => d.IsReady && d.DriveType == DriveType.Fixed)
                .OrderBy(d => d.Name)
                .ToList();

            for (var i = 0; i < drives.Count; i++)
            {
                var drive = drives[i];
                var totalGb = drive.TotalSize / (1024d * 1024d * 1024d);
                var freeGb = drive.AvailableFreeSpace / (1024d * 1024d * 1024d);
                var usedGb = Math.Max(0, totalGb - freeGb);
                var usagePercent = totalGb > 0 ? usedGb / totalGb * 100.0 : 0;

                cards.Add(new GaugeMetric(
                    Math.Clamp(usagePercent, 0, 100),
                    $"{usedGb:0.0} / {totalGb:0.0} GB",
                    $"{T("Disk.Label.Free")} {freeGb:0.0} GB",
                    PickColor(i + 2),
                    AppLanguageService.Format("Disk.DriveTitleFormat", drive.Name.TrimEnd('\\'))));
            }
        }
        catch (IOException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        if (cards.Count == 0)
        {
            cards.Add(new GaugeMetric(
                0,
                "N/A",
                T("Disk.NoFixedDrive"),
                PickColor(2),
                T("Disk.Title")));
        }

        return cards;
    }

    internal static List<SystemDetailPanel> GetDiskPanels()
    {
        var disks = GetDiskSnapshots();
        if (disks.Count == 0)
        {
            return new List<SystemDetailPanel>
            {
                new(
                    AppLanguageService.Format("Disk.PanelTitleFormat", 0),
                    "\uE7F1",
                    new List<SystemDetailItem>
                    {
                        new(T("Disk.Label.Status"), T("Common.Unknown")),
                        new(T("Disk.Label.Health"), T("Common.Unknown")),
                        new(T("Disk.Label.Model"), "N/A"),
                        new(T("Disk.Label.Media"), T("Common.Unknown")),
                        new(T("Disk.Label.Bus"), T("Common.Unknown")),
                        new(T("Disk.Label.Size"), "N/A"),
                        new(T("Disk.Label.Temperature"), "N/A")
                    })
            };
        }

        var panels = new List<SystemDetailPanel>();
        foreach (var disk in disks)
        {
            var diskMedia = "Unknown";
            var diskBus = "Unknown";
            var health = "Unknown";
            var temperature = "N/A";

            var hasPhysicalData = TryGetPhysicalDiskClassification(
                disk.Index,
                disk.Model,
                out diskMedia,
                out diskBus,
                out health,
                out temperature);
            if (!hasPhysicalData)
            {
                diskMedia = ResolveDiskMediaType(disk.Model, disk.InterfaceType, disk.MediaType, disk.PnpDeviceId);
                diskBus = ResolveDiskBusType(disk.Model, disk.InterfaceType, disk.MediaType, disk.PnpDeviceId);
            }

            if (TryGetSmartCtlDiskInfo(disk.Index, disk.Model, disk.SerialNumber, disks.Count, out var smartInfo))
            {
                if (!string.IsNullOrWhiteSpace(smartInfo.Health))
                {
                    health = smartInfo.Health;
                }

                if (smartInfo.TemperatureC > 0)
                {
                    temperature = $"{smartInfo.TemperatureC:0} \u00B0C";
                }
            }

            if (health == "Unknown")
            {
                health = GetDiskHealthStatus();
            }

            health = NormalizeDiskHealthLabel(health);

            panels.Add(new SystemDetailPanel(
                AppLanguageService.Format("Disk.PanelTitleFormat", disk.Index),
                "\uE7F1",
                new List<SystemDetailItem>
                {
                    new(T("Disk.Label.Status"), LocalizeDiskStatus(disk.Status)),
                    new(T("Disk.Label.Health"), LocalizeUnknown(health)),
                    new(T("Disk.Label.Model"), Truncate(disk.Model, 56)),
                    new(T("Disk.Label.Media"), LocalizeUnknown(diskMedia)),
                    new(T("Disk.Label.Bus"), LocalizeUnknown(diskBus)),
                    new(T("Disk.Label.Size"), disk.SizeGb),
                    new(T("Disk.Label.Temperature"), temperature)
                }));
        }

        return panels;
    }

    private static List<DiskSnapshot> GetDiskSnapshots()
    {
        var disks = new List<DiskSnapshot>();

        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT Index, Model, SerialNumber, Size, Status, InterfaceType, MediaType, PNPDeviceID FROM Win32_DiskDrive");
            using var results = searcher.Get();

            foreach (ManagementBaseObject item in results)
            {
                var index = (int)Math.Round(ToDouble(item["Index"]));
                var model = ToSafeText(item["Model"], "N/A");
                var serialNumber = ToSafeText(item["SerialNumber"], string.Empty);
                var status = ToSafeText(item["Status"], "Unknown");
                var interfaceType = ToSafeText(item["InterfaceType"], "Unknown");
                var mediaType = ToSafeText(item["MediaType"], string.Empty);
                var pnpDeviceId = ToSafeText(item["PNPDeviceID"], string.Empty);

                var sizeBytes = ToDouble(item["Size"]);
                var sizeGb = sizeBytes > 0
                    ? $"{sizeBytes / (1024d * 1024d * 1024d):0.0} GB"
                    : "N/A";

                disks.Add(new DiskSnapshot(index, model, serialNumber, status, interfaceType, mediaType, pnpDeviceId, sizeGb));
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        return disks
            .OrderBy(d => d.Index)
            .ToList();
    }

    private static string GetDiskHealthStatus()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher(
                @"root\WMI",
                "SELECT PredictFailure FROM MSStorageDriver_FailurePredictStatus");
            using var results = searcher.Get();

            var foundEntry = false;
            foreach (ManagementBaseObject item in results)
            {
                foundEntry = true;
                var predictFailure = item["PredictFailure"] as bool?;
                if (predictFailure == true)
                {
                    return "Warning";
                }
            }

            return foundEntry ? "Healthy" : "Unknown";
        }
        catch
        {
            return "Unknown";
        }
    }

    private static bool TryGetPhysicalDiskClassification(
        int diskIndex,
        string model,
        out string media,
        out string bus,
        out string health,
        out string temperature)
    {
        media = "Unknown";
        bus = "Unknown";
        health = "Unknown";
        temperature = "N/A";

        try
        {
            using var searcher = new ManagementObjectSearcher(
                @"root\Microsoft\Windows\Storage",
                "SELECT ObjectId, DeviceId, FriendlyName, Model, MediaType, BusType, HealthStatus, OperationalStatus FROM MSFT_PhysicalDisk");
            using var results = searcher.Get();

            var disks = new List<ManagementObject>();
            foreach (ManagementBaseObject item in results)
            {
                if (item is ManagementObject managementObject)
                {
                    disks.Add(managementObject);
                }
            }

            if (disks.Count == 0)
            {
                return false;
            }

            ManagementObject? matched = null;
            if (diskIndex >= 0)
            {
                matched = disks.FirstOrDefault(item => (int)Math.Round(ToDouble(item["DeviceId"])) == diskIndex);
            }

            var normalizedModel = model?.Trim().ToUpperInvariant() ?? string.Empty;
            if (matched == null && !string.IsNullOrWhiteSpace(normalizedModel))
            {
                matched = disks.FirstOrDefault(item =>
                {
                    var matchSource = $"{ToSafeText(item["FriendlyName"], string.Empty)} {ToSafeText(item["Model"], string.Empty)}"
                        .ToUpperInvariant();
                    return matchSource.Contains(normalizedModel, StringComparison.Ordinal);
                });

                if (matched == null)
                {
                    var firstToken = normalizedModel
                        .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                        .FirstOrDefault();
                    if (!string.IsNullOrWhiteSpace(firstToken))
                    {
                        matched = disks.FirstOrDefault(item =>
                        {
                            var matchSource = $"{ToSafeText(item["FriendlyName"], string.Empty)} {ToSafeText(item["Model"], string.Empty)}"
                                .ToUpperInvariant();
                            return matchSource.Contains(firstToken, StringComparison.Ordinal);
                        });
                    }
                }
            }

            matched ??= disks
                .OrderBy(item => ToDouble(item["DeviceId"]))
                .FirstOrDefault();

            if (matched == null)
            {
                return false;
            }

            media = MapPhysicalDiskMediaType(ToDouble(matched["MediaType"]));
            bus = MapPhysicalDiskBusType(ToDouble(matched["BusType"]));
            health = ResolvePhysicalDiskHealth(matched);
            if (TryGetPhysicalDiskReliability(matched, out var temperatureC, out var wearPercent))
            {
                if (temperatureC > 0)
                {
                    temperature = $"{temperatureC:0} \u00B0C";
                }

                health = MergeDiskHealthWithWear(health, wearPercent);
            }

            return media != "Unknown" ||
                   bus != "Unknown" ||
                   health != "Unknown" ||
                   temperature != "N/A";
        }
        catch (ManagementException)
        {
            return false;
        }
        catch (UnauthorizedAccessException)
        {
            return false;
        }
    }

    private static string ResolvePhysicalDiskHealth(ManagementObject disk)
    {
        var healthCode = (int)Math.Round(ToDouble(disk["HealthStatus"]));
        if (healthCode == 1)
        {
            return "Healthy";
        }

        if (healthCode == 2)
        {
            return "Warning";
        }

        if (healthCode == 3 || healthCode == 5)
        {
            return "Unhealthy";
        }

        return HasOperationalStatusCode(disk, 2)
            ? "Healthy"
            : "Unknown";
    }

    private static string MergeDiskHealthWithWear(string status, double wearPercent)
    {
        if (wearPercent < 0 || wearPercent > 100)
        {
            return NormalizeDiskHealthLabel(status);
        }

        var remainingPercent = Math.Clamp(100 - wearPercent, 0, 100);
        return $"{remainingPercent:0}%";
    }

    private static bool HasOperationalStatusCode(ManagementObject disk, ushort statusCode)
    {
        var value = disk["OperationalStatus"];
        if (value is Array array)
        {
            foreach (var item in array)
            {
                if ((ushort)Math.Round(ToDouble(item)) == statusCode)
                {
                    return true;
                }
            }
            return false;
        }

        return (ushort)Math.Round(ToDouble(value)) == statusCode;
    }

    private static bool TryGetPhysicalDiskReliability(
        ManagementObject disk,
        out double temperatureC,
        out double wearPercent)
    {
        temperatureC = 0;
        wearPercent = -1;

        try
        {
            var relativePath = disk.Path?.RelativePath;
            if (string.IsNullOrWhiteSpace(relativePath))
            {
                var objectId = ToSafeText(disk["ObjectId"], string.Empty);
                if (!string.IsNullOrWhiteSpace(objectId))
                {
                    relativePath = $"MSFT_PhysicalDisk.ObjectId=\"{EscapeWmiStringLiteral(objectId)}\"";
                }
            }

            if (string.IsNullOrWhiteSpace(relativePath))
            {
                return false;
            }

            var query = $"ASSOCIATORS OF {{{relativePath}}} WHERE ResultClass=MSFT_StorageReliabilityCounter";
            using var searcher = new ManagementObjectSearcher(@"root\Microsoft\Windows\Storage", query);
            using var results = searcher.Get();

            foreach (ManagementBaseObject item in results)
            {
                temperatureC = ToDouble(item["Temperature"]);
                wearPercent = ToDouble(item["Wear"]);
                return true;
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        return false;
    }

    private static bool TryGetSmartCtlDiskInfo(
        int diskIndex,
        string modelHint,
        string serialHint,
        int expectedDiskCount,
        out SmartCtlDiskInfo info)
    {
        info = default;

        var now = DateTime.UtcNow;
        var cacheAge = now - _cachedSmartCtlUpdatedUtc;
        var cachedCount = _cachedSmartCtlDiskInfos?.Count ?? 0;
        var noCacheYet = _cachedSmartCtlUpdatedUtc == DateTime.MinValue;
        var shouldRetryFast = expectedDiskCount > 0 &&
                              cachedCount < expectedDiskCount &&
                              cacheAge > SmartCtlRetryInterval;

        if (noCacheYet || cacheAge > SmartCtlCacheTtl || shouldRetryFast)
        {
            var refreshed = TryReadSmartCtlDiskInfos(out var latestInfos);
            _cachedSmartCtlUpdatedUtc = DateTime.UtcNow;
            _cachedSmartCtlDiskInfos = refreshed ? latestInfos : null;
        }

        if (_cachedSmartCtlDiskInfos == null || _cachedSmartCtlDiskInfos.Count == 0)
        {
            return false;
        }

        if (TryMatchSmartCtlDiskInfo(_cachedSmartCtlDiskInfos, diskIndex, modelHint, serialHint, out info))
        {
            return true;
        }

        var hasDiskCountMismatch = expectedDiskCount > 0 &&
                                   (_cachedSmartCtlDiskInfos?.Count ?? 0) < expectedDiskCount;
        if (!hasDiskCountMismatch &&
            DateTime.UtcNow - _cachedSmartCtlUpdatedUtc <= SmartCtlRetryInterval)
        {
            return false;
        }

        var retryRefreshed = TryReadSmartCtlDiskInfos(out var retryInfos);
        _cachedSmartCtlUpdatedUtc = DateTime.UtcNow;
        _cachedSmartCtlDiskInfos = retryRefreshed ? retryInfos : null;

        return retryRefreshed &&
               _cachedSmartCtlDiskInfos != null &&
               TryMatchSmartCtlDiskInfo(_cachedSmartCtlDiskInfos, diskIndex, modelHint, serialHint, out info);
    }

    private static bool TryReadSmartCtlDiskInfos(out List<SmartCtlDiskInfo> infos)
    {
        infos = new List<SmartCtlDiskInfo>();

        if (!TryFindSmartCtlExecutable(out var smartCtlPath))
        {
            return false;
        }

        if (!TryRunProcessCaptureOutput(smartCtlPath, new[] { "--scan-open" }, out var scanOutput))
        {
            return false;
        }

        var devices = ParseSmartCtlScanOutput(scanOutput);
        if (devices.Count == 0)
        {
            return false;
        }

        foreach (var device in devices)
        {
            var args = new List<string> { "-a", "-j", device.DevicePath };
            if (!string.IsNullOrWhiteSpace(device.DeviceType))
            {
                args.Add("-d");
                args.Add(device.DeviceType);
            }

            if (!TryRunProcessCaptureOutput(smartCtlPath, args, out var jsonOutput))
            {
                continue;
            }

            if (!TryParseSmartCtlDiskInfo(jsonOutput, out var candidate))
            {
                continue;
            }

            infos.Add(candidate);
        }

        return infos.Count > 0;
    }

    private static bool TryMatchSmartCtlDiskInfo(
        IReadOnlyList<SmartCtlDiskInfo> infos,
        int diskIndex,
        string modelHint,
        string serialHint,
        out SmartCtlDiskInfo info)
    {
        info = default;
        if (infos.Count == 0)
        {
            return false;
        }

        foreach (var candidate in infos)
        {
            if (IsDiskSerialMatch(serialHint, candidate.SerialNumber))
            {
                info = candidate;
                return true;
            }
        }

        if (diskIndex >= 0 && diskIndex < infos.Count)
        {
            var byIndex = infos[diskIndex];
            if (string.IsNullOrWhiteSpace(modelHint) || IsDiskModelMatch(modelHint, byIndex.Model))
            {
                info = byIndex;
                return true;
            }
        }

        SmartCtlDiskInfo? singleModelMatch = null;
        foreach (var candidate in infos)
        {
            if (IsDiskModelMatch(modelHint, candidate.Model))
            {
                if (singleModelMatch.HasValue)
                {
                    return false;
                }

                singleModelMatch = candidate;
            }
        }

        if (singleModelMatch.HasValue)
        {
            info = singleModelMatch.Value;
            return true;
        }

        return false;
    }

    private static bool TryFindSmartCtlExecutable(out string executablePath)
    {
        executablePath = string.Empty;
        var relativeCandidates = new[]
        {
            Path.Combine("Utils", "smartmontools", "smartctl.exe"),
            Path.Combine("WinstallerHubApp", "Utils", "smartmontools", "smartctl.exe")
        };

        var rootHints = new List<string>
        {
            AppContext.BaseDirectory,
            Directory.GetCurrentDirectory()
        };

        foreach (var root in rootHints.Where(r => !string.IsNullOrWhiteSpace(r)).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var current = new DirectoryInfo(root);
            for (var depth = 0; current != null && depth < 8; depth++)
            {
                foreach (var relative in relativeCandidates)
                {
                    var candidatePath = Path.Combine(current.FullName, relative);
                    if (File.Exists(candidatePath))
                    {
                        executablePath = candidatePath;
                        return true;
                    }
                }

                current = current.Parent;
            }
        }

        return false;
    }

    private static bool TryRunProcessCaptureOutput(string filePath, IReadOnlyList<string> arguments, out string output)
    {
        output = string.Empty;

        try
        {
            var startInfo = new ProcessStartInfo(filePath)
            {
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };

            foreach (var argument in arguments)
            {
                startInfo.ArgumentList.Add(argument);
            }

            using var process = Process.Start(startInfo);
            if (process == null)
            {
                return false;
            }

            var stdout = process.StandardOutput.ReadToEnd();
            var stderr = process.StandardError.ReadToEnd();

            if (!process.WaitForExit(5000))
            {
                try
                {
                    process.Kill(entireProcessTree: true);
                }
                catch
                {
                }
            }

            output = string.IsNullOrWhiteSpace(stdout) ? stderr : stdout;
            return !string.IsNullOrWhiteSpace(output);
        }
        catch
        {
            return false;
        }
    }

    private static List<SmartCtlDevice> ParseSmartCtlScanOutput(string scanOutput)
    {
        var devices = new List<SmartCtlDevice>();
        var lines = scanOutput.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);

        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#'))
            {
                continue;
            }

            var commandPart = line.Split('#', 2)[0].Trim();
            if (string.IsNullOrWhiteSpace(commandPart))
            {
                continue;
            }

            var tokens = commandPart
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .ToList();
            if (tokens.Count == 0)
            {
                continue;
            }

            var devicePath = tokens[0];
            var deviceType = string.Empty;
            for (var i = 1; i < tokens.Count - 1; i++)
            {
                if (tokens[i].Equals("-d", StringComparison.OrdinalIgnoreCase))
                {
                    deviceType = tokens[i + 1];
                    break;
                }
            }

            if (!string.IsNullOrWhiteSpace(devicePath))
            {
                devices.Add(new SmartCtlDevice(devicePath, deviceType));
            }
        }

        return devices;
    }

    private static bool TryParseSmartCtlDiskInfo(string jsonOutput, out SmartCtlDiskInfo info)
    {
        info = default;

        try
        {
            using var document = JsonDocument.Parse(jsonOutput);
            var root = document.RootElement;

            var model = GetJsonString(root, "model_name");
            var serial = GetJsonString(root, "serial_number");
            var passed = GetJsonBool(root, "smart_status", "passed");
            var usedPercent = GetJsonNumber(root, "nvme_smart_health_information_log", "percentage_used") ??
                              GetJsonNumber(root, "endurance_used", "current_percent");
            if (!usedPercent.HasValue)
            {
                var ataRemainingPercent = GetAtaWearRemainingPercent(root);
                if (ataRemainingPercent.HasValue)
                {
                    usedPercent = Math.Clamp(100 - ataRemainingPercent.Value, 0, 100);
                }
            }

            var tempC = GetJsonNumber(root, "temperature", "current") ??
                        GetJsonNumber(root, "nvme_smart_health_information_log", "temperature");

            var health = FormatSmartCtlHealth(passed, usedPercent);
            if (string.IsNullOrWhiteSpace(health) && !tempC.HasValue && string.IsNullOrWhiteSpace(model))
            {
                return false;
            }

            info = new SmartCtlDiskInfo(
                model,
                serial,
                health,
                tempC ?? 0);
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static double? GetAtaWearRemainingPercent(JsonElement root)
    {
        if (!TryGetJsonElement(root, new[] { "ata_smart_attributes", "table" }, out var table) ||
            table.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var attribute in table.EnumerateArray())
        {
            var id = GetJsonNumber(attribute, "id");
            var value = GetJsonNumber(attribute, "value");
            if (!value.HasValue || value < 0 || value > 100)
            {
                continue;
            }

            var name = GetJsonString(attribute, "name");
            var attrId = id.HasValue ? (int)Math.Round(id.Value) : -1;
            if (attrId == 177 || attrId == 202 || attrId == 231 || attrId == 233 ||
                name.Contains("wear", StringComparison.OrdinalIgnoreCase) ||
                name.Contains("life", StringComparison.OrdinalIgnoreCase) ||
                name.Contains("health", StringComparison.OrdinalIgnoreCase))
            {
                return value.Value;
            }
        }

        return null;
    }

    private static string FormatSmartCtlHealth(bool? passed, double? usedPercent)
    {
        if (usedPercent.HasValue)
        {
            var remaining = Math.Clamp(100 - usedPercent.Value, 0, 100);
            return $"{remaining:0}%";
        }

        return passed switch
        {
            true => "Healthy",
            false => "Warning",
            _ => string.Empty
        };
    }

    private static bool IsDiskModelMatch(string expectedModel, string candidateModel)
    {
        if (string.IsNullOrWhiteSpace(expectedModel) || string.IsNullOrWhiteSpace(candidateModel))
        {
            return false;
        }

        var expected = expectedModel.Trim().ToUpperInvariant();
        var candidate = candidateModel.Trim().ToUpperInvariant();
        return expected.Contains(candidate, StringComparison.Ordinal) ||
               candidate.Contains(expected, StringComparison.Ordinal);
    }

    private static bool IsDiskSerialMatch(string expectedSerial, string candidateSerial)
    {
        var expected = NormalizeHardwareIdentity(expectedSerial);
        var candidate = NormalizeHardwareIdentity(candidateSerial);
        return !string.IsNullOrWhiteSpace(expected) &&
               !string.IsNullOrWhiteSpace(candidate) &&
               string.Equals(expected, candidate, StringComparison.Ordinal);
    }

    private static string NormalizeDiskHealthLabel(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return T("Common.Unknown");
        }

        var text = value.Trim();
        var percentMatch = Regex.Match(text, @"(\d{1,3}(?:[.,]\d+)?)\s*%", RegexOptions.CultureInvariant);
        if (percentMatch.Success)
        {
            var numberText = percentMatch.Groups[1].Value.Replace(',', '.');
            if (double.TryParse(numberText, NumberStyles.Float, CultureInfo.InvariantCulture, out var percentValue))
            {
                return $"{Math.Clamp(percentValue, 0, 100):0}%";
            }
        }

        if (text.Equals("Healthy", StringComparison.OrdinalIgnoreCase))
        {
            return T("Disk.Health.Healthy");
        }

        if (text.Equals("Warning", StringComparison.OrdinalIgnoreCase))
        {
            return T("Disk.Health.Warning");
        }

        if (text.Equals("Unhealthy", StringComparison.OrdinalIgnoreCase) ||
            text.Equals("Failed", StringComparison.OrdinalIgnoreCase))
        {
            return T("Disk.Health.Unhealthy");
        }

        return LocalizeUnknown(text);
    }

    private static string LocalizeDiskStatus(string status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return T("Common.Unknown");
        }

        return status.Trim() switch
        {
            "OK" => T("Disk.Status.OK"),
            "Error" => T("Disk.Status.Error"),
            "Pred Fail" => T("Disk.Status.PredFail"),
            "Degraded" => T("Disk.Status.Degraded"),
            _ => LocalizeUnknown(status)
        };
    }

    private static string LocalizeUnknown(string value)
    {
        return value.Equals("Unknown", StringComparison.OrdinalIgnoreCase)
            ? T("Common.Unknown")
            : value;
    }

    private static string T(string key)
    {
        return AppLanguageService.GetString(key);
    }

    private static string NormalizeHardwareIdentity(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value
            .Where(char.IsLetterOrDigit)
            .ToArray();
        return normalized.Length == 0
            ? string.Empty
            : new string(normalized).ToUpperInvariant();
    }

    private static string GetJsonString(JsonElement element, params string[] path)
    {
        if (!TryGetJsonElement(element, path, out var result) || result.ValueKind != JsonValueKind.String)
        {
            return string.Empty;
        }

        return result.GetString() ?? string.Empty;
    }

    private static bool? GetJsonBool(JsonElement element, params string[] path)
    {
        if (!TryGetJsonElement(element, path, out var result))
        {
            return null;
        }

        return result.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            _ => null
        };
    }

    private static double? GetJsonNumber(JsonElement element, params string[] path)
    {
        if (!TryGetJsonElement(element, path, out var result))
        {
            return null;
        }

        if (result.ValueKind == JsonValueKind.Number && result.TryGetDouble(out var numericValue))
        {
            return numericValue;
        }

        if (result.ValueKind == JsonValueKind.String &&
            double.TryParse(result.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var textValue))
        {
            return textValue;
        }

        return null;
    }

    private static bool TryGetJsonElement(JsonElement root, string[] path, out JsonElement element)
    {
        element = root;
        foreach (var segment in path)
        {
            if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(segment, out element))
            {
                return false;
            }
        }

        return true;
    }

    private static string EscapeWmiStringLiteral(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("\"", "\\\"", StringComparison.Ordinal);
    }

    private static string MapPhysicalDiskMediaType(double mediaTypeCode)
    {
        var code = (int)Math.Round(mediaTypeCode);
        return code switch
        {
            3 => "HDD",
            4 => "SSD",
            5 => "SCM",
            _ => "Unknown"
        };
    }

    private static string MapPhysicalDiskBusType(double busTypeCode)
    {
        var code = (int)Math.Round(busTypeCode);
        return code switch
        {
            1 => "SCSI",
            2 => "ATAPI",
            3 => "ATA",
            4 => "IEEE 1394",
            5 => "SSA",
            6 => "Fibre Channel",
            7 => "USB",
            8 => "RAID",
            9 => "iSCSI",
            10 => "SAS",
            11 => "SATA",
            12 => "SD",
            13 => "MMC",
            15 => "Virtual",
            16 => "Storage Spaces",
            17 => "NVMe",
            18 => "SCM",
            19 => "UFS",
            _ => "Unknown"
        };
    }

    private static string ResolveDiskMediaType(string model, string interfaceType, string mediaType, string pnpDeviceId)
    {
        var merged = $"{model} {interfaceType} {mediaType} {pnpDeviceId}".ToUpperInvariant();
        if (merged.Contains("SSD") || merged.Contains("NVME"))
        {
            return "SSD";
        }

        if (merged.Contains("HDD") || merged.Contains("ROTATIONAL") || merged.Contains("HARD DISK"))
        {
            return "HDD";
        }

        if (merged.Contains("SCM"))
        {
            return "SCM";
        }

        return "Unknown";
    }

    private static string ResolveDiskBusType(string model, string interfaceType, string mediaType, string pnpDeviceId)
    {
        var merged = $"{model} {interfaceType} {mediaType} {pnpDeviceId}".ToUpperInvariant();

        if (merged.Contains("NVME"))
        {
            return "NVMe";
        }

        if (merged.Contains("SATA") || interfaceType.Equals("IDE", StringComparison.OrdinalIgnoreCase))
        {
            return "SATA";
        }

        if (merged.Contains("SAS"))
        {
            return "SAS";
        }

        if (merged.Contains("USB"))
        {
            return "USB";
        }

        return string.IsNullOrWhiteSpace(interfaceType) ? "Unknown" : interfaceType;
    }

    private static double ToDouble(object? value)
    {
        if (value == null)
        {
            return 0;
        }

        if (value is IConvertible convertible)
        {
            try
            {
                return convertible.ToDouble(CultureInfo.InvariantCulture);
            }
            catch (FormatException)
            {
            }
            catch (InvalidCastException)
            {
            }
        }

        var asText = value.ToString();
        if (double.TryParse(asText, NumberStyles.Any, CultureInfo.InvariantCulture, out var invariantValue))
        {
            return invariantValue;
        }

        if (double.TryParse(asText, NumberStyles.Any, CultureInfo.CurrentCulture, out var cultureValue))
        {
            return cultureValue;
        }

        return 0;
    }

    private static string ToSafeText(object? value, string fallback)
    {
        var asText = value?.ToString()?.Trim();
        return string.IsNullOrWhiteSpace(asText) ? fallback : asText;
    }

    private static string Truncate(string value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "N/A";
        }

        var normalized = value.Trim();
        if (normalized.Length <= maxLength)
        {
            return normalized;
        }

        return normalized[..Math.Max(0, maxLength - 3)] + "...";
    }

    private static string PickColor(int index)
    {
        if (index < 0)
        {
            return MetricPalette[0];
        }

        return MetricPalette[index % MetricPalette.Length];
    }

    private readonly record struct SmartCtlDevice(string DevicePath, string DeviceType);
    private readonly record struct SmartCtlDiskInfo(string Model, string SerialNumber, string Health, double TemperatureC);
    private readonly record struct DiskSnapshot(
        int Index,
        string Model,
        string SerialNumber,
        string Status,
        string InterfaceType,
        string MediaType,
        string PnpDeviceId,
        string SizeGb);
}
