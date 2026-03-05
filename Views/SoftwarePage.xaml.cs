using System;
using System.Windows;
using System.Windows.Controls;
using WinstallerHubApp.Services;

namespace WinstallerHubApp.Views;

public partial class SoftwarePage : Page
{
    public SoftwarePage()
    {
        InitializeComponent();
        Loaded += SoftwarePage_Loaded;
        Unloaded += SoftwarePage_Unloaded;
    }

    private void SoftwarePage_Loaded(object sender, RoutedEventArgs e)
    {
        AppLanguageService.LanguageChanged += AppLanguageService_LanguageChanged;
        UpdateLocalizedText();
    }

    private void SoftwarePage_Unloaded(object sender, RoutedEventArgs e)
    {
        AppLanguageService.LanguageChanged -= AppLanguageService_LanguageChanged;
    }

    private void AppLanguageService_LanguageChanged(string _)
    {
        Dispatcher.Invoke(UpdateLocalizedText);
    }

    private void UpdateLocalizedText()
    {
        PageTitleTextBlock.Text = AppLanguageService.GetString("Software.Title");
        PageDescriptionTextBlock.Text = AppLanguageService.GetString("Software.Description");
    }
}
