using System;
using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;
using WinstallerHubApp.Services;

namespace WinstallerHubApp.Views;

public partial class ActivationPage : Page
{
    public ActivationPage()
    {
        InitializeComponent();
    }

    private void Page_Loaded(object sender, RoutedEventArgs e)
    {
        UpdateLocalizedText();
        AppLanguageService.LanguageChanged += AppLanguageService_LanguageChanged;
    }

    private void Page_Unloaded(object sender, RoutedEventArgs e)
    {
        AppLanguageService.LanguageChanged -= AppLanguageService_LanguageChanged;
    }

    private void AppLanguageService_LanguageChanged(string _)
    {
        Dispatcher.Invoke(UpdateLocalizedText);
    }

    private void UpdateLocalizedText()
    {
        PageTitleTextBlock.Text = AppLanguageService.GetString("Activation.Title");
        PageDescriptionTextBlock.Text = AppLanguageService.GetString("Activation.Description");
        
        OfficialMethodTitleBlock.Text = AppLanguageService.GetString("Activation.Method.Official");
        OfficialMethodDescBlock.Text = AppLanguageService.GetString("Activation.Method.OfficialDesc");
        ModernWpf.Controls.Primitives.ControlHelper.SetPlaceholderText(ProductKeyTextBox, AppLanguageService.GetString("Activation.Input.Placeholder"));
        ActivateButton.Content = AppLanguageService.GetString("Activation.Button.Activate");
        
        MASMethodTitleBlock.Text = AppLanguageService.GetString("Activation.Method.MAS");
        MASMethodDescBlock.Text = AppLanguageService.GetString("Activation.Method.MASDesc");
        RunMASWindowsButton.Content = AppLanguageService.GetString("Activation.Button.MASWindows");
        RunMASOfficeButton.Content = AppLanguageService.GetString("Activation.Button.MASOffice");
    }

    private void ActivateButton_Click(object sender, RoutedEventArgs e)
    {
        var key = ProductKeyTextBox.Text.Trim();
        if (string.IsNullOrWhiteSpace(key))
            return;

        try
        {
            // Execute slmgr.vbs to install the product key
            Process.Start(new ProcessStartInfo
            {
                FileName = "cscript.exe",
                Arguments = $"//nologo c:\\windows\\system32\\slmgr.vbs /ipk {key}",
                UseShellExecute = true,
                Verb = "runas" // Request administrator privileges
            });
            
            AppToastService.Show(new AppToastMessage("Key installed", $"Product key {key} applied. Please run /ato or check Windows Settings.", AppToastType.Success));
        }
        catch (Exception ex)
        {
            AppToastService.Show(new AppToastMessage("Activation Error", ex.Message, AppToastType.Error));
        }
    }

    private void RunMASWindowsButton_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -ExecutionPolicy Bypass -Command \"iex \\\"& { $(irm https://get.activated.win) } /HWID\\\"\"",
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            AppToastService.Show(new AppToastMessage("Failed to launch MAS", ex.Message, AppToastType.Error));
        }
    }

    private void RunMASOfficeButton_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -ExecutionPolicy Bypass -Command \"iex \\\"& { $(irm https://get.activated.win) } /Ohook\\\"\"",
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            AppToastService.Show(new AppToastMessage("Failed to launch MAS", ex.Message, AppToastType.Error));
        }
    }
}
