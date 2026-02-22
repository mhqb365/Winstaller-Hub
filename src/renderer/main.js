const installerGrid = document.getElementById("installer-grid");
const addBtn = document.getElementById("add-installer-btn");
const searchInput = document.getElementById("search-input");
document.getElementById("notification-container");
const notiHistoryList = document.getElementById("noti-history-list");
const notiToggle = document.getElementById("notification-toggle");
const notiPanel = document.getElementById("notification-panel");
const notiBadge = document.getElementById("noti-badge");
const closeNotiBtn = document.getElementById("close-noti-panel");
const clearNotiBtn = document.getElementById("clear-noti-history");
const taskToggle = document.getElementById("task-toggle");

const taskPanel = document.getElementById("task-panel");
const taskList = document.getElementById("task-list");
const taskBadge = document.getElementById("task-badge");
const closeTaskBtn = document.getElementById("close-task-panel");
const systemLoader = document.getElementById("system-loader");
const systemLoaderText = document.getElementById("system-loader-text");
let notificationHistory = [];
let unreadCount = 0;
let activeTasks = /* @__PURE__ */ new Map();
let installers = [];
let installedIds = /* @__PURE__ */ new Set();
let installedApps = [];
let installedStatusRefreshBusy = false;
let installedStatusLastRefreshAt = 0;
let installedStatusSignature = "";
let pendingInstalledRenderTimer = null;
let disposeInstalledAppsUpdatedListener = null;
let searchTerm = "";
let sysInfo = {
  hostname: "--",
  os: "--",
  cpu: "--",
  ram: "--",
  arch: "--",
};
let viewMode = localStorage.getItem("viewMode") || "list";
let officeViewMode = localStorage.getItem("officeViewMode") || "grid";
let universalFilter = true;
let x64Filter = true;
let x86Filter = true;
let officeUniversalFilter =
  localStorage.getItem("officeUniversalFilter") !== "false";
let officeX64Filter = localStorage.getItem("officeX64Filter") !== "false";
let officeX86Filter = localStorage.getItem("officeX86Filter") !== "false";
let officeSearchTerm = "";
let officeOnlineLicenseFilter = "all";
let officeOnlineSelectedProductIds = /* @__PURE__ */ new Set();
let driverBackupPath = localStorage.getItem("driverBackupPath") || "";
let driverRestorePath = localStorage.getItem("driverRestorePath") || "";
let driverBackupBusy = false;
let driverRestoreBusy = false;
let cleanupRamBusy = false;
let cleanupDiskBusy = false;
let benchmarkBusy = false;
let benchmarkHealthBusy = false;
let benchmarkLastMeta = null;
let benchmarkRunningType = "";
let benchmarkHealthData = [];
let performancePollingTimer = null;
let performancePollingBusy = false;
const PERFORMANCE_REFRESH_MS = 3e3;
const PERFORMANCE_GPU_COLORS = ["#a855f7", "#14b8a6", "#f59e0b", "#ef4444"];
const PERFORMANCE_NETWORK_COLORS = ["#06b6d4", "#0891b2", "#0ea5e9", "#2563eb"];
const PERFORMANCE_DISK_COLORS = ["#0ea5e9", "#0284c7", "#0369a1", "#38bdf8"];
const THEME_STORAGE_KEY = "themeMode";
const LANGUAGE_STORAGE_KEY = "appLanguage";
const themeToggleInput = document.getElementById("theme-mode-toggle");
const themeModeLabel = document.getElementById("theme-mode-label");
const appLanguageSelect = document.getElementById("app-language-select");
let currentLanguage = resolveLanguage(
  localStorage.getItem(LANGUAGE_STORAGE_KEY),
);
const UI_TEXT = {
  en: {
    "i18n-task-panel-title": "Tasks Progress",
    "i18n-task-empty": "No active tasks",
    "i18n-noti-panel-title": "Notifications History",
    "i18n-noti-empty": "No notifications yet",
    "i18n-clear-noti-history": "Clear History",

    "i18n-nav-dashboard": "Dashboard",
    "i18n-nav-benchmark": "Benchmark",
    "i18n-nav-library": "Applications",
    "i18n-nav-office-parent": "Office",
    "i18n-nav-office-online": "Online Setup",
    "i18n-nav-office-images": "Images Setup",
    "i18n-nav-driver": "Drivers",
    "i18n-nav-cleanup": "Cleanup",
    "i18n-nav-activation": "Activation",
    "i18n-nav-settings": "Settings",
    "i18n-nav-about": "About",
    "i18n-credit-about-label": "About",
    "i18n-credit-about-value": "Windows toolkit for auto install apps",
    "i18n-credit-version-label": "Version",
    "i18n-credit-created-label": "Created by",
    "i18n-credit-source-label": "Opensource at",
    "i18n-about-title": "About",
    "i18n-about-subtitle": "Project information",
    "i18n-dashboard-title": "Dashboard",
    "i18n-dashboard-subtitle": "Overview of your system",
    "i18n-benchmark-title": "Benchmark",
    "i18n-benchmark-subtitle": "Run disk benchmark and check disk health",
    "i18n-benchmark-controls-title": "Disk Benchmark",
    "i18n-benchmark-controls-desc":
      "Run WinSAT disk test and monitor drive health information",
    "i18n-benchmark-drive-label": "Disk drive",
    "i18n-benchmark-run-disk-btn": "Run Disk Benchmark",
    "i18n-benchmark-health-title": "Disk Health",
    "i18n-benchmark-refresh-health-btn": "Refresh",
    "i18n-benchmark-health-status-label": "Status",
    "i18n-benchmark-health-percent-label": "Health",
    "i18n-benchmark-health-model-label": "Model",
    "i18n-benchmark-health-media-label": "Media",
    "i18n-benchmark-health-size-label": "Size",
    "i18n-benchmark-health-temp-label": "Temperature",
    "i18n-benchmark-output-title": "Benchmark Output",
    "i18n-detail-machine-title": "Machine",
    "i18n-detail-machine-manufacturer-label": "Manufacturer",
    "i18n-detail-machine-hostname-label": "Hostname",
    "i18n-detail-machine-model-label": "Model",
    "i18n-detail-machine-family-label": "System Family",
    "i18n-detail-machine-arch-label": "Architecture",
    "i18n-detail-serial-title": "Service Tag / Serial",
    "i18n-detail-serial-bios-label": "BIOS Serial",
    "i18n-detail-serial-product-label": "Product ID",
    "i18n-detail-serial-uuid-label": "UUID",
    "i18n-detail-mainboard-title": "Mainboard",
    "i18n-detail-mainboard-manufacturer-label": "Manufacturer",
    "i18n-detail-mainboard-model-label": "Model",
    "i18n-detail-mainboard-serial-label": "Serial",
    "i18n-detail-mainboard-version-label": "Version",
    "i18n-detail-bios-title": "BIOS / UEFI",
    "i18n-detail-bios-manufacturer-label": "Manufacturer",
    "i18n-detail-bios-version-label": "Version",
    "i18n-detail-bios-release-label": "Release Date",
    "i18n-detail-bios-smbios-label": "SMBIOS",
    "i18n-detail-os-title": "Operating System",
    "i18n-detail-os-name-label": "Name",
    "i18n-detail-os-build-label": "Build",
    "i18n-detail-os-kernel-label": "Kernel",
    "i18n-detail-os-uptime-label": "Uptime",
    "i18n-library-title": "Applications",
    "i18n-library-subtitle": "Install your favorite applications",
    "i18n-btn-revo": "Revo Uninstaller",
    "i18n-btn-add-online": "Add Online",
    "i18n-btn-add-local": "Add Local",
    "i18n-btn-install-selected": "Install Selected",
    "i18n-btn-delete": "Delete",
    "i18n-office-local-title": "Office Images Setup",
    "i18n-office-local-subtitle":
      "Install Microsoft Office from ISO or IMG images",
    "i18n-btn-office-clean-local": "Clean Office",
    "i18n-office-online-title": "Office Online Setup",
    "i18n-office-online-subtitle": "Install or download Office from Microsoft",
    "i18n-office-online-arch-title": "Architecture",
    "i18n-office-online-mode-title": "Mode",
    "i18n-office-online-audience-title": "Audience",
    "i18n-office-online-language-title": "Language",
    "i18n-office-online-choose-products": "Choose Products",
    "i18n-btn-office-clean-online": "Clean Office",
    "i18n-btn-office-online-submit": "Install",
    "i18n-driver-title": "Driver Backup & Restore",
    "i18n-driver-subtitle":
      "Backup installed drivers and restore them when needed",
    "i18n-driver-backup-title": "Backup Drivers",
    "i18n-driver-backup-desc": "Backup all driver packages from this system",
    "i18n-driver-backup-browse": "Browse",
    "i18n-driver-backup-run": "Backup",
    "i18n-driver-backup-hint": "Should save backups on another partition",
    "i18n-driver-restore-title": "Restore Drivers",
    "i18n-driver-restore-desc": "Restore drivers from a backup folder",
    "i18n-driver-restore-browse": "Browse",
    "i18n-driver-restore-run": "Restore",
    "i18n-driver-restore-hint": "Run as Administrator for best compatibility",
    "i18n-cleanup-title": "System Cleanup",
    "i18n-cleanup-subtitle": "Free RAM and clean temporary disk data",
    "i18n-cleanup-ram-title": "RAM Cleanup",
    "i18n-cleanup-ram-desc": "Trim working sets and purge standby memory",
    "i18n-cleanup-ram-btn": "Clean RAM",
    "i18n-cleanup-ram-hint": "Best results when running as Administrator",
    "i18n-cleanup-disk-title": "Disk Deep Cleanup",
    "i18n-cleanup-disk-desc": "Remove temp files, recycle bin and more",
    "i18n-cleanup-disk-btn": "Deep Clean Disk",
    "i18n-cleanup-disk-hint": "Deep cleanup may take several minutes",
    "i18n-activation-title": "Activation",
    "i18n-activation-subtitle":
      "Activation scripts based on MAS (massgrave.dev)",
    "i18n-activation-windows-title": "Windows",
    "i18n-activation-windows-desc":
      "Permanent Digital License (HWID) activation for Windows 10 & 11",
    "i18n-activation-windows-btn": "Activate Windows",
    "i18n-activation-office-title": "Office",
    "i18n-activation-office-desc":
      "Safe Ohook method for all Office versions including Microsoft 365",
    "i18n-activation-office-btn": "Activate Office",
    "i18n-activation-troubleshoot-title": "Troubleshoot",
    "i18n-activation-troubleshoot-desc":
      "Fix common activation issues like ISPs block or TLS errors",
    "i18n-activation-dns-btn": "Run ISPs Fix",
    "i18n-activation-tls-btn": "Run TLS Fix",
    "i18n-settings-title": "Settings",
    "i18n-settings-subtitle": "Manage application data and preferences",
    "i18n-settings-appearance-title": "Appearance",
    "i18n-settings-appearance-desc": "Switch between dark and light themes",
    "i18n-settings-language-title": "Language",
    "i18n-settings-language-desc": "Choose application display language",
    "i18n-settings-reset-title": "Reset Applications",
    "i18n-settings-reset-desc":
      "Clear all saved application data. This cannot be undone",
    "i18n-settings-reset-btn": "Reset All",
    "i18n-winget-modal-title": "Search Winget Repository",
    "i18n-winget-search-btn": "Search",
    "i18n-winget-results-placeholder": "Search results will appear here",
  },
  vi: {
    "i18n-task-panel-title": "Tiến trình tác vụ",
    "i18n-task-empty": "Không có tác vụ đang chạy",
    "i18n-noti-panel-title": "Lịch sử thông báo",
    "i18n-noti-empty": "Chưa có thông báo nào",
    "i18n-clear-noti-history": "Xóa lịch sử",

    "i18n-nav-dashboard": "Bảng điều khiển",
    "i18n-nav-benchmark": "Benchmark",
    "i18n-nav-library": "Ứng dụng",
    "i18n-nav-office-parent": "Office",
    "i18n-nav-office-online": "Cài online",
    "i18n-nav-office-images": "Cài từ file",
    "i18n-nav-driver": "Driver",
    "i18n-nav-cleanup": "Dọn dẹp",
    "i18n-nav-activation": "Kích hoạt",
    "i18n-nav-settings": "Cài đặt",
    "i18n-nav-about": "Giới thiệu",
    "i18n-credit-about-label": "Giới thiệu",
    "i18n-credit-about-value": "Công cụ cài đặt ứng dụng Windows đa năng",
    "i18n-credit-version-label": "Phiên bản",
    "i18n-credit-created-label": "Tạo bởi",
    "i18n-credit-source-label": "Mã nguồn mở",
    "i18n-about-title": "Giới thiệu",
    "i18n-about-subtitle": "Thông tin dự án",
    "i18n-dashboard-title": "Bảng điều khiển",
    "i18n-dashboard-subtitle": "Tổng quan hệ thống",
    "i18n-benchmark-title": "Benchmark",
    "i18n-benchmark-subtitle":
      "Chạy benchmark ổ đĩa và kiểm tra sức khỏe ổ cứng",
    "i18n-benchmark-controls-title": "Disk Benchmark",
    "i18n-benchmark-controls-desc":
      "Chạy WinSAT Disk và theo dõi sức khỏe ổ đĩa",
    "i18n-benchmark-drive-label": "Ổ đĩa",
    "i18n-benchmark-run-disk-btn": "Chạy Disk Benchmark",
    "i18n-benchmark-health-title": "Sức khỏe ổ đĩa",
    "i18n-benchmark-refresh-health-btn": "Làm mới",
    "i18n-benchmark-health-status-label": "Trạng thái",
    "i18n-benchmark-health-percent-label": "Sức khỏe",
    "i18n-benchmark-health-model-label": "Model",
    "i18n-benchmark-health-media-label": "Loại ổ",
    "i18n-benchmark-health-size-label": "Dung lượng",
    "i18n-benchmark-health-temp-label": "Nhiệt độ",
    "i18n-benchmark-output-title": "Kết quả Benchmark",
    "i18n-detail-machine-title": "Máy",
    "i18n-detail-machine-manufacturer-label": "Hãng sản xuất",
    "i18n-detail-machine-hostname-label": "Tên máy",
    "i18n-detail-machine-model-label": "Mẫu máy",
    "i18n-detail-machine-family-label": "Dòng hệ thống",
    "i18n-detail-machine-arch-label": "Kiến trúc",
    "i18n-detail-serial-title": "Service Tag / Serial",
    "i18n-detail-serial-bios-label": "Serial BIOS",
    "i18n-detail-serial-product-label": "Product ID",
    "i18n-detail-serial-uuid-label": "UUID",
    "i18n-detail-mainboard-title": "Mainboard",
    "i18n-detail-mainboard-manufacturer-label": "Hãng sản xuất",
    "i18n-detail-mainboard-model-label": "Mẫu",
    "i18n-detail-mainboard-serial-label": "Số serial",
    "i18n-detail-mainboard-version-label": "Phiên bản",
    "i18n-detail-bios-title": "BIOS / UEFI",
    "i18n-detail-bios-manufacturer-label": "Hãng sản xuất",
    "i18n-detail-bios-version-label": "Phiên bản",
    "i18n-detail-bios-release-label": "Ngày phát hành",
    "i18n-detail-bios-smbios-label": "SMBIOS",
    "i18n-detail-os-title": "Hệ điều hành",
    "i18n-detail-os-name-label": "Tên",
    "i18n-detail-os-build-label": "Build",
    "i18n-detail-os-kernel-label": "Kernel",
    "i18n-detail-os-uptime-label": "Thời gian chạy",
    "i18n-library-title": "Ứng dụng",
    "i18n-library-subtitle": "Cài các ứng dụng yêu thích của bạn",
    "i18n-btn-revo": "Revo Uninstaller",
    "i18n-btn-add-online": "Thêm online",
    "i18n-btn-add-local": "Thêm local",
    "i18n-btn-install-selected": "Cài đã chọn",
    "i18n-btn-delete": "Xóa",
    "i18n-office-local-title": "Office Images Setup",
    "i18n-office-local-subtitle": "Cài Microsoft Office từ tệp ISO hoặc IMG",
    "i18n-btn-office-clean-local": "Dọn Office",
    "i18n-office-online-title": "Office Online Setup",
    "i18n-office-online-subtitle": "Cài hoặc tải Office từ Microsoft",
    "i18n-office-online-arch-title": "Kiến trúc",
    "i18n-office-online-mode-title": "Chế độ",
    "i18n-office-online-audience-title": "Đối tượng",
    "i18n-office-online-language-title": "Ngôn ngữ",
    "i18n-office-online-choose-products": "Chọn sản phẩm",
    "i18n-btn-office-clean-online": "Dọn Office",
    "i18n-btn-office-online-submit": "Cài đặt",
    "i18n-driver-title": "Sao lưu & Khôi phục Driver",
    "i18n-driver-subtitle": "Sao lưu driver đã cài và khôi phục khi cần",
    "i18n-driver-backup-title": "Sao lưu Driver",
    "i18n-driver-backup-desc": "Sao lưu toàn bộ gói driver từ hệ thống này",
    "i18n-driver-backup-browse": "Duyệt",
    "i18n-driver-backup-run": "Sao lưu",
    "i18n-driver-backup-hint": "Nên lưu bản sao ở phân vùng khác",
    "i18n-driver-restore-title": "Khôi phục Driver",
    "i18n-driver-restore-desc": "Khôi phục driver từ thư mục sao lưu",
    "i18n-driver-restore-browse": "Duyệt",
    "i18n-driver-restore-run": "Khôi phục",
    "i18n-driver-restore-hint": "Nên chạy Administrator để tương thích tốt",
    "i18n-cleanup-title": "Dọn dẹp hệ thống",
    "i18n-cleanup-subtitle": "Giải phóng RAM và dọn dữ liệu tạm trên ổ đĩa",
    "i18n-cleanup-ram-title": "Dọn RAM",
    "i18n-cleanup-ram-desc": "Thu gọn working set và làm sạch standby",
    "i18n-cleanup-ram-btn": "Dọn RAM",
    "i18n-cleanup-ram-hint":
      "Hiệu quả tốt hơn khi chạy với quyền Administrator",
    "i18n-cleanup-disk-title": "Dọn sâu ổ đĩa",
    "i18n-cleanup-disk-desc": "Xóa file tạm, thùng rác và cleanup",
    "i18n-cleanup-disk-btn": "Dọn sâu ổ đĩa",
    "i18n-cleanup-disk-hint": "Dọn sâu có thể mất vài phút",
    "i18n-activation-title": "Kích hoạt",
    "i18n-activation-subtitle": "Script kích hoạt dựa trên MAS (massgrave.dev)",
    "i18n-activation-windows-title": "Windows",
    "i18n-activation-windows-desc":
      "Kích hoạt Digital License vĩnh viễn (HWID) cho Windows 10 & 11",
    "i18n-activation-windows-btn": "Kích hoạt Windows",
    "i18n-activation-office-title": "Office",
    "i18n-activation-office-desc":
      "Phương pháp Ohook an toàn cho mọi phiên bản Office gồm Microsoft 365",
    "i18n-activation-office-btn": "Kích hoạt Office",
    "i18n-activation-troubleshoot-title": "Khắc phục sự cố",
    "i18n-activation-troubleshoot-desc":
      "Sửa lỗi kích hoạt thường gặp như bị ISP chặn hoặc lỗi TLS",
    "i18n-activation-dns-btn": "Chạy ISPs Fix",
    "i18n-activation-tls-btn": "Chạy TLS Fix",
    "i18n-settings-title": "Cài đặt",
    "i18n-settings-subtitle": "Quản lý dữ liệu ứng dụng và tùy chọn",
    "i18n-settings-appearance-title": "Giao diện",
    "i18n-settings-appearance-desc": "Chuyển giữa giao diện sáng và tối",
    "i18n-settings-language-title": "Ngôn ngữ",
    "i18n-settings-language-desc": "Chọn ngôn ngữ hiển thị của ứng dụng",
    "i18n-settings-reset-title": "Đặt lại ứng dụng",
    "i18n-settings-reset-desc":
      "Xóa toàn bộ dữ liệu đã lưu. Không thể hoàn tác",
    "i18n-settings-reset-btn": "Đặt lại toàn bộ",
    "i18n-winget-modal-title": "Tìm kiếm kho Winget",
    "i18n-winget-search-btn": "Tìm kiếm",
    "i18n-winget-results-placeholder": "Kết quả tìm kiếm sẽ hiển thị ở đây",
  },
};
const UI_PLACEHOLDERS = {
  en: {
    "search-input": "Search applications",
    "office-search-input": "Search Office versions",
    "benchmark-drive-input": "C:",
    "driver-backup-path": "Select backup destination folder",
    "driver-restore-path": "Select driver backup folder",
    "winget-search-input": "Enter app name (e.g. Chrome)",
  },
  vi: {
    "search-input": "Tìm ứng dụng",
    "office-search-input": "Tìm phiên bản Office",
    "benchmark-drive-input": "C:",
    "driver-backup-path": "Chọn thư mục lưu sao lưu",
    "driver-restore-path": "Chọn thư mục sao lưu driver",
    "winget-search-input": "Nhập tên app (ví dụ: Chrome)",
  },
};
const UI_TITLES = {
  en: {
    "task-toggle": "Installation tasks",
    "notification-toggle": "System notifications",
  },
  vi: {
    "task-toggle": "Tác vụ cài đặt",
    "notification-toggle": "Thông báo hệ thống",
  },
};
const MSG = {
  en: {
    processing: "Processing",
    install: "Install",
    installed: "Installed",
    download: "Download",
    backup: "Backup",
    restore: "Restore",
    browse: "Browse",
    cancel: "Cancel",
    uninstalling: "Uninstalling",
    installing: "Installing",
    downloading: "Downloading",
    noTasksRunning: "No tasks running",
    noNotificationsYet: "No notifications yet",
    winget: "Winget",
    local: "Local",
    noApplicationsFound: "No applications found",
    noOfficeInstallersFound: "No Office installers found",
    officeCatalogFull: "1. Full",
    officeCatalogStandalone: "2. Standalone",
    officeCatalogNoProducts: "No products available with current filter",
    officeCatalogNoFullSuite: "No full-suite package in this version",
    officeCatalogNoStandalone: "No standalone app in this version",
    noProductSelected: "No product selected",
    volumeLicense: "Volume License",
    retailLicense: "Retail License",
    selectedProductsSummary: "{count} products selected: {preview}{more}",
    selectedProductsMore: " +{count} more",
    errorPrefix: "Error: {message}",
    themeDarkMode: "Dark Mode",
    themeLightMode: "Light Mode",
    languageEnglish: "English",
    languageVietnamese: "Vietnamese",
    audienceAll: "All",
    audiencePersonal: "Personal",
    audienceBusiness: "Business",
    architectureX64: "x64",
    architectureX86: "x86",
    live: "Live",
    memoryUsage: "Memory usage",
    rendering: "Rendering",
    idle: "Idle",
    freeSpace: "{value} free",
    uptimeHours: "{value} hours",
    batteryTitle: "Battery",
    batteryMetric: "Metric",
    batteryName: "Name",
    batteryStatus: "Status",
    batteryLevel: "Level",
    batteryCycleCount: "Cycle Count",
    batteryDesignCapacity: "Design Capacity",
    batteryFullChargeCapacity: "Full Charge Capacity",
    batteryWearLevel: "Wear Level",
    notAvailable: "--",
    detected: "Detected",
    removeWithName: "Remove {name}?",
    removedWithName: "Removed {name}",
    benchmarkOutputEmpty: "No output yet",
    benchmarkNoRunYet: "No test run yet",
    benchmarkDisk: "Disk",
    benchmarkRunning: "Running disk benchmark",
    benchmarkCompleted: "Disk benchmark completed",
    benchmarkFailed: "Disk benchmark failed",
    benchmarkLastRun: "Last run: {test} at {time}",
    benchmarkApiUnavailable: "Benchmark API is not available",
    benchmarkHealthChecking: "Checking disk health",
    benchmarkHealthUpdated: "Disk health updated",
    benchmarkHealthFailed: "Failed to check disk health",
    benchmarkUnknown: "Unknown",
    benchmarkNotAvailable: "--",
    benchmarkDiskSize: "{value} GB",
    benchmarkDiskTemperature: "{value} °C",
    benchmarkHealthPercent: "{value} %",
    benchmarkDiskTitle: "Disk {value}",
    benchmarkDiskDrive: "Drive",
    benchmarkHealthNoData: "No disk health data available",
    systemChecking: "Checking system",
    installingSmartMon: "Checking SmartMonTools",
    wingetCheck: "Checking Winget status",
  },
  vi: {
    processing: "Đang xử lý",
    install: "Cài đặt",
    installed: "Đã cài",
    download: "Tải xuống",
    backup: "Sao lưu",
    restore: "Khôi phục",
    browse: "Duyệt",
    cancel: "Hủy",
    uninstalling: "Đang gỡ",
    installing: "Đang cài",
    downloading: "Đang tải",
    noTasksRunning: "Không có tác vụ nào",
    noNotificationsYet: "Chưa có thông báo nào",
    winget: "Winget",
    local: "Local",
    noApplicationsFound: "Không tìm thấy ứng dụng",
    noOfficeInstallersFound: "Không tìm thấy bộ cài Office",
    officeCatalogFull: "1. Trọn bộ",
    officeCatalogStandalone: "2. Ứng dụng lẻ",
    officeCatalogNoProducts: "Không có sản phẩm phù hợp với bộ lọc hiện tại",
    officeCatalogNoFullSuite: "Không có gói trọn bộ ở phiên bản này",
    officeCatalogNoStandalone: "Không có ứng dụng lẻ ở phiên bản này",
    noProductSelected: "Chưa chọn sản phẩm",
    volumeLicense: "Bản quyền Volume",
    retailLicense: "Bản quyền Retail",
    selectedProductsSummary: "Đã chọn {count} sản phẩm: {preview}{more}",
    selectedProductsMore: " +{count} mục",
    errorPrefix: "Lỗi: {message}",
    themeDarkMode: "Chế độ tối",
    themeLightMode: "Chế độ sáng",
    languageEnglish: "English",
    languageVietnamese: "Tiếng Việt",
    audienceAll: "Tất cả",
    audiencePersonal: "Cá nhân",
    audienceBusiness: "Doanh nghiệp",
    architectureX64: "x64",
    architectureX86: "x86",
    live: "Trực tiếp",
    memoryUsage: "Mức dùng bộ nhớ",
    rendering: "Đang tải",
    idle: "Nhàn rỗi",
    freeSpace: "Còn trống {value}",
    uptimeHours: "{value} giờ",
    batteryTitle: "Pin",
    batteryMetric: "Chỉ số",
    batteryName: "Tên",
    batteryStatus: "Trạng thái",
    batteryLevel: "Mức pin",
    batteryCycleCount: "Chu kỳ sạc",
    batteryDesignCapacity: "Dung lượng thiết kế",
    batteryFullChargeCapacity: "Dung lượng sạc đầy",
    batteryWearLevel: "Độ chai pin",
    notAvailable: "--",
    detected: "Đã phát hiện",
    removeWithName: "Xóa {name}?",
    removedWithName: "Đã xóa {name}",
    benchmarkOutputEmpty: "Chưa có kết quả",
    benchmarkNoRunYet: "Chưa chạy test nào",
    benchmarkDisk: "Disk",
    benchmarkRunning: "Đang chạy disk benchmark",
    benchmarkCompleted: "Disk benchmark hoàn tất",
    benchmarkFailed: "Disk benchmark thất bại",
    benchmarkLastRun: "Lần chạy gần nhất: {test} lúc {time}",
    benchmarkApiUnavailable: "Benchmark API hiện không khả dụng",
    benchmarkHealthChecking: "Đang kiểm tra sức khỏe ổ đĩa",
    benchmarkHealthUpdated: "Đã cập nhật sức khỏe ổ đĩa",
    benchmarkHealthFailed: "Không thể kiểm tra sức khỏe ổ đĩa",
    benchmarkUnknown: "Không rõ",
    benchmarkNotAvailable: "--",
    benchmarkDiskSize: "{value} GB",
    benchmarkDiskTemperature: "{value} °C",
    benchmarkHealthPercent: "{value} %",
    benchmarkDiskTitle: "Ổ {value}",
    benchmarkDiskDrive: "Drive",
    benchmarkHealthNoData: "Không có dữ liệu sức khỏe ổ đĩa",
    systemChecking: "Đang kiểm tra hệ thống",
    installingSmartMon: "Đang kiểm tra SmartMonTools",
    wingetCheck: "Đang kiểm tra Winget",
  },
};
function resolveLanguage(value) {
  return value === "vi" ? "vi" : "en";
}
function getUiLocale() {
  return currentLanguage === "vi" ? "vi-VN" : "en-US";
}
function formatTemplate(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : "",
  );
}
function tr(key, vars = {}) {
  const bundle = MSG[currentLanguage] || MSG.en;
  const fallback = MSG.en[key] || key;
  return formatTemplate(bundle[key] || fallback, vars);
}
function applyStaticI18n() {
  document.title = "Winstaller Hub";
  const textBundle = UI_TEXT[currentLanguage] || UI_TEXT.en;
  Object.entries(textBundle).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
  const placeholderBundle =
    UI_PLACEHOLDERS[currentLanguage] || UI_PLACEHOLDERS.en;
  Object.entries(placeholderBundle).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute("placeholder", value);
  });
  const titleBundle = UI_TITLES[currentLanguage] || UI_TITLES.en;
  Object.entries(titleBundle).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute("title", value);
  });
  const setLabelText = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    const target = Array.from(el.childNodes || []).find(
      (node) =>
        node.nodeType === Node.TEXT_NODE && String(node.nodeValue).trim(),
    );
    if (target) target.nodeValue = ` ${value}`;
  };
  setLabelText("office-online-arch-x64-label", tr("architectureX64"));
  setLabelText("office-online-arch-x86-label", tr("architectureX86"));
  setLabelText("office-online-mode-install-label", tr("install"));
  setLabelText("office-online-mode-download-label", tr("download"));
  setLabelText("office-online-license-all-label", tr("audienceAll"));
  setLabelText("office-online-license-retail-label", tr("audiencePersonal"));
  setLabelText("office-online-license-volume-label", tr("audienceBusiness"));
  if (appLanguageSelect) {
    const enOpt = appLanguageSelect.querySelector('option[value="en"]');
    const viOpt = appLanguageSelect.querySelector('option[value="vi"]');
    if (enOpt) enOpt.textContent = tr("languageEnglish");
    if (viOpt) viOpt.textContent = tr("languageVietnamese");
  }
  document.documentElement.setAttribute("lang", currentLanguage);
}
function applyLanguage(language, options = {}) {
  const { persist = true, rerender = true } = options;
  currentLanguage = resolveLanguage(language);
  if (persist) localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  if (appLanguageSelect) appLanguageSelect.value = currentLanguage;
  applyStaticI18n();
  if (themeModeLabel) {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    themeModeLabel.innerText =
      currentTheme === "dark" ? tr("themeLightMode") : tr("themeDarkMode");
  }
  if (!rerender) return;
  updateNotiPanelUI();
  updateTaskPanelUI();
  setDriverButtonState();
  setCleanupButtonState();
  updateBenchmarkHealthUI();
  setBenchmarkButtonState();
  updateBenchmarkDisplayMeta();
  const isOfficeCleaning = Boolean(
    (officeCleanBtn && officeCleanBtn.disabled) ||
    (officeOnlineCleanBtn && officeOnlineCleanBtn.disabled),
  );
  setOfficeCleanButtonState(isOfficeCleaning);
  updateOfficeOnlineSubmitButtonLabel();
  renderOfficeOnlineCatalog();
  refreshCurrentView();
  updateDashboardInfo();
}
function initLanguageSelector() {
  const saved = resolveLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  currentLanguage = saved;
  if (appLanguageSelect) {
    appLanguageSelect.value = saved;
    appLanguageSelect.onchange = (event) => {
      applyLanguage(event.target.value, { persist: true, rerender: true });
    };
  }
  applyLanguage(saved, { persist: false, rerender: false });
}
const officeOnlineLanguages = [
  { id: "en-us", name: "English (US)" },
  { id: "ar-sa", name: "Arabic" },
  { id: "bg-bg", name: "Bulgarian" },
  { id: "zh-cn", name: "Chinese (Simplified)" },
  { id: "zh-tw", name: "Chinese (Traditional)" },
  { id: "hr-hr", name: "Croatian" },
  { id: "cs-cz", name: "Czech" },
  { id: "da-dk", name: "Danish" },
  { id: "nl-nl", name: "Dutch" },
  { id: "et-ee", name: "Estonian" },
  { id: "fi-fi", name: "Finnish" },
  { id: "fr-fr", name: "French" },
  { id: "de-de", name: "German" },
  { id: "el-gr", name: "Greek" },
  { id: "he-il", name: "Hebrew" },
  { id: "hi-in", name: "Hindi" },
  { id: "hu-hu", name: "Hungarian" },
  { id: "id-id", name: "Indonesian" },
  { id: "it-it", name: "Italian" },
  { id: "ja-jp", name: "Japanese" },
  { id: "kk-kz", name: "Kazakh" },
  { id: "ko-kr", name: "Korean" },
  { id: "lv-lv", name: "Latvian" },
  { id: "lt-lt", name: "Lithuanian" },
  { id: "ms-my", name: "Malay" },
  { id: "nb-no", name: "Norwegian" },
  { id: "pl-pl", name: "Polish" },
  { id: "pt-br", name: "Portuguese (Brazil)" },
  { id: "pt-pt", name: "Portuguese (Portugal)" },
  { id: "ro-ro", name: "Romanian" },
  { id: "ru-ru", name: "Russian" },
  { id: "sr-latn-rs", name: "Serbian (Latin)" },
  { id: "sk-sk", name: "Slovak" },
  { id: "sl-si", name: "Slovenian" },
  { id: "es-es", name: "Spanish" },
  { id: "sv-se", name: "Swedish" },
  { id: "th-th", name: "Thai" },
  { id: "tr-tr", name: "Turkish" },
  { id: "uk-ua", name: "Ukrainian" },
  { id: "vi-vn", name: "Vietnamese" },
];
const officeOnlineCatalogData = [
  {
    key: "m365",
    title: "Microsoft 365",
    tagClass: "office-online-tag-m365",
    products: [
      {
        id: "O365ProPlusRetail",
        name: "Apps for enterprise",
        license: "retail",
      },
      {
        id: "O365BusinessRetail",
        name: "Apps for business",
        license: "retail",
      },
      { id: "O365HomePremRetail", name: "Home Premium", license: "retail" },
      { id: "AccessRetail", name: "Access", license: "retail" },
      { id: "ExcelRetail", name: "Excel", license: "retail" },
      { id: "OutlookRetail", name: "Outlook", license: "retail" },
      { id: "PowerPointRetail", name: "PowerPoint", license: "retail" },
      { id: "PublisherRetail", name: "Publisher", license: "retail" },
      { id: "WordRetail", name: "Word", license: "retail" },
      { id: "ProjectProRetail", name: "Project Pro", license: "retail" },
      { id: "ProjectStdRetail", name: "Project Standard", license: "retail" },
      { id: "VisioProRetail", name: "Visio Pro", license: "retail" },
      { id: "VisioStdRetail", name: "Visio Standard", license: "retail" },
    ],
  },
  {
    key: "2024",
    title: "Office LTSC 2024",
    tagClass: "office-online-tag-2024",
    products: [
      { id: "Professional2024Retail", name: "Professional", license: "retail" },
      { id: "Professional2024Volume", name: "Professional", license: "volume" },
      { id: "Standard2024Volume", name: "Standard", license: "volume" },
      { id: "ProPlus2024Volume", name: "Pro Plus", license: "volume" },
      { id: "ProjectPro2024Retail", name: "Project Pro", license: "retail" },
      { id: "ProjectPro2024Volume", name: "Project Pro", license: "volume" },
      {
        id: "ProjectStd2024Retail",
        name: "Project Standard",
        license: "retail",
      },
      {
        id: "ProjectStd2024Volume",
        name: "Project Standard",
        license: "volume",
      },
      { id: "VisioPro2024Retail", name: "Visio Pro", license: "retail" },
      { id: "VisioPro2024Volume", name: "Visio Pro", license: "volume" },
      { id: "VisioStd2024Retail", name: "Visio Standard", license: "retail" },
      { id: "VisioStd2024Volume", name: "Visio Standard", license: "volume" },
      { id: "Word2024Retail", name: "Word", license: "retail" },
      { id: "Word2024Volume", name: "Word", license: "volume" },
      { id: "Excel2024Retail", name: "Excel", license: "retail" },
      { id: "Excel2024Volume", name: "Excel", license: "volume" },
      { id: "PowerPoint2024Retail", name: "PowerPoint", license: "retail" },
      { id: "PowerPoint2024Volume", name: "PowerPoint", license: "volume" },
      { id: "Outlook2024Retail", name: "Outlook", license: "retail" },
      { id: "Outlook2024Volume", name: "Outlook", license: "volume" },
      { id: "Access2024Retail", name: "Access", license: "retail" },
      { id: "Access2024Volume", name: "Access", license: "volume" },
      { id: "Publisher2024Retail", name: "Publisher", license: "retail" },
      { id: "Publisher2024Volume", name: "Publisher", license: "volume" },
      { id: "HomeStudent2024Retail", name: "Home Student", license: "retail" },
      {
        id: "HomeBusiness2024Retail",
        name: "Home Business",
        license: "retail",
      },
    ],
  },
  {
    key: "2021",
    title: "Office LTSC 2021",
    tagClass: "office-online-tag-2021",
    products: [
      { id: "Professional2021Retail", name: "Professional", license: "retail" },
      { id: "Professional2021Volume", name: "Professional", license: "volume" },
      { id: "Standard2021Volume", name: "Standard", license: "volume" },
      { id: "ProPlus2021Volume", name: "Pro Plus", license: "volume" },
      { id: "ProjectPro2021Retail", name: "Project Pro", license: "retail" },
      { id: "ProjectPro2021Volume", name: "Project Pro", license: "volume" },
      {
        id: "ProjectStd2021Retail",
        name: "Project Standard",
        license: "retail",
      },
      {
        id: "ProjectStd2021Volume",
        name: "Project Standard",
        license: "volume",
      },
      { id: "VisioPro2021Retail", name: "Visio Pro", license: "retail" },
      { id: "VisioPro2021Volume", name: "Visio Pro", license: "volume" },
      { id: "VisioStd2021Retail", name: "Visio Standard", license: "retail" },
      { id: "VisioStd2021Volume", name: "Visio Standard", license: "volume" },
      { id: "Word2021Retail", name: "Word", license: "retail" },
      { id: "Word2021Volume", name: "Word", license: "volume" },
      { id: "Excel2021Retail", name: "Excel", license: "retail" },
      { id: "Excel2021Volume", name: "Excel", license: "volume" },
      { id: "PowerPoint2021Retail", name: "PowerPoint", license: "retail" },
      { id: "PowerPoint2021Volume", name: "PowerPoint", license: "volume" },
      { id: "Outlook2021Retail", name: "Outlook", license: "retail" },
      { id: "Outlook2021Volume", name: "Outlook", license: "volume" },
      { id: "Access2021Retail", name: "Access", license: "retail" },
      { id: "Access2021Volume", name: "Access", license: "volume" },
      { id: "Publisher2021Retail", name: "Publisher", license: "retail" },
      { id: "Publisher2021Volume", name: "Publisher", license: "volume" },
      { id: "HomeStudent2021Retail", name: "Home Student", license: "retail" },
      {
        id: "HomeBusiness2021Retail",
        name: "Home Business",
        license: "retail",
      },
    ],
  },
  {
    key: "2019",
    title: "Office 2019",
    tagClass: "office-online-tag-2019",
    products: [
      { id: "ProPlus2019Volume", name: "Pro Plus", license: "volume" },
      { id: "Standard2019Volume", name: "Standard", license: "volume" },
      { id: "ProjectPro2019Volume", name: "Project Pro", license: "volume" },
      {
        id: "ProjectStd2019Volume",
        name: "Project Standard",
        license: "volume",
      },
      { id: "VisioPro2019Volume", name: "Visio Pro", license: "volume" },
      { id: "VisioStd2019Volume", name: "Visio Standard", license: "volume" },
    ],
  },
];
function resolveThemeMode(value) {
  return value === "dark" ? "dark" : "light";
}
function applyThemeMode(mode, options = {}) {
  const { persist = true } = options;
  const resolvedMode = resolveThemeMode(mode);
  document.documentElement.setAttribute("data-theme", resolvedMode);
  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, resolvedMode);
  }
  if (themeToggleInput) {
    themeToggleInput.checked = resolvedMode === "dark";
  }
  if (themeModeLabel) {
    themeModeLabel.innerText =
      resolvedMode === "light" ? tr("themeDarkMode") : tr("themeLightMode");
  }
}
function initThemeToggle() {
  const savedTheme = resolveThemeMode(localStorage.getItem(THEME_STORAGE_KEY));
  applyThemeMode(savedTheme, { persist: false });
  if (!themeToggleInput) return;
  themeToggleInput.onchange = (event) => {
    const nextMode = event.target.checked ? "dark" : "light";
    applyThemeMode(nextMode, { persist: true });
  };
}
function normalizeArchitecture(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("x64")) return "x64";
  if (text.includes("x86")) return "x86";
  return "Universal";
}
function getArchitectureBadgeClass(value) {
  const arch = normalizeArchitecture(value).toLowerCase();
  if (arch === "x64") return "arch-badge arch-badge-x64";
  if (arch === "x86") return "arch-badge arch-badge-x86";
  return "arch-badge arch-badge-universal";
}
function clampPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
}
function formatNumber(value, digits = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0";
  return parsed.toFixed(digits);
}
function formatNetworkRate(bytesPerSecond) {
  const speed = Number(bytesPerSecond);
  if (!Number.isFinite(speed) || speed <= 0) return "0 KB/s";
  if (speed >= 1024 * 1024) return `${(speed / (1024 * 1024)).toFixed(2)} MB/s`;
  if (speed >= 1024) return `${(speed / 1024).toFixed(0)} KB/s`;
  return `${speed.toFixed(0)} B/s`;
}
function hasNumericValue(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
  );
}
function formatBatteryCapacity(value) {
  const capacity = Number(value);
  if (!Number.isFinite(capacity) || capacity <= 0) return tr("notAvailable");
  return `${Math.round(capacity).toLocaleString(getUiLocale())} mWh`;
}
function setPerformanceGauge(metricKey, percent, valueText, detailText) {
  const safePercent = clampPercent(percent);
  const arc = document.getElementById(`perf-${metricKey}-arc`);
  const percentEl = document.getElementById(`perf-${metricKey}-percent`);
  const valueEl = document.getElementById(`perf-${metricKey}-value`);
  const detailEl = document.getElementById(`perf-${metricKey}-detail`);
  if (arc) {
    arc.style.strokeDashoffset = `${100 - safePercent}`;
  }
  if (percentEl) {
    percentEl.innerText = `${Math.round(safePercent)}%`;
  }
  if (valueEl) {
    valueEl.innerText = valueText || "--";
  }
  if (detailEl) {
    detailEl.innerText = detailText || "--";
  }
}
function getGpuTypeFromName(name) {
  const text = String(name || "").toLowerCase();
  if (!text) return "";

  if (
    text.includes("nvidia") ||
    text.includes("geforce") ||
    text.includes("quadro") ||
    text.includes("rtx") ||
    text.includes("gtx")
  ) {
    return "dGPU";
  }

  if (text.includes("intel") || text.includes("uhd") || text.includes("iris")) {
    return "iGPU";
  }

  if (text.includes("radeon")) {
    if (
      text.includes("radeon graphics") ||
      text.includes("radeon(tm) graphics")
    ) {
      return "iGPU";
    }
    return "dGPU";
  }

  return "";
}
function renderPerformanceGpuItems(gpus) {
  const container = document.getElementById("perf-gpu-items");
  if (!container) return;

  const source = Array.isArray(gpus)
    ? gpus
    : gpus && typeof gpus === "object"
      ? [gpus]
      : [];
  const normalized = source
    .map((gpu) => ({
      name: String(gpu?.name || "").trim() || "GPU",
      percent: clampPercent(gpu?.percent),
    }))
    .filter((gpu) => gpu.name.length > 0);

  const list = (
    normalized.length > 0 ? normalized : [{ name: "--", percent: 0 }]
  ).map((gpu) => ({
    ...gpu,
    type: getGpuTypeFromName(gpu.name),
  }));

  container.innerHTML = list
    .map((gpu, index) => {
      const color =
        PERFORMANCE_GPU_COLORS[index % PERFORMANCE_GPU_COLORS.length];
      let label = "GPU";
      if (gpu.type === "iGPU") {
        const igpuCount = list
          .slice(0, index + 1)
          .filter((item) => item.type === "iGPU").length;
        label = igpuCount > 1 ? `iGPU ${igpuCount}` : "iGPU";
      } else if (gpu.type === "dGPU") {
        const dgpuCount = list
          .slice(0, index + 1)
          .filter((item) => item.type === "dGPU").length;
        label = dgpuCount > 1 ? `dGPU ${dgpuCount}` : "dGPU";
      } else if (list.length > 1) {
        label = `GPU ${index + 1}`;
      }
      const stateText = gpu.percent > 0 ? tr("rendering") : tr("idle");

      return `
        <div class="performance-item" style="--perf-color: ${color}">
          <div class="performance-gauge">
            <svg class="performance-gauge-svg" viewBox="0 0 120 70">
              <path
                class="performance-arc performance-arc-track"
                d="M 10 60 A 50 50 0 0 1 110 60"
                pathLength="100"
              ></path>
              <path
                class="performance-arc performance-arc-fill"
                d="M 10 60 A 50 50 0 0 1 110 60"
                pathLength="100"
                style="stroke-dashoffset: ${100 - gpu.percent}"
              ></path>
            </svg>
            <div class="performance-percent">${Math.round(gpu.percent)}%</div>
            <div class="performance-subvalue">${stateText}</div>
          </div>
          <div class="performance-label">${label}</div>
          <div class="performance-detail" title="${escapeHtml(gpu.name)}">${escapeHtml(gpu.name)}</div>
        </div>
      `;
    })
    .join("");
}
function renderPerformanceNetworkItems(networks) {
  const container = document.getElementById("perf-network-items");
  if (!container) return;

  const source = Array.isArray(networks)
    ? networks
    : networks && typeof networks === "object"
      ? [networks]
      : [];
  const normalized = source
    .map((item) => {
      const name = String(item?.name || "").trim() || "Network";
      const description = String(item?.description || item?.name || "")
        .trim()
        .replace(/\s+/g, " ");
      const bytesPerSec = Math.max(0, Number(item?.bytesPerSec) || 0);
      const connected =
        item?.connected === true ||
        String(item?.adapterStatus || "")
          .toLowerCase()
          .includes("up");
      const linkSpeed = String(item?.linkSpeed || "").trim();
      return {
        name,
        description,
        bytesPerSec,
        connected,
        inUse: item?.inUse === true || bytesPerSec > 0,
        linkSpeed,
      };
    })
    .filter((item) => item.name.length > 0 && item.name !== "--");

  const mergedMap = new Map();
  normalized.forEach((item) => {
    const key = (item.description || item.name).toLowerCase();
    if (!mergedMap.has(key)) {
      mergedMap.set(key, { ...item });
      return;
    }
    const existing = mergedMap.get(key);
    existing.bytesPerSec += item.bytesPerSec;
    existing.connected = existing.connected || item.connected;
    existing.inUse = existing.inUse || item.inUse;
    if (!existing.linkSpeed && item.linkSpeed) {
      existing.linkSpeed = item.linkSpeed;
    }
    if (
      existing.name.toLowerCase().startsWith("network") &&
      !item.name.toLowerCase().startsWith("network")
    ) {
      existing.name = item.name;
    }
  });

  const list = Array.from(mergedMap.values())
    .map((item) => {
      const percent = clampPercent(
        (item.bytesPerSec / (50 * 1024 * 1024)) * 100,
      );
      return {
        ...item,
        percent,
        stateText: item.inUse ? "In use" : "Idle",
      };
    })
    .filter((item) => item.connected && item.inUse)
    .sort((a, b) => b.bytesPerSec - a.bytesPerSec);

  if (list.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = list
    .map((item, index) => {
      const color =
        PERFORMANCE_NETWORK_COLORS[index % PERFORMANCE_NETWORK_COLORS.length];
      const label = list.length > 1 ? `Network ${index + 1}` : "Network";
      const detailParts = [item.stateText, item.description];
      if (item.linkSpeed) {
        detailParts.push(item.linkSpeed);
      }
      return `
        <div class="performance-item" style="--perf-color: ${color}">
          <div class="performance-gauge">
            <svg class="performance-gauge-svg" viewBox="0 0 120 70">
              <path
                class="performance-arc performance-arc-track"
                d="M 10 60 A 50 50 0 0 1 110 60"
                pathLength="100"
              ></path>
              <path
                class="performance-arc performance-arc-fill"
                d="M 10 60 A 50 50 0 0 1 110 60"
                pathLength="100"
                style="stroke-dashoffset: ${100 - item.percent}"
              ></path>
            </svg>
            <div class="performance-percent">${Math.round(item.percent)}%</div>
            <div class="performance-subvalue">${formatNetworkRate(item.bytesPerSec)} | ${escapeHtml(item.stateText)}</div>
          </div>
          <div class="performance-label">${label}</div>
          <div class="performance-detail" title="${escapeHtml(detailParts.join(" | "))}">${escapeHtml(detailParts.join(" | "))}</div>
        </div>
      `;
    })
    .join("");
}
function renderPerformanceDiskItems(disks) {
  const container = document.getElementById("perf-disk-items");
  if (!container) return;

  const source = Array.isArray(disks)
    ? disks
    : disks && typeof disks === "object"
      ? [disks]
      : [];
  const normalized = source
    .map((item) => {
      const drive = String(item?.drive || item?.name || "").trim() || "Disk";
      const usedGB = Math.max(0, Number(item?.usedGB) || 0);
      const totalGB = Math.max(0, Number(item?.totalGB) || 0);
      const freeGB = Math.max(0, Number(item?.freeGB) || 0);
      const percentRaw =
        Number(item?.percent) || (totalGB > 0 ? (usedGB / totalGB) * 100 : 0);
      return {
        drive,
        usedGB,
        totalGB,
        freeGB,
        percent: clampPercent(percentRaw),
      };
    })
    .filter((item) => item.drive.length > 0);

  const list =
    normalized.length > 0
      ? normalized
      : [{ drive: "--", usedGB: 0, totalGB: 0, freeGB: 0, percent: 0 }];

  container.innerHTML = list
    .map((item, index) => {
      const color =
        PERFORMANCE_DISK_COLORS[index % PERFORMANCE_DISK_COLORS.length];
      const label = list.length > 1 ? `Disk ${item.drive}` : "Disk";
      return `
        <div class="performance-item" style="--perf-color: ${color}">
          <div class="performance-gauge">
            <svg class="performance-gauge-svg" viewBox="0 0 120 70">
              <path
                class="performance-arc performance-arc-track"
                d="M 10 60 A 50 50 0 0 1 110 60"
                pathLength="100"
              ></path>
              <path
                class="performance-arc performance-arc-fill"
                d="M 10 60 A 50 50 0 0 1 110 60"
                pathLength="100"
                style="stroke-dashoffset: ${100 - item.percent}"
              ></path>
            </svg>
            <div class="performance-percent">${Math.round(item.percent)}%</div>
            <div class="performance-subvalue">${formatNumber(item.usedGB, 1)} / ${formatNumber(item.totalGB, 1)} GB</div>
          </div>
          <div class="performance-label">${escapeHtml(label)}</div>
          <div class="performance-detail">${tr("freeSpace", { value: `${formatNumber(item.freeGB, 1)} GB` })}</div>
        </div>
      `;
    })
    .join("");
}
async function refreshPerformanceBoard() {
  if (performancePollingBusy) return;
  if (!window.api || !window.api.getPerformanceMetrics) return;
  if (!document.getElementById("perf-cpu-arc")) return;
  performancePollingBusy = true;
  try {
    const metrics = await window.api.getPerformanceMetrics();
    if (!metrics) return;
    const cpuPercent = clampPercent(metrics.cpuPercent);
    const ramPercent = clampPercent(metrics.ramPercent);
    const cpuSpeed =
      Number(metrics.cpuSpeedGhz) > 0
        ? `${formatNumber(metrics.cpuSpeedGhz, 2)} GHz`
        : tr("live");
    setPerformanceGauge(
      "cpu",
      cpuPercent,
      cpuSpeed,
      metrics.cpuName || sysInfo.cpu || "CPU",
    );
    setPerformanceGauge(
      "ram",
      ramPercent,
      `${formatNumber(metrics.ramUsedGB, 1)} / ${formatNumber(metrics.ramTotalGB, 1)} GB`,
      tr("memoryUsage"),
    );
    renderPerformanceGpuItems(metrics.gpus);
    renderPerformanceNetworkItems(metrics.networks);
    renderPerformanceDiskItems(metrics.disks);
  } catch (error) {
  } finally {
    performancePollingBusy = false;
  }
}
function startPerformancePolling() {
  if (performancePollingTimer) return;
  refreshPerformanceBoard();
  performancePollingTimer = setInterval(() => {
    const isDashboardActive =
      tabs.dashboard && tabs.dashboard.classList.contains("active");
    if (isDashboardActive) {
      refreshPerformanceBoard();
    }
  }, PERFORMANCE_REFRESH_MS);
}
function stopPerformancePolling() {
  if (!performancePollingTimer) return;
  clearInterval(performancePollingTimer);
  performancePollingTimer = null;
}
const wingetModal = document.getElementById("winget-modal");
const wingetSearchInput = document.getElementById("winget-search-input");
const wingetSearchBtn = document.getElementById("winget-search-btn");
const wingetResults = document.getElementById("winget-results");
const addWingetBtn = document.getElementById("add-winget-btn");
const closeModal = document.getElementById("close-modal");
const officeNavGroup = document.getElementById("nav-group-office");
const officeNavParent = document.getElementById("nav-office-parent");
const navItems = {
  dashboard: document.getElementById("nav-dashboard"),
  library: document.getElementById("nav-library"),
  office: document.getElementById("nav-office"),
  officeOnline: document.getElementById("nav-office-online"),
  driver: document.getElementById("nav-driver"),
  cleanup: document.getElementById("nav-cleanup"),
  activation: document.getElementById("nav-activation"),
  settings: document.getElementById("nav-settings"),
  about: document.getElementById("nav-about"),
};
const tabs = {
  dashboard: document.getElementById("tab-dashboard"),
  library: document.getElementById("tab-library"),
  office: document.getElementById("tab-office"),
  officeOnline: document.getElementById("tab-office-online"),
  driver: document.getElementById("tab-driver"),
  cleanup: document.getElementById("tab-cleanup"),
  activation: document.getElementById("tab-activation"),
  settings: document.getElementById("tab-settings"),
  about: document.getElementById("tab-about"),
};
function switchTab(tabName) {
  const isOfficeTab = tabName === "office" || tabName === "officeOnline";
  if (officeNavParent) {
    officeNavParent.classList.toggle("active", isOfficeTab);
  }
  Object.keys(navItems).forEach((key) => {
    if (navItems[key]) {
      if (key === tabName) {
        navItems[key].classList.add("active");
        const group = navItems[key].closest(".nav-item-group");
        if (group) group.classList.add("open");
      } else {
        navItems[key].classList.remove("active");
      }
    }
  });
  Object.keys(tabs).forEach((key) => {
    if (tabs[key]) {
      if (key === tabName) {
        tabs[key].style.display = "block";
        tabs[key].classList.add("active");
        if (key === "office" || key === "library") {
          refreshCurrentView();
          refreshInstalledStatus();
        }
        if (key === "officeOnline") {
          renderOfficeOnlineCatalog();
        }
      } else {
        tabs[key].style.display = "none";
        tabs[key].classList.remove("active");
      }
    }
  });
  if (tabName === "dashboard") {
    startPerformancePolling();
    refreshBenchmarkHealth(true);
  } else {
    stopPerformancePolling();
  }
}
if (navItems.dashboard)
  navItems.dashboard.onclick = () => switchTab("dashboard");
if (navItems.library) navItems.library.onclick = () => switchTab("library");
if (navItems.office) navItems.office.onclick = () => switchTab("office");
if (navItems.officeOnline)
  navItems.officeOnline.onclick = () => switchTab("officeOnline");
if (navItems.driver) navItems.driver.onclick = () => switchTab("driver");
if (navItems.cleanup) navItems.cleanup.onclick = () => switchTab("cleanup");
if (officeNavParent && officeNavGroup) {
  officeNavParent.onclick = () => {
    officeNavGroup.classList.toggle("open");
  };
}
if (navItems.activation)
  navItems.activation.onclick = () => switchTab("activation");
if (navItems.settings) navItems.settings.onclick = () => switchTab("settings");
if (navItems.about) navItems.about.onclick = () => switchTab("about");
function showNotification(message, type = "info", duration = 4e3) {
  const time = /* @__PURE__ */ new Date().toLocaleTimeString(getUiLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  });
  notificationHistory.unshift({ message, type, time });
  updateNotiPanelUI();
  if (!notiPanel.classList.contains("active")) {
    unreadCount++;
    notiBadge.innerText = unreadCount > 9 ? "9+" : unreadCount;
    notiBadge.style.display = "flex";
  }
}
function updateNotiPanelUI() {
  if (!notiHistoryList) return;
  if (notificationHistory.length === 0) {
    notiHistoryList.innerHTML = `<p class="text-center text-muted text-sm py-8">${tr("noNotificationsYet")}</p>`;
    return;
  }
  notiHistoryList.innerHTML = notificationHistory
    .map(
      (noti) => `
    <div class="flex flex-col gap-1 p-3 rounded-lg border bg-accent-5">
      <div class="flex items-center justify-between">
         <div class="text-2xs text-muted font-bold uppercase tracking-wider">${noti.time}</div>
         <div style="width: 6px; height: 6px; border-radius: 50%; background: ${noti.type === "success" ? "#10b981" : noti.type === "error" ? "#ef4444" : "#3b82f6"}"></div>
      </div>
      <div class="text-xs font-medium">${noti.message}</div>
    </div>
  `,
    )
    .join("");
}
function applyInstalledAppsSnapshot(apps, forceRender = false) {
  installedApps = Array.isArray(apps) ? apps : [];
  const ids = [];
  installedApps.forEach((app) => {
    ids.push(String(app.name || "").toLowerCase());
    ids.push(String(app.id || "").toLowerCase());
  });
  installedIds = new Set(ids);
  const nextSignature = ids.slice().sort().join("|");
  const hasChanges = nextSignature !== installedStatusSignature;
  installedStatusSignature = nextSignature;
  installedStatusLastRefreshAt = Date.now();
  if (!forceRender && !hasChanges) return;

  const activeTag = String(document.activeElement?.tagName || "").toUpperCase();
  const isTypingNow = activeTag === "INPUT" || activeTag === "TEXTAREA";
  if (!forceRender && isTypingNow) {
    if (pendingInstalledRenderTimer) {
      clearTimeout(pendingInstalledRenderTimer);
    }
    pendingInstalledRenderTimer = setTimeout(() => {
      const currentTag = String(
        document.activeElement?.tagName || "",
      ).toUpperCase();
      if (currentTag !== "INPUT" && currentTag !== "TEXTAREA") {
        refreshCurrentView();
      }
    }, 300);
    return;
  }
  refreshCurrentView();
}
async function refreshInstalledStatus(force = false) {
  if (!window.api || !window.api.getInstalledApps) return;
  const now = Date.now();
  if (installedStatusRefreshBusy) return;
  if (!force && now - installedStatusLastRefreshAt < 8e3) return;

  installedStatusRefreshBusy = true;
  try {
    const apps = await window.api.getInstalledApps({
      force,
      waitForFresh: false,
    });
    applyInstalledAppsSnapshot(apps, force);
  } finally {
    installedStatusRefreshBusy = false;
  }
}
function refreshCurrentView() {
  if (navItems.library && navItems.library.classList.contains("active")) {
    renderInstallers();
  }
  if (navItems.office && navItems.office.classList.contains("active")) {
    renderOfficeLocal();
  }
}
function updateTaskPanelUI() {
  if (!taskList || !taskBadge) return;
  const totalTasks = activeTasks.size;
  if (totalTasks === 0) {
    taskBadge.style.display = "none";
    taskList.innerHTML = `<p class="text-center text-muted text-sm py-8">${tr("noTasksRunning")}</p>`;
    return;
  }
  taskBadge.innerText = totalTasks;
  taskBadge.style.display = "flex";
  taskList.innerHTML = "";
  activeTasks.forEach((task, path) => {
    const item = document.createElement("div");
    item.className = "p-3 rounded-lg border bg-accent-5";
    item.innerHTML = `
      <div class="flex flex-col gap-1-5">
        <div class="flex justify-between items-center">
          <span class="font-bold truncate">${task.name}</span>
          <span class="text-xs text-muted font-medium">${task.startTime}</span>
        </div>
        <div class="progress-bar-premium">
          <div class="progress-bar-premium-fill"></div>
        </div>
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <span class="text-xs text-muted tracking-widest font-bold">${task.statusLabel || (path.startsWith("uninstall-") ? tr("uninstalling") : tr("installing"))}</span>
          </div>
          <button class="btn btn-ghost h-5 px-2 text-xs font-bold" style="color: hsl(var(--destructive));" onclick="cancelTask('${path.replace(/\\/g, "\\\\")}')">${tr("cancel")}</button>
        </div>
      </div>
    `;
    taskList.appendChild(item);
  });
  if (window.lucide) window.lucide.createIcons();
}
window.cancelTask = async (path) => {
  if (
    confirm(
      currentLanguage === "vi"
        ? "Bạn chắc chắn muốn hủy tác vụ này?"
        : "Are you sure you want to cancel this task?",
    )
  ) {
    showNotification(
      currentLanguage === "vi" ? "Đang hủy tác vụ" : "Cancelling task",
      "info",
    );
    const res = await window.api.cancelInstallation(path);
    if (res.success) {
      activeTasks.delete(path);
      updateTaskPanelUI();
      refreshCurrentView();
      showNotification(
        currentLanguage === "vi" ? "Đã hủy cài đặt" : "Installation cancelled",
        "info",
      );
    } else {
      showNotification(
        currentLanguage === "vi"
          ? `Hủy thất bại: ${res.error}`
          : `Failed to cancel: ${res.error}`,
        "error",
      );
    }
  }
};
async function initSysInfo() {
  if (window.api && window.api.getSysInfo) {
    sysInfo = await window.api.getSysInfo();
    updateDashboardInfo();
  }
}
function renderBatteryDetailCards() {
  const container = document.getElementById("detail-battery-cards");
  if (!container) return;

  const rawItems = Array.isArray(sysInfo.batteryItems)
    ? sysInfo.batteryItems
    : sysInfo.batteryItems && typeof sysInfo.batteryItems === "object"
      ? [sysInfo.batteryItems]
      : [];

  const normalizedItems = rawItems
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const rawName = String(item.name || "").trim();
      const rawStatus = String(item.status || "").trim();
      return {
        rawName,
        rawStatus,
        name: rawName || tr("batteryTitle"),
        status: rawStatus || tr("detected"),
        level: hasNumericValue(item.level)
          ? Math.round(Number(item.level))
          : null,
        cycleCount: hasNumericValue(item.cycleCount)
          ? Math.round(Number(item.cycleCount))
          : null,
        designCapacity: hasNumericValue(item.designCapacity)
          ? Math.round(Number(item.designCapacity))
          : null,
        currentCapacity: hasNumericValue(item.currentCapacity)
          ? Math.round(Number(item.currentCapacity))
          : null,
        fullChargeCapacity: hasNumericValue(item.fullChargeCapacity)
          ? Math.round(Number(item.fullChargeCapacity))
          : null,
        wearLevel: hasNumericValue(item.wearLevel)
          ? Math.round(Number(item.wearLevel))
          : null,
      };
    })
    .filter((item) => {
      const nameText = item.rawName.toLowerCase();
      const statusText = item.rawStatus.toLowerCase();
      const hasUsefulName =
        !!nameText &&
        nameText !== "battery" &&
        nameText !== "--" &&
        nameText !== "unknown";
      const hasUsefulStatus =
        !!statusText &&
        statusText !== "detected" &&
        statusText !== "unknown" &&
        statusText !== "--" &&
        statusText !== "no battery";
      return (
        hasUsefulName ||
        hasUsefulStatus ||
        item.level !== null ||
        item.cycleCount !== null ||
        item.designCapacity !== null ||
        item.currentCapacity !== null ||
        item.fullChargeCapacity !== null ||
        item.wearLevel !== null
      );
    })
    .map(({ rawName, rawStatus, ...item }) => item);

  const fallbackItem = {
    name:
      sysInfo.batteryPresent === true
        ? String(sysInfo.batteryName || tr("batteryTitle"))
        : tr("notAvailable"),
    status:
      sysInfo.batteryPresent === true
        ? String(sysInfo.batteryStatus || tr("detected"))
        : currentLanguage === "vi"
          ? "Không có pin"
          : "No battery",
    level: hasNumericValue(sysInfo.batteryLevel)
      ? Math.round(Number(sysInfo.batteryLevel))
      : null,
    cycleCount: hasNumericValue(sysInfo.batteryCycleCount)
      ? Math.round(Number(sysInfo.batteryCycleCount))
      : null,
    designCapacity: hasNumericValue(sysInfo.batteryDesignCapacity)
      ? Math.round(Number(sysInfo.batteryDesignCapacity))
      : null,
    currentCapacity: hasNumericValue(sysInfo.batteryCurrentCapacity)
      ? Math.round(Number(sysInfo.batteryCurrentCapacity))
      : null,
    fullChargeCapacity: hasNumericValue(sysInfo.batteryFullChargeCapacity)
      ? Math.round(Number(sysInfo.batteryFullChargeCapacity))
      : null,
    wearLevel: hasNumericValue(sysInfo.batteryWearLevel)
      ? Math.round(Number(sysInfo.batteryWearLevel))
      : null,
  };

  const list = normalizedItems.length > 0 ? normalizedItems : [fallbackItem];
  const shouldEnableHorizontalScroll = list.length > 2;
  const tableMinWidth = shouldEnableHorizontalScroll
    ? `${260 + list.length * 220}px`
    : "100%";
  const columnHeaders = list
    .map((battery, index) => {
      const title =
        list.length > 1
          ? `${tr("batteryTitle")} ${index + 1}`
          : tr("batteryTitle");
      return `<th class="battery-value-col" title="${escapeHtml(battery.name)}">${escapeHtml(title)}</th>`;
    })
    .join("");

  const metricRows = [
    {
      label: tr("batteryName"),
      value: (battery, index) =>
        battery.name || `${tr("batteryTitle")} ${index + 1}`,
    },
    {
      label: tr("batteryStatus"),
      value: (battery) => battery.status || tr("detected"),
    },
    {
      label: tr("batteryLevel"),
      value: (battery) =>
        battery.level !== null
          ? `${Math.round(battery.level)}%`
          : tr("notAvailable"),
    },
    {
      label: tr("batteryCycleCount"),
      value: (battery) =>
        battery.cycleCount !== null
          ? battery.cycleCount.toLocaleString(getUiLocale())
          : tr("notAvailable"),
    },
    {
      label: tr("batteryDesignCapacity"),
      value: (battery) => formatBatteryCapacity(battery.designCapacity),
    },
    // {
    //   label: "Current Capacity",
    //   value: (battery) => formatBatteryCapacity(battery.currentCapacity),
    // },
    {
      label: tr("batteryFullChargeCapacity"),
      value: (battery) => formatBatteryCapacity(battery.fullChargeCapacity),
    },
    {
      label: tr("batteryWearLevel"),
      value: (battery) =>
        battery.wearLevel !== null
          ? `${Math.round(battery.wearLevel)}%`
          : tr("notAvailable"),
    },
  ];

  const bodyRows = metricRows
    .map((metric) => {
      const valueCells = list
        .map(
          (battery, index) =>
            `<td class="battery-value-cell">${escapeHtml(metric.value(battery, index))}</td>`,
        )
        .join("");
      return `
        <tr>
          <td class="battery-label-cell">${escapeHtml(metric.label)}</td>
          ${valueCells}
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="card detail-card battery-matrix-card">
      <div class="detail-card-title">
        <i data-lucide="battery-charging" style="width: 15px; height: 15px"></i>
        ${tr("batteryTitle")}
      </div>
      <div class="battery-matrix-scroll${shouldEnableHorizontalScroll ? " is-scrollable" : ""}">
        <table class="battery-matrix-table" style="min-width: ${tableMinWidth}">
          <thead>
            <tr>
              <th class="battery-label-col">${tr("batteryMetric")}</th>
              ${columnHeaders}
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function updateDashboardInfo() {
  const setDetailValue = (id, value) => {
    const element = document.getElementById(id);
    if (!element) return;
    const text =
      value === null || value === undefined || String(value).trim() === ""
        ? "--"
        : String(value);
    element.innerText = text;
  };
  const normalizeOsDisplayName = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return raw
      .replace(/^microsoft\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // setDetailValue("detail-machine-type", sysInfo.machineType);
  setDetailValue("detail-machine-manufacturer", sysInfo.manufacturer);
  setDetailValue("detail-machine-hostname", sysInfo.hostname);
  setDetailValue("detail-machine-model", sysInfo.model);
  setDetailValue("detail-machine-family", sysInfo.systemFamily);
  setDetailValue("detail-machine-arch", sysInfo.arch);

  setDetailValue("detail-serial-service", sysInfo.serviceTag);
  setDetailValue("detail-serial-product", sysInfo.productId);
  setDetailValue("detail-serial-uuid", sysInfo.uuid);

  setDetailValue("detail-board-manufacturer", sysInfo.boardManufacturer);
  setDetailValue("detail-board-model", sysInfo.boardModel);
  setDetailValue("detail-board-serial", sysInfo.boardSerial);
  setDetailValue("detail-board-version", sysInfo.boardVersion);

  setDetailValue("detail-bios-manufacturer", sysInfo.biosManufacturer);
  setDetailValue("detail-bios-version", sysInfo.biosVersion);
  setDetailValue("detail-bios-release", sysInfo.biosReleaseDate);
  setDetailValue("detail-bios-smbios", sysInfo.smbiosVersion);

  const osNameRaw = sysInfo.osDisplayName || sysInfo.os;
  const osNameClean = normalizeOsDisplayName(osNameRaw);
  setDetailValue("detail-os-name", osNameClean || osNameRaw);
  setDetailValue("detail-os-build", sysInfo.osBuild);
  setDetailValue("detail-os-version", sysInfo.osVersion);
  setDetailValue(
    "detail-os-uptime",
    Number.isFinite(Number(sysInfo.uptime))
      ? tr("uptimeHours", { value: Math.round(Number(sysInfo.uptime)) })
      : "--",
  );
  renderBatteryDetailCards();
  if (window.lucide) window.lucide.createIcons();
}
function toLucideIconKey(name) {
  return String(name || "")
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}
function replaceLucidePlaceholders(root) {
  if (
    !root ||
    !window.lucide ||
    !window.lucide.icons ||
    !window.lucide.createElement
  ) {
    return;
  }
  const targets = [];
  if (root.matches && root.matches("[data-lucide]")) {
    targets.push(root);
  }
  if (root.querySelectorAll) {
    targets.push(...root.querySelectorAll("[data-lucide]"));
  }
  targets.forEach((node) => {
    if (!node || String(node.tagName || "").toLowerCase() === "svg") return;
    const rawName = node.getAttribute("data-lucide");
    if (!rawName) return;
    const iconKey = toLucideIconKey(rawName);
    const iconData = window.lucide.icons[iconKey];
    if (!iconData) return;

    const attrs = {};
    Array.from(node.attributes || []).forEach((attr) => {
      attrs[attr.name] = attr.value;
    });
    const classParts = [
      "lucide",
      `lucide-${rawName}`,
      String(attrs.class || "").trim(),
    ]
      .join(" ")
      .split(/\s+/)
      .filter(Boolean);
    attrs.class = Array.from(new Set(classParts)).join(" ");
    if (!("aria-label" in attrs) && !("role" in attrs) && !("title" in attrs)) {
      attrs["aria-hidden"] = "true";
    }
    const svg = window.lucide.createElement(iconData, attrs);
    if (node.parentNode) {
      node.parentNode.replaceChild(svg, node);
    }
  });
}
function renderInstallers() {
  if (!installerGrid) return;
  const filtered = installers.filter((app) => {
    const matchesSearch = app.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const appArch = (app.arch || "universal").toLowerCase();
    let matchesArch = false;
    if (!universalFilter && !x64Filter && !x86Filter) {
      matchesArch = true;
    } else {
      if (universalFilter && appArch.includes("universal")) matchesArch = true;
      if (x64Filter && appArch.includes("x64")) matchesArch = true;
      if (x86Filter && appArch.includes("x86")) matchesArch = true;
    }
    return matchesSearch && matchesArch;
  });
  filtered.sort((a, b) =>
    String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
      sensitivity: "base",
      numeric: true,
    }),
  );
  installerGrid.innerHTML = "";
  installerGrid.className =
    viewMode === "grid" ? "installer-grid" : "flex flex-col gap-2";
  const installedLocalEntries = installedApps
    .map((sys) => ({
      id: String(sys.id || "").trim(),
      nameLower: String(sys.name || "")
        .toLowerCase()
        .trim(),
    }))
    .filter((sys) => sys.id && sys.nameLower);
  const findMatchingInstalledId = (app) => {
    if (!app) return null;
    if (app.isWinget) {
      return installedIds.has(String(app.path || "").toLowerCase())
        ? app.path
        : null;
    }
    const appNameLower = String(app.name || "")
      .toLowerCase()
      .trim();
    const firstToken = appNameLower.split(/\s+/).find(Boolean) || appNameLower;
    if (!appNameLower) return null;
    const matched = installedLocalEntries.find(
      (sys) =>
        appNameLower.includes(sys.nameLower) ||
        sys.nameLower.includes(firstToken),
    );
    return matched ? matched.id : null;
  };
  const viewToggleIcon = document.getElementById("view-toggle-icon");
  if (viewToggleIcon) {
    viewToggleIcon.setAttribute(
      "data-lucide",
      viewMode === "grid" ? "list" : "layout-grid",
    );
  }
  if (filtered.length === 0) {
    installerGrid.innerHTML = `
      <div class="col-span-full py-12 text-center text-muted">
        <i data-lucide="package-search" class="mx-auto mb-2 opacity-20" style="width:48px;height:48px;"></i>
        <p class="text-sm">${tr("noApplicationsFound")}</p>
      </div>
    `;
    replaceLucidePlaceholders(installerGrid);
    return;
  }
  const fragment = document.createDocumentFragment();
  filtered.forEach((app, index) => {
    const card = document.createElement("div");
    card.className = "card installer-card";
    const appArch = normalizeArchitecture(app.arch);
    const appArchBadgeClass = getArchitectureBadgeClass(appArch);
    const matchingId = findMatchingInstalledId(app);
    if (viewMode === "grid") {
      card.innerHTML = `
        <div class="flex items-center gap-3 mb-4">
          <div class="stat-icon" style="width: 40px; height: 40px; display:flex; align-items:center; justify-content:center; background:hsl(var(--accent)); border-radius:var(--radius);">
            <i data-lucide="package"></i>
          </div>
          <div class="truncate">
            <h3 class="text-sm font-bold truncate">${app.name}</h3>
            <p class="text-2xs text-muted truncate">${app.isWinget ? tr("winget") : tr("local")}</p>
          </div>
        </div>
        <div class="flex items-center justify-between mt-auto pt-4 border-t border-border">
          <span class="${appArchBadgeClass}">${appArch}</span>
          ${(() => {
            const isInstalling = activeTasks.has(app.path);
            const isUninstalling =
              matchingId && activeTasks.has(`uninstall-${matchingId}`);
            if (isInstalling || isUninstalling) {
              return `<button class="btn btn-outline h-8 px-4 text-xs opacity-80 cursor-not-allowed flex items-center justify-center gap-2" disabled style="border-color: rgba(59, 130, 246, 0.4); color: #3b82f6; background: rgba(59, 130, 246, 0.05);">
                ${tr("processing")}
              </button>`;
            } else if (matchingId) {
              return `<button class="btn btn-outline h-8 px-4 text-xs" style="border-color: #10b981; color: #10b981; pointer-events: none;">${tr("installed")}</button>`;
            }
            return `<button class="btn btn-primary h-8 px-4 text-xs" data-index="${index}">${tr("install")}</button>`;
          })()}
        </div>
      `;
    } else {
      card.style.display = "grid";
      card.style.gridTemplateColumns = "48px 1fr 1fr 100px 100px 40px";
      card.style.alignItems = "center";
      card.style.padding = "0.6rem 1rem";
      card.style.gap = "1rem";
      const isInstalled = !!matchingId;
      card.innerHTML = `
          <div class="flex justify-center"><i data-lucide="package" style="width:20px; color:hsl(var(--muted-foreground))"></i></div>
          <div class="font-bold text-sm truncate">${app.name}</div>
          <div class="text-xs text-muted truncate">${app.isWinget ? tr("winget") : tr("local")}</div>
          <div class="text-center font-bold text-2xs"><span class="${appArchBadgeClass}">${appArch}</span></div>
          <div class="flex justify-center">${(() => {
            const isInstalling = activeTasks.has(app.path);
            const isUninstalling =
              matchingId && activeTasks.has(`uninstall-${matchingId}`);
            if (isInstalling || isUninstalling) {
              return `<button class="btn btn-outline h-8 px-4 text-xs opacity-80 cursor-not-allowed flex items-center justify-center gap-2" disabled style="border-color: rgba(59, 130, 246, 0.4); color: #3b82f6; background: rgba(59, 130, 246, 0.05);">
                ${tr("processing")}
              </button>`;
            }
            return isInstalled
              ? `<button class="btn btn-outline h-8 px-4 text-xs" style="border-color: #10b981; color: #10b981; pointer-events: none;">${tr("installed")}</button>`
              : `<button class="btn btn-primary h-8 px-4 text-xs" data-index="${index}">${tr("install")}</button>`;
          })()}</div>
          <div class="flex justify-center"><button class="btn btn-ghost h-8 w-8 p-0 text-destructive delete-btn" data-index="${index}"><i data-lucide="trash-2" style="width:14px"></i></button></div>
        `;
    }
    const installBtn = card.querySelector(".btn-primary");
    if (installBtn) installBtn.onclick = () => runInstaller(app.path, app.name);
    const deleteBtn = card.querySelector(".delete-btn");
    if (deleteBtn) {
      deleteBtn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (confirm(tr("removeWithName", { name: app.name }))) {
          const removedApp = app;
          installers = installers.filter((i) => i.path !== removedApp.path);
          renderInstallers();
          showNotification(
            tr("removedWithName", { name: removedApp.name }),
            "info",
          );
          setTimeout(() => {
            const activeTag = String(
              document.activeElement?.tagName || "",
            ).toLowerCase();
            if (activeTag === "input" || activeTag === "textarea") return;
            const fallbackInput =
              wingetModal && wingetModal.classList.contains("active")
                ? wingetSearchInput
                : searchInput;
            if (fallbackInput && document.contains(fallbackInput)) {
              fallbackInput.focus({ preventScroll: true });
            }
          }, 0);
          if (window.api && window.api.saveLibrary) {
            try {
              await window.api.saveLibrary(installers);
            } catch (err) {
              console.error("Error saving library after remove:", err);
            }
          }
          if (!removedApp.isWinget && window.api && window.api.deleteFile) {
            window.api
              .deleteFile(removedApp.path)
              .then((result) => {
                if (result && result.success) {
                  console.log(`Deleted file from disk: ${removedApp.path}`);
                } else if (result && result.error) {
                  showNotification(
                    currentLanguage === "vi"
                      ? `Đã xóa khỏi thư viện nhưng xóa file thất bại: ${result.error}`
                      : `Removed from library, but file delete failed: ${result.error}`,
                    "error",
                  );
                }
              })
              .catch((err) =>
                console.error("Error deleting file from disk:", err),
              );
          }
        }
      };
    }
    replaceLucidePlaceholders(card);
    fragment.appendChild(card);
  });
  installerGrid.appendChild(fragment);
}
async function runInstaller(path, name) {
  const startTime = /* @__PURE__ */ new Date().toLocaleTimeString(
    getUiLocale(),
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  activeTasks.set(path, { name, startTime });
  updateTaskPanelUI();
  refreshCurrentView();
  showNotification(
    currentLanguage === "vi" ? `Đang cài ${name}` : `Installing ${name}`,
    "info",
  );
  try {
    let result;
    if (
      path.toLowerCase().endsWith(".iso") ||
      path.toLowerCase().endsWith(".img")
    ) {
      result = await window.api.installOfficeLocal(path);
    } else {
      result = await window.api.runInstaller(path);
    }
    activeTasks.delete(path);
    updateTaskPanelUI();
    refreshCurrentView();
    if (result && result.success) {
      showNotification(
        currentLanguage === "vi"
          ? `Đã cài ${name} thành công`
          : `Successfully installed ${name}`,
        "success",
      );
      refreshInstalledStatus(true);
    } else {
      showNotification(
        currentLanguage === "vi"
          ? `Cài ${name} thất bại${result && result.error ? ": " + result.error : ""}`
          : `Failed to install ${name}${result && result.error ? ": " + result.error : ""}`,
        "error",
      );
    }
  } catch (e) {
    activeTasks.delete(path);
    updateTaskPanelUI();
    refreshCurrentView();
    showNotification(tr("errorPrefix", { message: e.message }), "error");
  }
}
const officeList = document.getElementById("office-list");
const officeSearchInput = document.getElementById("office-search-input");
const officeViewToggle = document.getElementById("office-view-toggle");
const officeUniversalCheck = document.getElementById("office-filter-universal");
const officeX64Check = document.getElementById("office-filter-x64");
const officeX86Check = document.getElementById("office-filter-x86");
const officeCleanBtn = document.getElementById("office-clean-btn");
const officeOnlineCatalogEl = document.getElementById("office-online-catalog");
const officeOnlineLanguageSelect = document.getElementById(
  "office-online-language",
);
const officeOnlineSelectedLabel = document.getElementById(
  "office-online-selected-label",
);
const officeOnlineSubmitBtn = document.getElementById(
  "office-online-submit-btn",
);
const officeOnlineCleanBtn = document.getElementById("office-online-clean-btn");
const officeOnlineModeInputs = document.querySelectorAll(
  'input[name="office-online-mode"]',
);
const officeOnlineLicenseInputs = document.querySelectorAll(
  'input[name="office-online-license"]',
);
const driverBackupPathInput = document.getElementById("driver-backup-path");
const driverBackupBrowseBtn = document.getElementById(
  "driver-backup-browse-btn",
);
const driverBackupRunBtn = document.getElementById("driver-backup-run-btn");
const driverRestorePathInput = document.getElementById("driver-restore-path");
const driverRestoreBrowseBtn = document.getElementById(
  "driver-restore-browse-btn",
);
const driverRestoreRunBtn = document.getElementById("driver-restore-run-btn");
const cleanupRamBtn = document.getElementById("cleanup-ram-btn");
const cleanupDiskBtn = document.getElementById("cleanup-disk-btn");
const cleanupRamResultEl = document.getElementById("cleanup-ram-result");
const cleanupDiskResultEl = document.getElementById("cleanup-disk-result");
const benchmarkDriveInput = document.getElementById("benchmark-drive-input");
const benchmarkRunDiskBtn = document.getElementById("benchmark-run-disk-btn");
const benchmarkOutputEl = document.getElementById("benchmark-output");
const benchmarkLastRunEl = document.getElementById("benchmark-last-run");
const benchmarkHealthCardsEl = document.getElementById(
  "benchmark-health-cards",
);
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function getOfficeOnlineChannel(productId) {
  if (productId.includes("2024Volume")) return "PerpetualVL2024";
  if (productId.includes("2021Volume")) return "PerpetualVL2021";
  if (productId.includes("2019Volume")) return "PerpetualVL2019";
  return "Current";
}
function getOfficeOnlineFilteredCatalog() {
  return officeOnlineCatalogData
    .map((version) => ({
      ...version,
      products: version.products.filter(
        (product) =>
          officeOnlineLicenseFilter === "all" ||
          product.license === officeOnlineLicenseFilter,
      ),
    }))
    .filter((version) => version.products.length > 0);
}
function isOfficeOnlineFullSuiteName(name) {
  const suiteNames = /* @__PURE__ */ new Set([
    "apps for enterprise",
    "apps for business",
    "home premium",
    "professional",
    "standard",
    "pro plus",
    "home student",
    "home business",
  ]);
  return suiteNames.has(
    String(name || "")
      .toLowerCase()
      .trim(),
  );
}
function findOfficeOnlineProduct(productId) {
  for (const version of officeOnlineCatalogData) {
    const matched = version.products.find(
      (product) => product.id === productId,
    );
    if (matched) {
      return {
        ...matched,
        versionKey: version.key,
        versionTitle: version.title,
        tagClass: version.tagClass,
      };
    }
  }
  return null;
}
function ensureOfficeOnlineSelection(filteredCatalog) {
  const visibleIds = filteredCatalog.flatMap((version) =>
    version.products.map((product) => product.id),
  );
  if (visibleIds.length === 0) {
    officeOnlineSelectedProductIds = /* @__PURE__ */ new Set();
    return;
  }
  const prunedSelection = Array.from(officeOnlineSelectedProductIds).filter(
    (id) => visibleIds.includes(id),
  );
  officeOnlineSelectedProductIds = new Set(prunedSelection);
}
function getSelectedOfficeOnlineProducts() {
  return Array.from(officeOnlineSelectedProductIds)
    .map((id) => findOfficeOnlineProduct(id))
    .filter(Boolean);
}
function updateOfficeOnlineSelectionLabel() {
  if (!officeOnlineSelectedLabel) return;
  const selectedProducts = getSelectedOfficeOnlineProducts();
  if (selectedProducts.length === 0) {
    officeOnlineSelectedLabel.innerText = tr("noProductSelected");
    return;
  }
  if (selectedProducts.length === 1) {
    const selected = selectedProducts[0];
    const licenseText =
      selected.license === "volume" ? tr("volumeLicense") : tr("retailLicense");
    officeOnlineSelectedLabel.innerText = `${selected.versionTitle} - ${selected.name} (${licenseText})`;
    return;
  }
  const preview = selectedProducts
    .slice(0, 3)
    .map((product) => product.name)
    .join(", ");
  const more =
    selectedProducts.length > 3
      ? tr("selectedProductsMore", { count: selectedProducts.length - 3 })
      : "";
  officeOnlineSelectedLabel.innerText = tr("selectedProductsSummary", {
    count: selectedProducts.length,
    preview,
    more,
  });
}
function renderOfficeOnlineLanguages() {
  if (!officeOnlineLanguageSelect) return;
  if (officeOnlineLanguageSelect.options.length > 0) return;
  officeOnlineLanguageSelect.innerHTML = officeOnlineLanguages
    .map(
      (language) =>
        `<option value="${language.id}">${escapeHtml(language.name)}</option>`,
    )
    .join("");
  const savedLanguage = localStorage.getItem("officeOnlineLanguageId");
  if (
    savedLanguage &&
    officeOnlineLanguages.some((language) => language.id === savedLanguage)
  ) {
    officeOnlineLanguageSelect.value = savedLanguage;
  } else {
    officeOnlineLanguageSelect.value = "en-us";
  }
}
function renderOfficeOnlineCatalog() {
  if (!officeOnlineCatalogEl) return;
  renderOfficeOnlineLanguages();
  const filteredCatalog = getOfficeOnlineFilteredCatalog();
  ensureOfficeOnlineSelection(filteredCatalog);
  if (filteredCatalog.length === 0) {
    officeOnlineCatalogEl.innerHTML = `
      <div class="office-online-empty">
        <p>${tr("officeCatalogNoProducts")}</p>
      </div>
    `;
    updateOfficeOnlineSelectionLabel();
    return;
  }
  officeOnlineCatalogEl.innerHTML = filteredCatalog
    .map((version) => {
      const groupedProducts = {
        suites: [],
        apps: [],
      };
      version.products.forEach((product) => {
        if (isOfficeOnlineFullSuiteName(product.name)) {
          groupedProducts.suites.push(product);
        } else {
          groupedProducts.apps.push(product);
        }
      });
      const renderFlatProductList = (products) =>
        products
          .map((product) => {
            const checked = officeOnlineSelectedProductIds.has(product.id);
            const checkedClass = checked ? "is-selected" : "";
            const licenseLabel =
              product.license === "volume"
                ? currentLanguage === "vi"
                  ? "Volume"
                  : "Volume"
                : currentLanguage === "vi"
                  ? "Retail"
                  : "Retail";
            const rowLabel = `${product.name} ${licenseLabel}`;
            return `
              <label class="office-online-product-option ${checkedClass}">
                <input type="checkbox" name="office-online-product" value="${product.id}" ${checked ? "checked" : ""} />
                <span class="office-online-product-name">${escapeHtml(rowLabel)}</span>
              </label>
            `;
          })
          .join("");
      const suiteListHtml = renderFlatProductList(groupedProducts.suites);
      const appListHtml = renderFlatProductList(groupedProducts.apps);
      const productsHtml = `
        <div class="office-online-major-group">
          <div class="office-online-major-title">${tr("officeCatalogFull")}</div>
          ${
            suiteListHtml
              ? `
                <div class="office-online-product-block office-online-fullsuite-list">
                  <div class="office-online-product-block-options">
                    ${suiteListHtml}
                  </div>
                </div>
              `
              : `<div class="office-online-major-empty">${tr("officeCatalogNoFullSuite")}</div>`
          }
        </div>
        <div class="office-online-major-group">
          <div class="office-online-major-title">${tr("officeCatalogStandalone")}</div>
          ${
            appListHtml
              ? `
                <div class="office-online-product-block office-online-standalone-list">
                  <div class="office-online-product-block-options">
                    ${appListHtml}
                  </div>
                </div>
              `
              : `<div class="office-online-major-empty">${tr("officeCatalogNoStandalone")}</div>`
          }
        </div>
      `;
      return `
        <div class="office-online-version">
          <div class="office-online-version-title ${version.tagClass}">${escapeHtml(version.title)}</div>
          <div class="office-online-version-products">
            ${productsHtml}
          </div>
        </div>
      `;
    })
    .join("");
  officeOnlineCatalogEl
    .querySelectorAll('input[name="office-online-product"]')
    .forEach((input) => {
      input.onchange = (event) => {
        const productId = event.target.value;
        if (event.target.checked) {
          const targetProduct = findOfficeOnlineProduct(productId);
          const hasDifferentVersion = getSelectedOfficeOnlineProducts().some(
            (product) =>
              targetProduct && product.versionKey !== targetProduct.versionKey,
          );
          if (hasDifferentVersion) {
            officeOnlineSelectedProductIds.clear();
            officeOnlineCatalogEl
              .querySelectorAll('input[name="office-online-product"]')
              .forEach((checkbox) => {
                checkbox.checked = false;
                const row = checkbox.closest(".office-online-product-option");
                if (row) row.classList.remove("is-selected");
              });
          }
          officeOnlineSelectedProductIds.add(productId);
        } else {
          officeOnlineSelectedProductIds.delete(productId);
        }
        const option = event.target.closest(".office-online-product-option");
        if (option) {
          option.classList.toggle("is-selected", event.target.checked);
        }
        updateOfficeOnlineSelectionLabel();
      };
    });
  updateOfficeOnlineSelectionLabel();
  if (window.lucide) window.lucide.createIcons();
}
function getCheckedValue(inputName, fallback) {
  const selected = document.querySelector(`input[name="${inputName}"]:checked`);
  return selected ? selected.value : fallback;
}
function updateOfficeOnlineSubmitButtonLabel() {
  if (!officeOnlineSubmitBtn || officeOnlineSubmitBtn.disabled) return;
  const mode = getCheckedValue("office-online-mode", "install");
  const isDownload = mode === "download";
  const label = isDownload ? tr("download") : tr("install");
  const icon = isDownload ? "download" : "package-check";
  officeOnlineSubmitBtn.innerHTML = `<i data-lucide="${icon}"></i> ${label}`;
  if (window.lucide) window.lucide.createIcons();
}
function setOfficeCleanButtonState(isProcessing) {
  const buttons = [officeCleanBtn, officeOnlineCleanBtn].filter(Boolean);
  if (buttons.length === 0) return;
  buttons.forEach((btn) => {
    btn.disabled = !!isProcessing;
    btn.innerHTML = isProcessing
      ? `<i data-lucide="loader-2" class="animate-spin"></i> ${tr("processing")}`
      : `<i data-lucide="trash-2"></i> ${UI_TEXT[currentLanguage]["i18n-btn-office-clean-online"] || UI_TEXT.en["i18n-btn-office-clean-online"]}`;
  });
  if (window.lucide) window.lucide.createIcons();
}
function setDriverBackupPath(value) {
  driverBackupPath = String(value || "").trim();
  if (driverBackupPathInput) {
    driverBackupPathInput.value = driverBackupPath;
  }
  if (driverBackupPath) {
    localStorage.setItem("driverBackupPath", driverBackupPath);
  } else {
    localStorage.removeItem("driverBackupPath");
  }
}
function setDriverRestorePath(value) {
  driverRestorePath = String(value || "").trim();
  if (driverRestorePathInput) {
    driverRestorePathInput.value = driverRestorePath;
  }
  if (driverRestorePath) {
    localStorage.setItem("driverRestorePath", driverRestorePath);
  } else {
    localStorage.removeItem("driverRestorePath");
  }
}
function setDriverButtonState() {
  if (driverBackupBrowseBtn) {
    driverBackupBrowseBtn.disabled = driverBackupBusy;
  }
  if (driverRestoreBrowseBtn) {
    driverRestoreBrowseBtn.disabled = driverRestoreBusy;
  }
  if (driverBackupRunBtn) {
    driverBackupRunBtn.disabled = driverBackupBusy;
    driverBackupRunBtn.innerHTML = driverBackupBusy
      ? `<i data-lucide="loader-2" class="animate-spin" style="width: 16px"></i> ${tr("processing")}`
      : `<i data-lucide="download" style="width: 16px"></i> ${tr("backup")}`;
  }
  if (driverRestoreRunBtn) {
    driverRestoreRunBtn.disabled = driverRestoreBusy;
    driverRestoreRunBtn.innerHTML = driverRestoreBusy
      ? `<i data-lucide="loader-2" class="animate-spin" style="width: 16px"></i> ${tr("processing")}`
      : `<i data-lucide="upload" style="width: 16px"></i> ${tr("restore")}`;
  }
  if (window.lucide) window.lucide.createIcons();
}
async function pickDriverFolder(type) {
  if (!window.api || !window.api.selectFolder) return;
  const title =
    type === "backup"
      ? currentLanguage === "vi"
        ? "Chọn thư mục đích để sao lưu"
        : "Select backup destination folder"
      : currentLanguage === "vi"
        ? "Chọn thư mục sao lưu driver để khôi phục"
        : "Select driver backup folder to restore";
  const selectedPath = await window.api.selectFolder({ title });
  if (!selectedPath) return;
  if (type === "backup") {
    setDriverBackupPath(selectedPath);
  } else {
    setDriverRestorePath(selectedPath);
  }
}
function getDriverOperationError(result, fallbackMessage) {
  if (result && result.error) return String(result.error);
  if (result && Number.isFinite(Number(result.code)) && Number(result.code) > 0)
    return `${fallbackMessage} (code ${result.code})`;
  return fallbackMessage;
}
function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  const digits = unitIndex <= 1 ? 0 : 2;
  return `${size.toFixed(digits)} ${units[unitIndex]}`;
}
function setCleanupButtonState() {
  const textBundle = UI_TEXT[currentLanguage] || UI_TEXT.en;
  const ramLabel =
    textBundle["i18n-cleanup-ram-btn"] || UI_TEXT.en["i18n-cleanup-ram-btn"];
  const diskLabel =
    textBundle["i18n-cleanup-disk-btn"] || UI_TEXT.en["i18n-cleanup-disk-btn"];

  if (cleanupRamBtn) {
    cleanupRamBtn.disabled = cleanupRamBusy || cleanupDiskBusy;
    cleanupRamBtn.innerHTML = cleanupRamBusy
      ? `<i data-lucide="loader-2" class="animate-spin" style="width: 16px"></i> ${tr("processing")}`
      : `<i data-lucide="zap" style="width: 16px"></i> ${ramLabel}`;
  }
  if (cleanupDiskBtn) {
    cleanupDiskBtn.disabled = cleanupDiskBusy || cleanupRamBusy;
    cleanupDiskBtn.innerHTML = cleanupDiskBusy
      ? `<i data-lucide="loader-2" class="animate-spin" style="width: 16px"></i> ${tr("processing")}`
      : `<i data-lucide="trash-2" style="width: 16px"></i> ${diskLabel}`;
  }
  if (window.lucide) window.lucide.createIcons();
}
async function runSystemRamCleanup() {
  if (cleanupRamBusy || cleanupDiskBusy) return;
  if (!window.api || !window.api.cleanSystemRam) {
    showNotification(
      currentLanguage === "vi"
        ? "API dọn RAM hiện không khả dụng."
        : "RAM cleanup API is not available.",
      "error",
    );
    return;
  }

  const taskKey = `system-clean-ram-${Date.now()}`;
  const startTime = /* @__PURE__ */ new Date().toLocaleTimeString(
    getUiLocale(),
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  activeTasks.set(taskKey, {
    name: currentLanguage === "vi" ? "Dọn RAM" : "RAM Cleanup",
    startTime,
    statusLabel: tr("processing"),
  });
  updateTaskPanelUI();
  cleanupRamBusy = true;
  setCleanupButtonState();
  if (cleanupRamResultEl) {
    cleanupRamResultEl.textContent =
      currentLanguage === "vi" ? "Đang dọn RAM" : "Cleaning RAM";
  }
  showNotification(
    currentLanguage === "vi" ? "Bắt đầu dọn RAM" : "Starting RAM cleanup",
    "info",
  );

  try {
    const result = await window.api.cleanSystemRam(taskKey);
    if (result && result.success) {
      const freedMB = Number.isFinite(Number(result.freedMB))
        ? Number(result.freedMB)
        : null;
      const trimmedProcesses = Number.isFinite(Number(result.trimmedProcesses))
        ? Number(result.trimmedProcesses)
        : null;
      const standbyText =
        result && result.standbyPurged === false
          ? currentLanguage === "vi"
            ? " | standby chưa dọn hết"
            : " | standby list not fully purged"
          : "";
      const summary =
        currentLanguage === "vi"
          ? `RAM trống tăng ${
              freedMB !== null
                ? `${freedMB.toLocaleString(getUiLocale())} MB`
                : "--"
            } | đã trim ${
              trimmedProcesses !== null
                ? trimmedProcesses.toLocaleString(getUiLocale())
                : "--"
            } tiến trình${standbyText}`
          : `Free RAM increased ${
              freedMB !== null
                ? `${freedMB.toLocaleString(getUiLocale())} MB`
                : "--"
            } | trimmed ${
              trimmedProcesses !== null
                ? trimmedProcesses.toLocaleString(getUiLocale())
                : "--"
            } processes${standbyText}`;
      if (cleanupRamResultEl) cleanupRamResultEl.textContent = summary;
      showNotification(
        currentLanguage === "vi" ? "Dọn RAM hoàn tất" : "RAM cleanup completed",
        "success",
      );
    } else {
      const message = getDriverOperationError(
        result,
        currentLanguage === "vi" ? "Dọn RAM thất bại." : "RAM cleanup failed.",
      );
      if (cleanupRamResultEl) cleanupRamResultEl.textContent = message;
      showNotification(message, "error");
    }
  } catch (error) {
    const message = tr("errorPrefix", { message: error.message });
    if (cleanupRamResultEl) cleanupRamResultEl.textContent = message;
    showNotification(message, "error");
  } finally {
    activeTasks.delete(taskKey);
    updateTaskPanelUI();
    cleanupRamBusy = false;
    setCleanupButtonState();
  }
}
async function runSystemDiskCleanup() {
  if (cleanupDiskBusy || cleanupRamBusy) return;
  if (!window.api || !window.api.cleanSystemDisk) {
    showNotification(
      currentLanguage === "vi"
        ? "API dọn ổ đĩa hiện không khả dụng."
        : "Disk cleanup API is not available.",
      "error",
    );
    return;
  }
  if (
    !confirm(
      currentLanguage === "vi"
        ? "Chạy dọn sâu ổ đĩa ngay bây giờ? Tác vụ có thể mất vài phút."
        : "Run deep disk cleanup now? This task can take several minutes.",
    )
  ) {
    return;
  }

  const taskKey = `system-clean-disk-${Date.now()}`;
  const startTime = /* @__PURE__ */ new Date().toLocaleTimeString(
    getUiLocale(),
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  activeTasks.set(taskKey, {
    name: currentLanguage === "vi" ? "Dọn sâu ổ đĩa" : "Disk Deep Cleanup",
    startTime,
    statusLabel: tr("processing"),
  });
  updateTaskPanelUI();
  cleanupDiskBusy = true;
  setCleanupButtonState();
  if (cleanupDiskResultEl) {
    cleanupDiskResultEl.textContent =
      currentLanguage === "vi" ? "Đang dọn ổ đĩa" : "Cleaning disk";
  }
  showNotification(
    currentLanguage === "vi"
      ? "Bắt đầu dọn sâu ổ đĩa"
      : "Starting disk deep cleanup",
    "info",
  );

  try {
    const result = await window.api.cleanSystemDisk(taskKey);
    if (result && result.success) {
      const freedBytes = Number.isFinite(Number(result.freedBytes))
        ? Number(result.freedBytes)
        : 0;
      const deletedItems = Number.isFinite(Number(result.deletedItems))
        ? Number(result.deletedItems)
        : null;
      const failedItems = Number.isFinite(Number(result.failedItems))
        ? Number(result.failedItems)
        : null;
      const summary =
        currentLanguage === "vi"
          ? `Đã giải phóng ${formatBytes(freedBytes)} | đã xóa ${
              deletedItems !== null
                ? deletedItems.toLocaleString(getUiLocale())
                : "--"
            } mục | lỗi ${
              failedItems !== null
                ? failedItems.toLocaleString(getUiLocale())
                : "--"
            } mục`
          : `Freed ${formatBytes(freedBytes)} | deleted ${
              deletedItems !== null
                ? deletedItems.toLocaleString(getUiLocale())
                : "--"
            } items | failed ${
              failedItems !== null
                ? failedItems.toLocaleString(getUiLocale())
                : "--"
            } items`;
      if (cleanupDiskResultEl) cleanupDiskResultEl.textContent = summary;
      showNotification(
        result.partial
          ? currentLanguage === "vi"
            ? "Dọn ổ đĩa hoàn tất một phần"
            : "Disk cleanup partially completed"
          : currentLanguage === "vi"
            ? "Dọn ổ đĩa hoàn tất"
            : "Disk cleanup completed",
        result.partial ? "info" : "success",
      );
    } else {
      const message = getDriverOperationError(
        result,
        currentLanguage === "vi"
          ? "Dọn ổ đĩa thất bại."
          : "Disk cleanup failed.",
      );
      if (cleanupDiskResultEl) cleanupDiskResultEl.textContent = message;
      showNotification(message, "error");
    }
  } catch (error) {
    const message = tr("errorPrefix", { message: error.message });
    if (cleanupDiskResultEl) cleanupDiskResultEl.textContent = message;
    showNotification(message, "error");
  } finally {
    activeTasks.delete(taskKey);
    updateTaskPanelUI();
    cleanupDiskBusy = false;
    setCleanupButtonState();
  }
}
function normalizeBenchmarkDrive(value) {
  const input = String(value || "").toUpperCase();
  const match = input.match(/[A-Z]/);
  const driveLetter = match ? match[0] : "C";
  return `${driveLetter}:`;
}
function formatDiskHealthText(value) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : tr("benchmarkNotAvailable");
}
function getBenchmarkI18nLabel(id, fallback) {
  const bundle = UI_TEXT[currentLanguage] || UI_TEXT.en;
  return bundle[id] || UI_TEXT.en[id] || fallback;
}
function normalizeBenchmarkHealthList(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object");
  }
  if (value && typeof value === "object") {
    return [value];
  }
  return [];
}
function formatDiskHealthPercent(value) {
  const healthPercent = Number(value);
  return Number.isFinite(healthPercent) && healthPercent >= 0
    ? tr("benchmarkHealthPercent", { value: Math.round(healthPercent) })
    : tr("benchmarkNotAvailable");
}
function formatDiskHealthSize(value) {
  const sizeValue = Number(value);
  return Number.isFinite(sizeValue) && sizeValue > 0
    ? tr("benchmarkDiskSize", {
        value: sizeValue.toLocaleString(getUiLocale()),
      })
    : tr("benchmarkNotAvailable");
}
function formatDiskHealthTemperature(value) {
  const temperatureValue = Number(value);
  return Number.isFinite(temperatureValue) && temperatureValue > 0
    ? tr("benchmarkDiskTemperature", {
        value: Math.round(temperatureValue),
      })
    : tr("benchmarkNotAvailable");
}
function updateBenchmarkHealthUI() {
  if (!benchmarkHealthCardsEl) return;

  const healthItems = normalizeBenchmarkHealthList(benchmarkHealthData).sort(
    (a, b) => {
      const aDisk = Number(a?.diskNumber);
      const bDisk = Number(b?.diskNumber);
      const aValid = Number.isFinite(aDisk);
      const bValid = Number.isFinite(bDisk);
      if (aValid && bValid) return aDisk - bDisk;
      if (aValid) return -1;
      if (bValid) return 1;
      return 0;
    },
  );

  const refreshLabel = getBenchmarkI18nLabel(
    "i18n-benchmark-refresh-health-btn",
    "Refresh",
  );
  const sectionLabel = getBenchmarkI18nLabel(
    "i18n-benchmark-health-title",
    "Disk Health",
  );

  if (healthItems.length === 0) {
    benchmarkHealthCardsEl.innerHTML = `
      <div class="card detail-card disk-health-card">
        <div class="detail-card-title detail-card-title-spread">
          <div class="detail-card-title-main">
            <i data-lucide="hard-drive" style="width: 15px; height: 15px"></i>
            <span class="disk-health-card-title">${escapeHtml(sectionLabel)}</span>
          </div>
          <button class="btn btn-outline h-8 px-3 text-xs benchmark-refresh-health-btn">
            <i data-lucide="refresh-cw" style="width: 14px; height: 14px"></i>
            ${escapeHtml(refreshLabel)}
          </button>
        </div>
        <div class="disk-health-empty">${escapeHtml(tr("benchmarkHealthNoData"))}</div>
      </div>
    `;
    return;
  }

  const statusLabel = getBenchmarkI18nLabel(
    "i18n-benchmark-health-status-label",
    "Status",
  );
  const healthLabel = getBenchmarkI18nLabel(
    "i18n-benchmark-health-percent-label",
    "Health",
  );
  const modelLabel = getBenchmarkI18nLabel(
    "i18n-benchmark-health-model-label",
    "Model",
  );
  const mediaLabel = getBenchmarkI18nLabel(
    "i18n-benchmark-health-media-label",
    "Media",
  );
  const sizeLabel = getBenchmarkI18nLabel(
    "i18n-benchmark-health-size-label",
    "Size",
  );
  const tempLabel = getBenchmarkI18nLabel(
    "i18n-benchmark-health-temp-label",
    "Temperature",
  );
  const driveLabel = tr("benchmarkDiskDrive");

  benchmarkHealthCardsEl.innerHTML = healthItems
    .map((health, index) => {
      const diskNumber = Number(health.diskNumber);
      const diskTitle = Number.isFinite(diskNumber)
        ? tr("benchmarkDiskTitle", { value: Math.round(diskNumber) })
        : tr("benchmarkDiskTitle", { value: index + 1 });
      const driveText = formatDiskHealthText(health.drive);
      const healthStatusText = formatDiskHealthText(
        health.healthStatus ||
          health.operationalStatus ||
          tr("benchmarkUnknown"),
      );
      const healthPercentText = formatDiskHealthPercent(health.healthPercent);
      const modelText = formatDiskHealthText(health.model);
      const mediaText = formatDiskHealthText(health.mediaType);
      const sizeText = formatDiskHealthSize(health.sizeGB);
      const tempText = formatDiskHealthTemperature(health.temperatureC);

      return `
        <div class="card detail-card disk-health-card">
          <div class="detail-card-title detail-card-title-spread">
            <div class="detail-card-title-main">
              <i data-lucide="hard-drive" style="width: 15px; height: 15px"></i>
              <span class="disk-health-card-title">${escapeHtml(diskTitle)}</span>
            </div>
            <div class="disk-health-card-head-right">
              <span class="disk-health-card-drive">${escapeHtml(driveLabel)}: ${escapeHtml(driveText)}</span>
              <button class="btn btn-outline h-8 px-3 text-xs benchmark-refresh-health-btn">
                <i data-lucide="refresh-cw" style="width: 14px; height: 14px"></i>
                ${escapeHtml(refreshLabel)}
              </button>
            </div>
          </div>
          <div class="detail-list">
            <div class="detail-row"><span>${escapeHtml(statusLabel)}</span><strong>${escapeHtml(healthStatusText)}</strong></div>
            <div class="detail-row"><span>${escapeHtml(healthLabel)}</span><strong>${escapeHtml(healthPercentText)}</strong></div>
            <div class="detail-row"><span>${escapeHtml(modelLabel)}</span><strong>${escapeHtml(modelText)}</strong></div>
            <div class="detail-row"><span>${escapeHtml(mediaLabel)}</span><strong>${escapeHtml(mediaText)}</strong></div>
            <div class="detail-row"><span>${escapeHtml(sizeLabel)}</span><strong>${escapeHtml(sizeText)}</strong></div>
            <div class="detail-row"><span>${escapeHtml(tempLabel)}</span><strong>${escapeHtml(tempText)}</strong></div>
          </div>
        </div>
      `;
    })
    .join("");
}
function setBenchmarkOutput(value) {
  if (!benchmarkOutputEl) return;
  const normalized = String(value || "").trim();
  benchmarkOutputEl.textContent =
    normalized.length > 0 ? normalized : tr("benchmarkOutputEmpty");
}
function sanitizeBenchmarkOutput(value) {
  return String(value || "")
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = String(line || "").trim();
      if (!trimmed) return true;
      if (/^WINSAT_HEALTH_JSON:/i.test(trimmed)) return false;
      if (/^WINSAT_EXIT_CODE:/i.test(trimmed)) return false;
      return true;
    })
    .join("\n")
    .trim();
}
function updateBenchmarkDisplayMeta() {
  if (benchmarkLastRunEl) {
    if (benchmarkLastMeta && Number.isFinite(benchmarkLastMeta.timeMs)) {
      const time = new Date(benchmarkLastMeta.timeMs).toLocaleTimeString(
        getUiLocale(),
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        },
      );
      benchmarkLastRunEl.innerText = tr("benchmarkLastRun", {
        test: tr("benchmarkDisk"),
        time,
      });
    } else {
      benchmarkLastRunEl.innerText = tr("benchmarkNoRunYet");
    }
  }
  if (
    benchmarkOutputEl &&
    !String(benchmarkOutputEl.textContent || "").trim()
  ) {
    setBenchmarkOutput("");
  }
}
function setBenchmarkButtonState() {
  if (benchmarkRunDiskBtn) {
    const textBundle = UI_TEXT[currentLanguage] || UI_TEXT.en;
    const label =
      textBundle["i18n-benchmark-run-disk-btn"] ||
      UI_TEXT.en["i18n-benchmark-run-disk-btn"] ||
      tr("benchmarkDisk");
    benchmarkRunDiskBtn.disabled = benchmarkBusy || benchmarkHealthBusy;
    benchmarkRunDiskBtn.innerHTML =
      benchmarkBusy && benchmarkRunningType === "disk"
        ? `<i data-lucide="loader-2" class="animate-spin"></i> ${tr("processing")}`
        : `<i data-lucide="hard-drive"></i> ${label}`;
  }
  if (benchmarkHealthCardsEl) {
    const refreshButtons = benchmarkHealthCardsEl.querySelectorAll(
      ".benchmark-refresh-health-btn",
    );
    refreshButtons.forEach((btn) => {
      btn.disabled = benchmarkBusy || benchmarkHealthBusy;
      btn.innerHTML = benchmarkHealthBusy
        ? `<i data-lucide="loader-2" class="animate-spin" style="width: 14px"></i> ${tr("processing")}`
        : `<i data-lucide="refresh-cw" style="width: 14px"></i> ${UI_TEXT[currentLanguage]["i18n-benchmark-refresh-health-btn"] || UI_TEXT.en["i18n-benchmark-refresh-health-btn"]}`;
    });
  }

  if (window.lucide) window.lucide.createIcons();
}
async function refreshBenchmarkHealth(silent = true) {
  if (benchmarkBusy || benchmarkHealthBusy) return;
  const hasApi = Boolean(window.api);
  const canGetAllDisks =
    hasApi && typeof window.api.getDiskHealthAll === "function";
  const canRunLegacyHealth =
    hasApi && typeof window.api.runBenchmark === "function";

  if (!canGetAllDisks && !canRunLegacyHealth) {
    return;
  }

  const drive = normalizeBenchmarkDrive(benchmarkDriveInput?.value || "C:");
  if (benchmarkDriveInput) {
    benchmarkDriveInput.value = drive;
  }
  benchmarkHealthBusy = true;
  setBenchmarkButtonState();
  try {
    let result = null;
    if (canGetAllDisks) {
      result = await window.api.getDiskHealthAll();
      if (result && result.success) {
        benchmarkHealthData = normalizeBenchmarkHealthList(result.disks);
        updateBenchmarkHealthUI();
        return;
      }
    }

    if (canRunLegacyHealth) {
      result = await window.api.runBenchmark("disk", {
        drive,
        healthOnly: true,
      });
    }

    if (result && result.success) {
      benchmarkHealthData = normalizeBenchmarkHealthList(result.health);
      updateBenchmarkHealthUI();
    } else {
      console.warn("Disk health refresh failed:", result?.error || "unknown");
    }
  } catch (error) {
    console.warn("Disk health refresh error:", error?.message || error);
  } finally {
    benchmarkHealthBusy = false;
    setBenchmarkButtonState();
  }
}
async function runBenchmarkTest() {
  if (benchmarkBusy || benchmarkHealthBusy) return;
  if (!window.api || !window.api.runBenchmark) {
    showNotification(tr("benchmarkApiUnavailable"), "error");
    return;
  }

  const drive = normalizeBenchmarkDrive(benchmarkDriveInput?.value || "C:");
  if (benchmarkDriveInput) {
    benchmarkDriveInput.value = drive;
  }

  benchmarkBusy = true;
  benchmarkRunningType = "disk";
  setBenchmarkButtonState();
  showNotification(tr("benchmarkRunning"), "info");

  try {
    const result = await window.api.runBenchmark("disk", { drive });
    const outputText = sanitizeBenchmarkOutput(result?.output || "");
    if (result && result.success) {
      showNotification(tr("benchmarkCompleted"), "success");
      benchmarkLastMeta = { type: "disk", timeMs: Date.now() };
      setBenchmarkOutput(outputText);
      benchmarkHealthData = normalizeBenchmarkHealthList(result.health);
      updateBenchmarkHealthUI();
    } else {
      const fallbackError = tr("benchmarkFailed");
      showNotification(result?.error || fallbackError, "error");
      setBenchmarkOutput(outputText);
      if (result?.health) {
        benchmarkHealthData = normalizeBenchmarkHealthList(result.health);
        updateBenchmarkHealthUI();
      }
    }
  } catch (error) {
    showNotification(tr("errorPrefix", { message: error.message }), "error");
  } finally {
    benchmarkBusy = false;
    benchmarkRunningType = "";
    setBenchmarkButtonState();
    updateBenchmarkDisplayMeta();
  }
}
async function runDriverBackup() {
  if (driverBackupBusy) return;
  if (!window.api || !window.api.backupDrivers) {
    showNotification(
      currentLanguage === "vi"
        ? "API sao lưu driver hiện không khả dụng"
        : "Driver backup API is not available",
      "error",
    );
    return;
  }
  if (!driverBackupPath) {
    await pickDriverFolder("backup");
  }
  if (!driverBackupPath) {
    showNotification(
      currentLanguage === "vi"
        ? "Vui lòng chọn thư mục đích để sao lưu"
        : "Please select a backup destination folder",
      "error",
    );
    return;
  }

  const taskKey = `driver-backup-${Date.now()}`;
  const startTime = /* @__PURE__ */ new Date().toLocaleTimeString(
    getUiLocale(),
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  activeTasks.set(taskKey, {
    name: currentLanguage === "vi" ? "Sao lưu Driver" : "Backup Drivers",
    startTime,
    statusLabel: tr("processing"),
  });
  updateTaskPanelUI();
  driverBackupBusy = true;
  setDriverButtonState();
  showNotification(
    currentLanguage === "vi"
      ? "Bắt đầu sao lưu driver"
      : "Starting driver backup",
    "info",
  );

  try {
    const result = await window.api.backupDrivers(
      { targetPath: driverBackupPath, createSubfolder: true },
      taskKey,
    );
    if (result && result.success) {
      const count = Number.isFinite(Number(result.driverCount))
        ? Number(result.driverCount)
        : null;
      const fullCount = Number.isFinite(Number(result.fullStoreCount))
        ? Number(result.fullStoreCount)
        : null;
      const thirdPartyCount = Number.isFinite(Number(result.thirdPartyCount))
        ? Number(result.thirdPartyCount)
        : null;
      const countText =
        count !== null
          ? currentLanguage === "vi"
            ? ` (${count.toLocaleString(getUiLocale())} tệp INF)`
            : ` (${count.toLocaleString(getUiLocale())} INF files)`
          : "";
      showNotification(
        currentLanguage === "vi"
          ? `Sao lưu driver hoàn tất${countText}`
          : `Driver backup completed${countText}`,
        "success",
      );
    } else {
      showNotification(
        getDriverOperationError(
          result,
          currentLanguage === "vi"
            ? "Sao lưu driver thất bại"
            : "Driver backup failed",
        ),
        "error",
      );
    }
  } catch (error) {
    showNotification(tr("errorPrefix", { message: error.message }), "error");
  } finally {
    activeTasks.delete(taskKey);
    updateTaskPanelUI();
    driverBackupBusy = false;
    setDriverButtonState();
  }
}
async function runDriverRestore() {
  if (driverRestoreBusy) return;
  if (!window.api || !window.api.restoreDrivers) {
    showNotification(
      currentLanguage === "vi"
        ? "API khôi phục driver hiện không khả dụng"
        : "Driver restore API is not available",
      "error",
    );
    return;
  }
  if (!driverRestorePath) {
    await pickDriverFolder("restore");
  }
  if (!driverRestorePath) {
    showNotification(
      currentLanguage === "vi"
        ? "Vui lòng chọn thư mục sao lưu driver"
        : "Please select a driver backup folder",
      "error",
    );
    return;
  }
  if (
    !confirm(
      currentLanguage === "vi"
        ? "Khôi phục driver từ thư mục này ngay bây giờ? Hành động này có thể cài nhiều driver thiết bị"
        : "Restore drivers from this backup folder now? This can install multiple device drivers",
    )
  ) {
    return;
  }

  const taskKey = `driver-restore-${Date.now()}`;
  const startTime = /* @__PURE__ */ new Date().toLocaleTimeString(
    getUiLocale(),
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  activeTasks.set(taskKey, {
    name: currentLanguage === "vi" ? "Khôi phục Driver" : "Restore Drivers",
    startTime,
    statusLabel: tr("processing"),
  });
  updateTaskPanelUI();
  driverRestoreBusy = true;
  setDriverButtonState();
  showNotification(
    currentLanguage === "vi"
      ? "Bắt đầu khôi phục driver"
      : "Starting driver restore",
    "info",
  );

  try {
    const result = await window.api.restoreDrivers(
      { sourcePath: driverRestorePath },
      taskKey,
    );
    if (result && result.success) {
      const addedCount = Number.isFinite(Number(result.addedDriverCount))
        ? Number(result.addedDriverCount)
        : null;
      const totalCount = Number.isFinite(Number(result.totalDriverPackages))
        ? Number(result.totalDriverPackages)
        : null;
      const count =
        addedCount !== null
          ? addedCount
          : Number.isFinite(Number(result.driverCount))
            ? Number(result.driverCount)
            : null;
      const countText =
        count !== null
          ? currentLanguage === "vi"
            ? ` (${count.toLocaleString(getUiLocale())} tệp INF)`
            : ` (${count.toLocaleString(getUiLocale())} INF files)`
          : "";
      if (result.partial) {
        const ratioText =
          addedCount !== null && totalCount !== null
            ? currentLanguage === "vi"
              ? ` (${addedCount.toLocaleString(getUiLocale())}/${totalCount.toLocaleString(getUiLocale())} tệp INF)`
              : ` (${addedCount.toLocaleString(getUiLocale())}/${totalCount.toLocaleString(getUiLocale())} INF files)`
            : countText;
        showNotification(
          currentLanguage === "vi"
            ? `Khôi phục driver một phần${ratioText}. Một số driver đã bị bỏ qua vì đã có sẵn hoặc không khớp phần cứng hiện tại`
            : `Driver restore partially completed${ratioText}. Some drivers were skipped because they already exist or do not match current hardware`,
          "info",
        );
      } else {
        showNotification(
          currentLanguage === "vi"
            ? `Khôi phục driver hoàn tất${countText}`
            : `Driver restore completed${countText}`,
          "success",
        );
      }
    } else {
      showNotification(
        getDriverOperationError(
          result,
          currentLanguage === "vi"
            ? "Khôi phục driver thất bại"
            : "Driver restore failed",
        ),
        "error",
      );
    }
  } catch (error) {
    showNotification(tr("errorPrefix", { message: error.message }), "error");
  } finally {
    activeTasks.delete(taskKey);
    updateTaskPanelUI();
    driverRestoreBusy = false;
    setDriverButtonState();
  }
}
async function runOfficeCleanup() {
  if (
    (officeCleanBtn && officeCleanBtn.disabled) ||
    (officeOnlineCleanBtn && officeOnlineCleanBtn.disabled)
  ) {
    return;
  }
  if (!window.api || !window.api.cleanOffice) {
    showNotification(
      currentLanguage === "vi"
        ? "API dọn Office hiện không khả dụng"
        : "Office cleanup API is not available",
      "error",
    );
    return;
  }
  if (
    !confirm(
      currentLanguage === "vi"
        ? "Dọn toàn bộ dư liệu Click-to-Run Office (Microsoft 365/2024/2021/2019)?"
        : "Clean all Click-to-Run Office residues (Microsoft 365/2024/2021/2019)?",
    )
  ) {
    return;
  }

  const taskKey = `maintenance-office-clean-${Date.now()}`;
  const startTime = /* @__PURE__ */ new Date().toLocaleTimeString(
    getUiLocale(),
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  activeTasks.set(taskKey, {
    name:
      currentLanguage === "vi"
        ? "Dọn Office Click-to-Run"
        : "Clean Office Click-to-Run",
    startTime,
    statusLabel: tr("processing"),
  });
  updateTaskPanelUI();
  setOfficeCleanButtonState(true);
  showNotification(
    currentLanguage === "vi"
      ? "Đang dọn môi trường Office"
      : "Cleaning Office environment",
    "info",
  );

  try {
    const result = await window.api.cleanOffice(taskKey);
    if (result && result.success) {
      showNotification(
        currentLanguage === "vi"
          ? "Dọn Office hoàn tất. Vui lòng khởi động lại Windows trước khi cài lại"
          : "Office cleanup completed. Please restart Windows before reinstalling",
        "success",
      );
      refreshInstalledStatus(true);
      refreshCurrentView();
      return;
    }

    const fallbackError =
      result && result.code === 2
        ? currentLanguage === "vi"
          ? "Dọn một phần. Hãy khởi động lại Windows và chạy dọn lại"
          : "Cleanup partially completed. Restart Windows and run cleanup again"
        : currentLanguage === "vi"
          ? "Dọn Office thất bại"
          : "Office cleanup failed";
    showNotification(
      result && result.error ? result.error : fallbackError,
      "error",
    );
  } catch (error) {
    showNotification(tr("errorPrefix", { message: error.message }), "error");
  } finally {
    activeTasks.delete(taskKey);
    updateTaskPanelUI();
    setOfficeCleanButtonState(false);
  }
}
async function submitOfficeOnlineSetup() {
  if (officeOnlineSubmitBtn && officeOnlineSubmitBtn.disabled) {
    return;
  }
  if (!window.api || !window.api.installOfficeOnline) {
    showNotification(
      currentLanguage === "vi"
        ? "API Office online hiện không khả dụng"
        : "Office online API is not available",
      "error",
    );
    return;
  }
  const selectedProducts = getSelectedOfficeOnlineProducts();
  if (selectedProducts.length === 0) {
    showNotification(
      currentLanguage === "vi"
        ? "Vui lòng chọn ít nhất một sản phẩm Office"
        : "Please select at least one Office product",
      "error",
    );
    return;
  }
  const versionKeys = Array.from(
    new Set(selectedProducts.map((product) => product.versionKey)),
  );
  if (versionKeys.length !== 1) {
    showNotification(
      currentLanguage === "vi"
        ? "Vui lòng chỉ chọn sản phẩm trong cùng một phiên bản Office (ví dụ: chỉ 2024)"
        : "Please select products from one Office version only (for example: only 2024)",
      "error",
    );
    return;
  }
  const selectedProductIds = selectedProducts.map((product) => product.id);
  const channels = Array.from(
    new Set(
      selectedProducts.map((product) => getOfficeOnlineChannel(product.id)),
    ),
  );
  if (channels.length !== 1) {
    showNotification(
      currentLanguage === "vi"
        ? "Các sản phẩm đang chọn dùng channel khác nhau. Vui lòng chọn cùng thế hệ/license channe"
        : "Selected products use different Office channels. Please choose products from the same generation/license channel",
      "error",
    );
    return;
  }
  const selectedLabel =
    selectedProducts.length === 1
      ? selectedProducts[0].name
      : currentLanguage === "vi"
        ? `Đã chọn ${selectedProducts.length} sản phẩm`
        : `${selectedProducts.length} selected products`;
  const officeClientEdition = getCheckedValue("office-online-arch", "64");
  const mode = getCheckedValue("office-online-mode", "install");
  const languageId = officeOnlineLanguageSelect
    ? officeOnlineLanguageSelect.value || "en-us"
    : "en-us";
  const channel = channels[0];
  if (officeOnlineSubmitBtn) {
    officeOnlineSubmitBtn.disabled = true;
    officeOnlineSubmitBtn.innerText = tr("processing");
  }
  const taskKey = `office-online-${Date.now()}`;
  const taskName =
    mode === "download"
      ? currentLanguage === "vi"
        ? `Tải xuống ${selectedLabel}`
        : `Download ${selectedLabel}`
      : currentLanguage === "vi"
        ? `Cài đặt ${selectedLabel}`
        : `Install ${selectedLabel}`;
  const startTime = /* @__PURE__ */ new Date().toLocaleTimeString(
    getUiLocale(),
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  activeTasks.set(taskKey, {
    name: taskName,
    startTime,
    statusLabel: mode === "download" ? tr("downloading") : tr("installing"),
  });
  updateTaskPanelUI();
  showNotification(
    `${
      mode === "download"
        ? currentLanguage === "vi"
          ? "Đang tải"
          : "Downloading"
        : currentLanguage === "vi"
          ? "Đang cài"
          : "Installing"
    } ${selectedLabel}`,
    "info",
  );
  try {
    const result = await window.api.installOfficeOnline(
      {
        productIds: selectedProductIds,
        languageId,
        officeClientEdition,
        mode,
        channel,
      },
      taskKey,
    );
    if (result && result.success) {
      showNotification(
        mode === "download"
          ? currentLanguage === "vi"
            ? `Đã tải ${selectedLabel} thành công`
            : `Downloaded ${selectedLabel} successfully`
          : currentLanguage === "vi"
            ? `Đã cài ${selectedLabel} thành công`
            : `Installed ${selectedLabel} successfully`,
        "success",
      );
      if (mode !== "download") {
        refreshInstalledStatus(true);
      }
    } else {
      showNotification(
        result && result.error
          ? result.error
          : currentLanguage === "vi"
            ? `${mode === "download" ? "Tải" : "Cài"} ${selectedLabel} thất bại`
            : `Failed to ${mode} ${selectedLabel}`,
        "error",
      );
    }
  } catch (error) {
    showNotification(tr("errorPrefix", { message: error.message }), "error");
  } finally {
    activeTasks.delete(taskKey);
    updateTaskPanelUI();
    if (officeOnlineSubmitBtn) {
      officeOnlineSubmitBtn.disabled = false;
      updateOfficeOnlineSubmitButtonLabel();
    }
    if (window.lucide) window.lucide.createIcons();
  }
}
function getOfficeArchitecture(file) {
  const archFromData = normalizeArchitecture(file.arch);
  if (archFromData !== "Universal") return archFromData;
  return normalizeArchitecture(file.fileName || file.name);
}
function getOfficeInstallerSearchText(file) {
  return `${file.name || ""} ${file.fileName || ""}`.toLowerCase();
}
function getOfficeInstallerKind(file) {
  const text = getOfficeInstallerSearchText(file);
  if (text.includes("visio")) return "visio";
  if (text.includes("project")) return "project";
  return "office";
}
function getOfficeInstallerYear(file) {
  const text = getOfficeInstallerSearchText(file);
  if (text.includes("365")) return "365";
  const yearMatch = text.match(/\b(2010|2013|2016|2019|2021|2024)\b/);
  return yearMatch ? yearMatch[1] : "";
}
function isOfficeNoiseInstalledApp(appText, appId) {
  if (appId.startsWith("msix\\")) return true;
  const noiseTokens = [
    "copilot",
    "actionsserver",
    "officepushnotification",
    "local ai manager",
    "onenote for windows 10",
    "teams meeting add-in",
    "microsoft office desktop apps",
    "click-to-run extensibility",
    "click-to-run licensing",
    "language pack",
    "proofing tools",
    "update health",
  ];
  return noiseTokens.some((token) => appText.includes(token));
}
function isOfficeFamilyInstalledApp(appText, appId) {
  if (isOfficeNoiseInstalledApp(appText, appId)) return false;
  if (appId === "microsoft.office") return true;
  return (
    appText.includes("microsoft office") ||
    appText.includes("office ltsc") ||
    appText.includes("office 365") ||
    appText.includes("microsoft 365 apps") ||
    appText.includes("apps for enterprise") ||
    appText.includes("apps for business")
  );
}
function isVisioInstalledApp(appText, appId) {
  if (isOfficeNoiseInstalledApp(appText, appId)) return false;
  if (!appText.includes("visio")) return false;
  if (appText.includes("viewer")) return false;
  return (
    appText.includes("microsoft visio") ||
    appText.includes("visio professional") ||
    appText.includes("visio pro") ||
    appText.includes("visio standard")
  );
}
function isProjectInstalledApp(appText, appId) {
  if (isOfficeNoiseInstalledApp(appText, appId)) return false;
  if (!appText.includes("project")) return false;
  return (
    appText.includes("microsoft project") ||
    appText.includes("project professional") ||
    appText.includes("project pro") ||
    appText.includes("project standard")
  );
}
function isOfficeInstallerMatchedByInstalledApp(file, app) {
  const installerKind = getOfficeInstallerKind(file);
  const installerYear = getOfficeInstallerYear(file);
  const sysName = String(app.name || "").toLowerCase();
  const sysId = String(app.id || "").toLowerCase();
  const sysText = `${sysName} ${sysId}`;
  const sysVersion = String(app.version || "");

  if (isOfficeNoiseInstalledApp(sysText, sysId)) return false;

  if (installerKind === "visio" && !isVisioInstalledApp(sysText, sysId))
    return false;
  if (installerKind === "project" && !isProjectInstalledApp(sysText, sysId))
    return false;
  if (installerKind === "office") {
    if (!isOfficeFamilyInstalledApp(sysText, sysId)) return false;
    if (sysText.includes("visio") || sysText.includes("project")) return false;
  }

  if (!installerYear) return true;
  if (installerYear === "365") {
    return (
      sysText.includes("microsoft 365 apps") ||
      sysText.includes("apps for enterprise") ||
      sysText.includes("apps for business") ||
      sysText.includes("office 365") ||
      sysText.includes("o365") ||
      sysText.includes("m365") ||
      (sysId === "microsoft.office" && sysText.includes("365"))
    );
  }
  if (sysText.includes(installerYear)) return true;

  if (installerYear === "2010") return sysVersion.startsWith("14.");
  if (installerYear === "2013") return sysVersion.startsWith("15.");
  if (installerYear === "2016") {
    return (
      sysVersion.startsWith("16.") &&
      !sysText.includes("2019") &&
      !sysText.includes("2021") &&
      !sysText.includes("2024") &&
      !sysText.includes("365")
    );
  }
  return false;
}
async function renderOfficeLocal() {
  if (!officeList || !window.api) return;
  try {
    let files = await window.api.getOfficeLocal();
    if (officeSearchTerm) {
      files = files.filter((f) =>
        f.name.toLowerCase().includes(officeSearchTerm.toLowerCase()),
      );
    }
    files = files.filter((f) => {
      const arch = getOfficeArchitecture(f).toLowerCase();
      if (!officeUniversalFilter && !officeX64Filter && !officeX86Filter) {
        return true;
      }
      return (
        (officeUniversalFilter && arch.includes("universal")) ||
        (officeX64Filter && arch.includes("x64")) ||
        (officeX86Filter && arch.includes("x86"))
      );
    });
    files.sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
        sensitivity: "base",
        numeric: true,
      }),
    );
    officeList.innerHTML = "";
    officeList.className =
      officeViewMode === "grid" ? "installer-grid" : "flex flex-col gap-2";
    const viewToggleIcon = document.getElementById("office-view-toggle-icon");
    if (viewToggleIcon) {
      viewToggleIcon.setAttribute(
        "data-lucide",
        officeViewMode === "grid" ? "list" : "layout-grid",
      );
    }
    if (files.length === 0) {
      officeList.innerHTML = `
        <div class="col-span-full py-12 text-center text-muted">
          <i data-lucide="file-search" class="mx-auto mb-2 opacity-20" style="width:48px;height:48px;"></i>
          <p class="text-sm">${tr("noOfficeInstallersFound")}</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    files.forEach((file) => {
      const arch = getOfficeArchitecture(file);
      const archBadgeClass = getArchitectureBadgeClass(arch);
      const isOfficeInstalled = installedApps.some((app) =>
        isOfficeInstallerMatchedByInstalledApp(file, app),
      );
      const isProcessing = activeTasks.has(file.path);
      const actionButtonHtml = isProcessing
        ? `<button class="btn btn-outline h-8 px-4 text-xs opacity-80 cursor-not-allowed flex items-center justify-center gap-2" disabled style="border-color: rgba(59, 130, 246, 0.4); color: #3b82f6; background: rgba(59, 130, 246, 0.05);">${tr("processing")}</button>`
        : isOfficeInstalled
          ? `<button class="btn btn-outline h-8 px-4 text-xs" style="border-color: #10b981; color: #10b981; pointer-events: none;">${tr("installed")}</button>`
          : `<button class="btn btn-primary h-8 px-4 text-xs">${tr("install")}</button>`;
      const card = document.createElement("div");
      card.className = "card installer-card";
      if (officeViewMode === "grid") {
        card.innerHTML = `
                <div class="flex items-center gap-3 mb-6">
                    <div class="stat-icon" style="width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:hsl(var(--accent)); border-radius:var(--radius);"><i data-lucide="file-text"></i></div>
                    <div class="truncate"><h3 class="text-sm font-bold">${file.name}</h3><p class="text-2xs text-muted">${file.fileName}</p></div>
                </div>
                <div class="flex items-center justify-between mt-auto pt-4 border-t border-border">
                    <span class="${archBadgeClass}">${arch}</span>
                    ${actionButtonHtml}
                </div>
            `;
      } else {
        card.style.display = "grid";
        card.style.gridTemplateColumns = "48px 1fr 1fr 100px 100px";
        card.style.alignItems = "center";
        card.style.padding = "0.6rem 1rem";
        card.style.gap = "1rem";
        card.innerHTML = `
          <div class="flex justify-center"><i data-lucide="file-text" style="width:20px; color:hsl(var(--muted-foreground))"></i></div>
          <div class="font-bold text-sm truncate">${file.name}</div>
          <div class="text-xs text-muted truncate">${file.fileName}</div>
          <div class="text-center font-bold text-2xs"><span class="${archBadgeClass}">${arch}</span></div>
          <div class="flex justify-center">${actionButtonHtml}</div>
        `;
      }
      const installBtn = card.querySelector(".btn-primary");
      if (installBtn) {
        installBtn.onclick = () => runInstaller(file.path, file.name);
      }
      officeList.appendChild(card);
    });
    if (window.lucide) window.lucide.createIcons();
  } catch (e) {
    officeList.innerHTML = `<p class='text-center py-8 text-muted'>${
      currentLanguage === "vi"
        ? "Lỗi quét thư mục Office"
        : "Error scanning Office folder"
    }</p>`;
  }
}
if (officeSearchInput) {
  officeSearchInput.oninput = (e) => {
    officeSearchTerm = e.target.value;
    renderOfficeLocal();
  };
}
if (officeViewToggle) {
  officeViewToggle.onclick = () => {
    officeViewMode = officeViewMode === "grid" ? "list" : "grid";
    localStorage.setItem("officeViewMode", officeViewMode);
    renderOfficeLocal();
  };
}
if (officeUniversalCheck) {
  officeUniversalCheck.checked = officeUniversalFilter;
  officeUniversalCheck.onchange = (e) => {
    officeUniversalFilter = e.target.checked;
    localStorage.setItem(
      "officeUniversalFilter",
      String(officeUniversalFilter),
    );
    renderOfficeLocal();
  };
}
if (officeX64Check) {
  officeX64Check.checked = officeX64Filter;
  officeX64Check.onchange = (e) => {
    officeX64Filter = e.target.checked;
    localStorage.setItem("officeX64Filter", String(officeX64Filter));
    renderOfficeLocal();
  };
}
if (officeX86Check) {
  officeX86Check.checked = officeX86Filter;
  officeX86Check.onchange = (e) => {
    officeX86Filter = e.target.checked;
    localStorage.setItem("officeX86Filter", String(officeX86Filter));
    renderOfficeLocal();
  };
}
if (officeOnlineLicenseInputs && officeOnlineLicenseInputs.length > 0) {
  officeOnlineLicenseInputs.forEach((input) => {
    input.onchange = (event) => {
      officeOnlineLicenseFilter = event.target.value || "all";
      renderOfficeOnlineCatalog();
    };
  });
}
if (officeOnlineModeInputs && officeOnlineModeInputs.length > 0) {
  officeOnlineModeInputs.forEach((input) => {
    input.onchange = () => updateOfficeOnlineSubmitButtonLabel();
  });
}
if (officeOnlineLanguageSelect) {
  officeOnlineLanguageSelect.onchange = (event) => {
    localStorage.setItem("officeOnlineLanguageId", event.target.value);
  };
}
if (officeOnlineSubmitBtn) {
  officeOnlineSubmitBtn.onclick = () => submitOfficeOnlineSetup();
}
if (officeCleanBtn || officeOnlineCleanBtn) {
  setOfficeCleanButtonState(false);
  if (officeCleanBtn) {
    officeCleanBtn.onclick = () => runOfficeCleanup();
  }
  if (officeOnlineCleanBtn) {
    officeOnlineCleanBtn.onclick = () => runOfficeCleanup();
  }
}
if (driverBackupPathInput) {
  driverBackupPathInput.value = driverBackupPath;
}
if (driverRestorePathInput) {
  driverRestorePathInput.value = driverRestorePath;
}
if (driverBackupBrowseBtn) {
  driverBackupBrowseBtn.onclick = () => pickDriverFolder("backup");
}
if (driverRestoreBrowseBtn) {
  driverRestoreBrowseBtn.onclick = () => pickDriverFolder("restore");
}
if (driverBackupRunBtn) {
  driverBackupRunBtn.onclick = () => runDriverBackup();
}
if (driverRestoreRunBtn) {
  driverRestoreRunBtn.onclick = () => runDriverRestore();
}
if (cleanupRamBtn) {
  cleanupRamBtn.onclick = () => runSystemRamCleanup();
}
if (cleanupDiskBtn) {
  cleanupDiskBtn.onclick = () => runSystemDiskCleanup();
}
setDriverButtonState();
setCleanupButtonState();
if (benchmarkDriveInput) {
  benchmarkDriveInput.value = normalizeBenchmarkDrive(
    benchmarkDriveInput.value,
  );
  benchmarkDriveInput.onblur = () => {
    benchmarkDriveInput.value = normalizeBenchmarkDrive(
      benchmarkDriveInput.value,
    );
    refreshBenchmarkHealth(true);
  };
}
if (benchmarkRunDiskBtn) {
  benchmarkRunDiskBtn.onclick = () => runBenchmarkTest();
}
if (benchmarkHealthCardsEl) {
  benchmarkHealthCardsEl.onclick = (event) => {
    const btn = event.target.closest(".benchmark-refresh-health-btn");
    if (btn) {
      refreshBenchmarkHealth(false);
    }
  };
}
setBenchmarkButtonState();
setBenchmarkOutput("");
updateBenchmarkDisplayMeta();
updateBenchmarkHealthUI();
notiToggle.onclick = (e) => {
  e.stopPropagation();
  notiPanel.classList.toggle("active");
  if (notiPanel.classList.contains("active")) {
    unreadCount = 0;
    notiBadge.style.display = "none";
    taskPanel.classList.remove("active");
  }
};
closeNotiBtn.onclick = () => notiPanel.classList.remove("active");
clearNotiBtn.onclick = () => {
  notificationHistory = [];
  updateNotiPanelUI();
};
notiPanel.onclick = (e) => e.stopPropagation();
taskToggle.onclick = (e) => {
  e.stopPropagation();
  taskPanel.classList.toggle("active");
  if (taskPanel.classList.contains("active")) {
    notiPanel.classList.remove("active");
  }
};
closeTaskBtn.onclick = () => taskPanel.classList.remove("active");
taskPanel.onclick = (e) => e.stopPropagation();

document.addEventListener("click", () => {
  notiPanel.classList.remove("active");
  taskPanel.classList.remove("active");
  if (wingetModal && wingetModal.classList.contains("active")) {
    wingetModal.classList.remove("active");
    setTimeout(() => (wingetModal.style.display = "none"), 300);
  }
});
searchInput.oninput = (e) => {
  searchTerm = e.target.value;
  renderInstallers();
};
if (addBtn) {
  addBtn.onclick = async () => {
    const result = await window.api.selectFile();
    if (result) {
      if (installers.some((i) => i.path === result.path)) {
        showNotification(
          currentLanguage === "vi"
            ? "Ứng dụng này đã có trong thư viện"
            : "This application already exists in library",
          "info",
        );
        return;
      }
      installers.push(result);
      if (window.api && window.api.saveLibrary) {
        window.api.saveLibrary(installers);
      }
      renderInstallers();
      showNotification(
        currentLanguage === "vi"
          ? `Đã thêm ${result.name}`
          : `Added ${result.name}`,
        "success",
      );
    }
  };
}
document.getElementById("clear-all-data-btn").onclick = () => {
  if (
    confirm(
      currentLanguage === "vi"
        ? "Đặt lại toàn bộ dữ liệu?"
        : "Reset everything?",
    )
  ) {
    installers = [];
    if (window.api && window.api.saveLibrary) {
      window.api.saveLibrary(installers);
    }
    renderInstallers();
    showNotification(
      currentLanguage === "vi" ? "Đã đặt lại thư viện" : "Library reset",
      "info",
    );
  }
};
function resetWingetModal() {
  if (wingetSearchInput) wingetSearchInput.value = "";
  if (wingetResults)
    wingetResults.innerHTML = `<p class="text-center text-muted text-sm py-4">${UI_TEXT[currentLanguage]["i18n-winget-results-placeholder"] || UI_TEXT.en["i18n-winget-results-placeholder"]}</p>`;
}
if (addWingetBtn && wingetModal) {
  addWingetBtn.onclick = () => {
    resetWingetModal();
    wingetModal.style.display = "flex";
    setTimeout(() => wingetModal.classList.add("active"), 10);
    if (wingetSearchInput) wingetSearchInput.focus();
  };
}
if (closeModal && wingetModal) {
  closeModal.onclick = () => {
    wingetModal.classList.remove("active");
    setTimeout(() => (wingetModal.style.display = "none"), 300);
  };
}
if (wingetModal) {
  wingetModal.onclick = (e) => e.stopPropagation();
}
if (wingetSearchInput) {
  wingetSearchInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      wingetSearchBtn.click();
    }
  };
}
if (wingetSearchBtn && window.api) {
  wingetSearchBtn.onclick = async () => {
    const query = wingetSearchInput.value.trim();
    if (!query) return;
    wingetSearchBtn.disabled = true;
    wingetSearchBtn.innerHTML =
      '<i data-lucide="loader-2" class="animate-spin" style="width:14px"></i>';
    wingetResults.innerHTML = `<p class="text-center text-muted text-sm py-8">${
      currentLanguage === "vi"
        ? "Đang tìm ứng dụng"
        : "Searching for applications"
    }</p>`;
    if (window.lucide) window.lucide.createIcons();
    try {
      const results = await window.api.searchWinget(query);
      wingetResults.innerHTML = "";
      if (!results || results.length === 0) {
        wingetResults.innerHTML = `<p class="text-center text-muted text-sm py-4">${
          currentLanguage === "vi"
            ? "Không tìm thấy kết quả"
            : "No results found"
        }</p>`;
      } else {
        results.forEach((pkg) => {
          const item = document.createElement("div");
          item.className =
            "flex items-center justify-between p-3 rounded-lg border bg-accent-5 hover-bg-accent-10 transition-colors";
          item.innerHTML = `
            <div class="truncate mr-4" style="flex: 1">
              <p class="text-xs font-bold truncate">${pkg.name}</p>
              <p class="text-2xs text-muted truncate">${pkg.id}</p>
            </div>
            <button class="btn btn-secondary h-7 px-3 text-2xs add-pkg-btn">${
              currentLanguage === "vi" ? "Thêm" : "Add"
            }</button>
          `;
          item.querySelector(".add-pkg-btn").onclick = () => {
            if (installers.some((i) => i.path === pkg.id)) {
              showNotification(
                currentLanguage === "vi"
                  ? "Ứng dụng đã có trong thư viện"
                  : "Application already in library",
                "info",
              );
              return;
            }
            const newApp = {
              name: pkg.name,
              path: pkg.id,
              isWinget: true,
              arch: "Universal",
            };
            installers.push(newApp);
            if (window.api && window.api.saveLibrary) {
              window.api.saveLibrary(installers);
            }
            renderInstallers();
            showNotification(
              currentLanguage === "vi"
                ? `Đã thêm ${pkg.name}`
                : `Added ${pkg.name}`,
              "success",
            );
          };
          wingetResults.appendChild(item);
        });
      }
    } catch (e) {
      wingetResults.innerHTML = `<p class="text-center text-destructive text-sm py-4">${tr("errorPrefix", { message: e.message })}</p>`;
    } finally {
      wingetSearchBtn.disabled = false;
      wingetSearchBtn.innerHTML =
        UI_TEXT[currentLanguage]["i18n-winget-search-btn"] ||
        UI_TEXT.en["i18n-winget-search-btn"];
      if (window.lucide) window.lucide.createIcons();
    }
  };
}
const viewToggleBtn = document.getElementById("view-toggle");
if (viewToggleBtn) {
  viewToggleBtn.onclick = () => {
    viewMode = viewMode === "grid" ? "list" : "grid";
    localStorage.setItem("viewMode", viewMode);
    renderInstallers();
  };
}
const onlineCheck = document.getElementById("filter-online");
const x64Check = document.getElementById("filter-x64");
const x86Check = document.getElementById("filter-x86");
if (onlineCheck) {
  onlineCheck.checked = universalFilter;
  onlineCheck.onchange = (e) => {
    universalFilter = e.target.checked;
    renderInstallers();
  };
}
if (x64Check) {
  x64Check.checked = x64Filter;
  x64Check.onchange = (e) => {
    x64Filter = e.target.checked;
    renderInstallers();
  };
}
if (x86Check) {
  x86Check.checked = x86Filter;
  x86Check.onchange = (e) => {
    x86Filter = e.target.checked;
    renderInstallers();
  };
}
const revoBtn = document.getElementById("launch-revo-btn");
const launchRevoUninstaller = () => {
  if (!window.api || !window.api.launchRevo) return;
  window.api.launchRevo();
};
if (revoBtn) {
  revoBtn.onclick = launchRevoUninstaller;
}
const winHwidBtn = document.getElementById("active-win-hwid-btn");
if (winHwidBtn && window.api) {
  winHwidBtn.onclick = async () => {
    showNotification(
      currentLanguage === "vi"
        ? "Bắt đầu kích hoạt Windows"
        : "Starting Windows Activation",
      "info",
    );
    try {
      const res = await window.api.activeWindows();
      if (res.success)
        showNotification(
          currentLanguage === "vi"
            ? "Đã mở trình kích hoạt Windows"
            : "Windows Activation launched",
          "success",
        );
      else
        showNotification(
          currentLanguage === "vi"
            ? `Mở trình kích hoạt thất bại: ${res.error}`
            : "Failed to launch activation: " + res.error,
          "error",
        );
    } catch (e) {
      showNotification(tr("errorPrefix", { message: e.message }), "error");
    }
  };
}
const officeActiveBtn = document.getElementById("page-active-office-btn");
if (officeActiveBtn && window.api) {
  officeActiveBtn.onclick = async () => {
    showNotification(
      currentLanguage === "vi"
        ? "Bắt đầu kích hoạt Office"
        : "Starting Office Activation",
      "info",
    );
    try {
      const res = await window.api.activeOffice("standard");
      if (res.success)
        showNotification(
          currentLanguage === "vi"
            ? "Đã mở trình kích hoạt Office"
            : "Office Activation launched",
          "success",
        );
      else
        showNotification(
          currentLanguage === "vi"
            ? `Mở trình kích hoạt thất bại: ${res.error}`
            : "Failed to launch activation: " + res.error,
          "error",
        );
    } catch (e) {
      showNotification(tr("errorPrefix", { message: e.message }), "error");
    }
  };
}
const dnsFixBtn = document.getElementById("page-dns-fix-btn");
if (dnsFixBtn && window.api) {
  dnsFixBtn.onclick = async () => {
    showNotification(
      currentLanguage === "vi" ? "Chạy ISPs Fix" : "Run ISPs Fix",
      "info",
    );
    try {
      const res = await window.api.activeOffice("dns");
      if (res.success)
        showNotification(
          currentLanguage === "vi"
            ? "ISPs Fix thành công"
            : "ISPs Fix successfully",
          "success",
        );
      else
        showNotification(
          currentLanguage === "vi"
            ? `Áp dụng ISPs Fix thất bại: ${res.error}`
            : "Failed to apply ISPs Fix: " + res.error,
          "error",
        );
    } catch (e) {
      showNotification(tr("errorPrefix", { message: e.message }), "error");
    }
  };
}
const tlsFixBtn = document.getElementById("page-tls-fix-btn");
if (tlsFixBtn && window.api) {
  tlsFixBtn.onclick = async () => {
    showNotification(
      currentLanguage === "vi" ? "Chạy TLS Fix" : "Run TLS Fix",
      "info",
    );
    try {
      const res = await window.api.activeOffice("tls");
      if (res.success)
        showNotification(
          currentLanguage === "vi"
            ? "TLS Fix thành công"
            : "TLS Fix successfully",
          "success",
        );
      else
        showNotification(
          currentLanguage === "vi"
            ? `Áp dụng TLS Fix thất bại: ${res.error}`
            : "Failed to apply TLS Fix: " + res.error,
          "error",
        );
    } catch (e) {
      showNotification(tr("errorPrefix", { message: e.message }), "error");
    }
  };
}
const githubLink = document.getElementById("github-link");
const creatorLink = document.getElementById("creator-link");
if (creatorLink && window.api && window.api.openExternal) {
  creatorLink.onclick = (e) => {
    e.preventDefault();
    window.api.openExternal("https://mhqb365.com");
  };
}
if (githubLink && window.api && window.api.openExternal) {
  githubLink.onclick = (e) => {
    e.preventDefault();
    window.api.openExternal("https://github.com/mhqb365/Winstaller-Hub");
  };
}
window.addEventListener("beforeunload", () => {
  stopPerformancePolling();
  if (pendingInstalledRenderTimer) {
    clearTimeout(pendingInstalledRenderTimer);
    pendingInstalledRenderTimer = null;
  }
  if (typeof disposeInstalledAppsUpdatedListener === "function") {
    disposeInstalledAppsUpdatedListener();
    disposeInstalledAppsUpdatedListener = null;
  }
});
function showSystemLoader(text) {
  if (systemLoader && systemLoaderText) {
    systemLoaderText.innerText = text || tr("systemChecking");
    systemLoader.classList.add("active");
  }
}
function hideSystemLoader() {
  if (systemLoader) {
    systemLoader.classList.remove("active");
  }
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkAndInstallWinget() {
  if (!window.api || !window.api.checkWingetStatus || !window.api.installWinget)
    return;

  showSystemLoader(tr("systemChecking"));
  await delay(800);

  try {
    // 1. Ensure Winget is ready
    showSystemLoader(tr("wingetCheck"));
    await delay(500);
    const status = await window.api.checkWingetStatus();

    if (status.status === "missing" || status.status === "outdated") {
      const msg =
        currentLanguage === "vi"
          ? "Đang cấu hình gói cài đặt hệ thống"
          : "Configuring system package manager";
      showSystemLoader(msg);
      await delay(1000);
      const result = await window.api.installWinget();
      if (!result.success) {
        showNotification(
          currentLanguage === "vi"
            ? `Cài đặt Winget thất bại: ${result.error}`
            : `Winget installation failed: ${result.error}`,
          "error",
        );
        return;
      }
    }

    // 2. Once Winget is ready, Check/Install SmartMonTools
    if (window.api.getInstalledApps && window.api.runInstaller) {
      showSystemLoader(tr("installingSmartMon"));
      await delay(800);
      // Force refreshing the list to get latest state
      const apps = await window.api.getInstalledApps({
        force: true,
        waitForFresh: true,
      });

      const hasSmartMon = apps.some(
        (app) =>
          app.id === "smartmontools.smartmontools" ||
          String(app.name).toLowerCase().includes("smartmontools"),
      );

      if (!hasSmartMon) {
        const installMsg =
          currentLanguage === "vi"
            ? "Đang cài đặt thành phần chẩn đoán"
            : "Installing diagnostic components";
        showSystemLoader(installMsg);
        await delay(1000);
        // Run silent installer via Winget
        const res = await window.api.runInstaller(
          "smartmontools.smartmontools",
        );
        if (res.success) {
          showNotification(
            currentLanguage === "vi"
              ? "Đã cài đặt SmartMonTools thành công"
              : "SmartMonTools installed successfully",
            "success",
          );
        }
      }
    }

    // 3. Prepare performance metrics & System info
    const perfMsg =
      currentLanguage === "vi"
        ? "Đang lấy thông tin hệ thống"
        : "Collecting system info";
    showSystemLoader(perfMsg);

    // Run both in parallel to save time
    await Promise.all([
      typeof refreshPerformanceBoard === "function"
        ? refreshPerformanceBoard()
        : Promise.resolve(),
      typeof initSysInfo === "function" ? initSysInfo() : Promise.resolve(),
    ]);

    const finalMsg = currentLanguage === "vi" ? "Đang hoàn tất" : "Finalizing";
    showSystemLoader(finalMsg);
    await delay(600);
  } catch (error) {
    console.error("Error during system check:", error);
  } finally {
    hideSystemLoader();
  }
}
async function initApp() {
  initLanguageSelector();
  initThemeToggle();
  await checkAndInstallWinget();
  if (window.api && window.api.onInstalledAppsUpdated) {
    disposeInstalledAppsUpdatedListener = window.api.onInstalledAppsUpdated(
      (apps) => applyInstalledAppsSnapshot(apps, false),
    );
  }

  if (window.api && window.api.loadLibrary) {
    installers = await window.api.loadLibrary();
  }
  const selectedLicenseInput = document.querySelector(
    'input[name="office-online-license"]:checked',
  );
  if (selectedLicenseInput) {
    officeOnlineLicenseFilter = selectedLicenseInput.value || "all";
  }
  renderOfficeOnlineCatalog();
  updateOfficeOnlineSubmitButtonLabel();
  initSysInfo();
  switchTab("dashboard");
  applyLanguage(currentLanguage, { persist: false, rerender: true });
  if (window.lucide) window.lucide.createIcons();
}
initApp();
