# Export documentary TV photos without carrying camera/GPS metadata into Git.
# The after photo's personal greeting and weather are visibly redacted.
[CmdletBinding()]
param(
    [string]$SourceDirectory,
    [string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
if (!$SourceDirectory) { $SourceDirectory = Join-Path $PSScriptRoot '../backups/readme-photos/originals' }
if (!$OutputDirectory) { $OutputDirectory = Join-Path $PSScriptRoot '../docs/images' }
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$photos = @(
    @{ Source = 'TV before 2.JPG'; Output = 'before-home.jpg'; Crop = @(0.01, 0.16, 0.98); Redact = $false },
    @{ Source = 'TV before 1.JPG'; Output = 'before-promotions.jpg'; Crop = @(0.01, 0.16, 0.98); Redact = $false },
    @{ Source = 'TV before 3.JPG'; Output = 'before-fullscreen.jpg'; Crop = @(0.075, 0.13, 0.84); Redact = $false },
    @{ Source = 'TV after.JPG'; Output = 'after-home.jpg'; Crop = @(0.075, 0.055, 0.89); Redact = $true }
)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
foreach ($entry in $photos) {
    $photo = [System.Drawing.Image]::FromFile((Join-Path $SourceDirectory $entry.Source))
    $bitmap = [System.Drawing.Bitmap]::new(1600, 900, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
    try {
        $x = [int]($photo.Width * $entry.Crop[0])
        $y = [int]($photo.Height * $entry.Crop[1])
        $width = [int]($photo.Width * $entry.Crop[2])
        $height = [int]($width * 9 / 16)
        if ($x + $width -gt $photo.Width -or $y + $height -gt $photo.Height) { throw 'Photo crop exceeds source' }
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($photo, [System.Drawing.Rectangle]::new(0, 0, 1600, 900),
            [System.Drawing.Rectangle]::new($x, $y, $width, $height), [System.Drawing.GraphicsUnit]::Pixel)
        if ($entry.Redact) {
            # Opaque replacement removes the underlying personal pixels entirely.
            $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(184, 194, 203))
            $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(58, 72, 83))
            $font = [System.Drawing.Font]::new('Segoe UI', 13, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
            try {
                $graphics.FillRectangle($brush, 88, 65, 280, 96)
                $graphics.DrawString('Greeting & weather redacted', $font, $textBrush, 105, 106)
            } finally { $font.Dispose(); $brush.Dispose(); $textBrush.Dispose() }
        }
        $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]88)
        $target = Join-Path $OutputDirectory $entry.Output
        $bitmap.Save([System.IO.Path]::GetFullPath($target), $codec, $parameters)
        $verified = [System.Drawing.Image]::FromFile([System.IO.Path]::GetFullPath($target))
        try {
            # GDI+ exposes the JPEG codec's two quantization tables as properties.
            $personalMetadata = @($verified.PropertyIdList | Where-Object { $_ -notin @(0x5090, 0x5091) })
            if ($personalMetadata.Count -gt 0) { throw 'Unexpected exported photo metadata' }
        } finally { $verified.Dispose() }
        Get-Item -LiteralPath $target | Select-Object Name, Length
    } finally { $parameters.Dispose(); $graphics.Dispose(); $bitmap.Dispose(); $photo.Dispose() }
}
