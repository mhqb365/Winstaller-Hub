using System;
using System.Collections.Generic;
using System.Management;

namespace WinstallerHubApp.Services;

internal sealed class SystemHardwareService
{
    internal OperatingSystemDetails GetOperatingSystemDetails()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT Caption, Version, BuildNumber FROM Win32_OperatingSystem");
            using var results = searcher.Get();

            foreach (ManagementBaseObject item in results)
            {
                var caption = item["Caption"]?.ToString();
                var kernel = item["Version"]?.ToString();
                var build = item["BuildNumber"]?.ToString();

                return new OperatingSystemDetails(
                    NormalizeOsCaption(caption),
                    string.IsNullOrWhiteSpace(build) ? "N/A" : build.Trim(),
                    string.IsNullOrWhiteSpace(kernel) ? "N/A" : kernel.Trim());
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        return new OperatingSystemDetails("Windows", "N/A", "N/A");
    }

    internal MemoryUsage GetMemoryUsage()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT TotalVisibleMemorySize, FreePhysicalMemory FROM Win32_OperatingSystem");
            using var results = searcher.Get();

            foreach (ManagementBaseObject item in results)
            {
                var totalKb = HardwareQueryHelpers.ToDouble(item["TotalVisibleMemorySize"]);
                var freeKb = HardwareQueryHelpers.ToDouble(item["FreePhysicalMemory"]);
                if (totalKb <= 0)
                {
                    break;
                }

                var usedKb = Math.Max(0, totalKb - freeKb);
                var totalGb = totalKb / (1024.0 * 1024.0);
                var usedGb = usedKb / (1024.0 * 1024.0);
                var usagePercent = usedGb / totalGb * 100.0;

                return new MemoryUsage(usedGb, totalGb, Math.Clamp(usagePercent, 0, 100));
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        return new MemoryUsage(0, 0, 0);
    }

    internal List<SystemDetailPanel> GetCoreSystemPanels()
    {
        return new List<SystemDetailPanel>
        {
            GetMachinePanel(),
            GetServiceTagPanel(),
            GetMainboardPanel(),
            GetBiosPanel()
        };
    }

    internal string GetMotherboardInfo()
    {
        return HardwareQueryHelpers.QuerySingle(
            "SELECT Manufacturer, Product FROM Win32_BaseBoard",
            item =>
            {
                var manufacturer = item["Manufacturer"]?.ToString();
                var product = item["Product"]?.ToString();
                return HardwareQueryHelpers.JoinParts(manufacturer, product);
            },
            T("System.UnknownMotherboard"));
    }

    private static SystemDetailPanel GetMachinePanel()
    {
        var unknown = T("Common.Unknown");
        var manufacturer = unknown;
        var model = unknown;
        var systemFamily = unknown;

        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT Manufacturer, Model, SystemFamily FROM Win32_ComputerSystem");
            using var results = searcher.Get();

            foreach (ManagementBaseObject item in results)
            {
                manufacturer = HardwareQueryHelpers.ToSafeText(item["Manufacturer"], unknown);
                model = HardwareQueryHelpers.ToSafeText(item["Model"], unknown);
                systemFamily = HardwareQueryHelpers.ToSafeText(item["SystemFamily"], unknown);
                break;
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        var architecture = Environment.Is64BitOperatingSystem ? "x64" : "x86";

        return new SystemDetailPanel(
            T("System.Panel.MachineTitle"),
            "\uE770",
            new List<SystemDetailItem>
            {
                new(T("System.Label.Manufacturer"), manufacturer),
                new(T("System.Label.Hostname"), Environment.MachineName),
                new(T("System.Label.Model"), model),
                new(T("System.Label.SystemFamily"), systemFamily),
                new(T("System.Label.Architecture"), architecture)
            });
    }

    private static SystemDetailPanel GetServiceTagPanel()
    {
        var biosSerial = HardwareQueryHelpers.ToSafeText(
            HardwareQueryHelpers.QuerySingleObjectValue("SELECT SerialNumber FROM Win32_BIOS", "SerialNumber"),
            "N/A");
        var productId = HardwareQueryHelpers.ToSafeText(
            HardwareQueryHelpers.QuerySingleObjectValue("SELECT IdentifyingNumber FROM Win32_ComputerSystemProduct", "IdentifyingNumber"),
            "N/A");
        var uuid = HardwareQueryHelpers.ToSafeText(
            HardwareQueryHelpers.QuerySingleObjectValue("SELECT UUID FROM Win32_ComputerSystemProduct", "UUID"),
            "N/A");

        return new SystemDetailPanel(
            T("System.Panel.ServiceTagTitle"),
            "\uE13D",
            new List<SystemDetailItem>
            {
                new(T("System.Label.BiosSerial"), biosSerial),
                new(T("System.Label.ProductId"), productId),
                new("UUID", uuid)
            });
    }

    private static SystemDetailPanel GetMainboardPanel()
    {
        var unknown = T("Common.Unknown");
        var manufacturer = unknown;
        var model = unknown;
        var serial = "N/A";
        var version = "N/A";

        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT Manufacturer, Product, SerialNumber, Version FROM Win32_BaseBoard");
            using var results = searcher.Get();

            foreach (ManagementBaseObject item in results)
            {
                manufacturer = HardwareQueryHelpers.ToSafeText(item["Manufacturer"], unknown);
                model = HardwareQueryHelpers.ToSafeText(item["Product"], unknown);
                serial = HardwareQueryHelpers.ToSafeText(item["SerialNumber"], "N/A");
                version = HardwareQueryHelpers.ToSafeText(item["Version"], "N/A");
                break;
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        return new SystemDetailPanel(
            T("System.Panel.MainboardTitle"),
            "\uE90F",
            new List<SystemDetailItem>
            {
                new(T("System.Label.Manufacturer"), manufacturer),
                new(T("System.Label.Model"), model),
                new("Serial", serial),
                new(T("System.Label.Version"), version)
            });
    }

    private static SystemDetailPanel GetBiosPanel()
    {
        var unknown = T("Common.Unknown");
        var manufacturer = unknown;
        var version = "N/A";
        var releaseDate = "N/A";
        var smbios = "N/A";

        try
        {
            using var searcher = new ManagementObjectSearcher(
                "SELECT Manufacturer, SMBIOSBIOSVersion, ReleaseDate, SMBIOSMajorVersion, SMBIOSMinorVersion FROM Win32_BIOS");
            using var results = searcher.Get();

            foreach (ManagementBaseObject item in results)
            {
                manufacturer = HardwareQueryHelpers.ToSafeText(item["Manufacturer"], unknown);
                version = HardwareQueryHelpers.ToSafeText(item["SMBIOSBIOSVersion"], "N/A");
                releaseDate = HardwareQueryHelpers.FormatWmiDate(item["ReleaseDate"]?.ToString());

                var major = HardwareQueryHelpers.ToSafeText(item["SMBIOSMajorVersion"], string.Empty);
                var minor = HardwareQueryHelpers.ToSafeText(item["SMBIOSMinorVersion"], string.Empty);
                if (!string.IsNullOrWhiteSpace(major) && !string.IsNullOrWhiteSpace(minor))
                {
                    smbios = $"{major}.{minor}";
                }

                break;
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        return new SystemDetailPanel(
            "BIOS / UEFI",
            "\uE946",
            new List<SystemDetailItem>
            {
                new(T("System.Label.Manufacturer"), manufacturer),
                new(T("System.Label.Version"), version),
                new(T("System.Label.ReleaseDate"), releaseDate),
                new("SMBIOS", smbios)
            });
    }

    private static string T(string key)
    {
        return AppLanguageService.GetString(key);
    }

    private static string NormalizeOsCaption(string? caption)
    {
        if (string.IsNullOrWhiteSpace(caption))
        {
            return "Windows";
        }

        var normalized = caption.Trim();
        const string microsoftPrefix = "Microsoft ";
        if (normalized.StartsWith(microsoftPrefix, StringComparison.OrdinalIgnoreCase))
        {
            normalized = normalized[microsoftPrefix.Length..].Trim();
        }

        return normalized;
    }
}

internal readonly record struct OperatingSystemDetails(string Caption, string BuildNumber, string KernelVersion);

internal readonly record struct MemoryUsage(double UsedGb, double TotalGb, double UsagePercent);
