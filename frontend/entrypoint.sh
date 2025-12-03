#!/bin/bash

ROOT_DIR=/usr/share/nginx/html

echo "Replacing docker environment constants in JavaScript files"

for file in $ROOT_DIR/assets/index-*.js* $ROOT_DIR/index.html;
do
	echo "Processing $file ...";
	sed -i 's|__BACKEND_URL__|'${VITE_API_BASE_URL}'|g' $file
	sed -i 's|__API_KEY__|'${VITE_API_KEY}'|g' $file
	sed -i 's|__EDC_HOSTNAME__|'${EDC_HOSTNAME}'|g' $file
	sed -i 's|__KEYCLOAK_URL__|'${VITE_KEYCLOAK_URL}'|g' $file
	sed -i 's|__KEYCLOAK_REALM__|'${VITE_KEYCLOAK_REALM}'|g' $file
	sed -i 's|__KEYCLOAK_CLIENT_ID__|'${VITE_KEYCLOAK_CLIENT_ID}'|g' $file
	sed -i 's|__SDE_URL__|'${VITE_SDE_URL}'|g' $file
done

exec "$@"

# cat <<EOF > /usr/share/nginx/html/config.js
# window.__RUNTIME_CONFIG__ = {
#   apiUrl: "${VITE_API_BASE_URL}",
#   apiKey: "${VITE_API_KEY}",
#   edcHost: "${EDC_HOSTNAME}",
#   keycloakUrl: "${VITE_KEYCLOAK_URL}",
#   realm: "${VITE_KEYCLOAK_REALM}",
#   clientId: "${VITE_KEYCLOAK_CLIENT_ID}"
# };
# EOF

# exec "$@"