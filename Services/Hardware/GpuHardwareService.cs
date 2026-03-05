using System;
using System.Collections.Generic;
using System.Linq;
using System.Management;
using System.Text.RegularExpressions;

namespace WinstallerHubApp.Services;

internal sealed class GpuHardwareService
{
    internal List<string> GetGpuInfo()
    {
        return HardwareQueryHelpers.QueryMany(
            "SELECT Name FROM Win32_VideoController",
            item => item["Name"]?.ToString(),
            AppLanguageService.GetString("Hardware.UnknownGpu"));
    }

    internal List<GaugeMetric> GetGpuCards(Func<int, string> pickColor)
    {
        var gpuNames = GetGpuInfo();
        var usageByPhysicalIndex = GetGpuUsageByPhysicalIndex();
        var cards = new List<GaugeMetric>();

        for (var i = 0; i < gpuNames.Count; i++)
        {
            var percent = usageByPhysicalIndex.TryGetValue(i, out var usage) ? usage : 0;
            var title = gpuNames.Count == 1 ? "GPU" : $"GPU {i + 1}";
            cards.Add(new GaugeMetric(
                Math.Clamp(percent, 0, 100),
                AppLanguageService.GetString("Hardware.Rendering"),
                HardwareQueryHelpers.Truncate(gpuNames[i], 34),
                pickColor(i),
                title));
        }

        if (cards.Count == 0)
        {
            cards.Add(new GaugeMetric(0, "N/A", AppLanguageService.GetString("Hardware.UnknownGpu"), pickColor(0), "GPU"));
        }

        return cards;
    }

    private static Dictionary<int, double> GetGpuUsageByPhysicalIndex()
    {
        var usage = new Dictionary<int, double>();
        var regex = new Regex(@"phys_(\d+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        try
        {
            using var searcher = new ManagementObjectSearcher(
                @"root\CIMV2",
                "SELECT Name, UtilizationPercentage FROM Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine");
            using var results = searcher.Get();

            foreach (ManagementBaseObject item in results)
            {
                var name = item["Name"]?.ToString();
                if (string.IsNullOrWhiteSpace(name) ||
                    !name.Contains("engtype_3D", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var match = regex.Match(name);
                var index = match.Success && int.TryParse(match.Groups[1].Value, out var parsedIndex)
                    ? parsedIndex
                    : 0;

                var value = HardwareQueryHelpers.ToDouble(item["UtilizationPercentage"]);
                if (!usage.TryAdd(index, value))
                {
                    usage[index] += value;
                }
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        foreach (var key in usage.Keys.ToList())
        {
            usage[key] = Math.Clamp(usage[key], 0, 100);
        }

        return usage;
    }
}
