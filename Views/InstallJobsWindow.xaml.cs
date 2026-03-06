using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Windows;
using WinstallerHubApp.Services;

namespace WinstallerHubApp.Views;

public partial class InstallJobsWindow : Window
{
    public InstallJobsWindow()
    {
        InitializeComponent();
        Loaded += InstallJobsWindow_Loaded;
        Unloaded += InstallJobsWindow_Unloaded;
    }

    private void InstallJobsWindow_Loaded(object sender, RoutedEventArgs e)
    {
        AppLanguageService.LanguageChanged += AppLanguageService_LanguageChanged;
        AppInstallJobService.JobsChanged += AppInstallJobService_JobsChanged;

        UpdateLocalizedText();
        RefreshJobs(AppInstallJobService.GetJobsSnapshot());
    }

    private void InstallJobsWindow_Unloaded(object sender, RoutedEventArgs e)
    {
        AppLanguageService.LanguageChanged -= AppLanguageService_LanguageChanged;
        AppInstallJobService.JobsChanged -= AppInstallJobService_JobsChanged;
    }

    private void AppLanguageService_LanguageChanged(string _)
    {
        Dispatcher.Invoke(() =>
        {
            UpdateLocalizedText();
            RefreshJobs(AppInstallJobService.GetJobsSnapshot());
        });
    }

    private void AppInstallJobService_JobsChanged(IReadOnlyList<AppInstallJobSnapshot> jobs)
    {
        Dispatcher.Invoke(() => RefreshJobs(jobs));
    }

    private void UpdateLocalizedText()
    {
        Title = AppLanguageService.GetString("Software.InstallJobs.WindowTitle");
        PageTitleTextBlock.Text = AppLanguageService.GetString("Software.InstallJobs.Title");
        PageDescriptionTextBlock.Text = AppLanguageService.GetString("Software.InstallJobs.Description");

        RefreshButton.Content = AppLanguageService.GetString("Software.Common.Refresh");
        ClearCompletedButton.Content = AppLanguageService.GetString("Software.InstallJobs.ClearCompleted");
        CloseButton.Content = AppLanguageService.GetString("Software.InstallJobs.Close");

        JobAppColumn.Header = AppLanguageService.GetString("Software.InstallJobs.Column.App");
        JobPackageColumn.Header = AppLanguageService.GetString("Software.InstallJobs.Column.Package");
        JobStateColumn.Header = AppLanguageService.GetString("Software.InstallJobs.Column.Status");
        JobStartedColumn.Header = AppLanguageService.GetString("Software.InstallJobs.Column.StartedAt");
        JobCompletedColumn.Header = AppLanguageService.GetString("Software.InstallJobs.Column.CompletedAt");
        JobDetailColumn.Header = AppLanguageService.GetString("Software.InstallJobs.Column.Detail");
        JobActionColumn.Header = AppLanguageService.GetString("Software.InstallJobs.Column.Action");
        EmptyTextBlock.Text = AppLanguageService.GetString("Software.InstallJobs.Empty");
    }

    private void RefreshJobs(IReadOnlyList<AppInstallJobSnapshot> jobs)
    {
        var rows = jobs
            .OrderByDescending(j => j.CreatedAt)
            .Select(ToRowViewModel)
            .ToList();

        JobsListView.ItemsSource = rows;
        EmptyTextBlock.Visibility = rows.Count == 0
            ? Visibility.Visible
            : Visibility.Collapsed;

        var inProgress = jobs.Count(j => j.State is AppInstallJobState.Queued or AppInstallJobState.Running);
        var completed = jobs.Count(j => j.State is AppInstallJobState.Succeeded or AppInstallJobState.Failed or AppInstallJobState.Canceled);

        SummaryTextBlock.Text = AppLanguageService.Format(
            "Software.InstallJobs.SummaryFormat",
            jobs.Count,
            inProgress,
            completed);
    }

    private static JobRowViewModel ToRowViewModel(AppInstallJobSnapshot job)
    {
        return new JobRowViewModel(
            job.JobId,
            job.DisplayName,
            job.PackageId,
            GetStateText(job.State),
            ToTimeText(job.StartedAt ?? job.CreatedAt),
            ToTimeText(job.CompletedAt),
            string.IsNullOrWhiteSpace(job.Detail) ? "-" : job.Detail,
            job.State is AppInstallJobState.Queued or AppInstallJobState.Running,
            AppLanguageService.GetString("Software.InstallJobs.Button.Cancel"));
    }

    private static string GetStateText(AppInstallJobState state)
    {
        return state switch
        {
            AppInstallJobState.Queued => AppLanguageService.GetString("Software.InstallJobs.State.Queued"),
            AppInstallJobState.Running => AppLanguageService.GetString("Software.InstallJobs.State.Running"),
            AppInstallJobState.Succeeded => AppLanguageService.GetString("Software.InstallJobs.State.Succeeded"),
            AppInstallJobState.Failed => AppLanguageService.GetString("Software.InstallJobs.State.Failed"),
            AppInstallJobState.Canceled => AppLanguageService.GetString("Software.InstallJobs.State.Canceled"),
            _ => AppLanguageService.GetString("Common.Unknown")
        };
    }

    private static string ToTimeText(DateTimeOffset? value)
    {
        if (!value.HasValue)
        {
            return "-";
        }

        return value.Value
            .LocalDateTime
            .ToString("g", CultureInfo.CurrentCulture);
    }

    private void RefreshButton_Click(object sender, RoutedEventArgs e)
    {
        RefreshJobs(AppInstallJobService.GetJobsSnapshot());
    }

    private void ClearCompletedButton_Click(object sender, RoutedEventArgs e)
    {
        var removedCount = AppInstallJobService.ClearCompletedJobs();
        if (removedCount > 0)
        {
            AppToastService.Show(new AppToastMessage(
                AppLanguageService.GetString("Toast.Install.Title"),
                AppLanguageService.Format("Software.InstallJobs.ClearedFormat", removedCount),
                AppToastType.Info));
        }

        RefreshJobs(AppInstallJobService.GetJobsSnapshot());
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is System.Windows.Controls.Button button && button.Tag is string jobId)
        {
            AppInstallJobService.CancelJob(jobId);
        }
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private readonly record struct JobRowViewModel(
        string JobId,
        string DisplayName,
        string PackageId,
        string StateText,
        string StartedAtText,
        string CompletedAtText,
        string Detail,
        bool CanCancel,
        string CancelText);
}
