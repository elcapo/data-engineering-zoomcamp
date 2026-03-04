#!/bin/bash

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NO_COLOR='\033[0m'

TAXI_TYPE=$1
YEAR=$2

# Validación de los argumentos
if [ -z "$TAXI_TYPE" ] || [ -z "$YEAR" ]; then
  printf "${RED}Error:${NO_COLOR} debes indicar el tipo de taxi y el año.\n\n"
  printf "${YELLOW}Uso:${NO_COLOR} %s <taxi_type> <year>\n" "$0"
  printf "${YELLOW}Ejemplo:${NO_COLOR} %s yellow 2020\n" "$0"
  exit 1
fi

printf "${GREEN}✔ Iniciando descarga para taxi '%s' del año %s${NO_COLOR}\n\n" "$TAXI_TYPE" "$YEAR"

for MONTH in {1..12}; do
  FORMATTED_MONTH=$(printf "%02d" ${MONTH})
  FILENAME="${TAXI_TYPE}_tripdata_${YEAR}-${FORMATTED_MONTH}.csv.gz"

  DOWNLOAD_BASEURL="https://github.com/DataTalksClub/nyc-tlc-data/releases/download"
  DOWNLOAD_URL="${DOWNLOAD_BASEURL}/${TAXI_TYPE}/${FILENAME}"

  LOCAL_PATH="data/raw/${TAXI_TYPE}"
  TARGET_FILENAME="${LOCAL_PATH}/${FILENAME}"
  TEMP_FILE="${TARGET_FILENAME}.tmp"

  mkdir -p "${LOCAL_PATH}"

  if [ -f "${TARGET_FILENAME}" ]; then
    printf "${YELLOW}↷ Ya existe:${NO_COLOR} %s\n" "${TARGET_FILENAME}"
    continue
  fi

  printf "${BLUE}→ Descargando:${NO_COLOR} %s\n" "$FILENAME"

  if wget -q --show-progress "${DOWNLOAD_URL}" -O "${TEMP_FILE}"; then
    mv "${TEMP_FILE}" "${TARGET_FILENAME}"
    printf "${GREEN}✔ Guardado en:${NO_COLOR} %s\n" "${TARGET_FILENAME}"
  else
    rm -f "${TEMP_FILE}"
    printf "${YELLOW}⚠ No existe:${NO_COLOR} %s\n" "$FILENAME"
  fi
done

printf "\n${GREEN}✔ Proceso finalizado.${NO_COLOR}\n"