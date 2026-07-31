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

  $backgroundPath = New-RoundedRectanglePath 2 2 60 60 14
  $background = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f8faf8'))
  $border = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#dfe6e1'), 1)
  $graphics.FillPath($background, $backgroundPath)
  $graphics.DrawPath($border, $backgroundPath)

  $brand = [System.Drawing.ColorTranslator]::FromHtml('#586b61')
  $cornerPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(82, $brand), 2.8)
  $cornerPen.StartCap = $cornerPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($cornerPen, 15, 14, 15, 49)
  $graphics.DrawLine($cornerPen, 15, 49, 50, 49)

  $windPen = [System.Drawing.Pen]::new($brand, 3.2)
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
  $windPen.Color = [System.Drawing.Color]::FromArgb(143, $brand)
  $graphics.DrawLine($windPen, 17, 46, 42, 46)
  $windThree = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $windThree.StartFigure()
  $windThree.AddBezier(42, 46, 48, 46, 51, 49, 51, 53)
  $graphics.DrawPath($windPen, $windThree)

  $dotBorder = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f8faf8'))
  $dot = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#d89454'))
  $graphics.FillEllipse($dotBorder, 10, 9, 10, 10)
  $graphics.FillEllipse($dot, 12, 11, 6, 6)

  $graphics.Dispose()
  $backgroundPath.Dispose(); $background.Dispose(); $border.Dispose(); $cornerPen.Dispose(); $windPen.Dispose()
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
