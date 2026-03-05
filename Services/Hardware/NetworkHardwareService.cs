using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.NetworkInformation;
using System.Net.Sockets;

namespace WinstallerHubApp.Services;

internal sealed class NetworkHardwareService
{
    internal List<string> GetNetworkAdapters()
    {
        return HardwareQueryHelpers.QueryMany(
            "SELECT Name FROM Win32_NetworkAdapter WHERE NetEnabled=TRUE",
            item => item["Name"]?.ToString(),
            AppLanguageService.GetString("Network.NoActive"));
    }

    internal List<NetworkMetric> GetNetworkCards()
    {
        var cards = new List<NetworkMetric>();
        var interfaces = NetworkInterface.GetAllNetworkInterfaces()
            .Where(i => i.NetworkInterfaceType != NetworkInterfaceType.Loopback &&
                        i.NetworkInterfaceType != NetworkInterfaceType.Tunnel &&
                        i.OperationalStatus == OperationalStatus.Up)
            .OrderBy(i => i.Name)
            .ToList();

        foreach (var nic in interfaces)
        {
            var status = nic.OperationalStatus == OperationalStatus.Up
                ? AppLanguageService.GetString("Network.Connected")
                : AppLanguageService.GetString("Network.Disconnected");
            var statusColor = nic.OperationalStatus == OperationalStatus.Up ? "#2FC16D" : "#9CA3AF";
            var speedText = FormatNetworkSpeed(nic.Speed);
            var typeText = nic.NetworkInterfaceType.ToString();
            var ipText = GetIpv4Address(nic);

            cards.Add(new NetworkMetric(
                HardwareQueryHelpers.Truncate(nic.Name, 32),
                speedText,
                $"{typeText} - {status}",
                ipText,
                statusColor));
        }

        if (cards.Count == 0)
        {
            cards.Add(new NetworkMetric(
                AppLanguageService.GetString("Dashboard.Network"),
                "N/A",
                AppLanguageService.GetString("Network.NoConnectedAdapter"),
                AppLanguageService.GetString("Network.NoIpv4"),
                "#9CA3AF"));
        }

        return cards;
    }

    private static string GetIpv4Address(NetworkInterface nic)
    {
        try
        {
            var ip = nic.GetIPProperties()
                .UnicastAddresses
                .FirstOrDefault(a => a.Address.AddressFamily == AddressFamily.InterNetwork)?
                .Address
                .ToString();

            return string.IsNullOrWhiteSpace(ip)
                ? AppLanguageService.GetString("Network.NoIpv4")
                : $"IPv4: {ip}";
        }
        catch
        {
            return AppLanguageService.GetString("Network.NoIpv4");
        }
    }

    private static string FormatNetworkSpeed(long bitsPerSecond)
    {
        if (bitsPerSecond <= 0)
        {
            return AppLanguageService.GetString("Network.SpeedUnknown");
        }

        var mbps = bitsPerSecond / 1_000_000d;
        if (mbps >= 1000)
        {
            return $"{mbps / 1000d:0.0} Gbps";
        }

        return $"{mbps:0} Mbps";
    }
}
