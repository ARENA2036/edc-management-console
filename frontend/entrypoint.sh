#!/bin/bash

ROOT_DIR=/usr/share/nginx/html

echo "Replacing docker environment constants in JavaScript files"

for file in $ROOT_DIR/assets/index-*.js* $ROOT_DIR/index.html;
do
	echo "Processing $file ...";
	sed -i 's|VITE_API_BASE_URL|'${VITE_API_BASE_URL}'|g' $file
	sed -i 's|VITE_API_KEY|'${VITE_API_KEY}'|g' $file
	sed -i 's|EDC_HOSTNAME|'${EDC_HOSTNAME}'|g' $file
	sed -i 's|VITE_KEYCLOAK_URL|'${VITE_KEYCLOAK_URL}'|g' $file
	sed -i 's|VITE_KEYCLOAK_REALM|'${VITE_KEYCLOAK_REALM}'|g' $file
	sed -i 's|VITE_KEYCLOAK_CLIENT_ID|'${VITE_KEYCLOAK_CLIENT_ID}'|g' $file

done

exec "$@"