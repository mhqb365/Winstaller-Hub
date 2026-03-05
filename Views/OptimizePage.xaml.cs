using System;
using System.Windows;
using System.Windows.Controls;
using WinstallerHubApp.Services;

namespace WinstallerHubApp.Views;

public partial class OptimizePage : Page
{
    public OptimizePage()
    {
        InitializeComponent();
        Loaded += OptimizePage_Loaded;
        Unloaded += OptimizePage_Unloaded;
    }

    private void OptimizePage_Loaded(object sender, RoutedEventArgs e)
    {
        AppLanguageService.LanguageChanged += AppLanguageService_LanguageChanged;
        UpdateLocalizedText();
    }

    private void OptimizePage_Unloaded(object sender, RoutedEventArgs e)
    {
        AppLanguageService.LanguageChanged -= AppLanguageService_LanguageChanged;
    }

    private void AppLanguageService_LanguageChanged(string _)
    {
        Dispatcher.Invoke(UpdateLocalizedText);
    }

    private void UpdateLocalizedText()
    {
        PageTitleTextBlock.Text = AppLanguageService.GetString("Optimize.Title");
        PageDescriptionTextBlock.Text = AppLanguageService.GetString("Optimize.Description");
    }
}
