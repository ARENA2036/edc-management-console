from fastapi import Depends, HTTPException
from auth.keycloak_config import keycloak_openid
from auth.models import AuthenticatedUser


def require_roles(required_roles: list[str]):
    async def role_checker(
        user: AuthenticatedUser = Depends(keycloak_openid.get_current_user)
    ):
        user_roles = user.roles

        if not any(role in user_roles for role in required_roles):
            raise HTTPException(status_code=403, detail="Forbidden")

        return user

    return role_checker


# Optional shortcuts
def require_admin():
    return require_roles(["Admin"])

def require_creator():
    return require_roles(["Creator", "Admin"])

def require_user():
    return require_roles(["User", "Creator", "Admin"])