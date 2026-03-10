using System.Windows.Controls;
using WinstallerHubApp.Services;

namespace WinstallerHubApp.Views;

public partial class OfficeImagePage : Page
{
    public OfficeImagePage()
    {
        InitializeComponent();
        UpdateLocalizedText();
    }

    private void UpdateLocalizedText()
    {
        PageTitleTextBlock.Text = AppLanguageService.GetString("Office.Image.Title");
        PageDescriptionTextBlock.Text = AppLanguageService.GetString("Office.Image.Description");
    }
}
