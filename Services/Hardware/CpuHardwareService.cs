using System;
using System.Management;

namespace WinstallerHubApp.Services;

internal sealed class CpuHardwareService
{
    internal string GetCpuInfo()
    {
        return HardwareQueryHelpers.QuerySingle(
            "SELECT Name FROM Win32_Processor",
            item => item["Name"]?.ToString(),
            AppLanguageService.GetString("Hardware.UnknownCpu"));
    }

    internal double GetCpuUsagePercent()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher(
                "SELECT PercentProcessorTime FROM Win32_PerfFormattedData_PerfOS_Processor WHERE Name='_Total'");
            using var results = searcher.Get();

            foreach (ManagementBaseObject item in results)
            {
                return Math.Clamp(HardwareQueryHelpers.ToDouble(item["PercentProcessorTime"]), 0, 100);
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        return 0;
    }

    internal double GetCpuFrequencyGHz()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT CurrentClockSpeed FROM Win32_Processor");
            using var results = searcher.Get();

            foreach (ManagementBaseObject item in results)
            {
                var mhz = HardwareQueryHelpers.ToDouble(item["CurrentClockSpeed"]);
                if (mhz > 0)
                {
                    return mhz / 1000.0;
                }
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        return 0;
    }
}
