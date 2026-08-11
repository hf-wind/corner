$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-LogoBitmap([int]$size) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $scale = $size / 64.0
  $graphics.ScaleTransform($scale, $scale)

  $brand = [System.Drawing.ColorTranslator]::FromHtml('#1a66ff')

  $framePath = New-RoundedRectanglePath 2.5 2.5 59 59 15
  $frame = [System.Drawing.Pen]::new($brand, 2.4)
  $graphics.DrawPath($frame, $framePath)

  $cornerPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(82, $brand), 2.8)
  $cornerPen.StartCap = $cornerPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($cornerPen, 15, 14, 15, 49)
  $graphics.DrawLine($cornerPen, 15, 49, 50, 49)

  $windPen = [System.Drawing.Pen]::new($brand, 3.4)
  $windPen.StartCap = $windPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $windOne = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $windOne.StartFigure()
  $windOne.AddBezier(7, 25, 18, 25, 19, 17, 31, 17)
  $windOne.AddBezier(31, 17, 38, 17, 41, 20, 41, 24)
  $windOne.AddBezier(41, 24, 41, 29, 37, 32, 32, 32)
  $graphics.DrawPath($windPen, $windOne)
  $graphics.DrawLine($windPen, 7, 36, 44, 36)
  $windTwo = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $windTwo.StartFigure()
  $windTwo.AddBezier(44, 36, 51, 36, 55, 33, 55, 28)
  $graphics.DrawPath($windPen, $windTwo)
  $windPen.Color = [System.Drawing.Color]::FromArgb(138, $brand)
  $graphics.DrawLine($windPen, 17, 46, 42, 46)
  $windThree = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $windThree.StartFigure()
  $windThree.AddBezier(42, 46, 48, 46, 51, 49, 51, 53)
  $graphics.DrawPath($windPen, $windThree)

  $dotBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(204, [System.Drawing.Color]::White), 1.5)
  $dot = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#d89454'))
  $graphics.FillEllipse($dot, 12, 11, 6, 6)
  $graphics.DrawEllipse($dotBorder, 10.55, 9.55, 8.9, 8.9)

  $graphics.Dispose()
  $framePath.Dispose(); $frame.Dispose(); $cornerPen.Dispose(); $windPen.Dispose()
  $windOne.Dispose(); $windTwo.Dispose(); $windThree.Dispose(); $dotBorder.Dispose(); $dot.Dispose()
  return $bitmap
}

$publicDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\frontend\public'))
foreach ($size in @(16, 32, 64, 192, 512)) {
  $bitmap = New-LogoBitmap $size
  $bitmap.Save((Join-Path $publicDirectory "logo_$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  if ($size -eq 512) { $bitmap.Save((Join-Path $publicDirectory 'logo.png'), [System.Drawing.Imaging.ImageFormat]::Png) }
  $bitmap.Dispose()
}

$iconBitmap = New-LogoBitmap 64
$stream = [System.IO.MemoryStream]::new()
$iconBitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $stream.ToArray()
$iconPath = Join-Path $publicDirectory 'favicon.ico'
$fileStream = [System.IO.File]::Open($iconPath, [System.IO.FileMode]::Create)
$writer = [System.IO.BinaryWriter]::new($fileStream)
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]1)
$writer.Write([byte]64); $writer.Write([byte]64); $writer.Write([byte]0); $writer.Write([byte]0)
$writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$pngBytes.Length); $writer.Write([uint32]22)
$writer.Write($pngBytes)
$writer.Dispose(); $fileStream.Dispose(); $stream.Dispose(); $iconBitmap.Dispose()
