param(
  [string]$Sdk=$env:ANDROID_SDK_ROOT,
  [string]$Jdk=$env:JAVA_HOME,
  [string]$Keystore,
  [switch]$DevelopmentV2,
  [switch]$LegacyMvp,
  [switch]$KeepBuildFiles
)
$ErrorActionPreference='Stop'
if($DevelopmentV2 -and $LegacyMvp){throw 'Choose either -DevelopmentV2 or -LegacyMvp, not both.'}
$buildV2 = -not $LegacyMvp
$root=$PSScriptRoot
if(-not $Sdk){$Sdk=$env:ANDROID_HOME}
if(-not $Sdk -or -not (Test-Path -LiteralPath $Sdk -PathType Container)){throw 'Android SDK not found. Set ANDROID_SDK_ROOT or pass -Sdk.'}
if(-not $Jdk -or -not (Test-Path -LiteralPath $Jdk -PathType Container)){throw 'JDK not found. Set JAVA_HOME or pass -Jdk.'}
$bt=Join-Path $Sdk 'build-tools\36.0.0'
$jarAndroid=Join-Path $Sdk 'platforms\android-35\android.jar'
$aapt=Join-Path $bt 'aapt2.exe';$align=Join-Path $bt 'zipalign.exe';$d8=Join-Path $bt 'lib\d8.jar';$signer=Join-Path $bt 'lib\apksigner.jar'
$java="$Jdk\bin\java.exe";$javac="$Jdk\bin\javac.exe";$jar="$Jdk\bin\jar.exe";$keytool="$Jdk\bin\keytool.exe"
foreach($tool in @($jarAndroid,$aapt,$align,$d8,$signer,$java,$javac,$jar,$keytool)){
  if(-not (Test-Path -LiteralPath $tool -PathType Leaf)){throw "Required build tool missing: $tool"}
}
if($Keystore -and -not (Test-Path -LiteralPath $Keystore -PathType Leaf)){throw "Signing keystore not found: $Keystore"}
function Run([string]$exe,[string[]]$arglist){& $exe @arglist;if($LASTEXITCODE -ne 0){throw "$exe failed: $LASTEXITCODE"}}
$b=Join-Path $root ('android\build\'+[guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Force "$b\assets","$b\classes","$b\dex"|Out-Null
try {
if($buildV2){
  foreach($folder in @('v2','engine','story','audio')){Copy-Item (Join-Path $root $folder) (Join-Path "$b\assets" $folder) -Recurse -Force}
}else{Copy-Item "$root\index.html","$root\styles.css","$root\app.js" "$b\assets" -Force}
Copy-Item "$root\assets" "$b\assets\assets" -Recurse -Force
$unsigned="$b\unsigned.apk";$aligned="$b\aligned.apk";$out=if($buildV2){"$root\Alishas-Adventures-DRAFT.apk"}else{"$root\PrincessAdventure-debug.apk"}
Run $aapt @('compile','--dir',"$root\android\res",'-o',"$b\resources.zip")
Run $aapt @('link','-o',$unsigned,'-I',$jarAndroid,'--manifest',"$root\android\AndroidManifest.xml",'-R',"$b\resources.zip",'--min-sdk-version','26','--target-sdk-version','35')
$activity="$root\android\src\com\princessadventure\MainActivity.java"
if($buildV2){$activity="$b\MainActivity.java";$source=Get-Content "$root\android\src\com\princessadventure\MainActivity.java" -Raw;$source=$source.Replace('/assets/index.html','/assets/v2/index.html');[System.IO.File]::WriteAllText($activity,$source,[System.Text.UTF8Encoding]::new($false))}
Run $javac @('--release','8','-encoding','UTF-8','-classpath',$jarAndroid,'-d',"$b\classes",$activity)
Run $jar @('cf',"$b\classes.jar",'-C',"$b\classes",'.')
Run $java @('-cp',$d8,'com.android.tools.r8.D8','--lib',$jarAndroid,'--min-api','26','--output',"$b\dex","$b\classes.jar")
Run $jar @('uf',$unsigned,'-C',"$b\dex",'classes.dex','-C',$b,'assets')
Run $align @('-f','4',$unsigned,$aligned)
$key=if($Keystore){$Keystore}else{Join-Path $root 'android\debug.keystore'}
if(!(Test-Path -LiteralPath $key)){
  Write-Warning 'Creating a new debug signing key. APKs signed with a different key cannot update an existing installation. Keep this key or pass -Keystore.'
  Run $keytool @('-genkeypair','-keystore',$key,'-storepass','android','-keypass','android','-alias','androiddebugkey','-dname','CN=Android Debug,O=Android,C=US','-keyalg','RSA','-keysize','2048','-validity','10000')
}
Run $java @('-jar',$signer,'sign','--ks',$key,'--ks-key-alias','androiddebugkey','--ks-pass','pass:android','--key-pass','pass:android','--out',$out,$aligned)
Run $java @('-jar',$signer,'verify','--verbose',$out)
Write-Output "Built $out"
} finally {
  if(-not $KeepBuildFiles -and (Test-Path -LiteralPath $b -PathType Container)){
    $resolvedBuild=(Resolve-Path -LiteralPath $b).Path
    $resolvedParent=(Resolve-Path -LiteralPath (Join-Path $root 'android\build')).Path
    if((Split-Path -Parent $resolvedBuild) -ne $resolvedParent){throw "Refusing to clean unexpected build path: $resolvedBuild"}
    Remove-Item -LiteralPath $resolvedBuild -Recurse -Force
  }
}
