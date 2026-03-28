@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64
set "PATH=C:\Program Files\CMake\bin;%PATH%"
echo Installing dlib and face-recognition...
pip install dlib face-recognition
