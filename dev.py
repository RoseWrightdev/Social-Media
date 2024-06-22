import os
import subprocess
import sys
import threading

import psutil

def handle_output(process, identifier):
    colors = {
        "Go  ": "\033[94m",  # Blue
        "Next": "\033[92m",  # Green
    }
    reset_color = "\033[0m"  # Resets the color to default

    color = colors.get(identifier, "\033[0m")

    for line in iter(process.stdout.readline, ''):
        if line:
            sys.stdout.write(f"{color}{identifier}:{reset_color} {line}")
        else:
            break
    process.stdout.close()

def start_processes():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    pids_dir = os.path.join(base_dir, 'pids')

    if not os.path.exists(pids_dir):
        os.makedirs(pids_dir)

    # Start the Go server and handle its output in a separate thread
    os.chdir(os.path.join(base_dir, 'backend/go'))
    go = subprocess.Popen(["go", "run", "."], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True, bufsize=1)
    go_thread = threading.Thread(target=handle_output, args=(go, "Go  "))
    go_thread.start()

    with open(os.path.join(pids_dir, 'go.pid'), 'w') as f:
        f.write(str(go.pid))

    # Start the Next.js development server and handle its output in a separate thread
    os.chdir(os.path.join(base_dir, "frontend"))
    next_process = subprocess.Popen(["C:\\Program Files\\nodejs\\npm.cmd", "run", "dev"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True, bufsize=1)
    next_thread = threading.Thread(target=handle_output, args=(next_process, "Next"))
    next_thread.start()

    go_thread.join()
    next_thread.join()

def stop_processes():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    pids_dir = os.path.join(base_dir, 'pids')

    for pid_file in os.listdir(pids_dir):
        with open(os.path.join(pids_dir, pid_file), 'r') as f:
            pid = int(f.read().strip())
            try:
                process = psutil.Process(pid)
                process.terminate()
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                print(f"Process {pid} could not be terminated.")
        os.remove(os.path.join(pids_dir, pid_file))

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "stop":
        stop_processes()
    else:
        start_processes()