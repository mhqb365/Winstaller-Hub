const installerGrid = document.getElementById("installer-grid");
const addBtn = document.getElementById("add-installer-btn");
const searchInput = document.getElementById("search-input");
const notificationContainer = document.getElementById("notification-container");
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
let toastSequence = 0;
const activeToastTimers = /* @__PURE__ */ new Map();
let activeTasks = /* @__PURE__ */ new Map();
let installers = [];
let selectedInstallerKeys = /* @__PURE__ */ new Set();
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
let sysInfoLoading = true;
let viewMode = localStorage.getItem("viewMode") || "list";
let officeViewMode = localStorage.getItem("officeViewMode") || "list";
let universalFilter = true;
let x64Filter = true;
let x86Filter = true;
let officeUniversalFilter =
  localStorage.getItem("officeUniversalFilter") !== "false";
let officeX64Filter = localStorage.getItem("officeX64Filter") !== "false";
let officeX86Filter = localStorage.getItem("officeX86Filter") !== "false";
let officeSearchTerm = "";
let officeOnlineSelectedProductIds = /* @__PURE__ */ new Set();
let driverBackupPath = "";
let driverRestorePath = "";
let driverBackupBusy = false;
let driverRestoreBusy = false;
let dataBackupPath = "";
let dataRestorePath = "";
let dataBackupBusy = false;
let dataRestoreBusy = false;
let dataDefaultFolders = [];
let dataSelectedFolderIds = /* @__PURE__ */ new Set();
let dataCustomFolders = [];
let dataSizeBusy = false;
let dataSelectedTotalBytes = 0;
let dataSelectedTotalFiles = 0;
let dataSizeRefreshTimer = null;
let dataSizeIdleHandle = null;
let dataSizeRequestId = 0;
let dataSizeRefreshQueued = false;
let dataSizeSelectionVersion = 0;
const DATA_SIZE_REFRESH_IDLE_MS = 1400;
const DATA_SIZE_CACHE_TTL_MS = 2 * 60 * 1000;
const dataFolderSizeCache = /* @__PURE__ */ new Map();
let dataFoldersLoadedOnce = false;
let dataFolderLoadPromise = null;
const DATA_CUSTOM_RESTORE_PROFILE_ID = "userprofile";
let cleanupRamBusy = false;
let cleanupDiskBusy = false;
let windowsUpdateBusy = false;
let windowsUpdateState = null;
let windowsUpdateStateLoading = true;
let benchmarkBusy = false;
let benchmarkHealthBusy = false;
let benchmarkLastMeta = null;
let benchmarkRunningType = "";
let benchmarkHealthData = [];
let performancePollingTimer = null;
let performancePollingBusy = false;
let activationWindowsKeyBusy = false;
let activationOfficeKeyBusy = false;
const PERFORMANCE_REFRESH_MS = 3e3;
const PERFORMANCE_GPU_COLORS = ["#a855f7", "#14b8a6", "#f59e0b", "#ef4444"];
const PERFORMANCE_NETWORK_COLORS = ["#06b6d4", "#0891b2", "#0ea5e9", "#2563eb"];
const PERFORMANCE_DISK_COLORS = ["#0ea5e9", "#0284c7", "#0369a1", "#38bdf8"];
const THEME_STORAGE_KEY = "themeMode";
const LANGUAGE_STORAGE_KEY = "appLanguage";
const PATH_STORAGE_KEYS = [
  "driverBackupPath",
  "driverRestorePath",
  "dataBackupPath",
  "dataRestorePath",
  "dataSelectedFolderIds",
  "dataCustomFolders",
];
const themeToggleInput = document.getElementById("theme-mode-toggle");
const themeModeLabel = document.getElementById("theme-mode-label");
const appLanguageSelect = document.getElementById("app-language-select");
const aboutVersionValue = document.getElementById("about-version-value");
const appTotalCountEl = document.getElementById("app-total-count");
const officeTotalCountEl = document.getElementById("office-total-count");
const selectionHeaderEl = document.getElementById("selection-header");
const selectedCountEl = document.getElementById("selected-count");
const clearSelectionBtn = document.getElementById("clear-selection-btn");
const installSelectedBtn = document.getElementById("install-selected-btn");
const deleteSelectedBtn = document.getElementById("delete-selected-btn");
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
    "i18n-nav-data-backup": "Data",
    "i18n-nav-cleanup": "Cleanup",
    "i18n-nav-utilities": "Utilities",
    "i18n-nav-utilities-home": "System",
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
    "i18n-benchmark-health-media-label": "Type",
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
    "i18n-btn-clear-selection": "Clear Selection",
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
    "i18n-office-online-language-title": "Language",
    "i18n-office-online-choose-products": "Choose Products",
    "i18n-btn-office-clean-online": "Clean Office",
    "i18n-btn-office-online-submit": "Install",
    "i18n-driver-title": "Drivers",
    "i18n-driver-subtitle": "Backup or restore drivers",
    "i18n-driver-backup-title": "Backup",
    "i18n-driver-backup-desc": "Backup all driver packages",
    "i18n-driver-backup-browse": "Browse",
    "i18n-driver-backup-run": "Backup",
    "i18n-driver-backup-hint": "Should save backups on another partition",
    "i18n-driver-restore-title": "Restore",
    "i18n-driver-restore-desc": "Restore drivers from backup folder",
    "i18n-driver-restore-browse": "Browse",
    "i18n-driver-restore-run": "Restore",
    "i18n-driver-restore-hint": "Run as Administrator for best compatibility",
    "i18n-data-backup-title": "Data",
    "i18n-data-backup-subtitle": "Backup and restore default user folders",
    "i18n-data-backup-run-title": "Backup",
    "i18n-data-backup-run-desc": "Copy selected default folders",
    "i18n-data-backup-add-folder": "Add folder",
    "i18n-data-backup-select-all": "Select all",
    "i18n-data-backup-clear-all": "Clear",
    "i18n-data-backup-browse": "Browse",
    "i18n-data-backup-run-btn": "Backup",
    "i18n-data-backup-run-hint": "Uses multithreaded copy to improve speed",
    "i18n-data-restore-title": "Restore",
    "i18n-data-restore-desc": "Restore selected folders from backup",
    "i18n-data-restore-browse": "Browse",
    "i18n-data-restore-run-btn": "Restore",
    "i18n-data-restore-hint":
      "Existing files are kept, changed files are updated",
    "i18n-cleanup-title": "Cleanup",
    "i18n-cleanup-subtitle": "Free RAM and clean temporary disk data",
    "i18n-cleanup-ram-title": "RAM Cleanup",
    "i18n-cleanup-ram-desc": "Trim working sets and purge standby memory",
    "i18n-cleanup-ram-btn": "Clean RAM",
    "i18n-cleanup-ram-hint": "Best results when running as Administrator",
    "i18n-cleanup-disk-title": "Disk Cleanup",
    "i18n-cleanup-disk-desc": "Remove temp files, recycle bin and more",
    "i18n-cleanup-disk-btn": "Clean Disk",
    "i18n-cleanup-disk-hint": "Cleanup may take several minutes",
    "i18n-utilities-title": "System",
    "i18n-utilities-subtitle": "Useful system tools",
    "i18n-utilities-wu-title": "Windows Update",
    "i18n-utilities-wu-desc": "Quickly disable or enable Windows Update",
    "i18n-utilities-wu-status-label": "Current status",
    "i18n-utilities-wu-hint":
      "Requires Administrator privileges to apply changes",
    "i18n-activation-title": "Microsoft Activation",
    "i18n-activation-subtitle":
      "Official active methods for Windows and Office",
    "i18n-activation-windows-title": "Windows",
    "i18n-activation-windows-desc":
      "Permanent Digital License (HWID) activation for Windows 10 & 11",
    "i18n-activation-windows-btn": "Activate Windows",
    "i18n-activation-office-title": "Office",
    "i18n-activation-office-desc":
      "Safe Ohook method for all Office versions including Microsoft 365",
    "i18n-activation-office-btn": "Activate Office",
    "i18n-activation-win-key-title": "Windows Product Key",
    "i18n-activation-win-key-desc": "Using your genuine Microsoft key",
    "i18n-activation-win-key-btn": "Activate by Key",
    "i18n-activation-office-key-title": "Office Product Key",
    "i18n-activation-office-key-desc": "Using your genuine Microsoft key",
    "i18n-activation-office-key-btn": "Activate by Key",
    "i18n-activation-mas-title": "MAS",
    "i18n-activation-key-hint": "Active script by massgrave.dev",
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

    "i18n-nav-dashboard": "Tổng quan",
    "i18n-nav-benchmark": "Benchmark",
    "i18n-nav-library": "Ứng dụng",
    "i18n-nav-office-parent": "Office",
    "i18n-nav-office-online": "Cài online",
    "i18n-nav-office-images": "Cài từ file",
    "i18n-nav-driver": "Driver",
    "i18n-nav-data-backup": "Dữ liệu",
    "i18n-nav-cleanup": "Dọn dẹp",
    "i18n-nav-utilities": "Tiện ích",
    "i18n-nav-utilities-home": "Hệ thống",
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
    "i18n-dashboard-title": "Tổng quan",
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
    "i18n-btn-clear-selection": "Bỏ chọn",
    "i18n-btn-install-selected": "Cài đã chọn",
    "i18n-btn-delete": "Xóa",
    "i18n-office-local-title": "Office Images Setup",
    "i18n-office-local-subtitle": "Cài Microsoft Office từ tệp ISO hoặc IMG",
    "i18n-btn-office-clean-local": "Dọn Office",
    "i18n-office-online-title": "Office Online Setup",
    "i18n-office-online-subtitle": "Cài hoặc tải Office từ Microsoft",
    "i18n-office-online-arch-title": "Kiến trúc",
    "i18n-office-online-mode-title": "Chế độ",
    "i18n-office-online-language-title": "Ngôn ngữ",
    "i18n-office-online-choose-products": "Chọn sản phẩm",
    "i18n-btn-office-clean-online": "Dọn Office",
    "i18n-btn-office-online-submit": "Cài đặt",
    "i18n-driver-title": "Driver",
    "i18n-driver-subtitle": "Sao lưu hoặc khôi phục driver",
    "i18n-driver-backup-title": "Sao lưu",
    "i18n-driver-backup-desc": "Sao lưu toàn bộ gói driver",
    "i18n-driver-backup-browse": "Duyệt",
    "i18n-driver-backup-run": "Sao lưu",
    "i18n-driver-backup-hint": "Nên lưu bản sao ở phân vùng khác",
    "i18n-driver-restore-title": "Khôi phục",
    "i18n-driver-restore-desc": "Khôi phục driver từ thư mục sao lưu",
    "i18n-driver-restore-browse": "Duyệt",
    "i18n-driver-restore-run": "Khôi phục",
    "i18n-driver-restore-hint": "Nên chạy Administrator để tương thích tốt",
    "i18n-data-backup-title": "Dữ liệu",
    "i18n-data-backup-subtitle":
      "Sao lưu và khôi phục các thư mục mặc định của người dùng",
    "i18n-data-backup-run-title": "Sao lưu",
    "i18n-data-backup-run-desc":
      "Sao chép các thư mục mặc định đã chọn của người dùng hiện tại",
    "i18n-data-backup-add-folder": "Tự chọn",
    "i18n-data-backup-select-all": "Tất cả",
    "i18n-data-backup-clear-all": "Bỏ chọn",
    "i18n-data-backup-browse": "Duyệt",
    "i18n-data-backup-run-btn": "Sao lưu",
    "i18n-data-backup-run-hint": "Dùng sao chép đa luồng để tăng tốc độ",
    "i18n-data-restore-title": "Khôi phục",
    "i18n-data-restore-desc":
      "Khôi phục các thư mục đã chọn từ bản sao lưu vào hồ sơ người dùng hiện tại",
    "i18n-data-restore-browse": "Duyệt",
    "i18n-data-restore-run-btn": "Khôi phục",
    "i18n-data-restore-hint": "Giữ file cũ, cập nhật file đã thay đổi",
    "i18n-cleanup-title": "Dọn dẹp",
    "i18n-cleanup-subtitle": "Giải phóng RAM và dọn dữ liệu tạm trên ổ đĩa",
    "i18n-cleanup-ram-title": "Dọn RAM",
    "i18n-cleanup-ram-desc": "Thu gọn working set và làm sạch standby",
    "i18n-cleanup-ram-btn": "Dọn RAM",
    "i18n-cleanup-ram-hint":
      "Hiệu quả tốt hơn khi chạy với quyền Administrator",
    "i18n-cleanup-disk-title": "Dọn ổ đĩa",
    "i18n-cleanup-disk-desc": "Xóa file tạm, thùng rác và cleanup",
    "i18n-cleanup-disk-btn": "Dọn ổ đĩa",
    "i18n-cleanup-disk-hint": "Dọn ổ đĩa có thể mất vài phút",
    "i18n-utilities-title": "Hệ thống",
    "i18n-utilities-subtitle": "Công cụ hệ thống hữu ích",
    "i18n-utilities-wu-title": "Windows Update",
    "i18n-utilities-wu-desc": "Bật tắt nhanh dịch vụ Windows Update",
    "i18n-utilities-wu-status-label": "Trạng thái hiện tại",
    "i18n-utilities-wu-hint": "Cần quyền Administrator để áp dụng thay đổi",
    "i18n-activation-title": "Kích hoạt Microsoft",
    "i18n-activation-subtitle":
      "Công cụ kích hoạt chính thức cho Windows và Office",
    "i18n-activation-windows-title": "Windows",
    "i18n-activation-windows-desc":
      "Kích hoạt Digital License vĩnh viễn (HWID) cho Windows 10 & 11",
    "i18n-activation-windows-btn": "Kích hoạt Windows",
    "i18n-activation-office-title": "Office",
    "i18n-activation-office-desc":
      "Phương pháp Ohook an toàn cho mọi phiên bản Office gồm Microsoft 365",
    "i18n-activation-office-btn": "Kích hoạt Office",
    "i18n-activation-win-key-title": "Windows Product Key",
    "i18n-activation-win-key-desc":
      "Kích hoạt Windows bằng key Microsoft bản quyền của bạn",
    "i18n-activation-win-key-btn": "Kích hoạt bằng key",
    "i18n-activation-office-key-title": "Office Product Key",
    "i18n-activation-office-key-desc":
      "Kích hoạt Office bằng key Microsoft bản quyền của bạn",
    "i18n-activation-office-key-btn": "Kích hoạt bằng key",
    "i18n-activation-mas-title": "MAS",
    "i18n-activation-key-hint": "Script kích hoạt của massgrave.dev",
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
    "driver-backup-path": "Select backup folder",
    "driver-restore-path": "Select data folder",
    "data-backup-path": "Select backup folder",
    "data-restore-path": "Select data backup folder",
    "activation-win-key-input": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
    "activation-office-key-input": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
    "winget-search-input": "Enter app name (e.g. Chrome)",
  },
  vi: {
    "search-input": "Tìm ứng dụng",
    "office-search-input": "Tìm phiên bản Office",
    "benchmark-drive-input": "C:",
    "driver-backup-path": "Chọn thư mục sao lưu",
    "driver-restore-path": "Chọn thư mục dữ liệu",
    "data-backup-path": "Chọn thư mục sao lưu",
    "data-restore-path": "Chọn thư mục dữ liệu",
    "activation-win-key-input": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
    "activation-office-key-input": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
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
    officeCatalogFull: "1. Suites",
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
    appsCountLabel: "{count} apps",
    dataFoldersSelectedLabel: "{count} folders selected",
    dataFolderExists: "Ready",
    dataFolderMissing: "Missing",
    dataFolderCustomTag: "Manual",
    dataFolderCustomRestoreHint: "Restore to user folder: {target}\\{subPath}",
    dataSizeCalculating: "Calculating size...",
    dataSizeSummary: "{size} | {count} files",
    dataCustomFolderAdded: "Added manual folder: {name}",
    dataCustomFolderExists: "This folder is already in the backup list",
    dataCustomFolderRemoved: "Removed manual folder: {name}",
    selectedAppsLabel: "{count} selected",
    installSelectedStarted: "Started installing {count} applications",
    installSelectedNoEligible: "Selected applications are already installed",
    deleteSelectedConfirm: "Remove {count} selected applications from library?",
    deleteSelectedDone: "Removed {count} applications from library",
    officeImagesCountLabel: "{count} images",
    windowsUpdateEnabled: "Enabled",
    windowsUpdateDisabled: "Disabled",
    windowsUpdateUnknown: "Unknown",
    windowsUpdateDisableBtn: "Disable Windows Update",
    windowsUpdateEnableBtn: "Enable Windows Update",
    windowsUpdateApiUnavailable: "Windows Update control API is not available",
    windowsUpdateRefreshFailed: "Failed to load Windows Update status",
    windowsUpdateDisableSuccess: "Windows Update has been disabled",
    windowsUpdateEnableSuccess: "Windows Update has been enabled",
    windowsUpdateToggleFailed: "Failed to change Windows Update state",
    invalidProductKey:
      "Invalid product key format. Use 25 characters (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX).",
    windowsKeyActivationStarting: "Activating Windows using product key",
    windowsKeyActivationSuccess: "Windows activated successfully by key",
    windowsKeyActivationFailed: "Windows key activation failed",
    officeKeyActivationStarting: "Activating Office using product key",
    officeKeyActivationSuccess: "Office activated successfully by key",
    officeKeyActivationFailed: "Office key activation failed",
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
    appsCountLabel: "{count} ứng dụng",
    dataFoldersSelectedLabel: "Đã chọn {count} thư mục",
    dataFolderExists: "Sẵn sàng",
    dataFolderMissing: "Thiếu",
    dataFolderCustomTag: "Thủ công",
    dataFolderCustomRestoreHint:
      "Khôi phục vào thư mục người dùng: {target}\\{subPath}",
    dataSizeCalculating: "Đang tính dung lượng...",
    dataSizeSummary: "{size} | {count} tệp",
    dataCustomFolderAdded: "Đã thêm thư mục thủ công: {name}",
    dataCustomFolderExists: "Thư mục này đã có trong danh sách sao lưu",
    dataCustomFolderRemoved: "Đã xóa thư mục thủ công: {name}",
    selectedAppsLabel: "Đã chọn {count}",
    installSelectedStarted: "Đã bắt đầu cài {count} ứng dụng",
    installSelectedNoEligible: "Các ứng dụng đã chọn đã được cài sẵn",
    deleteSelectedConfirm: "Xóa {count} ứng dụng đã chọn khỏi thư viện?",
    deleteSelectedDone: "Đã xóa {count} ứng dụng khỏi thư viện",
    officeImagesCountLabel: "{count} bộ cài",
    windowsUpdateEnabled: "Đang bật",
    windowsUpdateDisabled: "Đã tắt",
    windowsUpdateUnknown: "Không rõ",
    windowsUpdateDisableBtn: "Tắt Windows Update",
    windowsUpdateEnableBtn: "Bật Windows Update",
    windowsUpdateApiUnavailable: "API Windows Update hiện không khả dụng",
    windowsUpdateRefreshFailed: "Không thể tải trạng thái Windows Update",
    windowsUpdateDisableSuccess: "Đã tắt Windows Update",
    windowsUpdateEnableSuccess: "Đã bật Windows Update",
    windowsUpdateToggleFailed: "Không thể đổi trạng thái Windows Update",
    invalidProductKey:
      "Định dạng key không hợp lệ. Dùng 25 ký tự (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX).",
    windowsKeyActivationStarting: "Bắt đầu kích hoạt Windows bằng product key",
    windowsKeyActivationSuccess: "Kích hoạt Windows bằng key thành công",
    windowsKeyActivationFailed: "Kích hoạt Windows bằng key thất bại",
    officeKeyActivationStarting: "Bắt đầu kích hoạt Office bằng product key",
    officeKeyActivationSuccess: "Kích hoạt Office bằng key thành công",
    officeKeyActivationFailed: "Kích hoạt Office bằng key thất bại",
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
  if (appLanguageSelect) {
    const enOpt = appLanguageSelect.querySelector('option[value="en"]');
    const viOpt = appLanguageSelect.querySelector('option[value="vi"]');
    if (enOpt) enOpt.textContent = tr("languageEnglish");
    if (viOpt) viOpt.textContent = tr("languageVietnamese");
  }
  document.documentElement.setAttribute("lang", currentLanguage);
}
function clearStoredPathHistory() {
  PATH_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
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
  setDataBackupButtonState();
  renderDataBackupFolderList();
  setCleanupButtonState();
  renderWindowsUpdateCard();
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
// Synced with Microsoft OCT product manifest loaded by
// https://config.office.com/deploymentsettings (checked: 2026-02-22).
const officeOnlineCatalogData = [
  {
    key: "m365",
    title: "Microsoft 365 Apps",
    tagClass: "office-online-tag-m365",
    products: [
      {
        id: "O365ProPlusRetail",
        name: "Apps for enterprise",
        license: "retail",
      },
      // {
      //   id: "O365ProPlusEEANoTeamsRetail",
      //   name: "Apps for enterprise (no Teams)",
      //   license: "retail",
      // },
      {
        id: "O365BusinessRetail",
        name: "Apps for business",
        license: "retail",
      },
      // {
      //   id: "O365BusinessEEANoTeamsRetail",
      //   name: "Apps for business (no Teams)",
      //   license: "retail",
      // },
      {
        id: "ProjectProRetail",
        name: "Project Online Desktop",
        license: "retail",
      },
      {
        id: "VisioProRetail",
        name: "Visio Plan 2",
        license: "retail",
      },
      {
        id: "AccessRuntimeRetail",
        name: "Access Runtime",
        license: "retail",
      },
    ],
  },
  {
    key: "2024",
    title: "Office LTSC 2024",
    tagClass: "office-online-tag-2024",
    products: [
      { id: "ProPlus2024Volume", name: "Pro Plus", license: "volume" },
      { id: "Standard2024Volume", name: "Standard", license: "volume" },
      { id: "ProjectPro2024Volume", name: "Project Pro", license: "volume" },
      {
        id: "ProjectStd2024Volume",
        name: "Project Standard",
        license: "volume",
      },
      { id: "VisioPro2024Volume", name: "Visio Pro", license: "volume" },
      { id: "VisioStd2024Volume", name: "Visio Standard", license: "volume" },
    ],
  },
  {
    key: "2021",
    title: "Office LTSC 2021",
    tagClass: "office-online-tag-2021",
    products: [
      { id: "ProPlus2021Volume", name: "Pro Plus", license: "volume" },
      { id: "Standard2021Volume", name: "Standard", license: "volume" },
      // { id: "ProPlusSPLA2021Volume", name: "Pro Plus SPLA", license: "volume" },
      // {
      //   id: "StandardSPLA2021Volume",
      //   name: "Standard SPLA",
      //   license: "volume",
      // },
      { id: "ProjectPro2021Volume", name: "Project Pro", license: "volume" },
      {
        id: "ProjectStd2021Volume",
        name: "Project Standard",
        license: "volume",
      },
      { id: "VisioPro2021Volume", name: "Visio Pro", license: "volume" },
      { id: "VisioStd2021Volume", name: "Visio Standard", license: "volume" },
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
      // {
      //   id: "SkypeforBusinessEntry2019Retail",
      //   name: "Skype for Business Basic",
      //   license: "retail",
      // },
    ],
  },
  {
    key: "2016",
    title: "Office 2016",
    tagClass: "office-online-tag-m365",
    products: [
      { id: "ProjectProXVolume", name: "Project Pro", license: "volume" },
      {
        id: "ProjectStdXVolume",
        name: "Project Standard",
        license: "volume",
      },
      { id: "VisioProXVolume", name: "Visio Pro", license: "volume" },
      { id: "VisioStdXVolume", name: "Visio Standard", license: "volume" },
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
  // TEMP: Performance logic disabled
  /*
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
  */
}
function startPerformancePolling() {
  // TEMP: Performance logic disabled
  /*
  if (performancePollingTimer) return;
  refreshPerformanceBoard();
  performancePollingTimer = setInterval(() => {
    const isDashboardActive =
      tabs.dashboard && tabs.dashboard.classList.contains("active");
    if (isDashboardActive) {
      refreshPerformanceBoard();
    }
  }, PERFORMANCE_REFRESH_MS);
  */
}
function stopPerformancePolling() {
  // TEMP: Performance logic disabled
  /*
  if (!performancePollingTimer) return;
  clearInterval(performancePollingTimer);
  performancePollingTimer = null;
  */
}
const wingetModal = document.getElementById("winget-modal");
const wingetSearchInput = document.getElementById("winget-search-input");
const wingetSearchBtn = document.getElementById("winget-search-btn");
const wingetResults = document.getElementById("winget-results");
const addWingetBtn = document.getElementById("add-winget-btn");
const closeModal = document.getElementById("close-modal");
const officeNavGroup = document.getElementById("nav-group-office");
const officeNavParent = document.getElementById("nav-office-parent");
const utilitiesNavGroup = document.getElementById("nav-group-utilities");
const utilitiesNavParent = document.getElementById("nav-utilities-parent");
const navItems = {
  dashboard: document.getElementById("nav-dashboard"),
  library: document.getElementById("nav-library"),
  office: document.getElementById("nav-office"),
  officeOnline: document.getElementById("nav-office-online"),
  driver: document.getElementById("nav-driver"),
  dataBackup: document.getElementById("nav-data-backup"),
  cleanup: document.getElementById("nav-cleanup"),
  utilities: document.getElementById("nav-utilities"),
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
  dataBackup: document.getElementById("tab-data-backup"),
  cleanup: document.getElementById("tab-cleanup"),
  utilities: document.getElementById("tab-utilities"),
  activation: document.getElementById("tab-activation"),
  settings: document.getElementById("tab-settings"),
  about: document.getElementById("tab-about"),
};
function switchTab(tabName) {
  const isOfficeTab = tabName === "office" || tabName === "officeOnline";
  const isUtilitiesTab =
    tabName === "utilities" ||
    tabName === "activation" ||
    tabName === "cleanup" ||
    tabName === "driver" ||
    tabName === "dataBackup";
  if (officeNavParent) {
    officeNavParent.classList.toggle("active", isOfficeTab);
  }
  if (utilitiesNavParent) {
    utilitiesNavParent.classList.toggle("active", isUtilitiesTab);
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
        if (key === "utilities") {
          refreshWindowsUpdateState(false);
        }
        if (key === "dataBackup") {
          void ensureDataBackupFoldersLoaded({
            notifyError: !dataFoldersLoadedOnce,
          });
        }
      } else {
        tabs[key].style.display = "none";
        tabs[key].classList.remove("active");
      }
    }
  });
  if (tabName === "dashboard") {
    // TEMP: Performance logic disabled
    // startPerformancePolling();
    refreshBenchmarkHealth(true);
  } else {
    // TEMP: Performance logic disabled
    // stopPerformancePolling();
  }
  if (tabName !== "dataBackup") {
    clearDataSizeRefreshSchedule();
  }
}
if (navItems.dashboard)
  navItems.dashboard.onclick = () => switchTab("dashboard");
if (navItems.library) navItems.library.onclick = () => switchTab("library");
if (navItems.office) navItems.office.onclick = () => switchTab("office");
if (navItems.officeOnline)
  navItems.officeOnline.onclick = () => switchTab("officeOnline");
if (navItems.driver) navItems.driver.onclick = () => switchTab("driver");
if (navItems.dataBackup)
  navItems.dataBackup.onclick = () => switchTab("dataBackup");
if (navItems.cleanup) navItems.cleanup.onclick = () => switchTab("cleanup");
if (navItems.utilities)
  navItems.utilities.onclick = () => switchTab("utilities");
if (officeNavParent && officeNavGroup) {
  officeNavParent.onclick = () => {
    officeNavGroup.classList.toggle("open");
  };
}
if (utilitiesNavParent && utilitiesNavGroup) {
  utilitiesNavParent.onclick = () => {
    utilitiesNavGroup.classList.toggle("open");
  };
}
if (navItems.activation)
  navItems.activation.onclick = () => switchTab("activation");
if (navItems.settings) navItems.settings.onclick = () => switchTab("settings");
if (navItems.about) navItems.about.onclick = () => switchTab("about");
function showNotification(message, type = "info", duration = 3e3) {
  const safeMessage = String(message || "").trim();
  if (!safeMessage) return;
  const normalizedType = type === "success" || type === "error" ? type : "info";
  const time = /* @__PURE__ */ new Date().toLocaleTimeString(getUiLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  });
  notificationHistory.unshift({
    message: safeMessage,
    type: normalizedType,
    time,
  });
  updateNotiPanelUI();
  if (notiPanel && !notiPanel.classList.contains("active") && notiBadge) {
    unreadCount++;
    notiBadge.innerText = unreadCount > 9 ? "9+" : unreadCount;
    notiBadge.style.display = "flex";
  }
  if (!notificationContainer) return;

  const toastId = ++toastSequence;
  const iconName =
    normalizedType === "success"
      ? "check-circle-2"
      : normalizedType === "error"
        ? "alert-circle"
        : "info";
  const toastEl = document.createElement("div");
  toastEl.className = `toast toast-${normalizedType}`;
  toastEl.setAttribute("role", normalizedType === "error" ? "alert" : "status");
  toastEl.setAttribute(
    "aria-live",
    normalizedType === "error" ? "assertive" : "polite",
  );
  toastEl.innerHTML = `
    <span class="toast-icon">
      <i data-lucide="${iconName}" style="width: 14px; height: 14px"></i>
    </span>
    <span class="toast-message">${escapeHtml(safeMessage)}</span>
  `;

  const dismissToast = () => {
    if (!toastEl || toastEl.dataset.dismissed === "1") return;
    toastEl.dataset.dismissed = "1";
    const timerId = activeToastTimers.get(toastId);
    if (timerId) {
      clearTimeout(timerId);
      activeToastTimers.delete(toastId);
    }
    toastEl.classList.add("toast-exit");
    const removeToast = () => {
      toastEl.remove();
    };
    toastEl.addEventListener("transitionend", removeToast, { once: true });
    setTimeout(removeToast, 220);
  };

  toastEl.onclick = () => dismissToast();
  notificationContainer.prepend(toastEl);
  replaceLucidePlaceholders(toastEl);
  const hideDelay = Math.max(0, Number(duration) || 3000);
  const timerId = setTimeout(() => dismissToast(), hideDelay);
  activeToastTimers.set(toastId, timerId);
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
  if (!window.api || !window.api.getSysInfo) {
    sysInfoLoading = false;
    updateDashboardInfo();
    return;
  }
  sysInfoLoading = true;
  updateDashboardInfo();
  try {
    const nextSysInfo = await window.api.getSysInfo();
    if (nextSysInfo && typeof nextSysInfo === "object") {
      sysInfo = nextSysInfo;
    }
  } catch (error) {
    console.warn("Failed to load system information:", error);
  } finally {
    sysInfoLoading = false;
    updateDashboardInfo();
  }
}
function renderBatteryDetailCards() {
  const container = document.getElementById("detail-battery-cards");
  if (!container) return;
  if (sysInfoLoading) {
    container.innerHTML = `
      <div class="card detail-card battery-matrix-card battery-loading-card">
        <div class="detail-card-title detail-card-title-spread">
          <div class="detail-card-title-main">
            <i data-lucide="battery-charging" style="width: 15px; height: 15px"></i>
            ${tr("batteryTitle")}
          </div>
          <button class="btn btn-outline h-8 px-3 text-xs" disabled>
            <i data-lucide="loader-2" class="animate-spin" style="width: 14px; height: 14px"></i>
            ${tr("processing")}
          </button>
        </div>
        <div class="battery-loading-list">
          <div class="detail-row"><span>${tr("batteryMetric")}</span><strong>--</strong></div>
          <div class="detail-row"><span>${tr("batteryStatus")}</span><strong>--</strong></div>
          <div class="detail-row"><span>${tr("batteryLevel")}</span><strong>--</strong></div>
          <div class="detail-row"><span>${tr("batteryWearLevel")}</span><strong>--</strong></div>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

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
  if (window.lucide) window.lucide.createIcons();
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
function setViewToggleButtonIcon(buttonId, iconId, iconName) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  button.innerHTML = `<i id="${iconId}" data-lucide="${iconName}"></i>`;
  replaceLucidePlaceholders(button);
}
function getInstallerSelectionKey(app) {
  return String(app?.path || "")
    .trim()
    .toLowerCase();
}
function pruneSelectedInstallerKeys() {
  if (selectedInstallerKeys.size === 0) return;
  const validKeys = new Set(
    installers.map((app) => getInstallerSelectionKey(app)),
  );
  Array.from(selectedInstallerKeys).forEach((key) => {
    if (!validKeys.has(key)) {
      selectedInstallerKeys.delete(key);
    }
  });
}
function getSelectedInstallers() {
  pruneSelectedInstallerKeys();
  if (selectedInstallerKeys.size === 0) return [];
  const appByKey = new Map(
    installers.map((app) => [getInstallerSelectionKey(app), app]),
  );
  return Array.from(selectedInstallerKeys)
    .map((key) => appByKey.get(key))
    .filter(Boolean);
}
function setInstallerSelectedState(selectionKey, selected) {
  if (!selectionKey) return;
  if (selected) {
    selectedInstallerKeys.add(selectionKey);
  } else {
    selectedInstallerKeys.delete(selectionKey);
  }
}
function isInteractiveSelectionTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "button, a, input, label, select, textarea, [contenteditable='true'], [role='button']",
    ),
  );
}
function updateInstallerSelectionHeader() {
  if (!selectionHeaderEl || !selectedCountEl) return;
  pruneSelectedInstallerKeys();
  const selectedCount = selectedInstallerKeys.size;
  selectedCountEl.innerText = tr("selectedAppsLabel", { count: selectedCount });
  selectionHeaderEl.style.opacity = selectedCount > 0 ? "1" : "0";
  selectionHeaderEl.style.pointerEvents = selectedCount > 0 ? "auto" : "none";
  if (installSelectedBtn) {
    installSelectedBtn.disabled = selectedCount === 0;
  }
  if (deleteSelectedBtn) {
    deleteSelectedBtn.disabled = selectedCount === 0;
  }
  if (clearSelectionBtn) {
    clearSelectionBtn.disabled = selectedCount === 0;
  }
}
function getInstalledLocalEntries() {
  return installedApps
    .map((sys) => ({
      id: String(sys.id || "").trim(),
      nameLower: String(sys.name || "")
        .toLowerCase()
        .trim(),
    }))
    .filter((sys) => sys.id && sys.nameLower);
}
function findMatchingInstalledId(app, installedLocalEntries) {
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
  if (appTotalCountEl) {
    appTotalCountEl.innerText = tr("appsCountLabel", {
      count: filtered.length,
    });
  }
  installerGrid.innerHTML = "";
  installerGrid.className =
    viewMode === "grid" ? "installer-grid" : "flex flex-col gap-2";
  setViewToggleButtonIcon(
    "view-toggle",
    "view-toggle-icon",
    viewMode === "grid" ? "list" : "layout-grid",
  );
  const installedLocalEntries = getInstalledLocalEntries();
  if (filtered.length === 0) {
    installerGrid.innerHTML = `
      <div class="col-span-full py-12 text-center text-muted">
        <i data-lucide="package-search" class="mx-auto mb-2 opacity-20" style="width:48px;height:48px;"></i>
        <p class="text-sm">${tr("noApplicationsFound")}</p>
      </div>
    `;
    replaceLucidePlaceholders(installerGrid);
    updateInstallerSelectionHeader();
    return;
  }
  const fragment = document.createDocumentFragment();
  filtered.forEach((app, index) => {
    const card = document.createElement("div");
    card.className = "card installer-card";
    const appArch = normalizeArchitecture(app.arch);
    const appArchBadgeClass = getArchitectureBadgeClass(appArch);
    const matchingId = findMatchingInstalledId(app, installedLocalEntries);
    const selectionKey = getInstallerSelectionKey(app);
    const isSelected = selectedInstallerKeys.has(selectionKey);
    if (isSelected) card.classList.add("installer-card-selected");
    if (viewMode === "grid") {
      card.innerHTML = `
        <div class="flex items-start justify-between gap-3 mb-4">
          <div class="flex items-center gap-3 min-w-0">
            <div class="stat-icon" style="width: 40px; height: 40px; display:flex; align-items:center; justify-content:center; background:hsl(var(--accent)); border-radius:var(--radius); flex-shrink:0;">
              <i data-lucide="package"></i>
            </div>
            <div class="truncate">
              <h3 class="text-sm font-bold truncate">${app.name}</h3>
              <p class="text-2xs text-muted truncate">${app.isWinget ? tr("winget") : tr("local")}</p>
            </div>
          </div>
          <label class="installer-select-toggle" title="${currentLanguage === "vi" ? "Chọn ứng dụng" : "Select application"}">
            <input type="checkbox" class="installer-select-checkbox" data-selection-key="${escapeHtml(selectionKey)}" ${isSelected ? "checked" : ""} />
          </label>
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
      card.style.gridTemplateColumns = "36px 48px 1fr 1fr 100px 100px 40px";
      card.style.alignItems = "center";
      card.style.padding = "0.6rem 1rem";
      card.style.gap = "1rem";
      const isInstalled = !!matchingId;
      card.innerHTML = `
          <div class="flex justify-center">
            <label class="installer-select-toggle" title="${currentLanguage === "vi" ? "Chọn ứng dụng" : "Select application"}">
              <input type="checkbox" class="installer-select-checkbox" data-selection-key="${escapeHtml(selectionKey)}" ${isSelected ? "checked" : ""} />
            </label>
          </div>
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
    const selectCheckbox = card.querySelector(".installer-select-checkbox");
    const applyCardSelectionState = (selected) => {
      card.classList.toggle("installer-card-selected", selected);
      if (selectCheckbox && selectCheckbox.checked !== selected) {
        selectCheckbox.checked = selected;
      }
    };
    applyCardSelectionState(isSelected);
    const toggleCardSelection = () => {
      const nextSelected = !selectedInstallerKeys.has(selectionKey);
      setInstallerSelectedState(selectionKey, nextSelected);
      applyCardSelectionState(nextSelected);
      updateInstallerSelectionHeader();
    };
    if (selectCheckbox) {
      selectCheckbox.onclick = (event) => event.stopPropagation();
      selectCheckbox.onchange = (event) => {
        const nextSelected = Boolean(event.target?.checked);
        setInstallerSelectedState(selectionKey, nextSelected);
        applyCardSelectionState(nextSelected);
        updateInstallerSelectionHeader();
      };
    }
    card.onclick = (event) => {
      if (isInteractiveSelectionTarget(event.target)) return;
      toggleCardSelection();
    };
    const deleteBtn = card.querySelector(".delete-btn");
    if (deleteBtn) {
      deleteBtn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (confirm(tr("removeWithName", { name: app.name }))) {
          const removedApp = app;
          selectedInstallerKeys.delete(getInstallerSelectionKey(removedApp));
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
  updateInstallerSelectionHeader();
}
function clearSelectedApplications() {
  if (selectedInstallerKeys.size === 0) {
    updateInstallerSelectionHeader();
    return;
  }
  selectedInstallerKeys.clear();
  renderInstallers();
}
function installSelectedApplications() {
  const selectedApps = getSelectedInstallers();
  if (selectedApps.length === 0) {
    updateInstallerSelectionHeader();
    return;
  }
  const installedLocalEntries = getInstalledLocalEntries();
  const installableApps = selectedApps.filter((app) => {
    const matchingId = findMatchingInstalledId(app, installedLocalEntries);
    const isInstalling = activeTasks.has(app.path);
    const isUninstalling =
      matchingId && activeTasks.has(`uninstall-${matchingId}`);
    return !matchingId && !isInstalling && !isUninstalling;
  });
  if (installableApps.length === 0) {
    showNotification(tr("installSelectedNoEligible"), "info");
    return;
  }
  installableApps.forEach((app) => {
    runInstaller(app.path, app.name);
  });
  selectedInstallerKeys.clear();
  renderInstallers();
  showNotification(
    tr("installSelectedStarted", { count: installableApps.length }),
    "info",
  );
}
async function deleteSelectedApplications() {
  const selectedApps = getSelectedInstallers();
  if (selectedApps.length === 0) {
    updateInstallerSelectionHeader();
    return;
  }
  const shouldDelete = confirm(
    tr("deleteSelectedConfirm", { count: selectedApps.length }),
  );
  if (!shouldDelete) return;
  const selectedKeySet = new Set(
    selectedApps.map((app) => getInstallerSelectionKey(app)),
  );
  installers = installers.filter(
    (app) => !selectedKeySet.has(getInstallerSelectionKey(app)),
  );
  selectedInstallerKeys.clear();
  renderInstallers();
  showNotification(
    tr("deleteSelectedDone", { count: selectedApps.length }),
    "info",
  );
  if (window.api && window.api.saveLibrary) {
    try {
      await window.api.saveLibrary(installers);
    } catch (err) {
      console.error("Error saving library after bulk remove:", err);
    }
  }
  if (window.api && window.api.deleteFile) {
    selectedApps
      .filter((app) => !app.isWinget)
      .forEach((app) => {
        window.api
          .deleteFile(app.path)
          .then((result) => {
            if (result && result.success) {
              console.log(`Deleted file from disk: ${app.path}`);
              return;
            }
            if (result && result.error) {
              showNotification(
                currentLanguage === "vi"
                  ? `Đã xóa khỏi thư viện nhưng xóa file thất bại: ${result.error}`
                  : `Removed from library, but file delete failed: ${result.error}`,
                "error",
              );
            }
          })
          .catch((err) => console.error("Error deleting file from disk:", err));
      });
  }
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
const dataBackupFolderListEl = document.getElementById(
  "data-backup-folder-list",
);
const dataBackupSelectionCountEl = document.getElementById(
  "data-backup-selection-count",
);
const dataBackupSizeSummaryEl = document.getElementById(
  "data-backup-size-summary",
);
const dataBackupAddFolderBtn = document.getElementById(
  "data-backup-add-folder-btn",
);
const dataBackupSelectAllBtn = document.getElementById(
  "data-backup-select-all-btn",
);
const dataBackupClearAllBtn = document.getElementById(
  "data-backup-clear-all-btn",
);
const dataBackupPathInput = document.getElementById("data-backup-path");
const dataBackupBrowseBtn = document.getElementById("data-backup-browse-btn");
const dataBackupRunBtn = document.getElementById("data-backup-run-btn");
const dataRestorePathInput = document.getElementById("data-restore-path");
const dataRestoreBrowseBtn = document.getElementById("data-restore-browse-btn");
const dataRestoreRunBtn = document.getElementById("data-restore-run-btn");
const cleanupRamBtn = document.getElementById("cleanup-ram-btn");
const cleanupDiskBtn = document.getElementById("cleanup-disk-btn");
const cleanupRamResultEl = document.getElementById("cleanup-ram-result");
const cleanupDiskResultEl = document.getElementById("cleanup-disk-result");
const utilitiesWuStatusValueEl = document.getElementById(
  "utilities-wu-status-value",
);
const utilitiesWuToggleBtn = document.getElementById("utilities-wu-toggle-btn");
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
  if (productId === "AccessRuntimeRetail") return "SemiAnnual";
  if (productId.endsWith("XVolume")) return "SemiAnnual";
  if (productId === "SkypeforBusinessEntry2019Retail") return "PerpetualVL2019";
  if (productId.includes("2024Volume")) return "PerpetualVL2024";
  if (productId.includes("2021Volume")) return "PerpetualVL2021";
  if (productId.includes("2019Volume")) return "PerpetualVL2019";
  return "Current";
}
function getOfficeOnlineFilteredCatalog() {
  return officeOnlineCatalogData;
}
function isOfficeOnlineFullSuiteName(name) {
  const suiteNames = /* @__PURE__ */ new Set([
    "apps for enterprise",
    "apps for enterprise (no teams)",
    "apps for business",
    "apps for business (no teams)",
    "standard",
    "standard spla",
    "pro plus",
    "pro plus spla",
  ]);
  return suiteNames.has(
    String(name || "")
      .toLowerCase()
      .trim(),
  );
}
function getOfficeOnlineStandaloneFamily(product) {
  if (!product || isOfficeOnlineFullSuiteName(product.name)) return "";
  const productId = String(product.id || "").toLowerCase();
  const productName = String(product.name || "").toLowerCase();
  if (productId.includes("project") || productName.includes("project")) {
    return "project";
  }
  if (productId.includes("visio") || productName.includes("visio")) {
    return "visio";
  }
  if (productId.includes("access") || productName.includes("access")) {
    return "access";
  }
  return `single:${productId || productName}`;
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
  const visibleIdSet = new Set(visibleIds);
  const selectedIds = Array.from(officeOnlineSelectedProductIds).filter((id) =>
    visibleIdSet.has(id),
  );
  if (selectedIds.length === 0) {
    officeOnlineSelectedProductIds = /* @__PURE__ */ new Set();
    return;
  }

  // Keep selection coherent: one Office version, one suite, one standalone per family.
  const latestProduct = findOfficeOnlineProduct(
    selectedIds[selectedIds.length - 1],
  );
  if (!latestProduct) {
    officeOnlineSelectedProductIds = /* @__PURE__ */ new Set();
    return;
  }
  const normalizedIdsReversed = [];
  let suiteSelected = false;
  const standaloneFamilySelected = /* @__PURE__ */ new Set();
  for (let i = selectedIds.length - 1; i >= 0; i -= 1) {
    const id = selectedIds[i];
    const product = findOfficeOnlineProduct(id);
    if (!product) continue;
    if (product.versionKey !== latestProduct.versionKey) continue;
    const isSuite = isOfficeOnlineFullSuiteName(product.name);
    if (isSuite) {
      if (suiteSelected) continue;
      suiteSelected = true;
    } else {
      const standaloneFamily = getOfficeOnlineStandaloneFamily(product);
      if (standaloneFamilySelected.has(standaloneFamily)) continue;
      standaloneFamilySelected.add(standaloneFamily);
    }
    normalizedIdsReversed.push(id);
  }
  normalizedIdsReversed.reverse();
  officeOnlineSelectedProductIds = new Set(normalizedIdsReversed);
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
            const rowLabel = `${product.name}`;
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
          if (targetProduct) {
            const targetIsSuite = isOfficeOnlineFullSuiteName(
              targetProduct.name,
            );
            const targetStandaloneFamily = targetIsSuite
              ? ""
              : getOfficeOnlineStandaloneFamily(targetProduct);
            const nextSelection = /* @__PURE__ */ new Set();
            Array.from(officeOnlineSelectedProductIds).forEach((selectedId) => {
              if (selectedId === productId) return;
              const selectedProduct = findOfficeOnlineProduct(selectedId);
              if (!selectedProduct) return;
              if (selectedProduct.versionKey !== targetProduct.versionKey) {
                return;
              }
              const selectedIsSuite = isOfficeOnlineFullSuiteName(
                selectedProduct.name,
              );
              if (targetIsSuite && selectedIsSuite) return;
              if (!targetIsSuite && !selectedIsSuite) {
                const selectedStandaloneFamily =
                  getOfficeOnlineStandaloneFamily(selectedProduct);
                if (
                  targetStandaloneFamily &&
                  selectedStandaloneFamily === targetStandaloneFamily
                ) {
                  return;
                }
              }
              nextSelection.add(selectedId);
            });
            nextSelection.add(productId);
            officeOnlineSelectedProductIds = nextSelection;
          }
        } else {
          officeOnlineSelectedProductIds.delete(productId);
        }
        renderOfficeOnlineCatalog();
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
}
function setDriverRestorePath(value) {
  driverRestorePath = String(value || "").trim();
  if (driverRestorePathInput) {
    driverRestorePathInput.value = driverRestorePath;
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
function getSavedDataFolderSelection() {
  return Array.from(dataSelectedFolderIds)
    .map((id) =>
      String(id || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
}
function persistDataFolderSelection() {
  // Keep selected folders in-memory only for current app session.
}
function getFolderPathLeaf(folderPath) {
  const normalized = String(folderPath || "")
    .trim()
    .replace(/[\\/]+$/, "");
  if (!normalized) return "";
  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : normalized;
}
function isGenericCustomFolderName(name) {
  const normalized = String(name || "")
    .trim()
    .toLowerCase();
  if (!normalized) return true;
  const genericPatterns = [
    /^custom(?:[\s_-].*)?$/i,
    /^manual(?:[\s_-].*)?$/i,
    /^thu\s*cong(?:[\s_-].*)?$/i,
    /^thủ\s*công(?:[\s_-].*)?$/i,
  ];
  return genericPatterns.some((pattern) => pattern.test(normalized));
}
function createCustomDataFolderId(folderPath) {
  const seed = String(folderPath || "")
    .trim()
    .toLowerCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `custom-${hash.toString(36)}`;
}
function normalizeCustomDataFolderList(rawFolders) {
  if (!Array.isArray(rawFolders)) return [];
  const seenIds = new Set();
  const seenPaths = new Set();
  return rawFolders
    .map((folder, index) => {
      const folderPath = String(folder?.path || "").trim();
      if (!folderPath) return null;
      const normalizedPath = folderPath.replace(/[\\/]+$/, "");
      if (!normalizedPath) return null;
      const pathKey = normalizedPath.toLowerCase();
      if (seenPaths.has(pathKey)) return null;
      seenPaths.add(pathKey);
      let id = String(folder?.id || "")
        .trim()
        .toLowerCase();
      if (!id) id = createCustomDataFolderId(normalizedPath);
      if (!id.startsWith("custom-")) id = `custom-${id}`;
      id = id.replace(/[^a-z0-9_-]/g, "-");
      if (!id) id = `custom-${index + 1}`;
      let uniqueId = id;
      let suffix = 2;
      while (seenIds.has(uniqueId)) {
        uniqueId = `${id}-${suffix}`;
        suffix += 1;
      }
      seenIds.add(uniqueId);
      const fallbackName = getFolderPathLeaf(normalizedPath) || uniqueId;
      const rawName = String(folder?.name || "").trim();
      const name =
        !rawName || isGenericCustomFolderName(rawName) ? fallbackName : rawName;
      const restoreToId = DATA_CUSTOM_RESTORE_PROFILE_ID;
      const restoreSubPath = String(folder?.restoreSubPath || "").trim();
      return {
        id: uniqueId,
        name,
        path: normalizedPath,
        exists: true,
        type: "custom",
        restoreToId,
        restoreSubPath,
      };
    })
    .filter(Boolean);
}
function getSavedCustomDataFolderList() {
  return normalizeCustomDataFolderList(dataCustomFolders);
}
function persistCustomDataFolderList(customFolders) {
  const normalized = normalizeCustomDataFolderList(customFolders);
  dataCustomFolders = normalized;
  return normalized;
}
function getDataFolderDisplayName(folderId) {
  const id = String(folderId || "")
    .trim()
    .toLowerCase();
  if (id === DATA_CUSTOM_RESTORE_PROFILE_ID) {
    return currentLanguage === "vi" ? "Thư mục người dùng" : "User Profile";
  }
  const builtIn = {
    desktop: "Desktop",
    documents: "Documents",
    downloads: "Downloads",
    pictures: "Pictures",
    music: "Music",
    videos: "Videos",
  };
  return builtIn[id] || id || "Documents";
}
function getDefaultDataFolderSelection(availableIds) {
  if (!(availableIds instanceof Set) || availableIds.size === 0) return [];
  return [];
}
function getSelectedDefaultFolderIds() {
  return dataDefaultFolders
    .filter(
      (folder) =>
        folder.type !== "custom" && dataSelectedFolderIds.has(folder.id),
    )
    .map((folder) => folder.id);
}
function getSelectedCustomFolders() {
  return dataDefaultFolders
    .filter(
      (folder) =>
        folder.type === "custom" && dataSelectedFolderIds.has(folder.id),
    )
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      sourcePath: folder.path,
      restoreToId: folder.restoreToId || DATA_CUSTOM_RESTORE_PROFILE_ID,
      restoreSubPath: String(folder.restoreSubPath || "").trim(),
    }));
}
function normalizeDataFolderPathKey(pathValue) {
  return String(pathValue || "")
    .trim()
    .replace(/[\\/]+$/, "")
    .toLowerCase();
}
function getSelectedDataSizePlan() {
  const selected = dataDefaultFolders.filter((folder) =>
    dataSelectedFolderIds.has(folder.id),
  );
  const dedupMap = new Map();
  selected.forEach((folder) => {
    const pathKey = normalizeDataFolderPathKey(folder.path);
    if (!pathKey) return;
    if (dedupMap.has(pathKey)) return;
    dedupMap.set(pathKey, {
      id: String(folder.id || "").trim().toLowerCase(),
      sourcePath: String(folder.path || "").trim(),
    });
  });
  return Array.from(dedupMap.values()).filter((item) => item.sourcePath);
}
function getCachedDataSizeEntry(pathKey, nowMs = Date.now()) {
  const cached = dataFolderSizeCache.get(pathKey);
  if (!cached) return null;
  if (nowMs - Number(cached.updatedAt || 0) > DATA_SIZE_CACHE_TTL_MS) {
    dataFolderSizeCache.delete(pathKey);
    return null;
  }
  return cached;
}
function setCachedDataSizeEntry(pathKey, value = {}) {
  if (!pathKey) return;
  const bytes = Number(value.bytes);
  const files = Number(value.files);
  dataFolderSizeCache.set(pathKey, {
    updatedAt: Date.now(),
    exists: value.exists !== false,
    bytes: Number.isFinite(bytes) ? Math.max(0, bytes) : 0,
    files: Number.isFinite(files) ? Math.max(0, files) : 0,
  });
}
function computeTotalsFromCachedPlan(plan, nowMs = Date.now()) {
  return plan.reduce(
    (acc, item) => {
      const pathKey = normalizeDataFolderPathKey(item.sourcePath);
      const cached = getCachedDataSizeEntry(pathKey, nowMs);
      if (!cached) return acc;
      acc.totalBytes += Number(cached.bytes) || 0;
      acc.totalFiles += Number(cached.files) || 0;
      return acc;
    },
    { totalBytes: 0, totalFiles: 0 },
  );
}
function normalizeDataFolderList(rawFolders) {
  if (!Array.isArray(rawFolders)) return [];
  return rawFolders
    .map((folder) => {
      const id = String(folder?.id || "")
        .trim()
        .toLowerCase();
      const name = String(folder?.name || "").trim();
      const folderPath = String(folder?.path || "").trim();
      if (!id || !name || !folderPath) return null;
      return {
        id,
        name,
        path: folderPath,
        exists: Boolean(folder?.exists),
        type: "default",
        restoreToId: id,
        restoreSubPath: "",
      };
    })
    .filter(Boolean);
}
function composeDataFolderList(defaultFolders, customFolders) {
  const defaultList = Array.isArray(defaultFolders) ? defaultFolders : [];
  const customList = Array.isArray(customFolders) ? customFolders : [];
  return [...customList, ...defaultList];
}
function setDataBackupPath(value) {
  dataBackupPath = String(value || "").trim();
  if (dataBackupPathInput) {
    dataBackupPathInput.value = dataBackupPath;
  }
}
function setDataRestorePath(value) {
  dataRestorePath = String(value || "").trim();
  if (dataRestorePathInput) {
    dataRestorePathInput.value = dataRestorePath;
  }
}
async function addCustomDataFolder() {
  if (!window.api || !window.api.selectFolder) return;
  const title =
    currentLanguage === "vi"
      ? "Chọn thư mục dữ liệu thủ công để sao lưu"
      : "Select manual data folder to back up";
  const selectedPath = await window.api.selectFolder({ title });
  if (!selectedPath) return;
  const normalizedPath = String(selectedPath || "")
    .trim()
    .replace(/[\\/]+$/, "");
  if (!normalizedPath) return;
  const pathKey = normalizedPath.toLowerCase();
  const duplicate = dataDefaultFolders.some(
    (folder) =>
      String(folder.path || "")
        .trim()
        .toLowerCase() === pathKey,
  );
  if (duplicate) {
    showNotification(tr("dataCustomFolderExists"), "info");
    return;
  }
  const savedCustomFolders = getSavedCustomDataFolderList();
  let nextId = createCustomDataFolderId(normalizedPath);
  if (!nextId.startsWith("custom-")) nextId = `custom-${nextId}`;
  let uniqueId = nextId;
  let suffix = 2;
  while (savedCustomFolders.some((folder) => folder.id === uniqueId)) {
    uniqueId = `${nextId}-${suffix}`;
    suffix += 1;
  }
  const folderName = getFolderPathLeaf(normalizedPath) || uniqueId;
  const nextCustomFolders = persistCustomDataFolderList([
    {
      id: uniqueId,
      name: folderName,
      path: normalizedPath,
      restoreToId: DATA_CUSTOM_RESTORE_PROFILE_ID,
      restoreSubPath: "",
    },
    ...savedCustomFolders,
  ]);
  dataSelectedFolderIds.add(uniqueId);
  dataSizeSelectionVersion += 1;
  persistDataFolderSelection();
  const builtInFolders = dataDefaultFolders.filter(
    (folder) => folder.type !== "custom",
  );
  dataDefaultFolders = composeDataFolderList(builtInFolders, nextCustomFolders);
  renderDataBackupFolderList();
  scheduleDataSizeRefresh(DATA_SIZE_REFRESH_IDLE_MS);
  showNotification(
    tr("dataCustomFolderAdded", { name: folderName }),
    "success",
  );
}
async function removeCustomDataFolderById(folderId) {
  const targetId = String(folderId || "")
    .trim()
    .toLowerCase();
  if (!targetId) return;
  const savedCustomFolders = getSavedCustomDataFolderList();
  const targetFolder = savedCustomFolders.find(
    (folder) => folder.id === targetId,
  );
  if (!targetFolder) return;
  const nextCustomFolders = savedCustomFolders.filter(
    (folder) => folder.id !== targetId,
  );
  persistCustomDataFolderList(nextCustomFolders);
  dataSelectedFolderIds.delete(targetId);
  dataSizeSelectionVersion += 1;
  persistDataFolderSelection();
  const builtInFolders = dataDefaultFolders.filter(
    (folder) => folder.type !== "custom",
  );
  dataDefaultFolders = composeDataFolderList(builtInFolders, nextCustomFolders);
  renderDataBackupFolderList();
  scheduleDataSizeRefresh(DATA_SIZE_REFRESH_IDLE_MS);
  showNotification(
    tr("dataCustomFolderRemoved", { name: targetFolder.name }),
    "info",
  );
}
function pruneDataFolderSelection() {
  if (dataSelectedFolderIds.size === 0) return;
  const availableIds = new Set(
    dataDefaultFolders.map((folder) => String(folder.id || "").toLowerCase()),
  );
  let changed = false;
  Array.from(dataSelectedFolderIds).forEach((id) => {
    if (!availableIds.has(id)) {
      dataSelectedFolderIds.delete(id);
      changed = true;
    }
  });
  if (changed) {
    persistDataFolderSelection();
  }
}
function updateDataBackupStatsUI() {
  const selectedCount = dataSelectedFolderIds.size;
  if (dataBackupSelectionCountEl) {
    dataBackupSelectionCountEl.innerText = tr("dataFoldersSelectedLabel", {
      count: selectedCount,
    });
  }
  if (!dataBackupSizeSummaryEl) return;
  if (selectedCount === 0) {
    dataBackupSizeSummaryEl.innerText = tr("dataSizeSummary", {
      size: formatBytes(0),
      count: Number(0).toLocaleString(getUiLocale()),
    });
    return;
  }
  if (dataSizeBusy) {
    dataBackupSizeSummaryEl.innerText = tr("dataSizeCalculating");
    return;
  }
  dataBackupSizeSummaryEl.innerText = tr("dataSizeSummary", {
    size: formatBytes(dataSelectedTotalBytes),
    count: Number(dataSelectedTotalFiles || 0).toLocaleString(getUiLocale()),
  });
}
function isDataBackupTabActive() {
  return Boolean(tabs.dataBackup && tabs.dataBackup.classList.contains("active"));
}
function clearDataSizeRefreshSchedule() {
  if (dataSizeRefreshTimer) {
    clearTimeout(dataSizeRefreshTimer);
    dataSizeRefreshTimer = null;
  }
  if (
    dataSizeIdleHandle !== null &&
    typeof window !== "undefined" &&
    typeof window.cancelIdleCallback === "function"
  ) {
    window.cancelIdleCallback(dataSizeIdleHandle);
  }
  dataSizeIdleHandle = null;
}
function scheduleDataSizeRefresh(delayMs = DATA_SIZE_REFRESH_IDLE_MS) {
  clearDataSizeRefreshSchedule();
  dataSizeRefreshTimer = setTimeout(
    () => {
      dataSizeRefreshTimer = null;
      const runRefresh = () => {
        dataSizeIdleHandle = null;
        if (!isDataBackupTabActive()) return;
        refreshSelectedDataSize();
      };
      if (
        typeof window !== "undefined" &&
        typeof window.requestIdleCallback === "function"
      ) {
        dataSizeIdleHandle = window.requestIdleCallback(runRefresh, {
          timeout: 2500,
        });
      } else {
        runRefresh();
      }
    },
    Math.max(0, Number(delayMs) || 0),
  );
}
async function refreshSelectedDataSize() {
  clearDataSizeRefreshSchedule();
  if (!isDataBackupTabActive()) return;
  if (dataSizeBusy) {
    dataSizeRefreshQueued = true;
    return;
  }
  const requestId = ++dataSizeRequestId;
  const selectionVersion = dataSizeSelectionVersion;
  const selectedPlan = getSelectedDataSizePlan();
  if (selectedPlan.length === 0) {
    dataSelectedTotalBytes = 0;
    dataSelectedTotalFiles = 0;
    dataSizeBusy = false;
    dataSizeRefreshQueued = false;
    updateDataBackupStatsUI();
    return;
  }
  if (!window.api || !window.api.getUserDataSize) {
    dataSelectedTotalBytes = 0;
    dataSelectedTotalFiles = 0;
    dataSizeBusy = false;
    dataSizeRefreshQueued = false;
    updateDataBackupStatsUI();
    return;
  }
  const nowMs = Date.now();
  const missingPlan = [];
  selectedPlan.forEach((item) => {
    const pathKey = normalizeDataFolderPathKey(item.sourcePath);
    if (!pathKey) return;
    if (!getCachedDataSizeEntry(pathKey, nowMs)) {
      missingPlan.push(item);
    }
  });
  if (missingPlan.length === 0) {
    const totals = computeTotalsFromCachedPlan(selectedPlan, nowMs);
    dataSelectedTotalBytes = totals.totalBytes;
    dataSelectedTotalFiles = totals.totalFiles;
    dataSizeBusy = false;
    dataSizeRefreshQueued = false;
    updateDataBackupStatsUI();
    return;
  }
  dataSizeBusy = true;
  updateDataBackupStatsUI();
  try {
    const result = await window.api.getUserDataSize({
      selectedFolderIds: [],
      customFolders: missingPlan.map((item) => ({
        id: item.id,
        name: item.id,
        sourcePath: item.sourcePath,
        restoreToId: DATA_CUSTOM_RESTORE_PROFILE_ID,
        restoreSubPath: "",
      })),
    });
    if (
      requestId !== dataSizeRequestId ||
      selectionVersion !== dataSizeSelectionVersion
    )
      return;

    const statsById = new Map();
    if (result && result.success && Array.isArray(result.folders)) {
      result.folders.forEach((folderStat) => {
        const id = String(folderStat?.id || "")
          .trim()
          .toLowerCase();
        if (!id) return;
        statsById.set(id, folderStat);
      });
    }

    missingPlan.forEach((item) => {
      const pathKey = normalizeDataFolderPathKey(item.sourcePath);
      if (!pathKey) return;
      const stat = statsById.get(item.id);
      setCachedDataSizeEntry(pathKey, {
        exists: stat ? stat.exists !== false : false,
        bytes: stat ? stat.bytes : 0,
        files: stat ? stat.files : 0,
      });
    });

    const totals = computeTotalsFromCachedPlan(selectedPlan);
    dataSelectedTotalBytes = totals.totalBytes;
    dataSelectedTotalFiles = totals.totalFiles;
  } catch {
    if (
      requestId !== dataSizeRequestId ||
      selectionVersion !== dataSizeSelectionVersion
    )
      return;
    const totals = computeTotalsFromCachedPlan(selectedPlan);
    dataSelectedTotalBytes = totals.totalBytes;
    dataSelectedTotalFiles = totals.totalFiles;
  } finally {
    if (requestId === dataSizeRequestId) {
      dataSizeBusy = false;
      updateDataBackupStatsUI();
    }
    if (dataSizeRefreshQueued) {
      dataSizeRefreshQueued = false;
      scheduleDataSizeRefresh(DATA_SIZE_REFRESH_IDLE_MS);
    }
  }
}
function adjustDataBackupFolderListHeight(visibleRows = 3) {
  if (!dataBackupFolderListEl || typeof window === "undefined") return;
  const items = Array.from(
    dataBackupFolderListEl.querySelectorAll(".data-folder-item"),
  );
  if (!items.length) {
    dataBackupFolderListEl.style.removeProperty("height");
    return;
  }

  const rows = Math.max(1, Math.min(Number(visibleRows) || 3, items.length));
  const listStyle = window.getComputedStyle(dataBackupFolderListEl);
  const gap =
    parseFloat(listStyle.rowGap || listStyle.gap || "0") ||
    parseFloat(listStyle.columnGap || "0") ||
    0;
  const paddingTop = parseFloat(listStyle.paddingTop || "0") || 0;
  const paddingBottom = parseFloat(listStyle.paddingBottom || "0") || 0;
  const borderTop = parseFloat(listStyle.borderTopWidth || "0") || 0;
  const borderBottom = parseFloat(listStyle.borderBottomWidth || "0") || 0;

  let itemsHeight = 0;
  for (let index = 0; index < rows; index += 1) {
    itemsHeight += items[index].offsetHeight;
  }

  const totalHeight =
    itemsHeight +
    gap * Math.max(0, rows - 1) +
    paddingTop +
    paddingBottom +
    borderTop +
    borderBottom;

  dataBackupFolderListEl.style.height = `${Math.ceil(totalHeight)}px`;
}
function renderDataBackupFolderList() {
  if (!dataBackupFolderListEl) return;
  pruneDataFolderSelection();
  if (!Array.isArray(dataDefaultFolders) || dataDefaultFolders.length === 0) {
    dataSelectedTotalBytes = 0;
    dataSelectedTotalFiles = 0;
    dataSizeBusy = false;
    dataSizeRefreshQueued = false;
    dataBackupFolderListEl.innerHTML = `<div class="data-folder-empty">${
      currentLanguage === "vi"
        ? "Không tìm thấy thư mục mặc định cho người dùng hiện tại"
        : "No default folders found for current user"
    }</div>`;
    adjustDataBackupFolderListHeight(3);
    updateDataBackupStatsUI();
    setDataBackupButtonState(false);
    return;
  }
  updateDataBackupStatsUI();
  dataBackupFolderListEl.innerHTML = dataDefaultFolders
    .map((folder) => {
      const checked = dataSelectedFolderIds.has(folder.id);
      const isCustom = folder.type === "custom";
      const stateLabel = folder.exists
        ? tr("dataFolderExists")
        : tr("dataFolderMissing");
      const stateClass = folder.exists
        ? "data-folder-state"
        : "data-folder-state missing";
      const customTag = isCustom
        ? `<span class="data-folder-custom-tag">${escapeHtml(tr("dataFolderCustomTag"))}</span>`
        : "";
      const customHint = isCustom
        ? tr("dataFolderCustomRestoreHint", {
            target: getDataFolderDisplayName(
              folder.restoreToId || DATA_CUSTOM_RESTORE_PROFILE_ID,
            ),
            subPath:
              String(folder.restoreSubPath || "").trim() ||
              getFolderPathLeaf(folder.path),
          })
        : "";
      const removeTitle =
        currentLanguage === "vi"
          ? "Xóa thư mục thủ công"
          : "Remove manual folder";
      return `
        <label class="data-folder-item">
          <input type="checkbox" class="data-folder-checkbox" data-folder-id="${escapeHtml(folder.id)}" ${checked ? "checked" : ""} />
          <div>
            <div class="data-folder-name">${escapeHtml(folder.name)}${customTag}</div>
            <div class="data-folder-path">${escapeHtml(folder.path)}</div>
            ${customHint ? `<div class="data-folder-restore-hint">${escapeHtml(customHint)}</div>` : ""}
          </div>
          <div class="data-folder-meta">
            <span class="${stateClass}">${escapeHtml(stateLabel)}</span>
            ${isCustom ? `<button type="button" class="data-folder-remove-btn" data-folder-id="${escapeHtml(folder.id)}" title="${escapeHtml(removeTitle)}" aria-label="${escapeHtml(removeTitle)}"><span aria-hidden="true">&times;</span></button>` : ""}
          </div>
        </label>
      `;
    })
    .join("");
  dataBackupFolderListEl
    .querySelectorAll(".data-folder-checkbox")
    .forEach((input) => {
      input.onchange = (event) => {
        const folderId = String(event.target?.dataset?.folderId || "");
        if (!folderId) return;
        if (event.target.checked) {
          dataSelectedFolderIds.add(folderId);
        } else {
          dataSelectedFolderIds.delete(folderId);
        }
        dataSizeSelectionVersion += 1;
        persistDataFolderSelection();
        updateDataBackupStatsUI();
        setDataBackupButtonState(false);
        scheduleDataSizeRefresh(DATA_SIZE_REFRESH_IDLE_MS);
      };
    });
  dataBackupFolderListEl
    .querySelectorAll(".data-folder-remove-btn")
    .forEach((btn) => {
      btn.onmousedown = (event) => {
        event.preventDefault();
        event.stopPropagation();
      };
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const folderId = String(event.currentTarget?.dataset?.folderId || "")
          .trim()
          .toLowerCase();
        if (!folderId) return;
        await removeCustomDataFolderById(folderId);
      };
    });
  adjustDataBackupFolderListHeight(3);
  setDataBackupButtonState(false);
}
function setDataBackupButtonState(refreshIcons = true) {
  const selectedCount = dataSelectedFolderIds.size;
  const hasFolders =
    Array.isArray(dataDefaultFolders) && dataDefaultFolders.length > 0;
  if (dataBackupBrowseBtn) {
    dataBackupBrowseBtn.disabled = dataBackupBusy;
  }
  if (dataRestoreBrowseBtn) {
    dataRestoreBrowseBtn.disabled = dataRestoreBusy;
  }
  if (dataBackupAddFolderBtn) {
    dataBackupAddFolderBtn.disabled = dataBackupBusy || dataRestoreBusy;
  }
  if (dataBackupRunBtn) {
    dataBackupRunBtn.disabled =
      dataBackupBusy || !hasFolders || selectedCount === 0;
    dataBackupRunBtn.innerHTML = dataBackupBusy
      ? `<i data-lucide="loader-2" class="animate-spin" style="width: 16px"></i> ${tr("processing")}`
      : `<i data-lucide="download" style="width: 16px"></i> ${tr("backup")}`;
  }
  if (dataRestoreRunBtn) {
    dataRestoreRunBtn.disabled = dataRestoreBusy;
    dataRestoreRunBtn.innerHTML = dataRestoreBusy
      ? `<i data-lucide="loader-2" class="animate-spin" style="width: 16px"></i> ${tr("processing")}`
      : `<i data-lucide="upload" style="width: 16px"></i> ${tr("restore")}`;
  }
  if (dataBackupSelectAllBtn) {
    dataBackupSelectAllBtn.disabled =
      !hasFolders || dataBackupBusy || dataRestoreBusy;
  }
  if (dataBackupClearAllBtn) {
    dataBackupClearAllBtn.disabled =
      !hasFolders || dataBackupBusy || dataRestoreBusy || selectedCount === 0;
  }
  if (refreshIcons && window.lucide) window.lucide.createIcons();
}
function ensureDataBackupFoldersLoaded(options = {}) {
  const { force = false, notifyError = false } = options;
  if (!force && dataFoldersLoadedOnce) {
    return Promise.resolve(true);
  }
  if (dataFolderLoadPromise) {
    return dataFolderLoadPromise;
  }
  dataFolderLoadPromise = loadUserDefaultFolders({
    notifyError,
  })
    .then((success) => {
      if (success) {
        dataFoldersLoadedOnce = true;
      }
      return success;
    })
    .finally(() => {
      dataFolderLoadPromise = null;
    });
  return dataFolderLoadPromise;
}
async function loadUserDefaultFolders(options = {}) {
  const { resetSelection = false, notifyError = false } = options;
  if (!window.api || !window.api.getUserDefaultFolders) return false;
  try {
    const result = await window.api.getUserDefaultFolders();
    if (!result || !result.success) {
      dataDefaultFolders = [];
      dataSelectedFolderIds = /* @__PURE__ */ new Set();
      dataSizeSelectionVersion += 1;
      dataSelectedTotalBytes = 0;
      dataSelectedTotalFiles = 0;
      dataSizeBusy = false;
      dataSizeRefreshQueued = false;
      persistDataFolderSelection();
      renderDataBackupFolderList();
      if (notifyError) {
        showNotification(
          result && result.error
            ? result.error
            : currentLanguage === "vi"
              ? "Không thể tải danh sách thư mục mặc định"
              : "Failed to load default folder list",
          "error",
        );
      }
      return false;
    }
    const builtInFolders = normalizeDataFolderList(result.folders);
    const builtInPathSet = new Set(
      builtInFolders.map((folder) =>
        String(folder.path || "")
          .trim()
          .toLowerCase(),
      ),
    );
    const customFolders = getSavedCustomDataFolderList().filter((folder) => {
      const pathKey = String(folder.path || "")
        .trim()
        .toLowerCase();
      return !builtInPathSet.has(pathKey);
    });
    persistCustomDataFolderList(customFolders);
    dataDefaultFolders = composeDataFolderList(builtInFolders, customFolders);
    const availableIds = new Set(dataDefaultFolders.map((folder) => folder.id));
    let nextSelected = [];
    if (!resetSelection) {
      nextSelected = getSavedDataFolderSelection().filter((id) =>
        availableIds.has(id),
      );
    }
    if (nextSelected.length === 0) {
      nextSelected = getDefaultDataFolderSelection(availableIds);
    }
    dataSelectedFolderIds = new Set(nextSelected);
    dataSizeSelectionVersion += 1;
    dataSelectedTotalBytes = 0;
    dataSelectedTotalFiles = 0;
    dataSizeBusy = false;
    dataSizeRefreshQueued = false;
    persistDataFolderSelection();
    renderDataBackupFolderList();
    scheduleDataSizeRefresh(DATA_SIZE_REFRESH_IDLE_MS);
    return true;
  } catch (error) {
    dataDefaultFolders = [];
    dataSelectedFolderIds = /* @__PURE__ */ new Set();
    dataSizeSelectionVersion += 1;
    dataSelectedTotalBytes = 0;
    dataSelectedTotalFiles = 0;
    dataSizeBusy = false;
    dataSizeRefreshQueued = false;
    persistDataFolderSelection();
    renderDataBackupFolderList();
    if (notifyError) {
      showNotification(tr("errorPrefix", { message: error.message }), "error");
    }
    return false;
  }
}
async function pickDataFolder(type) {
  if (!window.api || !window.api.selectFolder) return;
  const title =
    type === "backup"
      ? currentLanguage === "vi"
        ? "Chọn thư mục đích để sao lưu dữ liệu"
        : "Select backup folder"
      : currentLanguage === "vi"
        ? "Chọn thư mục chứa bản sao lưu dữ liệu"
        : "Select data backup folder to restore";
  const selectedPath = await window.api.selectFolder({ title });
  if (!selectedPath) return;
  if (type === "backup") {
    setDataBackupPath(selectedPath);
  } else {
    setDataRestorePath(selectedPath);
  }
}
function getDataOperationError(result, fallbackMessage) {
  if (result && result.error) return String(result.error);
  if (result && Number.isFinite(Number(result.code)) && Number(result.code) > 0)
    return `${fallbackMessage} (code ${result.code})`;
  return fallbackMessage;
}
async function runDataBackup() {
  if (dataBackupBusy) return;
  if (!window.api || !window.api.backupUserData) {
    showNotification(
      currentLanguage === "vi"
        ? "API sao lưu dữ liệu hiện không khả dụng"
        : "Data backup API is not available",
      "error",
    );
    return;
  }
  const selectedDefaultFolderIds = getSelectedDefaultFolderIds();
  const selectedCustomFolders = getSelectedCustomFolders();
  if (
    selectedDefaultFolderIds.length === 0 &&
    selectedCustomFolders.length === 0
  ) {
    showNotification(
      currentLanguage === "vi"
        ? "Vui lòng chọn ít nhất một thư mục để sao lưu"
        : "Please select at least one folder to back up",
      "error",
    );
    return;
  }
  if (!dataBackupPath) {
    await pickDataFolder("backup");
  }
  if (!dataBackupPath) {
    showNotification(
      currentLanguage === "vi"
        ? "Vui lòng chọn thư mục đích để sao lưu dữ liệu"
        : "Please select a backup destination folder",
      "error",
    );
    return;
  }

  const taskKey = `data-backup-${Date.now()}`;
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
        ? "Sao lưu dữ liệu người dùng"
        : "Backup User Data",
    startTime,
    statusLabel: tr("processing"),
  });
  updateTaskPanelUI();
  dataBackupBusy = true;
  setDataBackupButtonState();
  showNotification(
    currentLanguage === "vi"
      ? "Bắt đầu sao lưu dữ liệu người dùng"
      : "Starting user data backup",
    "info",
  );

  try {
    const result = await window.api.backupUserData(
      {
        targetPath: dataBackupPath,
        selectedFolderIds: selectedDefaultFolderIds,
        customFolders: selectedCustomFolders,
        createSubfolder: true,
      },
      taskKey,
    );
    if (result && result.success) {
      const copiedCount = Number.isFinite(Number(result.copiedFolderCount))
        ? Number(result.copiedFolderCount)
        : 0;
      const outputPath = String(result.outputPath || "").trim();
      if (outputPath) {
        setDataRestorePath(outputPath);
      }
      const countText =
        copiedCount > 0
          ? currentLanguage === "vi"
            ? ` (${copiedCount.toLocaleString(getUiLocale())} thư mục)`
            : ` (${copiedCount.toLocaleString(getUiLocale())} folders)`
          : "";
      showNotification(
        currentLanguage === "vi"
          ? `Sao lưu dữ liệu hoàn tất${countText}`
          : `Data backup completed${countText}`,
        "success",
      );
      const missingCount = Number.isFinite(Number(result.missingFolderCount))
        ? Number(result.missingFolderCount)
        : 0;
      if (missingCount > 0) {
        showNotification(
          currentLanguage === "vi"
            ? `${missingCount.toLocaleString(getUiLocale())} thư mục nguồn không tồn tại nên đã bỏ qua`
            : `${missingCount.toLocaleString(getUiLocale())} source folders were missing and skipped`,
          "info",
        );
      }
    } else {
      showNotification(
        getDataOperationError(
          result,
          currentLanguage === "vi"
            ? "Sao lưu dữ liệu thất bại"
            : "Data backup failed",
        ),
        "error",
      );
    }
  } catch (error) {
    showNotification(tr("errorPrefix", { message: error.message }), "error");
  } finally {
    activeTasks.delete(taskKey);
    updateTaskPanelUI();
    dataBackupBusy = false;
    setDataBackupButtonState();
  }
}
async function runDataRestore() {
  if (dataRestoreBusy) return;
  if (!window.api || !window.api.restoreUserData) {
    showNotification(
      currentLanguage === "vi"
        ? "API khôi phục dữ liệu hiện không khả dụng"
        : "Data restore API is not available",
      "error",
    );
    return;
  }
  if (!dataRestorePath) {
    await pickDataFolder("restore");
  }
  if (!dataRestorePath) {
    showNotification(
      currentLanguage === "vi"
        ? "Vui lòng chọn thư mục chứa bản sao lưu dữ liệu"
        : "Please select a data backup folder",
      "error",
    );
    return;
  }
  const hasManualSelection = dataSelectedFolderIds.size > 0;
  if (
    !confirm(
      currentLanguage === "vi"
        ? hasManualSelection
          ? "Khôi phục các thư mục đã chọn từ bản sao lưu này? File trùng tên có thể bị ghi đè"
          : "Không có thư mục nào được chọn. Tự động phát hiện thư mục trong backup và khôi phục? File trùng tên có thể bị ghi đè"
        : hasManualSelection
          ? "Restore selected folders from this backup? Existing files with same name may be overwritten"
          : "No folders selected. Auto-detect available folders in backup and restore them? Existing files with same name may be overwritten",
    )
  ) {
    return;
  }

  const taskKey = `data-restore-${Date.now()}`;
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
        ? "Khôi phục dữ liệu người dùng"
        : "Restore User Data",
    startTime,
    statusLabel: tr("processing"),
  });
  updateTaskPanelUI();
  dataRestoreBusy = true;
  setDataBackupButtonState();
  showNotification(
    currentLanguage === "vi"
      ? "Bắt đầu khôi phục dữ liệu người dùng"
      : "Starting user data restore",
    "info",
  );

  try {
    const result = await window.api.restoreUserData(
      {
        sourcePath: dataRestorePath,
        selectedFolderIds: Array.from(dataSelectedFolderIds),
      },
      taskKey,
    );
    if (result && result.success) {
      const restoredCount = Number.isFinite(Number(result.restoredFolderCount))
        ? Number(result.restoredFolderCount)
        : 0;
      const countText =
        restoredCount > 0
          ? currentLanguage === "vi"
            ? ` (${restoredCount.toLocaleString(getUiLocale())} thư mục)`
            : ` (${restoredCount.toLocaleString(getUiLocale())} folders)`
          : "";
      showNotification(
        currentLanguage === "vi"
          ? `Khôi phục dữ liệu hoàn tất${countText}`
          : `Data restore completed${countText}`,
        "success",
      );
      const missingCount = Number.isFinite(Number(result.missingFolderCount))
        ? Number(result.missingFolderCount)
        : 0;
      if (missingCount > 0) {
        showNotification(
          currentLanguage === "vi"
            ? `${missingCount.toLocaleString(getUiLocale())} thư mục không có trong bản sao lưu nên đã bỏ qua`
            : `${missingCount.toLocaleString(getUiLocale())} folders were not found in backup and skipped`,
          "info",
        );
      }
    } else {
      showNotification(
        getDataOperationError(
          result,
          currentLanguage === "vi"
            ? "Khôi phục dữ liệu thất bại"
            : "Data restore failed",
        ),
        "error",
      );
    }
  } catch (error) {
    showNotification(tr("errorPrefix", { message: error.message }), "error");
  } finally {
    activeTasks.delete(taskKey);
    updateTaskPanelUI();
    dataRestoreBusy = false;
    setDataBackupButtonState();
  }
}
async function pickDriverFolder(type) {
  if (!window.api || !window.api.selectFolder) return;
  const title =
    type === "backup"
      ? currentLanguage === "vi"
        ? "Chọn thư mục đích để sao lưu"
        : "Select backup folder"
      : currentLanguage === "vi"
        ? "Chọn thư mục sao lưu để khôi phục"
        : "Select backup folder to restore";
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
function normalizeWindowsUpdateState(raw) {
  if (!raw || raw.success !== true) return null;
  const startType = String(raw.startType || "").trim();
  const status = String(raw.status || "").trim();
  const isDisabled =
    typeof raw.isDisabled === "boolean"
      ? raw.isDisabled
      : startType.toLowerCase() === "disabled";
  return {
    isDisabled,
    startType,
    status,
  };
}
function renderWindowsUpdateCard() {
  if (!utilitiesWuToggleBtn || !utilitiesWuStatusValueEl) return;
  const hasKnownState =
    windowsUpdateState && typeof windowsUpdateState.isDisabled === "boolean";
  const isStatusLoading = windowsUpdateStateLoading && !hasKnownState;
  const isDisabled =
    hasKnownState
      ? windowsUpdateState.isDisabled
      : null;
  const stateKey =
    isStatusLoading
      ? "loading"
      : isDisabled === true
      ? "disabled"
      : isDisabled === false
        ? "enabled"
        : "unknown";
  utilitiesWuStatusValueEl.dataset.state = stateKey;
  if (isStatusLoading) {
    utilitiesWuStatusValueEl.innerHTML = `<i data-lucide="loader-2" class="animate-spin" style="width: 12px; height: 12px"></i> ${escapeHtml(tr("processing"))}`;
  } else {
    utilitiesWuStatusValueEl.innerText =
      stateKey === "disabled"
        ? tr("windowsUpdateDisabled")
        : stateKey === "enabled"
          ? tr("windowsUpdateEnabled")
          : tr("windowsUpdateUnknown");
  }

  const buttonIcon = windowsUpdateBusy || isStatusLoading
    ? "loader-2"
    : isDisabled === true
      ? "shield-check"
      : "shield-off";
  const buttonLabel = windowsUpdateBusy || isStatusLoading
    ? tr("processing")
    : isDisabled === true
      ? tr("windowsUpdateEnableBtn")
      : tr("windowsUpdateDisableBtn");
  utilitiesWuToggleBtn.disabled = windowsUpdateBusy || isStatusLoading;
  utilitiesWuToggleBtn.className =
    isDisabled === false ? "btn btn-primary w-full" : "btn btn-outline w-full";
  utilitiesWuToggleBtn.innerHTML = `<i data-lucide="${buttonIcon}" ${(windowsUpdateBusy || isStatusLoading) ? 'class="animate-spin"' : ""} style="width: 16px"></i> ${buttonLabel}`;
  if (window.lucide) window.lucide.createIcons();
}
async function refreshWindowsUpdateState(showError = false) {
  windowsUpdateStateLoading = true;
  renderWindowsUpdateCard();
  if (!window.api || !window.api.getWindowsUpdateState) {
    windowsUpdateStateLoading = false;
    renderWindowsUpdateCard();
    if (showError) showNotification(tr("windowsUpdateApiUnavailable"), "error");
    return null;
  }
  try {
    const result = await window.api.getWindowsUpdateState();
    const normalized = normalizeWindowsUpdateState(result);
    if (!normalized) {
      if (showError) {
        showNotification(
          (result && result.error) || tr("windowsUpdateRefreshFailed"),
          "error",
        );
      }
      return null;
    }
    windowsUpdateState = normalized;
    return normalized;
  } catch (error) {
    if (showError) {
      showNotification(tr("errorPrefix", { message: error.message }), "error");
    }
    return null;
  } finally {
    windowsUpdateStateLoading = false;
    renderWindowsUpdateCard();
  }
}
async function toggleWindowsUpdateState() {
  if (windowsUpdateBusy) return;
  if (!window.api || !window.api.setWindowsUpdateDisabled) {
    showNotification(tr("windowsUpdateApiUnavailable"), "error");
    return;
  }
  const currentlyDisabled =
    windowsUpdateState && typeof windowsUpdateState.isDisabled === "boolean"
      ? windowsUpdateState.isDisabled
      : false;
  const targetDisable = !currentlyDisabled;
  windowsUpdateBusy = true;
  renderWindowsUpdateCard();
  try {
    const result = await window.api.setWindowsUpdateDisabled(targetDisable);
    const normalized = normalizeWindowsUpdateState(result);
    if (!normalized) {
      showNotification(
        (result && result.error) || tr("windowsUpdateToggleFailed"),
        "error",
      );
      await refreshWindowsUpdateState(false);
      return;
    }
    windowsUpdateState = normalized;
    showNotification(
      targetDisable
        ? tr("windowsUpdateDisableSuccess")
        : tr("windowsUpdateEnableSuccess"),
      "success",
    );
  } catch (error) {
    showNotification(tr("errorPrefix", { message: error.message }), "error");
    await refreshWindowsUpdateState(false);
  } finally {
    windowsUpdateBusy = false;
    renderWindowsUpdateCard();
  }
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
      const standbyReducedMB = Number.isFinite(Number(result.standbyReducedMB))
        ? Number(result.standbyReducedMB)
        : null;
      const privilegeStatus = Number.isFinite(Number(result.privilegeStatus))
        ? Number(result.privilegeStatus)
        : null;
      let standbyText = "";
      if (standbyReducedMB !== null) {
        standbyText =
          currentLanguage === "vi"
            ? standbyReducedMB > 0
              ? ` | standby giảm ${standbyReducedMB.toLocaleString(getUiLocale())} MB`
              : " | standby chưa giảm"
            : standbyReducedMB > 0
              ? ` | standby reduced ${standbyReducedMB.toLocaleString(getUiLocale())} MB`
              : " | standby unchanged";
      } else if (result && result.standbyPurged === false) {
        standbyText =
          currentLanguage === "vi"
            ? " | standby chưa dọn hết"
            : " | standby list not fully purged";
      }
      if (result && result.standbyPurged === false && privilegeStatus !== null) {
        standbyText +=
          currentLanguage === "vi"
            ? ` (privilege code ${privilegeStatus})`
            : ` (privilege code ${privilegeStatus})`;
      }
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
        ? "Chạy dọn ổ đĩa ngay bây giờ? Tác vụ có thể mất vài phút."
        : "Run disk cleanup now? This task can take several minutes.",
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
    name: currentLanguage === "vi" ? "Dọn ổ đĩa" : "Disk Cleanup",
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
    currentLanguage === "vi" ? "Bắt đầu dọn ổ đĩa" : "Starting disk cleanup",
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
        ? "Vui lòng Chọn thư mục sao lưu"
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
    if (officeTotalCountEl) {
      officeTotalCountEl.innerText = tr("officeImagesCountLabel", {
        count: files.length,
      });
    }
    officeList.innerHTML = "";
    officeList.className =
      officeViewMode === "grid" ? "installer-grid" : "flex flex-col gap-2";
    setViewToggleButtonIcon(
      "office-view-toggle",
      "office-view-toggle-icon",
      officeViewMode === "grid" ? "list" : "layout-grid",
    );
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
    if (officeTotalCountEl) {
      officeTotalCountEl.innerText = tr("officeImagesCountLabel", { count: 0 });
    }
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
if (dataBackupPathInput) {
  dataBackupPathInput.value = dataBackupPath;
}
if (dataRestorePathInput) {
  dataRestorePathInput.value = dataRestorePath;
}
if (driverBackupBrowseBtn) {
  driverBackupBrowseBtn.onclick = () => pickDriverFolder("backup");
}
if (driverRestoreBrowseBtn) {
  driverRestoreBrowseBtn.onclick = () => pickDriverFolder("restore");
}
if (dataBackupBrowseBtn) {
  dataBackupBrowseBtn.onclick = () => pickDataFolder("backup");
}
if (dataRestoreBrowseBtn) {
  dataRestoreBrowseBtn.onclick = () => pickDataFolder("restore");
}
if (dataBackupAddFolderBtn) {
  dataBackupAddFolderBtn.onclick = () => addCustomDataFolder();
}
if (driverBackupRunBtn) {
  driverBackupRunBtn.onclick = () => runDriverBackup();
}
if (driverRestoreRunBtn) {
  driverRestoreRunBtn.onclick = () => runDriverRestore();
}
if (dataBackupRunBtn) {
  dataBackupRunBtn.onclick = () => runDataBackup();
}
if (dataRestoreRunBtn) {
  dataRestoreRunBtn.onclick = () => runDataRestore();
}
if (dataBackupSelectAllBtn) {
  dataBackupSelectAllBtn.onclick = () => {
    dataSelectedFolderIds = new Set(
      dataDefaultFolders.map((folder) => String(folder.id || "").toLowerCase()),
    );
    dataSizeSelectionVersion += 1;
    persistDataFolderSelection();
    renderDataBackupFolderList();
    scheduleDataSizeRefresh(DATA_SIZE_REFRESH_IDLE_MS);
  };
}
if (dataBackupClearAllBtn) {
  dataBackupClearAllBtn.onclick = () => {
    dataSelectedFolderIds = /* @__PURE__ */ new Set();
    dataSizeSelectionVersion += 1;
    dataSelectedTotalBytes = 0;
    dataSelectedTotalFiles = 0;
    dataSizeBusy = false;
    dataSizeRefreshQueued = false;
    clearDataSizeRefreshSchedule();
    persistDataFolderSelection();
    renderDataBackupFolderList();
  };
}
if (cleanupRamBtn) {
  cleanupRamBtn.onclick = () => runSystemRamCleanup();
}
if (cleanupDiskBtn) {
  cleanupDiskBtn.onclick = () => runSystemDiskCleanup();
}
if (utilitiesWuToggleBtn) {
  utilitiesWuToggleBtn.onclick = () => toggleWindowsUpdateState();
}
setDriverButtonState();
setDataBackupButtonState();
setCleanupButtonState();
renderWindowsUpdateCard();
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
    selectedInstallerKeys.clear();
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
            const normalizedPkgId = String(pkg.id || "")
              .trim()
              .toLowerCase();
            if (!normalizedPkgId) {
              showNotification(
                currentLanguage === "vi"
                  ? "ID gói Winget không hợp lệ"
                  : "Invalid Winget package id",
                "error",
              );
              return;
            }
            if (
              installers.some(
                (i) =>
                  String(i.path || "")
                    .trim()
                    .toLowerCase() === normalizedPkgId,
              )
            ) {
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
              path: String(pkg.id || "").trim(),
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
if (installSelectedBtn) {
  installSelectedBtn.onclick = () => installSelectedApplications();
}
if (deleteSelectedBtn) {
  deleteSelectedBtn.onclick = () => deleteSelectedApplications();
}
if (clearSelectionBtn) {
  clearSelectionBtn.onclick = () => clearSelectedApplications();
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
function normalizeProductKey(rawValue) {
  const compact = String(rawValue || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (compact.length !== 25) return "";
  return compact.match(/.{1,5}/g).join("-");
}
function bindProductKeyInput(inputEl) {
  if (!inputEl) return;
  inputEl.addEventListener("blur", () => {
    const normalized = normalizeProductKey(inputEl.value);
    if (normalized) inputEl.value = normalized;
  });
  inputEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const triggerId =
      inputEl.id === "activation-win-key-input"
        ? "activation-win-key-btn"
        : "activation-office-key-btn";
    const triggerBtn = document.getElementById(triggerId);
    if (triggerBtn) {
      event.preventDefault();
      triggerBtn.click();
    }
  });
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
const activationWinKeyInput = document.getElementById(
  "activation-win-key-input",
);
const activationWinKeyBtn = document.getElementById("activation-win-key-btn");
if (
  activationWinKeyInput &&
  activationWinKeyBtn &&
  window.api &&
  window.api.activateWindowsByKey
) {
  bindProductKeyInput(activationWinKeyInput);
  activationWinKeyBtn.onclick = async () => {
    if (activationWindowsKeyBusy) return;
    const productKey = normalizeProductKey(activationWinKeyInput.value);
    if (!productKey) {
      showNotification(tr("invalidProductKey"), "error");
      activationWinKeyInput.focus();
      return;
    }
    activationWinKeyInput.value = productKey;
    activationWindowsKeyBusy = true;
    activationWinKeyBtn.disabled = true;
    showNotification(tr("windowsKeyActivationStarting"), "info");
    try {
      const result = await window.api.activateWindowsByKey(productKey);
      if (result && result.success) {
        showNotification(tr("windowsKeyActivationSuccess"), "success");
      } else {
        showNotification(
          (result && result.error) || tr("windowsKeyActivationFailed"),
          "error",
        );
      }
    } catch (error) {
      showNotification(tr("errorPrefix", { message: error.message }), "error");
    } finally {
      activationWindowsKeyBusy = false;
      activationWinKeyBtn.disabled = false;
    }
  };
}
const activationOfficeKeyInput = document.getElementById(
  "activation-office-key-input",
);
const activationOfficeKeyBtn = document.getElementById(
  "activation-office-key-btn",
);
if (
  activationOfficeKeyInput &&
  activationOfficeKeyBtn &&
  window.api &&
  window.api.activateOfficeByKey
) {
  bindProductKeyInput(activationOfficeKeyInput);
  activationOfficeKeyBtn.onclick = async () => {
    if (activationOfficeKeyBusy) return;
    const productKey = normalizeProductKey(activationOfficeKeyInput.value);
    if (!productKey) {
      showNotification(tr("invalidProductKey"), "error");
      activationOfficeKeyInput.focus();
      return;
    }
    activationOfficeKeyInput.value = productKey;
    activationOfficeKeyBusy = true;
    activationOfficeKeyBtn.disabled = true;
    showNotification(tr("officeKeyActivationStarting"), "info");
    try {
      const result = await window.api.activateOfficeByKey(productKey);
      if (result && result.success) {
        showNotification(tr("officeKeyActivationSuccess"), "success");
      } else {
        showNotification(
          (result && result.error) || tr("officeKeyActivationFailed"),
          "error",
        );
      }
    } catch (error) {
      showNotification(tr("errorPrefix", { message: error.message }), "error");
    } finally {
      activationOfficeKeyBusy = false;
      activationOfficeKeyBtn.disabled = false;
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
  // TEMP: Performance logic disabled
  // stopPerformancePolling();
  if (pendingInstalledRenderTimer) {
    clearTimeout(pendingInstalledRenderTimer);
    pendingInstalledRenderTimer = null;
  }
  clearDataSizeRefreshSchedule();
  if (typeof disposeInstalledAppsUpdatedListener === "function") {
    disposeInstalledAppsUpdatedListener();
    disposeInstalledAppsUpdatedListener = null;
  }
  activeToastTimers.forEach((timerId) => {
    clearTimeout(timerId);
  });
  activeToastTimers.clear();
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

async function initAboutVersion() {
  if (!aboutVersionValue || !window.api || !window.api.getAppVersion) return;
  try {
    const version = String((await window.api.getAppVersion()) || "").trim();
    if (!version) return;
    aboutVersionValue.innerText = version;
  } catch (error) {
    console.warn("Failed to load app version:", error);
  }
}

async function warmupDashboardDataInBackground() {
  await Promise.allSettled([
    // TEMP: Performance logic disabled
    // typeof refreshPerformanceBoard === "function"
    //   ? refreshPerformanceBoard()
    //   : Promise.resolve(),
    typeof initSysInfo === "function" ? initSysInfo() : Promise.resolve(),
  ]);
}

async function ensureSmartMonToolsInBackground() {
  if (!window.api || typeof window.api.checkSmartctlStatus !== "function") return;

  try {
    const status = await window.api.checkSmartctlStatus();
    if (!status || !status.success || !status.available) {
      console.warn(
        "Smartctl is not available from bundled smartmontools folder.",
      );
    }
  } catch (error) {
    console.warn("SmartMonTools availability check failed:", error);
  }
}

function runPostStartupBackgroundTasks() {
  setTimeout(() => {
    Promise.allSettled([
      warmupDashboardDataInBackground(),
      ensureSmartMonToolsInBackground(),
    ]);
  }, 0);
}

async function checkAndInstallWinget() {
  showSystemLoader(tr("systemChecking"));
  let pendingStoreFallback = null;

  if (!window.api || !window.api.checkWingetStatus || !window.api.installWinget) {
    hideSystemLoader();
    runPostStartupBackgroundTasks();
    return;
  }

  try {
    showSystemLoader(tr("wingetCheck"));
    const status = await window.api.checkWingetStatus();
    const statusCode = String(status?.status || "").toLowerCase();

    if (statusCode === "missing") {
      hideSystemLoader();
      const shouldInstallWinget = confirm(
        currentLanguage === "vi"
          ? "Không tìm thấy Winget. Bạn có muốn cài Winget ngay bây giờ không?"
          : "Winget was not found. Do you want to install Winget now?",
      );
      if (!shouldInstallWinget) {
        showNotification(
          currentLanguage === "vi"
            ? "Đã bỏ qua cài Winget theo lựa chọn của bạn"
            : "Skipped Winget installation as requested",
          "info",
        );
      } else {
        const msg =
          currentLanguage === "vi"
            ? "Đang cấu hình gói cài đặt hệ thống"
            : "Configuring system package manager";
        showSystemLoader(msg);
        const result = await window.api.installWinget();
        if (!result.success) {
          showNotification(
            currentLanguage === "vi"
              ? `Cài đặt Winget thất bại: ${result.error}`
              : `Winget installation failed: ${result.error}`,
            "error",
          );
          if (result.requiresStore && result.storeUrl) {
            pendingStoreFallback = String(result.storeUrl);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error during system check:", error);
  } finally {
    hideSystemLoader();
  }

  if (
    pendingStoreFallback &&
    window.api &&
    typeof window.api.openExternal === "function"
  ) {
    const shouldOpenStore = confirm(
      currentLanguage === "vi"
        ? "Máy mới cài Windows có thể thiếu dependency của Winget. Mở Microsoft Store để cài App Installer ngay bây giờ?"
        : "Fresh Windows installs may miss Winget dependencies. Open Microsoft Store to install App Installer now?",
    );
    if (shouldOpenStore) {
      await window.api.openExternal(pendingStoreFallback);
      showNotification(
        currentLanguage === "vi"
          ? "Cài App Installer trong Microsoft Store, sau đó mở lại ứng dụng."
          : "Install App Installer in Microsoft Store, then reopen the app.",
        "info",
      );
    }
  }

  runPostStartupBackgroundTasks();
}
async function initApp() {
  clearStoredPathHistory();
  initLanguageSelector();
  initThemeToggle();
  await initAboutVersion();
  await checkAndInstallWinget();
  if (window.api && window.api.onInstalledAppsUpdated) {
    disposeInstalledAppsUpdatedListener = window.api.onInstalledAppsUpdated(
      (apps) => applyInstalledAppsSnapshot(apps, false),
    );
  }

  if (window.api && window.api.loadLibrary) {
    installers = await window.api.loadLibrary();
  }
  switchTab("dashboard");
  renderBatteryDetailCards();
  applyLanguage(currentLanguage, { persist: false, rerender: false });
  setTimeout(() => {
    updateOfficeOnlineSubmitButtonLabel();
    if (window.lucide) window.lucide.createIcons();
  }, 0);
}
initApp();
