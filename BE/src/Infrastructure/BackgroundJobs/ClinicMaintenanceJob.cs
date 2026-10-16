using Application.Interfaces.Services.Clinic;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.BackgroundJobs;

/// <summary>
/// Chạy <see cref="IClinicMaintenanceService"/> lúc khởi động rồi mỗi 5 phút (06 §3): lịch ngày đã qua chuyển "Không đến" (BR-05),
/// lượt còn chờ của ngày đã qua chuyển "Bỏ về", dòng nhắc quá hạn (BR-29), tin nhắc lịch từ 18:00 (FR-12).
/// </summary>
public sealed class ClinicMaintenanceJob(
    IServiceScopeFactory scopeFactory,
    TimeProvider timeProvider,
    ILogger<ClinicMaintenanceJob> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            // Đợi DB khởi tạo xong (Program gọi InitializeDatabaseAsync trước khi chạy host, chờ thêm cho chắc).
            await Task.Delay(TimeSpan.FromSeconds(5), timeProvider, stoppingToken);
            while (!stoppingToken.IsCancellationRequested)
            {
                await RunOnceAsync(stoppingToken);
                await Task.Delay(Interval, timeProvider, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Ứng dụng đang dừng.
        }
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var changes = await scope.ServiceProvider.GetRequiredService<IClinicMaintenanceService>().RunAsync(ct);
            if (changes > 0)
                logger.LogInformation("Việc nền phòng khám: cập nhật {Count} bản ghi.", changes);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Việc nền phòng khám thất bại, thử lại sau.");
        }
    }
}
