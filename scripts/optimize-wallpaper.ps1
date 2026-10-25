# Keep precisely the bottom-aligned 16:9 area already displayed by CSS cover.
# This is deterministic asset processing; the original photograph is preserved.
[CmdletBinding()]
param(
    [string]$Source,
    [string]$Output
)
$ErrorActionPreference = 'Stop'
if (!$Source) { $Source = Join-Path $PSScriptRoot '../assets/source/madison-capitol-sunset.jpg' }
if (!$Output) { $Output = Join-Path $PSScriptRoot '../public/backgrounds/madison-capitol-sunset.jpg' }
Add-Type -AssemblyName System.Drawing
$photo = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $Source).Path)
$bitmap = $null
$graphics = $null
$encoderParameters = $null
try {
    if ($photo.Width -ne 3840 -or $photo.Height -ne 2765) {
        throw 'Expected the preserved 3840 x 2765 Madison original.'
    }
    $bitmap = [System.Drawing.Bitmap]::new(3840, 2160, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.DrawImage($photo, [System.Drawing.Rectangle]::new(0, 0, 3840, 2160),
        [System.Drawing.Rectangle]::new(0, 605, 3840, 2160), [System.Drawing.GraphicsUnit]::Pixel)
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
        Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encoderParameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new(
        [System.Drawing.Imaging.Encoder]::Quality, [long]85)
    $bitmap.Save([System.IO.Path]::GetFullPath($Output), $codec, $encoderParameters)
    Get-Item -LiteralPath $Output | Select-Object Name, Length
}
finally {
    if ($encoderParameters) { $encoderParameters.Dispose() }
    if ($graphics) { $graphics.Dispose() }
    if ($bitmap) { $bitmap.Dispose() }
    $photo.Dispose()
}
