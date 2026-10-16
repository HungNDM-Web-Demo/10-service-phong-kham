namespace Infrastructure.Implementations.Services.Clinic;

/// <summary>
/// Một cổng ghi (06 §3): đặt lịch, đổi giờ, tiếp đón, cấp số thứ tự, gọi, kết thúc khám, thu tiền chạy tuần tự trong tiến
/// trình rồi mới kiểm tra chỗ trống và lưu, nên hai người đặt cùng khung chỉ một người lưu được khi khung hết chỗ.
/// Demo chạy một tiến trình BE.
/// </summary>
internal static class ClinicGate
{
    private static readonly SemaphoreSlim Gate = new(1, 1);

    public static async Task<T> RunAsync<T>(Func<Task<T>> action, CancellationToken ct)
    {
        await Gate.WaitAsync(ct);
        try
        {
            return await action();
        }
        finally
        {
            Gate.Release();
        }
    }
}
