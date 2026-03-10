using System.Windows.Controls;
using WinstallerHubApp.Services;

namespace WinstallerHubApp.Views;

public partial class OfficeOnlinePage : Page
{
    public OfficeOnlinePage()
    {
        InitializeComponent();
        UpdateLocalizedText();
    }

    private void UpdateLocalizedText()
    {
        PageTitleTextBlock.Text = AppLanguageService.GetString("Office.Online.Title");
        PageDescriptionTextBlock.Text = AppLanguageService.GetString("Office.Online.Description");
    }
}
