using System;
using System.Collections.Generic;
using System.Globalization;
using System.Management;

namespace WinstallerHubApp.Services;

internal static class HardwareQueryHelpers
{
    internal static string QuerySingle(
        string wmiQuery,
        Func<ManagementBaseObject, string?> selector,
        string fallback)
    {
        try
        {
            using var searcher = new ManagementObjectSearcher(wmiQuery);
            using var results = searcher.Get();

            foreach (ManagementBaseObject item in results)
            {
                var value = selector(item)?.Trim();
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        return fallback;
    }

    internal static List<string> QueryMany(
        string wmiQuery,
        Func<ManagementBaseObject, string?> selector,
        string fallback)
    {
        var values = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        try
        {
            using var searcher = new ManagementObjectSearcher(wmiQuery);
            using var results = searcher.Get();

            foreach (ManagementBaseObject item in results)
            {
                var value = selector(item)?.Trim();
                if (!string.IsNullOrWhiteSpace(value) && seen.Add(value))
                {
                    values.Add(value);
                }
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        if (values.Count == 0)
        {
            values.Add(fallback);
        }

        return values;
    }

    internal static object? QuerySingleObjectValue(string wmiQuery, string propertyName, string? scope = null)
    {
        try
        {
            using var searcher = scope is null
                ? new ManagementObjectSearcher(wmiQuery)
                : new ManagementObjectSearcher(scope, wmiQuery);
            using var results = searcher.Get();

            foreach (ManagementBaseObject item in results)
            {
                var value = item[propertyName];
                if (value != null)
                {
                    return value;
                }
            }
        }
        catch (ManagementException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        return null;
    }

    internal static string? JoinParts(params string?[] values)
    {
        var parts = new List<string>();
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                parts.Add(value.Trim());
            }
        }

        return parts.Count == 0 ? null : string.Join(" ", parts);
    }

    internal static double ToDouble(object? value)
    {
        if (value == null)
        {
            return 0;
        }

        if (value is IConvertible convertible)
        {
            try
            {
                return convertible.ToDouble(CultureInfo.InvariantCulture);
            }
            catch (FormatException)
            {
            }
            catch (InvalidCastException)
            {
            }
        }

        var asText = value.ToString();
        if (double.TryParse(asText, NumberStyles.Any, CultureInfo.InvariantCulture, out var invariantValue))
        {
            return invariantValue;
        }

        if (double.TryParse(asText, NumberStyles.Any, CultureInfo.CurrentCulture, out var cultureValue))
        {
            return cultureValue;
        }

        return 0;
    }

    internal static string ToSafeText(object? value, string fallback)
    {
        var asText = value?.ToString()?.Trim();
        return string.IsNullOrWhiteSpace(asText) ? fallback : asText;
    }

    internal static string Truncate(string value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "N/A";
        }

        var normalized = value.Trim();
        if (normalized.Length <= maxLength)
        {
            return normalized;
        }

        return normalized[..Math.Max(0, maxLength - 3)] + "...";
    }

    internal static string FormatWmiDate(string? rawValue)
    {
        if (string.IsNullOrWhiteSpace(rawValue) || rawValue.Length < 8)
        {
            return "N/A";
        }

        if (DateTime.TryParseExact(rawValue[..8], "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            return parsed.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        return "N/A";
    }
}
