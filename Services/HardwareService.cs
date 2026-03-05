using System;
using System.Collections.Generic;

namespace WinstallerHubApp.Services;

public static class HardwareService
{
    private static readonly string[] MetricPalette =
    {
        "#A96AF3",
        "#1EA0F0",
        "#0F86D4",
        "#2FC16D",
        "#4486F5",
        "#F59E0B"
    };

    private static readonly CpuHardwareService CpuService = new();
    private static readonly GpuHardwareService GpuService = new();
    private static readonly NetworkHardwareService NetworkService = new();
    private static readonly BatteryHardwareService BatteryService = new();
    private static readonly SystemHardwareService SystemService = new();

    public static DashboardSnapshot GetDashboardSnapshot()
    {
        var os = SystemService.GetOperatingSystemDetails();
        var cpuName = CpuService.GetCpuInfo();
        var cpuUsagePercent = CpuService.GetCpuUsagePercent();
        var cpuFrequencyGHz = CpuService.GetCpuFrequencyGHz();
        var memory = SystemService.GetMemoryUsage();

        var gpuCards = GpuService.GetGpuCards(PickColor);
        var diskCards = DiskHardwareService.GetDiskCards();
        var networkCards = NetworkService.GetNetworkCards();
        var detailPanels = GetSystemDetailPanels();

        return new DashboardSnapshot
        {
            OsTitle = os.Caption,
            OsSubtitle = $"{AppLanguageService.GetString("Hardware.Build")} {os.BuildNumber}",
            Cpu = new GaugeMetric(cpuUsagePercent, $"{cpuFrequencyGHz:0.00} GHz", HardwareQueryHelpers.Truncate(cpuName, 34), "#2FC16D", "CPU"),
            Ram = new GaugeMetric(
                memory.UsagePercent,
                $"{memory.UsedGb:0.0} / {memory.TotalGb:0.0} GB",
                AppLanguageService.GetString("Hardware.MemoryUsage"),
                "#4486F5",
                "RAM"),
            GpuCards = gpuCards,
            DiskCards = diskCards,
            NetworkCards = networkCards,
            DetailPanels = detailPanels
        };
    }

    public static string GetOSInfo()
    {
        var details = SystemService.GetOperatingSystemDetails();
        return $"{details.Caption} ({details.KernelVersion})";
    }

    public static string GetCPUInfo()
    {
        return CpuService.GetCpuInfo();
    }

    public static List<string> GetGPUInfo()
    {
        return GpuService.GetGpuInfo();
    }

    public static string GetMotherboardInfo()
    {
        return SystemService.GetMotherboardInfo();
    }

    public static List<string> GetNetworkAdapters()
    {
        return NetworkService.GetNetworkAdapters();
    }

    private static List<SystemDetailPanel> GetSystemDetailPanels()
    {
        var panels = SystemService.GetCoreSystemPanels();
        panels.AddRange(BatteryService.GetBatteryPanels());
        panels.AddRange(DiskHardwareService.GetDiskPanels());
        return panels;
    }

    private static string PickColor(int index)
    {
        if (index < 0)
        {
            return MetricPalette[0];
        }

        return MetricPalette[index % MetricPalette.Length];
    }
}
