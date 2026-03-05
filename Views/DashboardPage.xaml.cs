using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Animation;
using WinstallerHubApp.Services;

namespace WinstallerHubApp.Views;

public partial class DashboardPage : Page
{
    private static readonly Duration LoadingFadeDuration = new(TimeSpan.FromMilliseconds(150));
    private bool _initialLoadCompleted;

    public DashboardPage()
    {
        InitializeComponent();
        Loaded += DashboardPage_Loaded;
        Unloaded += DashboardPage_Unloaded;
    }

    private async void DashboardPage_Loaded(object sender, RoutedEventArgs e)
    {
        AppLanguageService.LanguageChanged += AppLanguageService_LanguageChanged;
        DashboardSnapshotCacheService.SnapshotUpdated += DashboardSnapshotCacheService_SnapshotUpdated;
        DashboardSnapshotCacheService.SnapshotRefreshFailed += DashboardSnapshotCacheService_SnapshotRefreshFailed;
        UpdateLocalizedStaticText();

        if (DashboardSnapshotCacheService.TryGetLatestSnapshot(out var cachedSnapshot))
        {
            ApplySnapshot(cachedSnapshot);
            _initialLoadCompleted = true;
            SetInitialLoadingState(false);
        }
        else
        {
            SetInitialLoadingState(true);
        }

        await DashboardSnapshotCacheService.RefreshNowAsync();
    }

    private void DashboardPage_Unloaded(object sender, RoutedEventArgs e)
    {
        AppLanguageService.LanguageChanged -= AppLanguageService_LanguageChanged;
        DashboardSnapshotCacheService.SnapshotUpdated -= DashboardSnapshotCacheService_SnapshotUpdated;
        DashboardSnapshotCacheService.SnapshotRefreshFailed -= DashboardSnapshotCacheService_SnapshotRefreshFailed;
    }

    private void AppLanguageService_LanguageChanged(string _)
    {
        Dispatcher.InvokeAsync(async () =>
        {
            UpdateLocalizedStaticText();
            await DashboardSnapshotCacheService.RefreshNowAsync();
        });
    }

    private void UpdateLocalizedStaticText()
    {
        SystemInfoHeaderTextBlock.Text = AppLanguageService.GetString("Dashboard.SystemInfo.Header");
        LoadingStatusTextBlock.Text = AppLanguageService.GetString("Dashboard.Loading.Hardware");
    }

    private void DashboardSnapshotCacheService_SnapshotUpdated(DashboardSnapshot snapshot)
    {
        Dispatcher.Invoke(() =>
        {
            ApplySnapshot(snapshot);
            if (_initialLoadCompleted)
            {
                return;
            }

            _initialLoadCompleted = true;
            SetInitialLoadingState(false);
        });
    }

    private void DashboardSnapshotCacheService_SnapshotRefreshFailed(string message)
    {
        Dispatcher.Invoke(() =>
        {
            if (_initialLoadCompleted)
            {
                return;
            }

            ApplyErrorState(message);
            _initialLoadCompleted = true;
            SetInitialLoadingState(false);
        });
    }

    private void SetInitialLoadingState(bool isLoading)
    {
        InitialLoadingOverlay.BeginAnimation(OpacityProperty, null);

        if (isLoading)
        {
            InitialLoadingOverlay.Visibility = Visibility.Visible;
            InitialLoadingOverlay.Opacity = 0;

            var fadeIn = new DoubleAnimation
            {
                To = 1,
                Duration = LoadingFadeDuration,
                EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
            };

            InitialLoadingOverlay.BeginAnimation(OpacityProperty, fadeIn);
            return;
        }

        if (InitialLoadingOverlay.Visibility != Visibility.Visible)
        {
            InitialLoadingOverlay.Visibility = Visibility.Collapsed;
            InitialLoadingOverlay.Opacity = 1;
            return;
        }

        var fadeOut = new DoubleAnimation
        {
            To = 0,
            Duration = LoadingFadeDuration,
            EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseIn }
        };

        fadeOut.Completed += (_, _) =>
        {
            InitialLoadingOverlay.Visibility = Visibility.Collapsed;
            InitialLoadingOverlay.Opacity = 1;
        };

        InitialLoadingOverlay.BeginAnimation(OpacityProperty, fadeOut);
    }

    private void ApplySnapshot(DashboardSnapshot snapshot)
    {
        var cards = new List<DashboardCardViewModel>
        {
            new OsCardViewModel
            {
                Title = snapshot.OsTitle,
                Subtitle = snapshot.OsSubtitle
            },
            ToGaugeCardViewModel(snapshot.Cpu),
            ToGaugeCardViewModel(snapshot.Ram)
        };

        cards.AddRange(snapshot.GpuCards.Select(ToGaugeCardViewModel));
        cards.AddRange(snapshot.DiskCards.Select(ToGaugeCardViewModel));
        cards.AddRange(snapshot.NetworkCards.Select(ToNetworkCardViewModel));

        AllCardsItemsControl.ItemsSource = cards;
        var detailPanels = snapshot.DetailPanels
            .Select(ToSystemDetailPanelViewModel)
            .ToList();
        BindSystemDetailPanels(detailPanels);
    }

    private static GaugeCardViewModel ToGaugeCardViewModel(GaugeMetric metric)
    {
        var percent = Math.Clamp(metric.Percent, 0, 100);
        return new GaugeCardViewModel
        {
            Title = metric.Title,
            PercentText = $"{percent:0}%",
            Value = metric.Value,
            Subtitle = metric.Subtitle,
            ArcPoints = BuildArcPoints(percent),
            StrokeBrush = CreateBrush(metric.ColorHex)
        };
    }

    private static NetworkCardViewModel ToNetworkCardViewModel(NetworkMetric metric)
    {
        return new NetworkCardViewModel
        {
            Title = metric.Title,
            Value = metric.Value,
            Subtitle = metric.Subtitle,
            Detail = metric.Detail,
            StatusBrush = CreateBrush(metric.StatusColorHex)
        };
    }

    private static SystemDetailPanelViewModel ToSystemDetailPanelViewModel(SystemDetailPanel panel)
    {
        return new SystemDetailPanelViewModel
        {
            Title = panel.Title,
            IconGlyph = panel.IconGlyph,
            Items = panel.Items
                .Select(i => new SystemDetailItemViewModel
                {
                    Label = i.Label,
                    Value = i.Value
                })
                .ToList()
        };
    }

    private void BindSystemDetailPanels(List<SystemDetailPanelViewModel> panels)
    {
        SystemDetailsLeftItemsControl.ItemsSource = panels
            .Where((_, index) => index % 2 == 0)
            .ToList();
        SystemDetailsRightItemsControl.ItemsSource = panels
            .Where((_, index) => index % 2 == 1)
            .ToList();
    }

    private static PointCollection BuildArcPoints(double percent)
    {
        var points = new PointCollection();
        var normalized = Math.Clamp(percent, 0, 100);
        if (normalized <= 0)
        {
            return points;
        }

        const double centerX = 62;
        const double centerY = 72;
        const double radius = 50;

        var sweepDegrees = 180.0 * (normalized / 100.0);
        var segments = Math.Max(2, (int)Math.Ceiling(sweepDegrees / 4.0));

        for (var i = 0; i <= segments; i++)
        {
            var angle = 180.0 - (sweepDegrees * i / segments);
            var radians = angle * Math.PI / 180.0;

            var x = centerX + radius * Math.Cos(radians);
            var y = centerY - radius * Math.Sin(radians);
            points.Add(new Point(x, y));
        }

        return points;
    }

    private static SolidColorBrush CreateBrush(string colorHex)
    {
        if (string.IsNullOrWhiteSpace(colorHex))
        {
            return new SolidColorBrush((Color)ColorConverter.ConvertFromString("#9CA3AF"));
        }

        var converted = ColorConverter.ConvertFromString(colorHex);
        if (converted is Color color)
        {
            return new SolidColorBrush(color);
        }

        return new SolidColorBrush((Color)ColorConverter.ConvertFromString("#9CA3AF"));
    }

    private void ApplyErrorState(string message)
    {
        AllCardsItemsControl.ItemsSource = new List<DashboardCardViewModel>
        {
            new OsCardViewModel
            {
                Title = AppLanguageService.GetString("Dashboard.Error.UnableLoad"),
                Subtitle = message
            },
            ToGaugeCardViewModel(new GaugeMetric(0, "N/A", AppLanguageService.GetString("Dashboard.Error.NoCpuData"), "#9CA3AF", "CPU")),
            ToGaugeCardViewModel(new GaugeMetric(0, "N/A", AppLanguageService.GetString("Dashboard.Error.NoRamData"), "#9CA3AF", "RAM")),
            ToGaugeCardViewModel(new GaugeMetric(0, "N/A", AppLanguageService.GetString("Dashboard.Error.NoGpuData"), "#9CA3AF", "GPU")),
            ToGaugeCardViewModel(new GaugeMetric(0, "N/A", AppLanguageService.GetString("Dashboard.Error.NoDiskData"), "#9CA3AF", AppLanguageService.GetString("Dashboard.Disk"))),
            ToNetworkCardViewModel(new NetworkMetric(
                AppLanguageService.GetString("Dashboard.Network"),
                "N/A",
                AppLanguageService.GetString("Dashboard.NoConnectedAdapter"),
                AppLanguageService.GetString("Dashboard.NoIpv4"),
                "#9CA3AF"))
        };

        BindSystemDetailPanels(new List<SystemDetailPanelViewModel>
        {
            new()
            {
                Title = AppLanguageService.GetString("Dashboard.SystemInfo.Title"),
                IconGlyph = "\uE946",
                Items = new List<SystemDetailItemViewModel>
                {
                    new() { Label = AppLanguageService.GetString("Dashboard.Status"), Value = message }
                }
            }
        });
    }
}

public abstract class DashboardCardViewModel;

public sealed class OsCardViewModel : DashboardCardViewModel
{
    public string Title { get; init; } = "Windows";
    public string Subtitle { get; init; } = AppLanguageService.GetString("Dashboard.BuildNA");
}

public sealed class GaugeCardViewModel : DashboardCardViewModel
{
    public string Title { get; init; } = AppLanguageService.GetString("Dashboard.Metric");
    public string PercentText { get; init; } = "0%";
    public string Value { get; init; } = "N/A";
    public string Subtitle { get; init; } = "N/A";
    public PointCollection ArcPoints { get; init; } = new();
    public SolidColorBrush StrokeBrush { get; init; } = new((Color)ColorConverter.ConvertFromString("#9CA3AF"));
}

public sealed class NetworkCardViewModel : DashboardCardViewModel
{
    public string Title { get; init; } = AppLanguageService.GetString("Dashboard.Network");
    public string Value { get; init; } = "N/A";
    public string Subtitle { get; init; } = "N/A";
    public string Detail { get; init; } = AppLanguageService.GetString("Dashboard.NoIpv4");
    public SolidColorBrush StatusBrush { get; init; } = new((Color)ColorConverter.ConvertFromString("#9CA3AF"));
}

public sealed class SystemDetailPanelViewModel
{
    public string Title { get; init; } = AppLanguageService.GetString("Dashboard.SystemInfo.Title");
    public string IconGlyph { get; init; } = "\uE946";
    public List<SystemDetailItemViewModel> Items { get; init; } = new();
}

public sealed class SystemDetailItemViewModel
{
    public string Label { get; init; } = "Label";
    public string Value { get; init; } = "N/A";
}
