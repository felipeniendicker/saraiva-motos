param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\public")
)

Add-Type -AssemblyName System.Drawing

function New-SaraivaIcon {
    param(
        [int]$Size,
        [string]$Path,
        [bool]$Maskable
    )

    $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#181916"))

    $margin = if ($Maskable) { [int]($Size * 0.22) } else { [int]($Size * 0.15) }
    $markSize = $Size - (2 * $margin)
    $radius = [int]($markSize * 0.24)
    $pathShape = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = 2 * $radius
    $pathShape.AddArc($margin, $margin, $diameter, $diameter, 180, 90)
    $pathShape.AddArc($margin + $markSize - $diameter, $margin, $diameter, $diameter, 270, 90)
    $pathShape.AddArc($margin + $markSize - $diameter, $margin + $markSize - $diameter, $diameter, $diameter, 0, 90)
    $pathShape.AddArc($margin, $margin + $markSize - $diameter, $diameter, $diameter, 90, 90)
    $pathShape.CloseFigure()
    $yellowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#f2d53c"))
    $graphics.FillPath($yellowBrush, $pathShape)

    $fontSize = [single]($markSize * 0.37)
    $font = [System.Drawing.Font]::new("Trebuchet MS", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#29291f"))
    $format = [System.Drawing.StringFormat]::new()
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textArea = [System.Drawing.RectangleF]::new([single]$margin, [single]$margin, [single]$markSize, [single]$markSize)
    $graphics.DrawString("SM", $font, $textBrush, $textArea, $format)

    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $format.Dispose()
    $textBrush.Dispose()
    $font.Dispose()
    $yellowBrush.Dispose()
    $pathShape.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
New-SaraivaIcon -Size 192 -Path (Join-Path $OutputDirectory "pwa-192x192.png") -Maskable $false
New-SaraivaIcon -Size 512 -Path (Join-Path $OutputDirectory "pwa-512x512.png") -Maskable $false
New-SaraivaIcon -Size 512 -Path (Join-Path $OutputDirectory "pwa-maskable-512x512.png") -Maskable $true
