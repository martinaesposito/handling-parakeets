import subprocess
import webbrowser
import time

PORT = 8000

# Avvia il server con "python3 -m http.server 8000"
print(f"Avvio del server su http://localhost:{PORT} ...")
server_process = subprocess.Popen(["python3", "-m", "http.server", str(PORT)])

# Attendere un attimo per assicurarci che il server parta
time.sleep(2)

# Aprire automaticamente il browser alla PWA
webbrowser.open(f"http://localhost:{PORT}/?source=pwa")

# Mantieni il processo in esecuzione
try:
    server_process.wait()
except KeyboardInterrupt:
    print("Arresto del server...")
    server_process.terminate()