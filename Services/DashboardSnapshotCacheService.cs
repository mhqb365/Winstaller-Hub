using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace WinstallerHubApp.Services;

internal static class DashboardSnapshotCacheService
{
    private static readonly object Sync = new();
    private static readonly TimeSpan RefreshInterval = TimeSpan.FromSeconds(2);
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = false
    };

    private static Timer? _refreshTimer;
    private static bool _isStarted;
    private static bool _isRefreshing;
    private static DashboardSnapshot? _latestSnapshot;
    private static string _latestSignature = string.Empty;
    private static string _lastErrorMessage = string.Empty;

    internal static event Action<DashboardSnapshot>? SnapshotUpdated;
    internal static event Action<string>? SnapshotRefreshFailed;

    internal static void Start()
    {
        lock (Sync)
        {
            if (_isStarted)
            {
                return;
            }

            _refreshTimer = new Timer(OnRefreshTimerTick, null, RefreshInterval, RefreshInterval);
            _isStarted = true;
        }

        _ = RefreshNowAsync();
    }

    internal static bool TryGetLatestSnapshot(out DashboardSnapshot snapshot)
    {
        lock (Sync)
        {
            if (_latestSnapshot == null)
            {
                snapshot = new DashboardSnapshot();
                return false;
            }

            snapshot = _latestSnapshot;
            return true;
        }
    }

    internal static Task RefreshNowAsync()
    {
        return RefreshCoreAsync();
    }

    private static void OnRefreshTimerTick(object? _)
    {
        _ = RefreshCoreAsync();
    }

    private static async Task RefreshCoreAsync()
    {
        lock (Sync)
        {
            if (_isRefreshing)
            {
                return;
            }

            _isRefreshing = true;
        }

        try
        {
            var snapshot = await Task.Run(HardwareService.GetDashboardSnapshot).ConfigureAwait(false);
            var signature = JsonSerializer.Serialize(snapshot, JsonOptions);

            var shouldNotify = false;
            lock (Sync)
            {
                if (!string.Equals(signature, _latestSignature, StringComparison.Ordinal))
                {
                    _latestSnapshot = snapshot;
                    _latestSignature = signature;
                    _lastErrorMessage = string.Empty;
                    shouldNotify = true;
                }
            }

            if (shouldNotify)
            {
                SnapshotUpdated?.Invoke(snapshot);
            }
        }
        catch (Exception ex)
        {
            var shouldNotifyError = false;
            lock (Sync)
            {
                if (!string.Equals(_lastErrorMessage, ex.Message, StringComparison.Ordinal))
                {
                    _lastErrorMessage = ex.Message;
                    shouldNotifyError = true;
                }
            }

            if (shouldNotifyError)
            {
                SnapshotRefreshFailed?.Invoke(ex.Message);
            }
        }
        finally
        {
            lock (Sync)
            {
                _isRefreshing = false;
            }
        }
    }
}
