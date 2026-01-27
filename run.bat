@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "G:\Modding\_Github\mattermost-mobile\android"
call gradlew.bat --stop 2>nul
call gradlew.bat app:installDebug -PreactNativeDevServerPort=8081
if %ERRORLEVEL% EQU 0 (
    adb shell am start -n com.mattermost.rnbeta/.MainActivity
)
