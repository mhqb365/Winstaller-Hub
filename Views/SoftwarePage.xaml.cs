using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using WinstallerHubApp.Services;

namespace WinstallerHubApp.Views;

public partial class SoftwarePage : Page
{
    private readonly WingetService _wingetService = new();
    private List<InstalledAppViewModel> _installedApps = [];
    private IReadOnlyList<WingetTrendingApp> _trendingApps = Array.Empty<WingetTrendingApp>();
    private List<WingetSearchPackage> _wingetSearchResults = [];
    private bool _isSearchMode;

    private WingetStatus _wingetStatus = new(false, false, string.Empty);

    public SoftwarePage()
    {
        InitializeComponent();
        Loaded += SoftwarePage_Loaded;
        Unloaded += SoftwarePage_Unloaded;
    }

    private async void SoftwarePage_Loaded(object sender, RoutedEventArgs e)
    {
        AppLanguageService.LanguageChanged += AppLanguageService_LanguageChanged;
        AppInstallJobService.JobsChanged += AppInstallJobService_JobsChanged;
        AppInstallJobService.JobCompleted += AppInstallJobService_JobCompleted;
        _trendingApps = _wingetService.GetTrendingApps();
        _isSearchMode = false;

        UpdateLocalizedText();
        RenderTrendingApps(preserveStatusText: false);
        RenderWingetSearchResults(preserveStatusText: false);

        await RefreshWingetStatusAsync();
        await RefreshInstalledAppsAsync();
    }

    private void SoftwarePage_Unloaded(object sender, RoutedEventArgs e)
    {
        AppLanguageService.LanguageChanged -= AppLanguageService_LanguageChanged;
        AppInstallJobService.JobsChanged -= AppInstallJobService_JobsChanged;
        AppInstallJobService.JobCompleted -= AppInstallJobService_JobCompleted;
    }

    private void AppLanguageService_LanguageChanged(string _)
    {
        Dispatcher.Invoke(() =>
        {
            UpdateLocalizedText();
            UpdateWingetStatusUi();
            RenderTrendingApps(preserveStatusText: false);
            RenderWingetSearchResults(preserveStatusText: false);
            ApplyInstalledAppsFilter();
        });
    }

    private void AppInstallJobService_JobsChanged(IReadOnlyList<AppInstallJobSnapshot> _)
    {
        Dispatcher.Invoke(() =>
        {
            UpdateWingetStatusUi();
            RenderTrendingApps();
            RenderWingetSearchResults();
        });
    }

    private void AppInstallJobService_JobCompleted(AppInstallJobSnapshot job)
    {
        _ = Dispatcher.InvokeAsync(async () =>
        {
            if (job.JobType == AppInstallJobType.WingetInstall || job.JobType == AppInstallJobType.WingetUninstall)
            {
                await RefreshWingetStatusAsync();
            }

            if (job.State == AppInstallJobState.Succeeded)
            {
                TrendingStatusTextBlock.Text = AppLanguageService.Format(
                    "Software.Trending.Status.InstallSuccessFormat",
                    job.DisplayName);
                await RefreshInstalledAppsAsync();
            }
            else if (job.State == AppInstallJobState.Failed)
            {
                var detail = string.IsNullOrWhiteSpace(job.Detail)
                    ? AppLanguageService.GetString("Software.Common.UnknownError")
                    : job.Detail;

                TrendingStatusTextBlock.Text = AppLanguageService.Format(
                    "Software.Trending.Status.InstallFailedFormat",
                    job.DisplayName,
                    detail);
            }

            RenderTrendingApps();
            RenderWingetSearchResults();
        });
    }

    private void UpdateLocalizedText()
    {
        PageTitleTextBlock.Text = AppLanguageService.GetString("Software.Title");
        PageDescriptionTextBlock.Text = AppLanguageService.GetString("Software.Description");

        WingetTitleTextBlock.Text = AppLanguageService.GetString("Software.Winget.Title");
        WingetDescriptionTextBlock.Text = AppLanguageService.GetString("Software.Winget.Description");

        TrendingTitleTextBlock.Text = AppLanguageService.GetString("Software.Trending.Title");
        TrendingDescriptionTextBlock.Text = AppLanguageService.GetString("Software.Trending.Description");
        ManageInstallJobsButton.Content = AppLanguageService.GetString("Software.InstallJobs.Button.Manage");

        WingetSearchTitleTextBlock.Text = AppLanguageService.GetString("Software.Search.Title");
        WingetSearchDescriptionTextBlock.Text = AppLanguageService.GetString("Software.Search.Description");
        WingetSearchLabelTextBlock.Text = AppLanguageService.GetString("Software.Search.SearchLabel");
        WingetSearchButton.Content = AppLanguageService.GetString("Software.Search.Button.Search");

        InstalledTitleTextBlock.Text = AppLanguageService.GetString("Software.Installed.Title");
        InstalledDescriptionTextBlock.Text = AppLanguageService.GetString("Software.Installed.Description");
        InstalledSearchLabelTextBlock.Text = AppLanguageService.GetString("Software.Installed.SearchLabel");

        RefreshWingetStatusButton.Content = AppLanguageService.GetString("Software.Common.Refresh");
        RefreshInstalledAppsButton.Content = AppLanguageService.GetString("Software.Common.Refresh");

        InstalledActionColumn.Header = AppLanguageService.GetString("Software.Installed.Column.Action");
        InstalledNameColumn.Header = AppLanguageService.GetString("Software.Installed.Column.Name");
        InstalledPublisherColumn.Header = AppLanguageService.GetString("Software.Installed.Column.Publisher");
        InstalledVersionColumn.Header = AppLanguageService.GetString("Software.Installed.Column.Version");

        RemoveWingetButton.Content = AppLanguageService.GetString("Software.Winget.Button.Remove");
        if (string.IsNullOrWhiteSpace(RemoveWingetButton.Content?.ToString()))
        {
            RemoveWingetButton.Content = "Remove"; // Fallback if missing
        }
    }

    private async Task RefreshWingetStatusAsync()
    {
        RefreshWingetStatusButton.IsEnabled = false;
        InstallWingetButton.IsEnabled = false;
        RemoveWingetButton.IsEnabled = false;
        
        var originalButtonContent = InstallWingetButton.Content;
        InstallWingetButton.Content = "...";

        WingetStatusTextBlock.Text = AppLanguageService.GetString("Software.Winget.Status.Checking");
        WingetStatusTextBlock.Foreground = GetBrush("#F3F8FF");
        WingetVersionTextBlock.Text = string.Empty;

        try
        {
            _wingetStatus = await _wingetService.GetWingetStatusAsync();
        }
        catch (Exception ex)
        {
            _wingetStatus = new WingetStatus(false, false, string.Empty);
            WingetStatusTextBlock.Text = AppLanguageService.Format("Software.Common.ErrorFormat", ex.Message);
            WingetStatusTextBlock.Foreground = GetBrush("#FF8A80");
        }
        finally
        {
            RefreshWingetStatusButton.IsEnabled = true;
            UpdateWingetStatusUi();
            RenderTrendingApps(preserveStatusText: false);
            RenderWingetSearchResults(preserveStatusText: false);
        }
    }
    private void UpdateWingetStatusUi()
    {
        var versionText = string.IsNullOrWhiteSpace(_wingetStatus.Version)
            ? string.Empty
            : AppLanguageService.Format("Software.Winget.Status.VersionFormat", _wingetStatus.Version);

        if (!string.IsNullOrWhiteSpace(_wingetStatus.LatestVersion))
        {
            var latestInfo = AppLanguageService.Format("Software.Winget.Status.LatestVersionFormat", _wingetStatus.LatestVersion);
            versionText = string.IsNullOrWhiteSpace(versionText) 
                ? latestInfo 
                : $"{versionText} | {latestInfo}";
        }

        bool isWingetInstalling = AppInstallJobService.IsPackageBusy("__WINGET_INSTALL__");
        bool isWingetRemoving = AppInstallJobService.IsPackageBusy("__WINGET_UNINSTALL__");
        bool isBusy = isWingetInstalling || isWingetRemoving;

        if (_wingetStatus.IsReady)
        {
            if (_wingetStatus.IsOutdated)
            {
                WingetStatusTextBlock.Text = isWingetInstalling 
                    ? AppLanguageService.GetString("Software.Winget.Button.Installing")
                    : AppLanguageService.GetString("Software.Winget.Status.Outdated");
                
                WingetStatusTextBlock.Foreground = GetBrush("#FFB300"); // Yellow warning
                WingetVersionTextBlock.Text = versionText;

                InstallWingetButton.Visibility = Visibility.Visible;
                InstallWingetButton.IsEnabled = !isBusy;
                InstallWingetButton.Content = AppLanguageService.GetString("Software.Winget.Button.Update");

                RemoveWingetButton.Visibility = Visibility.Visible;
                RemoveWingetButton.IsEnabled = !isBusy;
                return;
            }

            WingetStatusTextBlock.Text = isWingetRemoving 
                ? AppLanguageService.GetString("Software.InstallJobs.State.Uninstalling")
                : AppLanguageService.GetString("Software.Winget.Status.Ready");
                
            WingetStatusTextBlock.Foreground = GetBrush("#2FC16D"); // Green
            WingetVersionTextBlock.Text = versionText;

            InstallWingetButton.Visibility = Visibility.Collapsed;
            InstallWingetButton.IsEnabled = false;

            RemoveWingetButton.Visibility = Visibility.Visible;
            RemoveWingetButton.IsEnabled = !isBusy;
            return;
        }

        WingetStatusTextBlock.Text = isWingetInstalling 
            ? AppLanguageService.GetString("Software.Winget.Button.Installing")
            : (_wingetStatus.DesktopAppInstallerInstalled
                ? AppLanguageService.GetString("Software.Winget.Status.RepairNeeded")
                : AppLanguageService.GetString("Software.Winget.Status.NotInstalled"));
        
        WingetStatusTextBlock.Foreground = GetBrush("#FFB300");
        WingetVersionTextBlock.Text = versionText;

        InstallWingetButton.Visibility = Visibility.Visible;
        InstallWingetButton.IsEnabled = !isBusy;
        InstallWingetButton.Content = _wingetStatus.DesktopAppInstallerInstalled
            ? AppLanguageService.GetString("Software.Winget.Button.Repair")
            : AppLanguageService.GetString("Software.Winget.Button.Install");

        RemoveWingetButton.Visibility = _wingetStatus.DesktopAppInstallerInstalled 
            ? Visibility.Visible 
            : Visibility.Collapsed;
        RemoveWingetButton.IsEnabled = !isBusy;
    }

    private async Task RefreshInstalledAppsAsync()
    {
        RefreshInstalledAppsButton.IsEnabled = false;
        InstalledStatusTextBlock.Text = AppLanguageService.GetString("Software.Installed.Status.Loading");

        try
        {
            var apps = await _wingetService.GetInstalledApplicationsAsync();
            var uninstallText = AppLanguageService.GetString("Software.Installed.Button.Uninstall");
            
            _installedApps = apps.Select(a => new InstalledAppViewModel(
                a.Name,
                a.Publisher,
                a.Version,
                uninstallText)).ToList();

            InstalledStatusTextBlock.Text = AppLanguageService.Format("Software.Installed.Status.CountFormat", _installedApps.Count);
        }
        catch (Exception ex)
        {
            _installedApps = [];
            InstalledStatusTextBlock.Text = AppLanguageService.Format("Software.Common.ErrorFormat", ex.Message);
        }
        finally
        {
            RefreshInstalledAppsButton.IsEnabled = true;
            ApplyInstalledAppsFilter();
            RenderTrendingApps();
            RenderWingetSearchResults();
        }
    }

    private void ApplyInstalledAppsFilter()
    {
        var keyword = InstalledSearchTextBox.Text?.Trim() ?? string.Empty;
        var filtered = string.IsNullOrWhiteSpace(keyword)
            ? _installedApps
            : _installedApps.Where(a =>
                    a.Name.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                    a.Publisher.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                .ToList();

        InstalledAppsListView.ItemsSource = filtered;
        InstalledEmptyTextBlock.Text = AppLanguageService.GetString("Software.Installed.Empty");
        InstalledEmptyTextBlock.Visibility = filtered.Count == 0
            ? Visibility.Visible
            : Visibility.Collapsed;
    }

    private void RenderTrendingApps(bool preserveStatusText = true)
    {
        var installText = AppLanguageService.GetString("Software.Trending.Button.Install");
        var installingText = AppLanguageService.GetString("Software.Trending.Button.Installing");
        var installedText = AppLanguageService.GetString("Software.Trending.Button.Installed");

        var canInstall = _wingetStatus.IsReady;
        var items = _trendingApps
            .Select(app =>
            {
                var isInstalled = IsTrendingAppInstalled(app);
                var isInstalling = !isInstalled && AppInstallJobService.IsPackageBusy(app.Id);
                var buttonText = isInstalled
                    ? installedText
                    : isInstalling
                        ? installingText
                        : installText;

                return new TrendingAppViewModel(
                    app.Id,
                    app.Name,
                    app.Description,
                    buttonText,
                    canInstall && !isInstalling && !isInstalled);
            })
            .ToList();

        TrendingAppsItemsControl.ItemsSource = items;

        if (!canInstall)
        {
            TrendingStatusTextBlock.Text = AppLanguageService.GetString("Software.Trending.Status.WingetRequired");
            return;
        }

        if (!preserveStatusText || string.IsNullOrWhiteSpace(TrendingStatusTextBlock.Text))
        {
            TrendingStatusTextBlock.Text = AppLanguageService.GetString("Software.Trending.Status.Ready");
        }
    }

    private void RenderWingetSearchResults(bool preserveStatusText = true)
    {
        UpdateSearchModeSectionVisibility();

        if (!_isSearchMode)
        {
            WingetSearchItemsControl.ItemsSource = Array.Empty<WingetSearchViewModel>();
            WingetSearchEmptyTextBlock.Visibility = Visibility.Collapsed;
            return;
        }

        var installText = AppLanguageService.GetString("Software.Trending.Button.Install");
        var installingText = AppLanguageService.GetString("Software.Trending.Button.Installing");
        var installedText = AppLanguageService.GetString("Software.Trending.Button.Installed");
        var versionFormat = AppLanguageService.GetString("Software.Search.Result.VersionFormat");

        var canInstall = _wingetStatus.IsReady;
        var items = _wingetSearchResults
            .Select(app =>
            {
                var isInstalled = IsPackageInstalledByName(app.Name);
                var isInstalling = !isInstalled && AppInstallJobService.IsPackageBusy(app.Id);
                var buttonText = isInstalled
                    ? installedText
                    : isInstalling
                        ? installingText
                        : installText;

                var version = string.IsNullOrWhiteSpace(app.Version) ? "-" : app.Version;
                var versionText = string.Format(versionFormat, version);

                return new WingetSearchViewModel(
                    app.Id,
                    app.Name,
                    versionText,
                    buttonText,
                    canInstall && !isInstalling && !isInstalled);
            })
            .ToList();

        WingetSearchItemsControl.ItemsSource = items;

        WingetSearchEmptyTextBlock.Text = AppLanguageService.GetString("Software.Search.Empty");
        var hasQuery = !string.IsNullOrWhiteSpace(WingetSearchTextBox.Text);
        WingetSearchEmptyTextBlock.Visibility = hasQuery && items.Count == 0
            ? Visibility.Visible
            : Visibility.Collapsed;

        if (!preserveStatusText || string.IsNullOrWhiteSpace(WingetSearchStatusTextBlock.Text))
        {
            UpdateWingetSearchStatus();
        }
    }

    private void UpdateSearchModeSectionVisibility()
    {
        SearchResultsSectionPanel.Visibility = _isSearchMode
            ? Visibility.Visible
            : Visibility.Collapsed;

        TrendingSectionPanel.Visibility = _isSearchMode
            ? Visibility.Collapsed
            : Visibility.Visible;
    }

    private void UpdateWingetSearchStatus()
    {
        if (!_wingetStatus.IsReady)
        {
            WingetSearchStatusTextBlock.Text = AppLanguageService.GetString("Software.Search.Status.WingetRequired");
            return;
        }

        var query = WingetSearchTextBox.Text?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(query))
        {
            WingetSearchStatusTextBlock.Text = AppLanguageService.GetString("Software.Search.Status.Hint");
            return;
        }

        if (_wingetSearchResults.Count == 0)
        {
            WingetSearchStatusTextBlock.Text = AppLanguageService.GetString("Software.Search.Status.NoResult");
            return;
        }

        WingetSearchStatusTextBlock.Text = AppLanguageService.Format(
            "Software.Search.Status.CountFormat",
            _wingetSearchResults.Count);
    }

    private async Task SearchWingetAsync()
    {
        var query = WingetSearchTextBox.Text?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(query))
        {
            _isSearchMode = false;
            _wingetSearchResults = [];
            RenderWingetSearchResults(preserveStatusText: false);
            RenderTrendingApps();
            return;
        }

        _isSearchMode = true;

        if (!_wingetStatus.IsReady)
        {
            _wingetSearchResults = [];
            RenderWingetSearchResults(preserveStatusText: false);
            return;
        }

        WingetSearchButton.IsEnabled = false;
        WingetSearchStatusTextBlock.Text = AppLanguageService.GetString("Software.Search.Status.Searching");

        try
        {
            _wingetSearchResults = await _wingetService.SearchPackagesAsync(query, 20);
            RenderWingetSearchResults(preserveStatusText: false);
        }
        catch (Exception ex)
        {
            _wingetSearchResults = [];
            WingetSearchStatusTextBlock.Text = AppLanguageService.Format("Software.Common.ErrorFormat", ex.Message);
            RenderWingetSearchResults();
        }
        finally
        {
            WingetSearchButton.IsEnabled = true;
        }
    }

    private async void RefreshWingetStatusButton_Click(object sender, RoutedEventArgs e)
    {
        await RefreshWingetStatusAsync();
    }

    private void InstallWingetButton_Click(object sender, RoutedEventArgs e)
    {
        AppInstallJobService.QueueWingetInstall();
    }

    private void RemoveWingetButton_Click(object sender, RoutedEventArgs e)
    {
        var result = MessageBox.Show(
            "Bạn có chắc chắn muốn gỡ bỏ Winget khỏi hệ thống?\nĐiều này cũng sẽ gỡ bỏ Desktop App Installer và Microsoft Store.",
            "Remove Winget",
            MessageBoxButton.YesNo,
            MessageBoxImage.Warning);

        if (result == MessageBoxResult.Yes)
        {
            AppInstallJobService.QueueWingetUninstall();
        }
    }


    private void TrendingInstallButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button button || button.Tag is not string packageId)
        {
            return;
        }

        if (!_wingetStatus.IsReady)
        {
            TrendingStatusTextBlock.Text = AppLanguageService.GetString("Software.Trending.Status.WingetRequired");
            return;
        }

        var matchedTrendingApp = _trendingApps
            .FirstOrDefault(app => string.Equals(app.Id, packageId, StringComparison.OrdinalIgnoreCase));
        var displayName = matchedTrendingApp?.Name ?? packageId;

        if (matchedTrendingApp != null && IsTrendingAppInstalled(matchedTrendingApp))
        {
            TrendingStatusTextBlock.Text = AppLanguageService.Format(
                "Software.Trending.Status.AlreadyInstalledFormat",
                displayName);
            return;
        }

        var queueResult = AppInstallJobService.QueueInstall(packageId, displayName);
        if (queueResult.Result == AppInstallEnqueueResult.Queued)
        {
            TrendingStatusTextBlock.Text = AppLanguageService.Format(
                "Software.Trending.Status.QueuedFormat",
                queueResult.Job?.DisplayName ?? packageId);
        }
        else if (queueResult.Result == AppInstallEnqueueResult.AlreadyQueued)
        {
            TrendingStatusTextBlock.Text = AppLanguageService.Format(
                "Software.Trending.Status.AlreadyQueuedFormat",
                queueResult.Job?.DisplayName ?? packageId);
        }
        else
        {
            TrendingStatusTextBlock.Text = AppLanguageService.GetString("Software.Common.UnknownError");
        }

        RenderTrendingApps();
    }

    private void SearchInstallButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button button || button.Tag is not string packageId)
        {
            return;
        }

        if (!_wingetStatus.IsReady)
        {
            WingetSearchStatusTextBlock.Text = AppLanguageService.GetString("Software.Search.Status.WingetRequired");
            return;
        }

        var matchedPackage = _wingetSearchResults
            .FirstOrDefault(app => string.Equals(app.Id, packageId, StringComparison.OrdinalIgnoreCase));
        var displayName = matchedPackage?.Name ?? packageId;

        if (matchedPackage != null && IsPackageInstalledByName(matchedPackage.Name))
        {
            WingetSearchStatusTextBlock.Text = AppLanguageService.Format(
                "Software.Search.Status.AlreadyInstalledFormat",
                displayName);
            return;
        }

        var queueResult = AppInstallJobService.QueueInstall(packageId, displayName);
        if (queueResult.Result == AppInstallEnqueueResult.Queued)
        {
            WingetSearchStatusTextBlock.Text = AppLanguageService.Format(
                "Software.Search.Status.QueuedFormat",
                queueResult.Job?.DisplayName ?? packageId);
        }
        else if (queueResult.Result == AppInstallEnqueueResult.AlreadyQueued)
        {
            WingetSearchStatusTextBlock.Text = AppLanguageService.Format(
                "Software.Search.Status.AlreadyQueuedFormat",
                queueResult.Job?.DisplayName ?? packageId);
        }
        else
        {
            WingetSearchStatusTextBlock.Text = AppLanguageService.GetString("Software.Common.UnknownError");
        }

        RenderWingetSearchResults();
    }

    private async void RefreshInstalledAppsButton_Click(object sender, RoutedEventArgs e)
    {
        await RefreshInstalledAppsAsync();
    }

    private void UninstallButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button button || button.Tag is not string appName)
        {
            return;
        }

        if (!_wingetStatus.IsReady)
        {
            InstalledStatusTextBlock.Text = AppLanguageService.GetString("Software.Search.Status.WingetRequired");
            return;
        }

        var result = MessageBox.Show(
            AppLanguageService.Format("Software.Installed.UninstallConfirmation", appName),
            AppLanguageService.GetString("Software.Installed.UninstallTitle"),
            MessageBoxButton.YesNo,
            MessageBoxImage.Question);

        if (result != MessageBoxResult.Yes)
        {
            return;
        }

        // We use the application name as the identifier for winget uninstall --name
        var queueResult = AppInstallJobService.QueueUninstall(appName, appName);
        if (queueResult.Result == AppInstallEnqueueResult.Queued)
        {
            InstalledStatusTextBlock.Text = AppLanguageService.Format(
                "Software.Trending.Status.QueuedFormat",
                queueResult.Job?.DisplayName ?? appName);
        }
        else if (queueResult.Result == AppInstallEnqueueResult.AlreadyQueued)
        {
            InstalledStatusTextBlock.Text = AppLanguageService.Format(
                "Software.Trending.Status.AlreadyQueuedFormat",
                queueResult.Job?.DisplayName ?? appName);
        }

        ApplyInstalledAppsFilter();
    }

    private void InstalledSearchTextBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        ApplyInstalledAppsFilter();
    }

    private async void WingetSearchButton_Click(object sender, RoutedEventArgs e)
    {
        await SearchWingetAsync();
    }

    private async void WingetSearchTextBox_KeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key != Key.Enter)
        {
            return;
        }

        e.Handled = true;
        await SearchWingetAsync();
    }

    private void WingetSearchTextBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        if (!string.IsNullOrWhiteSpace(WingetSearchTextBox.Text))
        {
            return;
        }

        _isSearchMode = false;
        _wingetSearchResults = [];
        RenderWingetSearchResults(preserveStatusText: false);
        RenderTrendingApps();
    }

    private void ManageInstallJobsButton_Click(object sender, RoutedEventArgs e)
    {
        var owner = Window.GetWindow(this);
        var jobsWindow = new InstallJobsWindow
        {
            Owner = owner
        };

        jobsWindow.ShowDialog();
    }

    private static SolidColorBrush GetBrush(string colorHex)
    {
        var converted = ColorConverter.ConvertFromString(colorHex);
        if (converted is Color color)
        {
            return new SolidColorBrush(color);
        }

        return new SolidColorBrush(Colors.White);
    }

    private bool IsTrendingAppInstalled(WingetTrendingApp app)
    {
        return IsPackageInstalledByName(app.Name);
    }

    private bool IsPackageInstalledByName(string packageName)
    {
        if (_installedApps.Count == 0)
        {
            return false;
        }

        return _installedApps.Any(installed => IsNameMatch(installed.Name, packageName));
    }

    private static bool IsNameMatch(string installedName, string trendingName)
    {
        if (string.IsNullOrWhiteSpace(installedName) || string.IsNullOrWhiteSpace(trendingName))
        {
            return false;
        }

        if (installedName.Equals(trendingName, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var normalizedInstalled = NormalizeName(installedName);
        var normalizedTrending = NormalizeName(trendingName);
        if (string.IsNullOrWhiteSpace(normalizedInstalled) || string.IsNullOrWhiteSpace(normalizedTrending))
        {
            return false;
        }

        if (normalizedInstalled.Equals(normalizedTrending, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (normalizedTrending.Length < 5 || normalizedInstalled.Length < 5)
        {
            return false;
        }

        return normalizedInstalled.Contains(normalizedTrending, StringComparison.OrdinalIgnoreCase) ||
               normalizedTrending.Contains(normalizedInstalled, StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizeName(string value)
    {
        var buffer = value
            .Where(char.IsLetterOrDigit)
            .ToArray();

        return new string(buffer);
    }

    private readonly record struct TrendingAppViewModel(
        string Id,
        string Name,
        string Description,
        string InstallButtonText,
        bool IsInstallEnabled);

    private readonly record struct WingetSearchViewModel(
        string Id,
        string Name,
        string VersionText,
        string InstallButtonText,
        bool IsInstallEnabled);

    private readonly record struct InstalledAppViewModel(
        string Name,
        string Publisher,
        string Version,
        string UninstallButtonText);
}
