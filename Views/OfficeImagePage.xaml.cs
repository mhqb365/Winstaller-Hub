using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Win32;
using WinstallerHubApp.Services;

namespace WinstallerHubApp.Views;

public partial class OfficeImagePage : Page
{
    private readonly OfficeImageService _officeImageService = new();
    private readonly OfficeToolService _officeToolService = new();
    private string _currentImagesPath = string.Empty;

    public OfficeImagePage()
    {
        InitializeComponent();
        Loaded += OfficeImagePage_Loaded;
    }

    private void OfficeImagePage_Loaded(object sender, RoutedEventArgs e)
    {
        UpdateLocalizedText();
        _currentImagesPath = AppSettingsService.GetSettings().OfficeImagesPath;
        
        if (string.IsNullOrWhiteSpace(_currentImagesPath))
        {
            _currentImagesPath = AppContext.BaseDirectory;
        }

        FolderPathTextBlock.Text = _currentImagesPath;
        _ = RefreshImagesAsync();
    }

    private void UpdateLocalizedText()
    {
        PageTitleTextBlock.Text = AppLanguageService.GetString("Office.Image.Title");
        PageDescriptionTextBlock.Text = AppLanguageService.GetString("Office.Image.Description");
        FolderLabelTextBlock.Text = AppLanguageService.GetString("Office.Image.FolderLabel");
        BrowseFolderButton.Content = AppLanguageService.GetString("Office.Image.Button.Browse");
        NoImagesTextBlock.Text = AppLanguageService.GetString("Office.Image.Status.NoImages");
        FileColumn.Header = AppLanguageService.GetString("Office.Image.Header.File");
        SizeColumn.Header = AppLanguageService.GetString("Office.Image.Header.Size");
        ActionColumn.Header = AppLanguageService.GetString("Office.Image.Header.Action");
        StatusTextBlock.Text = string.Empty;

        UninstallOfficeButton.Content = AppLanguageService.GetString("Office.Uninstall.Button.Uninstall");
    }

    private async Task RefreshImagesAsync()
    {
        LoadingRing.IsActive = true;
        StatusTextBlock.Text = AppLanguageService.GetString("Office.Image.Status.Scanning");
        
        var images = await Task.Run(() => _officeImageService.GetImages(_currentImagesPath));
        
        var viewModels = images.Select(i => new OfficeImageViewModel(
            i.Name,
            i.FullPath,
            FormatSize(i.SizeBytes),
            AppLanguageService.GetString("Office.Image.Button.Install")
        )).ToList();

        ImagesListView.ItemsSource = viewModels;
        NoImagesPanel.Visibility = viewModels.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        
        LoadingRing.IsActive = false;
        StatusTextBlock.Text = AppLanguageService.Format("Office.Image.Status.CountFormat", viewModels.Count);
    }

    private async void BrowseFolderButton_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFolderDialog
        {
            InitialDirectory = Directory.Exists(_currentImagesPath) ? _currentImagesPath : AppContext.BaseDirectory
        };

        if (dialog.ShowDialog() == true)
        {
            _currentImagesPath = dialog.FolderName;
            FolderPathTextBlock.Text = _currentImagesPath;
            
            AppSettingsService.Update(s => s.OfficeImagesPath = _currentImagesPath);
            await RefreshImagesAsync();
        }
    }

    private async void InstallImageButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button button || button.Tag is not string imagePath) return;

        try
        {
            button.IsEnabled = false;
            LoadingRing.IsActive = true;
            
            string fileName = Path.GetFileName(imagePath);
            StatusTextBlock.Text = AppLanguageService.Format("Office.Image.Status.Mounting", fileName);

            string? driveLetter = await _officeImageService.MountImageAsync(imagePath);
            
            if (string.IsNullOrEmpty(driveLetter))
            {
                AppToastService.Show(new AppToastMessage(
                    AppLanguageService.GetString("Toast.DefaultTitle"),
                    AppLanguageService.Format("Office.Image.Dialog.MountError", "PowerShell error"),
                    AppToastType.Error));
                return;
            }

            StatusTextBlock.Text = AppLanguageService.GetString("Office.Image.Status.Installing");
            
            bool success = _officeImageService.RunSetup(driveLetter);
            if (!success)
            {
                AppToastService.Show(new AppToastMessage(
                    AppLanguageService.GetString("Toast.DefaultTitle"),
                    AppLanguageService.GetString("Office.Image.Dialog.SetupNotFound"),
                    AppToastType.Warning));
            }
            else
            {
                AppToastService.Show(new AppToastMessage(
                    AppLanguageService.GetString("Toast.DefaultTitle"),
                    AppLanguageService.GetString("Office.Image.Dialog.Starting"),
                    AppToastType.Success));
                
                StatusTextBlock.Text = string.Empty;
            }
        }
        catch (Exception ex)
        {
            AppToastService.Show(new AppToastMessage("Error", ex.Message, AppToastType.Error));
        }
        finally
        {
            button.IsEnabled = true;
            LoadingRing.IsActive = false;
        }
    }

    private async void UninstallOfficeButton_Click(object sender, RoutedEventArgs e)
    {
        var result = MessageBox.Show(
            AppLanguageService.GetString("Office.Uninstall.UninstallWarning"),
            AppLanguageService.GetString("Office.Uninstall.UninstallTitle"),
            MessageBoxButton.YesNo,
            MessageBoxImage.Warning);

        if (result != MessageBoxResult.Yes) return;

        try
        {
            UninstallOfficeButton.IsEnabled = false;
            LoadingRing.IsActive = true;
            StatusTextBlock.Text = AppLanguageService.GetString("Office.Uninstall.UninstallStatus.Running");

            bool success = await _officeToolService.UninstallOfficeAsync();

            if (success)
            {
                AppToastService.Show(new AppToastMessage(
                    AppLanguageService.GetString("Toast.DefaultTitle"),
                    AppLanguageService.GetString("Office.Uninstall.UninstallDone") + " " + 
                    AppLanguageService.GetString("Office.Uninstall.RestartNeeded"),
                    AppToastType.Success));
            }
            else
            {
                AppToastService.Show(new AppToastMessage(
                    AppLanguageService.GetString("Toast.DefaultTitle"),
                    "Quá trình gỡ bỏ Office gặp lỗi hoặc bị hủy.",
                    AppToastType.Error));
            }
        }
        catch (Exception ex)
        {
            AppToastService.Show(new AppToastMessage("Error", ex.Message, AppToastType.Error));
        }
        finally
        {
            UninstallOfficeButton.IsEnabled = true;
            LoadingRing.IsActive = false;
            StatusTextBlock.Text = string.Empty;
        }
    }

    private static string FormatSize(long bytes)
    {
        string[] units = { "B", "KB", "MB", "GB", "TB" };
        double size = bytes;
        int unitIndex = 0;
        while (size >= 1024 && unitIndex < units.Length - 1)
        {
            size /= 1024;
            unitIndex++;
        }
        return $"{size:F2} {units[unitIndex]}";
    }

    public record OfficeImageViewModel(string Name, string FullPath, string SizeText, string InstallButtonText);
}
