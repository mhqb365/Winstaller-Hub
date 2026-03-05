using System;
using System.IO;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;
using WinstallerHubApp.Services;

namespace WinstallerHubApp;

public partial class App : Application
{
    private static readonly string LogDirectory = Path.Combine(AppContext.BaseDirectory, "logs");

    protected override void OnStartup(StartupEventArgs e)
    {
        Directory.CreateDirectory(LogDirectory);

        AppDomain.CurrentDomain.UnhandledException += OnUnhandledException;
        DispatcherUnhandledException += OnDispatcherUnhandledException;
        TaskScheduler.UnobservedTaskException += OnUnobservedTaskException;

        var settings = AppSettingsService.GetSettings();
        AppLanguageService.ApplyLanguage(settings.LanguageCode);
        ThemeService.ApplyTheme(settings.UseDarkTheme);

        base.OnStartup(e);
    }

    private static void OnUnhandledException(object? sender, UnhandledExceptionEventArgs e)
    {
        WriteLog("global_crash.log", e.ExceptionObject?.ToString() ?? "Unknown unhandled exception.");
    }

    private void OnDispatcherUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        WriteLog("dispatcher_crash.log", e.Exception.ToString());
        e.Handled = false;
    }

    private static void OnUnobservedTaskException(object? sender, UnobservedTaskExceptionEventArgs e)
    {
        WriteLog("task_crash.log", e.Exception.ToString());
        e.SetObserved();
    }

    private static void WriteLog(string fileName, string message)
    {
        try
        {
            var path = Path.Combine(LogDirectory, fileName);
            var logLine = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} | {message}{Environment.NewLine}";
            File.AppendAllText(path, logLine);
        }
        catch
        {
            // Do not throw from logger to avoid recursive failures on crash paths.
        }
    }
}
