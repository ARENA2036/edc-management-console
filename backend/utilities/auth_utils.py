def get_oauth2_token(oauth_config: dict) -> str:
    """Fetch OAuth2 access token using client credentials"""
    import requests

    token_url = oauth_config.get("accessTokenUrl")
    client_id = oauth_config.get("clientId")
    client_secret = oauth_config.get("clientSecret")
    scope = oauth_config.get("scope", "openid")
    client_auth = oauth_config.get("clientAuth", "basic")

    data = {"grant_type": "client_credentials", "scope": scope}

    if client_auth == "basic":
        # Basic Auth Header
        response = requests.post(
            token_url,
            data=data,
            auth=(client_id, client_secret)
        )
    else:
        # Credentials im Body
        data["client_id"] = client_id
        data["client_secret"] = client_secret
        response = requests.post(token_url, data=data)

    return response.json()["access_token"]