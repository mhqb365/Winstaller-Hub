using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Threading;
using WinstallerHubApp.Services;
using WinstallerHubApp.Views;

namespace WinstallerHubApp;

public partial class MainWindow : Window
{
    private readonly Queue<AppToastMessage> _toastQueue = new();
    private readonly DispatcherTimer _toastTimer = new()
    {
        Interval = TimeSpan.FromSeconds(4)
    };

    private bool _isToastVisible;
    private bool _isOfficeExpanded = false;
    private ListBoxItem? _lastSelectedNavItem;

    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
        Unloaded += MainWindow_Unloaded;
        _toastTimer.Tick += ToastTimer_Tick;

        // Initialize last selected to Dashboard
        Loaded += (s, e) => _lastSelectedNavItem = SidebarListBox.Items[0] as ListBoxItem;

        MainFrame.Navigate(new DashboardPage());
    }

    private void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        UpdateLocalizedText();
        AppLanguageService.LanguageChanged += AppLanguageService_LanguageChanged;
        AppToastService.ToastRequested += AppToastService_ToastRequested;
    }

    private void MainWindow_Unloaded(object sender, RoutedEventArgs e)
    {
        AppLanguageService.LanguageChanged -= AppLanguageService_LanguageChanged;
        AppToastService.ToastRequested -= AppToastService_ToastRequested;
        _toastTimer.Stop();
    }

    private void AppLanguageService_LanguageChanged(string _)
    {
        Dispatcher.Invoke(UpdateLocalizedText);
    }

    private void AppToastService_ToastRequested(AppToastMessage message)
    {
        Dispatcher.Invoke(() => EnqueueToast(message));
    }

    private void UpdateLocalizedText()
    {
        DashboardNavTextBlock.Text = AppLanguageService.GetString("Nav.Overview");
        SoftwareNavTextBlock.Text = AppLanguageService.GetString("Nav.Applications");
        OptimizeNavTextBlock.Text = AppLanguageService.GetString("Nav.SystemOptimize");
        ActivationNavTextBlock.Text = AppLanguageService.GetString("Nav.Activation");
        SettingsNavTextBlock.Text = AppLanguageService.GetString("Nav.Settings");
        OfficeNavTextBlock.Text = AppLanguageService.GetString("Nav.Office");
        OfficeOnlineNavTextBlock.Text = AppLanguageService.GetString("Nav.Office.Online");
        OfficeImageNavTextBlock.Text = AppLanguageService.GetString("Nav.Office.Image");

        BylineTextBlock.Text = AppLanguageService.GetString("App.Byline");
    }

    private void EnqueueToast(AppToastMessage message)
    {
        _toastQueue.Enqueue(message);
        if (_isToastVisible)
        {
            return;
        }

        ShowNextToast();
    }

    private void ShowNextToast()
    {
        if (_toastQueue.Count == 0)
        {
            _isToastVisible = false;
            return;
        }

        var nextToast = _toastQueue.Dequeue();
        _isToastVisible = true;

        ToastTitleTextBlock.Text = string.IsNullOrWhiteSpace(nextToast.Title)
            ? AppLanguageService.GetString("Toast.DefaultTitle")
            : nextToast.Title;
        ToastMessageTextBlock.Text = nextToast.Message;
        ApplyToastStyle(nextToast.Type);

        ToastHostBorder.Visibility = Visibility.Visible;
        ToastHostBorder.BeginAnimation(OpacityProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(160)));

        _toastTimer.Stop();
        _toastTimer.Start();
    }

    private void ToastTimer_Tick(object? sender, EventArgs e)
    {
        _toastTimer.Stop();
        HideCurrentToast();
    }

    private void HideCurrentToast()
    {
        if (ToastHostBorder.Visibility != Visibility.Visible)
        {
            _isToastVisible = false;
            ShowNextToast();
            return;
        }

        var fadeOut = new DoubleAnimation(0, TimeSpan.FromMilliseconds(220));
        fadeOut.Completed += (_, _) =>
        {
            ToastHostBorder.Visibility = Visibility.Collapsed;
            _isToastVisible = false;
            ShowNextToast();
        };

        ToastHostBorder.BeginAnimation(OpacityProperty, fadeOut);
    }

    private void ApplyToastStyle(AppToastType type)
    {
        var (background, border) = type switch
        {
            AppToastType.Success => ("#CC113725", "#FF2FC16D"),
            AppToastType.Warning => ("#CC4E380A", "#FFF6B73C"),
            AppToastType.Error => ("#CC4A1D22", "#FFFF7B7B"),
            _ => ("#CC102A4C", "#FF4DA3FF")
        };

        ToastHostBorder.Background = CreateBrush(background);
        ToastHostBorder.BorderBrush = CreateBrush(border);
    }

    private static SolidColorBrush CreateBrush(string colorHex)
    {
        var converted = ColorConverter.ConvertFromString(colorHex);
        return converted is Color color
            ? new SolidColorBrush(color)
            : new SolidColorBrush(Colors.Transparent);
    }

    private void Sidebar_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (MainFrame == null || sender is not ListBox listBox) return;
        if (listBox.SelectedItem is not ListBoxItem selectedItem) return;
        if (selectedItem.Tag is not string tag || string.IsNullOrWhiteSpace(tag)) return;

        if (tag == "OfficeHeader")
        {
            ToggleOfficeMenu();
            // Re-select the last actual page item so the header doesn't stay highlighted
            listBox.SelectedItem = _lastSelectedNavItem;
            return;
        }

        _lastSelectedNavItem = selectedItem;

        var nextPage = CreatePage(tag);
        if (nextPage != null)
        {
            MainFrame.Navigate(nextPage);
        }
    }

    private void ToggleOfficeMenu()
    {
        _isOfficeExpanded = !_isOfficeExpanded;
        var visibility = _isOfficeExpanded ? Visibility.Visible : Visibility.Collapsed;

        OfficeOnlineItem.Visibility = visibility;
        OfficeImageItem.Visibility = visibility;


        // E76C = ChevronRight (Closed), E70D = ChevronDown (Open)
        OfficeChevron.Text = _isOfficeExpanded ? "\uE70D" : "\uE76C";
    }

    private static Page? CreatePage(string tag)
    {
        return tag switch
        {
            "Dashboard" => new DashboardPage(),
            "Software" => new SoftwarePage(),
            "Optimize" => new OptimizePage(),
            "Activation" => new ActivationPage(),
            "Settings" => new SettingsPage(),
            "OfficeOnline" => new OfficeOnlinePage(),
            "OfficeImage" => new OfficeImagePage(),

            "OfficeHeader" => new OfficeOnlinePage(), // Default to online when clicking header
            _ => null
        };
    }
}
