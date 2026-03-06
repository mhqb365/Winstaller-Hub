using System;

namespace WinstallerHubApp.Services;

internal enum AppToastType
{
    Info,
    Success,
    Warning,
    Error
}

internal sealed record AppToastMessage(
    string Title,
    string Message,
    AppToastType Type = AppToastType.Info);

internal static class AppToastService
{
    internal static event Action<AppToastMessage>? ToastRequested;

    internal static void Show(AppToastMessage message)
    {
        ToastRequested?.Invoke(message);
    }
}
