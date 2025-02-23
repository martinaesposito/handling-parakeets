#!/bin/bash
echo "Avviando il server Python nella cartella corretta..."

# Vai nella cartella giusta prima di avviare il server
cd /Users/User/Library/CloudStorage/OneDrive-PolitecnicodiMilano/magistrale/secondo-anno/sintesi/group-project/parrocchetti || exit

# Avvia il server e mettilo in background
python3 -m http.server 8000 &

# Aspetta che il server sia pronto
while ! nc -z localhost 8000; do   
  sleep 1
  echo "Aspettando che il server si avvii..."
done

echo "Server attivo! Avviando la PWA installata..."

# Apri direttamente l'app PWA invece del browser
open -a "Handling Parakeets"

echo "PWA avviata in modalità app!"