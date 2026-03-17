using System;
using System.IO;
using System.Text.Json;

namespace WinstallerHubApp.Services;

internal sealed class AppSettings
{
    public bool UseDarkTheme { get; set; } = true;
    public string LanguageCode { get; set; } = AppLanguageService.VietnameseCode;
    public string OfficeImagesPath { get; set; } = string.Empty;
}

internal static class AppSettingsService
{
    private static readonly object Sync = new();
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true
    };

    private static readonly string LegacySettingsDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "WinstallerHub");

    private static readonly string SettingsDirectory = AppContext.BaseDirectory;
    private static readonly string SettingsPath = Path.Combine(SettingsDirectory, "settings.json");
    private static readonly string LegacySettingsPath = Path.Combine(LegacySettingsDirectory, "settings.json");

    private static AppSettings _cachedSettings = LoadFromDisk();

    internal static AppSettings GetSettings()
    {
        lock (Sync)
        {
            return Clone(_cachedSettings);
        }
    }

    internal static void Update(Action<AppSettings> updateAction)
    {
        if (updateAction == null)
        {
            return;
        }

        lock (Sync)
        {
            var workingCopy = Clone(_cachedSettings);
            updateAction(workingCopy);

            _cachedSettings = Sanitize(workingCopy);
            SaveToDisk(_cachedSettings);
        }
    }

    private static AppSettings LoadFromDisk()
    {
        try
        {
            var candidatePath = ResolveSettingsPathForRead();
            if (string.IsNullOrWhiteSpace(candidatePath) || !File.Exists(candidatePath))
            {
                return new AppSettings();
            }

            var raw = File.ReadAllText(candidatePath);
            var parsed = JsonSerializer.Deserialize<AppSettings>(raw, JsonOptions);
            var sanitized = parsed == null
                ? new AppSettings()
                : Sanitize(parsed);

            if (string.Equals(candidatePath, LegacySettingsPath, StringComparison.OrdinalIgnoreCase))
            {
                // Migrate existing setting file to portable location beside executable.
                SaveToDisk(sanitized);
            }

            return sanitized;
        }
        catch
        {
            return new AppSettings();
        }
    }

    private static void SaveToDisk(AppSettings settings)
    {
        try
        {
            Directory.CreateDirectory(SettingsDirectory);
            var raw = JsonSerializer.Serialize(settings, JsonOptions);
            File.WriteAllText(SettingsPath, raw);
        }
        catch
        {
            // Ignore settings persistence failures to avoid breaking app startup.
        }
    }

    private static string ResolveSettingsPathForRead()
    {
        if (File.Exists(SettingsPath))
        {
            return SettingsPath;
        }

        if (File.Exists(LegacySettingsPath))
        {
            return LegacySettingsPath;
        }

        return SettingsPath;
    }

    private static AppSettings Sanitize(AppSettings settings)
    {
        return new AppSettings
        {
            UseDarkTheme = settings.UseDarkTheme,
            LanguageCode = AppLanguageService.NormalizeLanguageCode(settings.LanguageCode),
            OfficeImagesPath = settings.OfficeImagesPath ?? string.Empty
        };
    }

    private static AppSettings Clone(AppSettings settings)
    {
        return new AppSettings
        {
            UseDarkTheme = settings.UseDarkTheme,
            LanguageCode = settings.LanguageCode,
            OfficeImagesPath = settings.OfficeImagesPath
        };
    }
}
