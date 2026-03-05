using System.Windows;
using System.Windows.Controls;
using WinstallerHubApp.Services;
using WinstallerHubApp.Views;

namespace WinstallerHubApp;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
        Unloaded += MainWindow_Unloaded;
        MainFrame.Navigate(new DashboardPage());
    }

    private void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        UpdateLocalizedText();
        AppLanguageService.LanguageChanged += AppLanguageService_LanguageChanged;
    }

    private void MainWindow_Unloaded(object sender, RoutedEventArgs e)
    {
        AppLanguageService.LanguageChanged -= AppLanguageService_LanguageChanged;
    }

    private void AppLanguageService_LanguageChanged(string _)
    {
        Dispatcher.Invoke(UpdateLocalizedText);
    }

    private void UpdateLocalizedText()
    {
        DashboardNavTextBlock.Text = AppLanguageService.GetString("Nav.Overview");
        SoftwareNavTextBlock.Text = AppLanguageService.GetString("Nav.Applications");
        OptimizeNavTextBlock.Text = AppLanguageService.GetString("Nav.SystemOptimize");
        SettingsNavTextBlock.Text = AppLanguageService.GetString("Nav.Settings");
        BylineTextBlock.Text = AppLanguageService.GetString("App.Byline");
    }

    private void Sidebar_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (MainFrame == null || sender is not ListBox listBox) return;
        if (listBox.SelectedItem is not ListBoxItem selectedItem) return;
        if (selectedItem.Tag is not string tag || string.IsNullOrWhiteSpace(tag)) return;

        var nextPage = CreatePage(tag);
        if (nextPage != null)
        {
            MainFrame.Navigate(nextPage);
        }
    }

    private static Page? CreatePage(string tag)
    {
        return tag switch
        {
            "Dashboard" => new DashboardPage(),
            "Software" => new SoftwarePage(),
            "Optimize" => new OptimizePage(),
            "Settings" => new SettingsPage(),
            _ => null
        };
    }
}
