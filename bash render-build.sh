#!/usr/bin/env bash
# Instalar dependencias del sistema necesarias
apt-get update
apt-get install -y python3 make build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Ahora sí, instalar los paquetes de Node
npm install
