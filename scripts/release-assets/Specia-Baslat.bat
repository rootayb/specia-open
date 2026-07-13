@echo off
rem Specia Open baslatici (Windows) - cift tiklayinca uygulamayi acar.
setlocal enabledelayedexpansion
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js bulunamadi.
  echo Lutfen https://nodejs.org adresinden LTS surumunu kurun ve tekrar deneyin.
  pause
  exit /b 1
)

if not exist veri mkdir veri

rem Ilk calistirma: mufredat yuklu bos veritabanini kopyala.
if not exist veri\specia.db (
  copy /y uygulama\veritabani-sablonu.db veri\specia.db >nul
  echo Yeni veritabani olusturuldu.
)

rem Ilk calistirma: rastgele gizli anahtarlari uret.
rem DIKKAT: veri klasorunu silmek = tum verilerin kaybi. Yedeklerinizi bu klasorden alin.
if not exist veri\ayarlar.env (
  node -e "const{randomBytes}=require('node:crypto');const k=()=>randomBytes(32).toString('hex');require('node:fs').writeFileSync('veri/ayarlar.env',`NEXTAUTH_SECRET=${k()}\nDOCUMENT_LINK_SECRET=${k()}\nDB_ENCRYPTION_KEY=${k()}\n`);"
  echo Gizli anahtarlar olusturuldu.
)

rem Ayarlari yukle.
for /f "usebackq tokens=1,* delims==" %%a in ("veri\ayarlar.env") do set "%%a=%%b"

set "DBPATH=%cd%\veri\specia.db"
set "DBPATH=%DBPATH:\=/%"
set "DATABASE_URL=file:%DBPATH%"
set "NEXTAUTH_URL=http://localhost:3000"
set "NEXT_TELEMETRY_DISABLED=1"
set "HOSTNAME=127.0.0.1"
set "PORT=3000"

start "" /b cmd /c "timeout /t 4 >nul && start http://localhost:3000"

echo.
echo Specia Open http://localhost:3000 adresinde calisiyor.
echo KAPATMAK icin bu pencerede Ctrl+C'ye basin veya pencereyi kapatin.
echo.
node uygulama\server.js
pause
