@echo off

for /L %%i in (8001,1,8014) do (
    start "Server %%i" py server.py --port %%i
)
