using System.Windows.Controls;
using WinstallerHubApp.Services;

namespace WinstallerHubApp.Views;

public partial class OfficeActivePage : Page
{
    public OfficeActivePage()
    {
        InitializeComponent();
        UpdateLocalizedText();
    }

    private void UpdateLocalizedText()
    {
        PageTitleTextBlock.Text = AppLanguageService.GetString("Office.Active.Title");
        PageDescriptionTextBlock.Text = AppLanguageService.GetString("Office.Active.Description");
    }
}
