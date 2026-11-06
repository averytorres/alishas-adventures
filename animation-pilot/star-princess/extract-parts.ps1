$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = $PSScriptRoot
$sheet = [System.Drawing.Bitmap]::new((Join-Path $root 'parts-sheet-TEMP.png'))
try {
  $parts = @{
    'body-TEMP.png'         = @(38, 0, 620, 1018)
    'arm-down-TEMP.png'     = @(645, 130, 385, 280)
    'arm-wave-TEMP.png'     = @(1120, 72, 295, 310)
    'hair-front-TEMP.png'   = @(860, 375, 355, 270)
    'eyes-open-TEMP.png'    = @(755, 667, 284, 113)
    'eyes-closed-TEMP.png'  = @(1090, 667, 290, 113)
    'mouth-closed-TEMP.png' = @(700, 808, 165, 127)
    'mouth-narrow-TEMP.png' = @(868, 808, 160, 127)
    'mouth-wide-TEMP.png'   = @(1020, 808, 158, 127)
    'mouth-round-TEMP.png'  = @(1178, 808, 115, 127)
    'mouth-smile-TEMP.png'  = @(1300, 808, 172, 127)
  }
  foreach ($name in $parts.Keys) {
    $x, $y, $width, $height = $parts[$name]
    $rect = [System.Drawing.Rectangle]::new($x, $y, $width, $height)
    $piece = $sheet.Clone($rect, $sheet.PixelFormat)
    try {
      if ($name -eq 'arm-down-TEMP.png') {
        # A separate hair piece begins at sheet x=860, y=375. Keep the full hand.
        for ($py = 245; $py -lt $piece.Height; $py++) {
          for ($px = 215; $px -lt $piece.Width; $px++) {
            $piece.SetPixel($px, $py, [System.Drawing.Color]::Transparent)
          }
        }
      }
      $piece.Save((Join-Path $root $name), [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally { $piece.Dispose() }
  }
}
finally { $sheet.Dispose() }
