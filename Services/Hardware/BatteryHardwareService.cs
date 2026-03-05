using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Management;

namespace WinstallerHubApp.Services;

internal sealed class BatteryHardwareService
{
    internal List<SystemDetailPanel> GetBatteryPanels()
    {
        var batteries = GetBatterySnapshots();
        if (batteries.Count == 0)
        {
            return new List<SystemDetailPanel>
            {
                new(
                    T("Battery.Panel.Title"),
                    "\uE850",
                    new List<SystemDetailItem>
                    {
                        new(T("Battery.Label.Type"), T("Battery.Panel.Title")),
                        new(T("Battery.Label.Status"), T("Battery.NoBatteryDetected")),
                        new(T("Battery.Label.Level"), "N/A"),
                        new(T("Battery.Label.CycleCount"), "N/A"),
                        new(T("Battery.Label.DesignCapacity"), "N/A"),
                        new(T("Battery.Label.FullChargeCapacity"), "N/A"),
                        new(T("Battery.Label.WearLevel"), "N/A")
                    })
            };
        }

        var cycleCounts = QueryBatteryMetricValues(
            "SELECT InstanceName, Tag, CycleCount FROM BatteryCycleCount",
            "CycleCount",
            @"root\WMI");
        var designCapacities = QueryBatteryMetricValues(
            "SELECT InstanceName, Tag, DesignedCapacity FROM BatteryStaticData",
            "DesignedCapacity",
            @"root\WMI");
        var fullChargeCapacities = QueryBatteryMetricValues(
            "SELECT InstanceName, Tag, FullChargedCapacity FROM BatteryFullChargedCapacity",
            "FullChargedCapacity",
            @"root\WMI");

        var panels = new List<SystemDetailPanel>();
        for (var i = 0; i < batteries.Count; i++)
        {
            var battery = batteries[i];
            var cycleCount = i < cycleCounts.Count ? cycleCounts[i] : 0;
            var designCapacity = i < designCapacities.Count ? designCapacities[i] : 0;
            var fullChargeCapacity = i < fullChargeCapacities.Count ? fullChargeCapacities[i] : 0;

            var wearLevel = designCapacity > 0 && fullChargeCapacity > 0
                ? $"{Math.Clamp((designCapacity - fullChargeCapacity) / designCapacity * 100.0, 0, 100):0}%"
                : "N/A";

            var panelTitle = batteries.Count == 1
                ? T("Battery.Panel.Title")
                : AppLanguageService.Format("Battery.Panel.TitleIndexed", i + 1);
            panels.Add(new SystemDetailPanel(
                panelTitle,
                "\uE850",
                new List<SystemDetailItem>
                {
                    new(T("Battery.Label.Type"), T("Battery.Panel.Title")),
                    new(T("Battery.Label.Name"), battery.Name),
                    new(T("Battery.Label.Status"), battery.Status),
                    new(T("Battery.Label.Level"), battery.Level),
                    new(T("Battery.Label.CycleCount"), cycleCount > 0 ? $"{cycleCount:0}" : "N/A"),
                    new(T("Battery.Label.DesignCapacity"), FormatCapacity(designCapacity)),
                    new(T("Battery.Label.FullChargeCapacity"), FormatCapacity(fullChargeCapacity)),
                    new(T("Battery.Label.WearLevel"), wearLevel)
                }));
        }

        return panels;
    }

    private static List<BatterySnapshot> GetBatterySnapshots()
    {
        var batteries = new List<BatterySnapshot>();

        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT Name, BatteryStatus, EstimatedChargeRemaining, DeviceID FROM Win32_Battery");
            using var results = searcher.Get();

            foreach (ManagementBaseObject item in results)
            {
                var name = HardwareQueryHelpers.ToSafeText(item["Name"], T("Battery.Name"));
                var status = MapBatteryStatus(HardwareQueryHelpers.ToDouble(item["BatteryStatus"]));
                var level = $"{Math.Clamp(HardwareQueryHelpers.ToDouble(item["EstimatedChargeRemaining"]), 0, 100):0}%";
                var deviceId = HardwareQueryHelpers.ToSafeText(item["DeviceID"], string.Empty);

                batteries.Add(new BatterySnapshot(name, status, level, deviceId));
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        return batteries
            .OrderBy(b => b.DeviceId, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static List<double> QueryBatteryMetricValues(string query, string propertyName, string scope)
    {
        var values = new List<(string SortKey, double Value)>();

        try
        {
            using var searcher = new ManagementObjectSearcher(scope, query);
            using var results = searcher.Get();

            var index = 0;
            foreach (ManagementBaseObject item in results)
            {
                var sortKey = HardwareQueryHelpers.ToSafeText(item["InstanceName"], string.Empty);
                if (string.IsNullOrWhiteSpace(sortKey))
                {
                    sortKey = HardwareQueryHelpers.ToSafeText(item["Tag"], string.Empty);
                }

                if (string.IsNullOrWhiteSpace(sortKey))
                {
                    sortKey = index.ToString(CultureInfo.InvariantCulture);
                }

                values.Add((sortKey, HardwareQueryHelpers.ToDouble(item[propertyName])));
                index++;
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        return values
            .OrderBy(v => v.SortKey, StringComparer.OrdinalIgnoreCase)
            .Select(v => v.Value)
            .ToList();
    }

    private static string MapBatteryStatus(double statusCode)
    {
        return statusCode switch
        {
            1 => T("Battery.Status.Discharging"),
            2 => T("Battery.Status.ChargingAc"),
            3 => T("Battery.Status.FullyCharged"),
            4 => T("Battery.Status.Low"),
            5 => T("Battery.Status.Critical"),
            6 => T("Battery.Status.Charging"),
            7 => T("Battery.Status.ChargingHigh"),
            8 => T("Battery.Status.ChargingLow"),
            9 => T("Battery.Status.ChargingCritical"),
            10 => T("Battery.Status.Undefined"),
            11 => T("Battery.Status.PartiallyCharged"),
            _ => T("Common.Unknown")
        };
    }

    private static string FormatCapacity(double milliWattHours)
    {
        return milliWattHours > 0
            ? $"{milliWattHours:0,0} mWh"
            : "N/A";
    }

    private static string T(string key)
    {
        return AppLanguageService.GetString(key);
    }

    private readonly record struct BatterySnapshot(string Name, string Status, string Level, string DeviceId);
}
