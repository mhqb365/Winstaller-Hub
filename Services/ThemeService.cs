using ModernWpf;

namespace WinstallerHubApp.Services;

internal static class ThemeService
{
    internal static void ApplyTheme(bool useDarkTheme)
    {
        ThemeManager.Current.ApplicationTheme = useDarkTheme
            ? ApplicationTheme.Dark
            : ApplicationTheme.Light;

        AppPaletteService.ApplyPalette(useDarkTheme);
    }
}
