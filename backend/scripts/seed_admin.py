"""Seed the explicitly configured development administrator."""

import asyncio
from datetime import UTC, datetime

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models.organization import Organization, OrganizationMembership
from app.repositories.user_repository import UserRepository


async def seed_admin() -> None:
    """Create a verified administrator together with an owner workspace."""

    if not settings.seed_admin_password:
        raise RuntimeError(
            "SEED_ADMIN_PASSWORD must be configured in backend/.env.",
        )

    async with async_session_factory() as session:
        repository = UserRepository(
            session,
        )

        user = await repository.get_by_email(
            settings.seed_admin_email,
        )

        created_user = False

        if user is None:
            user = await repository.create(
                email=settings.seed_admin_email,
                full_name=settings.seed_admin_name,
                password_hash=hash_password(
                    settings.seed_admin_password,
                ),
                role="admin",
                email_verified_at=datetime.now(
                    UTC,
                ),
                # Keep user + workspace creation inside one transaction.
                commit=False,
            )

            created_user = True

        # Reuse an existing active owner workspace when one already exists.
        membership_result = await session.execute(
            select(
                OrganizationMembership,
            )
            .where(
                OrganizationMembership.user_id == user.id,
                OrganizationMembership.role == "owner",
                OrganizationMembership.is_active.is_(True),
            )
            .order_by(
                OrganizationMembership.created_at,
                OrganizationMembership.id,
            )
            .limit(
                1,
            ),
        )

        membership = membership_result.scalar_one_or_none()

        if membership is None:
            workspace_name = (f"{user.full_name or user.email} Workspace")[:160]

            organization = Organization(
                name=workspace_name,
                is_active=True,
            )

            session.add(
                organization,
            )

            await session.flush()

            session.add(
                OrganizationMembership(
                    organization_id=organization.id,
                    user_id=user.id,
                    role="owner",
                    is_active=True,
                ),
            )

            await session.commit()

        elif created_user:
            # Defensive transaction boundary. A newly created user should
            # normally enter the branch above, but never leave it uncommitted.
            await session.commit()

        if created_user:
            print(
                "Created administrator:",
                user.email,
            )

        else:
            print(
                "Administrator already exists:",
                user.email,
            )


if __name__ == "__main__":
    asyncio.run(
        seed_admin(),
    )
