using System.Collections.Generic;

namespace WinstallerHubApp.Services;

public sealed class DashboardSnapshot
{
    public string OsTitle { get; init; } = "Windows";
    public string OsSubtitle { get; init; } = AppLanguageService.GetString("Dashboard.BuildNA");
    public GaugeMetric Cpu { get; init; } = new(0, "N/A", "N/A", "#2FC16D");
    public GaugeMetric Ram { get; init; } = new(0, "N/A", "N/A", "#4486F5");
    public List<GaugeMetric> GpuCards { get; init; } = new();
    public List<GaugeMetric> DiskCards { get; init; } = new();
    public List<NetworkMetric> NetworkCards { get; init; } = new();
    public List<SystemDetailPanel> DetailPanels { get; init; } = new();
}

public sealed record GaugeMetric(
    double Percent,
    string Value,
    string Subtitle,
    string ColorHex,
    string Title = "Metric");

public sealed record NetworkMetric(
    string Title,
    string Value,
    string Subtitle,
    string Detail,
    string StatusColorHex);

public sealed record SystemDetailPanel(
    string Title,
    string IconGlyph,
    List<SystemDetailItem> Items);

public sealed record SystemDetailItem(
    string Label,
    string Value);
