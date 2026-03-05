using System;
using System.Globalization;
using System.Resources;
using System.Threading;

namespace WinstallerHubApp.Services;

internal static class AppLanguageService
{
    internal const string VietnameseCode = "vi-VN";
    internal const string EnglishCode = "en-US";
    internal static event Action<string>? LanguageChanged;
    private static readonly ResourceManager ResourceManager = new(
        "WinstallerHubApp.Resources.Strings",
        typeof(AppLanguageService).Assembly);

    internal static string CurrentLanguageCode { get; private set; } = VietnameseCode;

    internal static string NormalizeLanguageCode(string? languageCode)
    {
        if (string.IsNullOrWhiteSpace(languageCode))
        {
            return VietnameseCode;
        }

        try
        {
            return CultureInfo.GetCultureInfo(languageCode).Name;
        }
        catch (CultureNotFoundException)
        {
            return VietnameseCode;
        }
    }

    internal static void ApplyLanguage(string? languageCode)
    {
        var normalizedCode = NormalizeLanguageCode(languageCode);
        var culture = CultureInfo.GetCultureInfo(normalizedCode);

        CultureInfo.DefaultThreadCurrentCulture = culture;
        CultureInfo.DefaultThreadCurrentUICulture = culture;

        Thread.CurrentThread.CurrentCulture = culture;
        Thread.CurrentThread.CurrentUICulture = culture;

        var hasChanged = !string.Equals(CurrentLanguageCode, normalizedCode, StringComparison.OrdinalIgnoreCase);
        CurrentLanguageCode = normalizedCode;
        if (hasChanged)
        {
            LanguageChanged?.Invoke(CurrentLanguageCode);
        }
    }

    internal static string GetString(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return string.Empty;
        }

        return ResourceManager.GetString(key, CultureInfo.CurrentUICulture) ?? key;
    }

    internal static string Format(string key, params object[] args)
    {
        var template = GetString(key);
        if (args == null || args.Length == 0)
        {
            return template;
        }

        return string.Format(CultureInfo.CurrentCulture, template, args);
    }
}
