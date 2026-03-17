using System.Windows;
using System.Windows.Media;

namespace WinstallerHubApp.Services;

internal static class AppPaletteService
{
    internal static void ApplyPalette(bool useDarkTheme)
    {
        var resources = Application.Current?.Resources;
        if (resources == null)
        {
            return;
        }

        if (useDarkTheme)
        {
            ApplyDark(resources);
            return;
        }

        ApplyLight(resources);
    }

    private static void ApplyDark(ResourceDictionary resources)
    {
        SetBrush(resources, "AccentBrush", "#00AADE");

        SetBrush(resources, "ShellWindowBackgroundBrush", "#101522");
        SetGradient(resources, "ShellBackgroundBrush", "#0F172A", "#1E1E2E", "#111111");
        SetBrush(resources, "SidebarBackgroundBrush", "#1A000000");
        SetBrush(resources, "SidebarDividerBrush", "#1FFFFFFF");
        SetBrush(resources, "SidebarFooterPrimaryBrush", "#44FFFFFF");
        SetBrush(resources, "SidebarFooterSecondaryBrush", "#88A4C9");
        SetBrush(resources, "SidebarLogoBrush", "#007ACC");
        SetBrush(resources, "SidebarIconInactiveBrush", "#ABB2BF");
        SetBrush(resources, "SidebarIconActiveBrush", "#00AADE");
        SetBrush(resources, "SidebarItemForegroundBrush", "#BBFFFFFF");
        SetBrush(resources, "SidebarItemSelectedForegroundBrush", "#FFFFFF");
        SetBrush(resources, "SidebarItemSelectedBackgroundBrush", "#2AFFFFFF");
        SetBrush(resources, "SidebarItemHoverBackgroundBrush", "#15FFFFFF");
        SetBrush(resources, "SidebarItemHoverSelectedBrush", "#33FFFFFF");

        SetBrush(resources, "AppTextPrimaryBrush", "#F3F8FF");
        SetBrush(resources, "AppTextSecondaryBrush", "#B2C0D6");
        SetBrush(resources, "AppTextMutedBrush", "#8FA2BF");
        SetBrush(resources, "AppCardBackgroundBrush", "#12FFFFFF");
        SetBrush(resources, "AppCardBorderBrush", "#25FFFFFF");

        SetBrush(resources, "DashboardCardBackgroundBrush", "#14FFFFFF");
        SetBrush(resources, "DashboardCardBorderBrush", "#33FFFFFF");
        SetBrush(resources, "DashboardGaugeTrackBrush", "#33FFFFFF");
        SetBrush(resources, "DashboardIconBrush", "#93A8C3");
        SetBrush(resources, "DashboardTextPrimaryBrush", "#F3F8FF");
        SetBrush(resources, "DashboardTextSecondaryBrush", "#B2C0D6");
        SetBrush(resources, "DashboardTextMutedBrush", "#9DB0CB");
        SetBrush(resources, "DashboardTextTertiaryBrush", "#8FA2BF");
        SetBrush(resources, "DashboardSectionTitleBrush", "#D9E5F7");
        SetBrush(resources, "DashboardDividerBrush", "#22FFFFFF");
        SetBrush(resources, "DashboardOverlayBackgroundBrush", "#35060A1B");
        SetBrush(resources, "DashboardOverlayCardBackgroundBrush", "#1EFFFFFF");
        SetBrush(resources, "DashboardOverlayCardBorderBrush", "#3AFFFFFF");
        SetBrush(resources, "DashboardOverlayTextBrush", "#DCE7FA");
        SetBrush(resources, "DashboardOverlayProgressBrush", "#27A4FF");
    }

    private static void ApplyLight(ResourceDictionary resources)
    {
        SetBrush(resources, "AccentBrush", "#0078D4");

        SetBrush(resources, "ShellWindowBackgroundBrush", "#EFF3FA");
        SetGradient(resources, "ShellBackgroundBrush", "#EEF3FB", "#F7FAFF", "#E9EFFA");
        SetBrush(resources, "SidebarBackgroundBrush", "#DCE5F3");
        SetBrush(resources, "SidebarDividerBrush", "#2B000000");
        SetBrush(resources, "SidebarFooterPrimaryBrush", "#8A30425B");
        SetBrush(resources, "SidebarFooterSecondaryBrush", "#B0506280");
        SetBrush(resources, "SidebarLogoBrush", "#005EA6");
        SetBrush(resources, "SidebarIconInactiveBrush", "#4B5E7C");
        SetBrush(resources, "SidebarIconActiveBrush", "#0078D4");
        SetBrush(resources, "SidebarItemForegroundBrush", "#25364F");
        SetBrush(resources, "SidebarItemSelectedForegroundBrush", "#0F172A");
        SetBrush(resources, "SidebarItemSelectedBackgroundBrush", "#12000000");
        SetBrush(resources, "SidebarItemHoverBackgroundBrush", "#08000000");
        SetBrush(resources, "SidebarItemHoverSelectedBrush", "#1A000000");

        SetBrush(resources, "AppTextPrimaryBrush", "#0F172A");
        SetBrush(resources, "AppTextSecondaryBrush", "#334155");
        SetBrush(resources, "AppTextMutedBrush", "#64748B");
        SetBrush(resources, "AppCardBackgroundBrush", "#F6F9FF");
        SetBrush(resources, "AppCardBorderBrush", "#CDD8E6");

        SetBrush(resources, "DashboardCardBackgroundBrush", "#F7FAFF");
        SetBrush(resources, "DashboardCardBorderBrush", "#CDD8E6");
        SetBrush(resources, "DashboardGaugeTrackBrush", "#C4CFDD");
        SetBrush(resources, "DashboardIconBrush", "#5D6F88");
        SetBrush(resources, "DashboardTextPrimaryBrush", "#0F172A");
        SetBrush(resources, "DashboardTextSecondaryBrush", "#334155");
        SetBrush(resources, "DashboardTextMutedBrush", "#475569");
        SetBrush(resources, "DashboardTextTertiaryBrush", "#64748B");
        SetBrush(resources, "DashboardSectionTitleBrush", "#0F172A");
        SetBrush(resources, "DashboardDividerBrush", "#22000000");
        SetBrush(resources, "DashboardOverlayBackgroundBrush", "#66E8EEF7");
        SetBrush(resources, "DashboardOverlayCardBackgroundBrush", "#FFFFFF");
        SetBrush(resources, "DashboardOverlayCardBorderBrush", "#C7D2E0");
        SetBrush(resources, "DashboardOverlayTextBrush", "#1E293B");
        SetBrush(resources, "DashboardOverlayProgressBrush", "#0078D4");
    }

    private static void SetBrush(ResourceDictionary resources, string key, string colorHex)
    {
        resources[key] = CreateBrush(colorHex);
    }

    private static void SetGradient(ResourceDictionary resources, string key, string startHex, string middleHex, string endHex)
    {
        resources[key] = CreateGradient(startHex, middleHex, endHex);
    }

    private static SolidColorBrush CreateBrush(string colorHex)
    {
        var brush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(colorHex));
        if (brush.CanFreeze)
        {
            brush.Freeze();
        }

        return brush;
    }

    private static LinearGradientBrush CreateGradient(string startHex, string middleHex, string endHex)
    {
        var brush = new LinearGradientBrush
        {
            StartPoint = new Point(0, 0),
            EndPoint = new Point(1, 1)
        };

        brush.GradientStops.Add(new GradientStop((Color)ColorConverter.ConvertFromString(startHex), 0));
        brush.GradientStops.Add(new GradientStop((Color)ColorConverter.ConvertFromString(middleHex), 0.5));
        brush.GradientStops.Add(new GradientStop((Color)ColorConverter.ConvertFromString(endHex), 1));

        if (brush.CanFreeze)
        {
            brush.Freeze();
        }

        return brush;
    }
}
