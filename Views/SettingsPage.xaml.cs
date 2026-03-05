using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using WinstallerHubApp.Services;

namespace WinstallerHubApp.Views;

public partial class SettingsPage : Page
{
    private bool _isInitializing;
    private string _currentLanguageCode = AppLanguageService.VietnameseCode;

    public SettingsPage()
    {
        InitializeComponent();
        Loaded += SettingsPage_Loaded;
        Unloaded += SettingsPage_Unloaded;
    }

    private void SettingsPage_Loaded(object sender, RoutedEventArgs e)
    {
        _isInitializing = true;
        AppLanguageService.LanguageChanged += AppLanguageService_LanguageChanged;

        var settings = AppSettingsService.GetSettings();
        _currentLanguageCode = AppLanguageService.NormalizeLanguageCode(settings.LanguageCode);

        ReloadLanguageOptions();
        ThemeToggleSwitch.IsOn = settings.UseDarkTheme;
        UpdateLocalizedText();
        UpdateThemeModeLabel(settings.UseDarkTheme);

        _isInitializing = false;
    }

    private void SettingsPage_Unloaded(object sender, RoutedEventArgs e)
    {
        AppLanguageService.LanguageChanged -= AppLanguageService_LanguageChanged;
    }

    private void ThemeToggleSwitch_Toggled(object sender, RoutedEventArgs e)
    {
        if (_isInitializing)
        {
            return;
        }

        var useDarkTheme = ThemeToggleSwitch.IsOn;
        ThemeService.ApplyTheme(useDarkTheme);
        AppSettingsService.Update(s => s.UseDarkTheme = useDarkTheme);
        UpdateThemeModeLabel(useDarkTheme);
    }

    private void LanguageComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_isInitializing || LanguageComboBox.SelectedValue is not string selectedCode)
        {
            return;
        }

        _currentLanguageCode = AppLanguageService.NormalizeLanguageCode(selectedCode);
        AppSettingsService.Update(s => s.LanguageCode = _currentLanguageCode);
        AppLanguageService.ApplyLanguage(_currentLanguageCode);
    }

    private void AppLanguageService_LanguageChanged(string languageCode)
    {
        Dispatcher.Invoke(() =>
        {
            _currentLanguageCode = AppLanguageService.NormalizeLanguageCode(languageCode);

            _isInitializing = true;
            ReloadLanguageOptions();
            _isInitializing = false;

            UpdateLocalizedText();
            UpdateThemeModeLabel(ThemeToggleSwitch.IsOn);
        });
    }

    private void ReloadLanguageOptions()
    {
        LanguageComboBox.ItemsSource = BuildLanguageOptions();
        LanguageComboBox.SelectedValue = _currentLanguageCode;
    }

    private static List<LanguageOption> BuildLanguageOptions()
    {
        return
        [
            new(AppLanguageService.VietnameseCode, AppLanguageService.GetString("Language.Name.Vietnamese")),
            new(AppLanguageService.EnglishCode, AppLanguageService.GetString("Language.Name.English"))
        ];
    }

    private void UpdateLocalizedText()
    {
        PageTitleTextBlock.Text = AppLanguageService.GetString("Settings.Title");
        PageDescriptionTextBlock.Text = AppLanguageService.GetString("Settings.Description");

        AppearanceTitleTextBlock.Text = AppLanguageService.GetString("Settings.Appearance.Title");
        AppearanceDescriptionTextBlock.Text = AppLanguageService.GetString("Settings.Appearance.Description");

        LanguageTitleTextBlock.Text = AppLanguageService.GetString("Settings.Language.Title");
        LanguageDescriptionTextBlock.Text = AppLanguageService.GetString("Settings.Language.Description");
    }

    private void UpdateThemeModeLabel(bool useDarkTheme)
    {
        ThemeModeLabelTextBlock.Text = useDarkTheme
            ? AppLanguageService.GetString("Settings.ThemeMode.Dark")
            : AppLanguageService.GetString("Settings.ThemeMode.Light");
    }

    private readonly record struct LanguageOption(string Code, string DisplayName);
}
