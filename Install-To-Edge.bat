@echo off
rem Install/launch the unpacked extension in the default Edge profile.
rem NOTE: close all Edge windows first, otherwise Edge forwards this command to the running instance.

tasklist /FI "IMAGENAME eq msedge.exe" 2>nul | find /I "msedge.exe" >nul
if %errorlevel%==0 (
  echo Edge is still running. Please close all Edge windows and run this script again.
  pause
  exit /b 1
)

set "EXT=%~dp0"
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --load-extension="%EXT%" --no-first-run "edge://extensions"
echo Edge started with the extension loaded.
echo If you want to keep it permanently, click "Load unpacked" in edge://extensions and select this folder.
pause
