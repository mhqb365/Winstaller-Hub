using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace WinstallerHubApp.Services;

internal enum AppInstallJobState
{
    Queued,
    Running,
    Succeeded,
    Failed,
    Canceled
}

internal enum AppInstallJobType
{
    Install,
    Uninstall,
    WingetInstall,
    WingetUninstall
}

internal enum AppInstallEnqueueResult
{
    Queued,
    AlreadyQueued,
    InvalidPackage
}

internal sealed record AppInstallEnqueueResponse(
    AppInstallEnqueueResult Result,
    AppInstallJobSnapshot? Job);

internal sealed record AppInstallJobSnapshot(
    string JobId,
    string PackageId,
    string DisplayName,
    AppInstallJobState State,
    AppInstallJobType JobType,
    DateTimeOffset CreatedAt,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    string Detail);

internal static class AppInstallJobService
{
    private sealed class AppInstallJobEntry
    {
        internal string JobId { get; init; } = Guid.NewGuid().ToString("N");
        internal string PackageId { get; init; } = string.Empty;
        internal string DisplayName { get; init; } = string.Empty;
        internal AppInstallJobState State { get; set; } = AppInstallJobState.Queued;
        internal AppInstallJobType JobType { get; init; } = AppInstallJobType.Install;
        internal DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.Now;
        internal DateTimeOffset? StartedAt { get; set; }
        internal DateTimeOffset? CompletedAt { get; set; }
        internal string Detail { get; set; } = string.Empty;
    }

    private static readonly object Sync = new();
    private static readonly List<AppInstallJobEntry> Jobs = [];
    private static readonly Dictionary<string, CancellationTokenSource> CancellationSources = [];
    private static readonly HashSet<string> BusyPackages = new(StringComparer.OrdinalIgnoreCase);
    private static readonly WingetService WingetService = new();

    internal static event Action<IReadOnlyList<AppInstallJobSnapshot>>? JobsChanged;
    internal static event Action<AppInstallJobSnapshot>? JobCompleted;

    internal static AppInstallEnqueueResponse QueueWingetInstall()
    {
        return QueueInternal("__WINGET_INSTALL__", "Windows Package Manager", AppInstallJobType.WingetInstall);
    }

    internal static AppInstallEnqueueResponse QueueWingetUninstall()
    {
        return QueueInternal("__WINGET_UNINSTALL__", "Windows Package Manager", AppInstallJobType.WingetUninstall);
    }

    internal static AppInstallEnqueueResponse QueueInstall(string? packageId, string? displayName = null)
    {
        return QueueInternal(packageId, displayName, AppInstallJobType.Install);
    }

    internal static AppInstallEnqueueResponse QueueUninstall(string? packageIdOrName, string? displayName = null)
    {
        return QueueInternal(packageIdOrName, displayName, AppInstallJobType.Uninstall);
    }

    private static AppInstallEnqueueResponse QueueInternal(string? packageId, string? displayName, AppInstallJobType jobType)
    {
        var normalizedPackageId = NormalizePackageId(packageId);
        if (string.IsNullOrWhiteSpace(normalizedPackageId))
        {
            return new AppInstallEnqueueResponse(AppInstallEnqueueResult.InvalidPackage, null);
        }

        var normalizedDisplayName = string.IsNullOrWhiteSpace(displayName)
            ? normalizedPackageId
            : displayName.Trim();

        IReadOnlyList<AppInstallJobSnapshot>? jobsSnapshot = null;
        AppInstallJobSnapshot? existingJob = null;
        AppInstallJobEntry? queuedJob = null;

        lock (Sync)
        {
            if (BusyPackages.Contains(normalizedPackageId))
            {
                existingJob = Jobs
                    .Where(j => string.Equals(j.PackageId, normalizedPackageId, StringComparison.OrdinalIgnoreCase))
                    .OrderByDescending(j => j.CreatedAt)
                    .Select(ToSnapshot)
                    .FirstOrDefault();
            }
            else
            {
                queuedJob = new AppInstallJobEntry
                {
                    PackageId = normalizedPackageId,
                    DisplayName = normalizedDisplayName,
                    JobType = jobType
                };

                BusyPackages.Add(normalizedPackageId);
                Jobs.Insert(0, queuedJob);
                jobsSnapshot = BuildSnapshotUnsafe();
            }
        }

        if (existingJob != null)
        {
            var titleKey = existingJob.JobType == AppInstallJobType.Install || existingJob.JobType == AppInstallJobType.WingetInstall ? "Toast.Install.Title" : "Toast.Uninstall.Title";
            var msgKey = existingJob.JobType == AppInstallJobType.Install || existingJob.JobType == AppInstallJobType.WingetInstall ? "Toast.Install.AlreadyQueuedFormat" : "Toast.Uninstall.AlreadyQueuedFormat";

            AppToastService.Show(new AppToastMessage(
                AppLanguageService.GetString(titleKey),
                AppLanguageService.Format(msgKey, existingJob.DisplayName),
                AppToastType.Warning));

            return new AppInstallEnqueueResponse(AppInstallEnqueueResult.AlreadyQueued, existingJob);
        }

        if (queuedJob == null || jobsSnapshot == null)
        {
            return new AppInstallEnqueueResponse(AppInstallEnqueueResult.InvalidPackage, null);
        }

        RaiseJobsChanged(jobsSnapshot);

        var queueTitleKey = queuedJob.JobType == AppInstallJobType.Install || queuedJob.JobType == AppInstallJobType.WingetInstall ? "Toast.Install.Title" : "Toast.Uninstall.Title";
        var queueMsgKey = queuedJob.JobType == AppInstallJobType.Install || queuedJob.JobType == AppInstallJobType.WingetInstall ? "Toast.Install.QueuedFormat" : "Toast.Uninstall.QueuedFormat";

        AppToastService.Show(new AppToastMessage(
            AppLanguageService.GetString(queueTitleKey),
            AppLanguageService.Format(queueMsgKey, queuedJob.DisplayName),
            AppToastType.Info));

        _ = RunInstallJobAsync(queuedJob);
        return new AppInstallEnqueueResponse(AppInstallEnqueueResult.Queued, ToSnapshot(queuedJob));
    }

    internal static bool IsPackageBusy(string? packageId)
    {
        var normalizedPackageId = NormalizePackageId(packageId);
        if (string.IsNullOrWhiteSpace(normalizedPackageId))
        {
            return false;
        }

        lock (Sync)
        {
            return BusyPackages.Contains(normalizedPackageId);
        }
    }

    internal static void CancelJob(string jobId)
    {
        CancellationTokenSource? cts = null;
        lock (Sync)
        {
            if (CancellationSources.TryGetValue(jobId, out cts))
            {
                // We keep it in the dictionary; RunInstallJobAsync will remove it and update state.
            }
            else
            {
                // If it's still Queued but not Running yet, we can mark it Canceled immediately.
                var job = Jobs.FirstOrDefault(j => j.JobId == jobId);
                if (job != null && job.State == AppInstallJobState.Queued)
                {
                    job.State = AppInstallJobState.Canceled;
                    job.CompletedAt = DateTimeOffset.Now;
                    job.Detail = AppLanguageService.GetString("Software.InstallJobs.Status.Canceled");
                    BusyPackages.Remove(job.PackageId);
                    RaiseJobsChanged(BuildSnapshotUnsafe());
                }
            }
        }

        cts?.Cancel();
    }

    internal static IReadOnlyList<AppInstallJobSnapshot> GetJobsSnapshot()
    {
        lock (Sync)
        {
            return BuildSnapshotUnsafe();
        }
    }

    internal static int ClearCompletedJobs()
    {
        IReadOnlyList<AppInstallJobSnapshot>? jobsSnapshot = null;
        int removed;

        lock (Sync)
        {
            removed = Jobs.RemoveAll(j =>
                j.State is AppInstallJobState.Succeeded or AppInstallJobState.Failed);

            if (removed > 0)
            {
                jobsSnapshot = BuildSnapshotUnsafe();
            }
        }

        if (jobsSnapshot != null)
        {
            RaiseJobsChanged(jobsSnapshot);
        }

        return removed;
    }

    private static async Task RunInstallJobAsync(AppInstallJobEntry job)
    {
        IReadOnlyList<AppInstallJobSnapshot>? jobsSnapshot;

        var cts = new CancellationTokenSource();
        lock (Sync)
        {
            if (job.State == AppInstallJobState.Canceled)
            {
                return; // Already canceled while queued.
            }

            job.State = AppInstallJobState.Running;
            job.StartedAt = DateTimeOffset.Now;
            job.Detail = string.Empty;
            CancellationSources[job.JobId] = cts;
            jobsSnapshot = BuildSnapshotUnsafe();
        }

        RaiseJobsChanged(jobsSnapshot);

        var runTitleKey = job.JobType == AppInstallJobType.Install || job.JobType == AppInstallJobType.WingetInstall ? "Toast.Install.Title" : "Toast.Uninstall.Title";
        var runMsgKey = job.JobType == AppInstallJobType.Install || job.JobType == AppInstallJobType.WingetInstall ? "Toast.Install.StartedFormat" : "Toast.Uninstall.StartedFormat";

        AppToastService.Show(new AppToastMessage(
            AppLanguageService.GetString(runTitleKey),
            AppLanguageService.Format(runMsgKey, job.DisplayName),
            AppToastType.Info));

        var detail = string.Empty;
        var state = AppInstallJobState.Failed;

        try
        {
            (bool Success, string Detail) result;
            if (job.JobType == AppInstallJobType.Install)
                result = await WingetService.InstallPackageAsync(job.PackageId, cts.Token).ConfigureAwait(false);
            else if (job.JobType == AppInstallJobType.Uninstall)
                result = await WingetService.UninstallPackageAsync(job.PackageId, cts.Token).ConfigureAwait(false);
            else if (job.JobType == AppInstallJobType.WingetInstall)
                result = await WingetService.InstallOrRepairWingetAsync().ConfigureAwait(false);
            else
                result = await WingetService.RemoveWingetAsync().ConfigureAwait(false);

            if (result.Success)
            {
                state = AppInstallJobState.Succeeded;
                detail = AppLanguageService.GetString("Toast.Install.SuccessDetail");
            }
            else
            {
                detail = string.IsNullOrWhiteSpace(result.Detail)
                    ? AppLanguageService.GetString("Software.Common.UnknownError")
                    : result.Detail;
            }
        }
        catch (OperationCanceledException)
        {
            state = AppInstallJobState.Canceled;
            detail = AppLanguageService.GetString("Software.InstallJobs.Status.Canceled");
        }
        catch (Exception ex)
        {
            state = AppInstallJobState.Failed;
            detail = ex.Message;
        }
        finally
        {
            cts.Dispose();
        }

        AppInstallJobSnapshot completedSnapshot;
        lock (Sync)
        {
            job.State = state;
            job.CompletedAt = DateTimeOffset.Now;
            job.Detail = detail;
            BusyPackages.Remove(job.PackageId);
            CancellationSources.Remove(job.JobId);
            jobsSnapshot = BuildSnapshotUnsafe();
            completedSnapshot = ToSnapshot(job);
        }

        RaiseJobsChanged(jobsSnapshot);

        if (state == AppInstallJobState.Succeeded)
        {
            var successTitleKey = job.JobType == AppInstallJobType.Install || job.JobType == AppInstallJobType.WingetInstall ? "Toast.Install.Title" : "Toast.Uninstall.Title";
            var successMsgKey = job.JobType == AppInstallJobType.Install || job.JobType == AppInstallJobType.WingetInstall ? "Toast.Install.SuccessFormat" : "Toast.Uninstall.SuccessFormat";

            AppToastService.Show(new AppToastMessage(
                AppLanguageService.GetString(successTitleKey),
                AppLanguageService.Format(successMsgKey, job.DisplayName),
                AppToastType.Success));
        }
        else
        {
            var failTitleKey = job.JobType == AppInstallJobType.Install || job.JobType == AppInstallJobType.WingetInstall ? "Toast.Install.Title" : "Toast.Uninstall.Title";
            var failMsgKey = job.JobType == AppInstallJobType.Install || job.JobType == AppInstallJobType.WingetInstall ? "Toast.Install.FailedFormat" : "Toast.Uninstall.FailedFormat";

            AppToastService.Show(new AppToastMessage(
                AppLanguageService.GetString(failTitleKey),
                AppLanguageService.Format(failMsgKey, job.DisplayName, detail),
                AppToastType.Error));
        }

        JobCompleted?.Invoke(completedSnapshot);
    }

    private static string NormalizePackageId(string? packageId)
    {
        return packageId?.Trim() ?? string.Empty;
    }

    private static IReadOnlyList<AppInstallJobSnapshot> BuildSnapshotUnsafe()
    {
        return Jobs
            .Select(ToSnapshot)
            .ToList();
    }

    private static void RaiseJobsChanged(IReadOnlyList<AppInstallJobSnapshot> snapshot)
    {
        JobsChanged?.Invoke(snapshot);
    }

    private static AppInstallJobSnapshot ToSnapshot(AppInstallJobEntry job)
    {
        return new AppInstallJobSnapshot(
            job.JobId,
            job.PackageId,
            job.DisplayName,
            job.State,
            job.JobType,
            job.CreatedAt,
            job.StartedAt,
            job.CompletedAt,
            job.Detail);
    }
}
