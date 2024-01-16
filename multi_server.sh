#!/bin/bash

start_port=8001
num_servers=14

for ((i=0; i<num_servers; i++)); do
    port=$((start_port + i))
    python server.py --port $port &
done

wait
