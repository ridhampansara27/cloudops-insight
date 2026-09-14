"""PostgreSQL tests for workspace invitation API boundaries."""

import os
from datetime import (
    UTC,
    datetime,
)
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
)

from app.api.v1 import workspace as workspace_api
from app.core.security import hash_password
from app.models.organization import (
    Organization,
    OrganizationMembership,
)
from app.repositories.user_repository import UserRepository
from app.schemas.workspace import (
    WorkspaceInvitationAcceptRequest,
    WorkspaceInvitationCreate,
)

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)


pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason="TENANT_TEST_DATABASE_URL is required.",
)


class CapturingApiInvitationEmail:
    """SMTP-compatible fake that captures only the test bearer."""

    is_configured = True

    def __init__(
        self,
    ) -> None:
        self.tokens: list[str] = []

    async def send_workspace_invitation(
        self,
        *,
        recipient_email: str,
        token: str,
        organization_name: str,
        role: str,
        inviter_name: str,
    ) -> None:
        del recipient_email
        del organization_name
        del role
        del inviter_name

        self.tokens.append(
            token,
        )


async def _create_user(
    session: AsyncSession,
    *,
    email: str,
    full_name: str,
):
    user = await UserRepository(
        session,
    ).create(
        email=email,
        full_name=full_name,
        password_hash=hash_password(
            "workspace-api-owner-password",
        ),
        email_verified_at=datetime.now(
            UTC,
        ),
        commit=False,
    )

    await session.flush()

    return user


@pytest.mark.asyncio
async def test_invitation_api_issue_list_accept_and_replay(
    monkeypatch,
) -> None:
    """HTTP-boundary functions expose no bearer and preserve one-time use."""

    assert TENANT_TEST_DATABASE_URL is not None

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    async with engine.connect() as connection:
        outer_transaction = await connection.begin()

        session = AsyncSession(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )

        try:
            organization = Organization(
                name="API Invitation Workspace",
                is_active=True,
            )

            session.add(
                organization,
            )

            await session.flush()

            owner = await _create_user(
                session,
                email="workspace-api-owner@example.com",
                full_name="Workspace API Owner",
            )

            membership = OrganizationMembership(
                organization_id=organization.id,
                user_id=owner.id,
                role="owner",
                is_active=True,
            )

            session.add(
                membership,
            )

            await session.commit()

            sender = CapturingApiInvitationEmail()

            monkeypatch.setattr(
                workspace_api,
                "AuthEmailService",
                lambda: sender,
            )

            tenant = SimpleNamespace(
                org_id=organization.id,
                role="owner",
            )

            created = await workspace_api.create_workspace_invitation(
                payload=WorkspaceInvitationCreate(
                    email="new-api-member@example.com",
                    role="member",
                ),
                current_user=owner,
                tenant=tenant,
                session=session,
            )

            assert created.status == "pending"

            created_payload = created.model_dump()

            assert "token" not in created_payload
            assert "token_hash" not in created_payload

            assert (
                len(
                    sender.tokens,
                )
                == 1
            )

            raw_token = sender.tokens[0]

            invitations = await workspace_api.list_workspace_invitations(
                tenant=tenant,
                session=session,
            )

            assert (
                len(
                    invitations,
                )
                == 1
            )

            assert invitations[0].id == created.id

            accepted = await workspace_api.accept_workspace_invitation(
                payload=WorkspaceInvitationAcceptRequest(
                    token=raw_token,
                    full_name="New API Member",
                    password="new-api-member-password",
                ),
                session=session,
            )

            assert accepted.organization_id == organization.id

            assert accepted.email == "new-api-member@example.com"

            assert accepted.role == "member"

            assert accepted.account_created is True

            with pytest.raises(
                HTTPException,
            ) as replay:
                await workspace_api.accept_workspace_invitation(
                    payload=WorkspaceInvitationAcceptRequest(
                        token=raw_token,
                        full_name="Replay User",
                        password="new-api-member-password",
                    ),
                    session=session,
                )

            assert replay.value.status_code == 400

            assert replay.value.detail == (
                "Invitation is invalid, expired, or could not be accepted."
            )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_invitation_api_revoke_is_tenant_scoped(
    monkeypatch,
) -> None:
    """Foreign invitation UUIDs must appear absent to another tenant."""

    assert TENANT_TEST_DATABASE_URL is not None

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    async with engine.connect() as connection:
        outer_transaction = await connection.begin()

        session = AsyncSession(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )

        try:
            organization_a = Organization(
                name="API Tenant A",
                is_active=True,
            )

            organization_b = Organization(
                name="API Tenant B",
                is_active=True,
            )

            session.add_all(
                [
                    organization_a,
                    organization_b,
                ],
            )

            await session.flush()

            owner_b = await _create_user(
                session,
                email="api-owner-b@example.com",
                full_name="API Owner B",
            )

            membership_b = OrganizationMembership(
                organization_id=organization_b.id,
                user_id=owner_b.id,
                role="owner",
                is_active=True,
            )

            session.add(
                membership_b,
            )

            await session.commit()

            sender = CapturingApiInvitationEmail()

            monkeypatch.setattr(
                workspace_api,
                "AuthEmailService",
                lambda: sender,
            )

            tenant_b = SimpleNamespace(
                org_id=organization_b.id,
                role="owner",
            )

            created = await workspace_api.create_workspace_invitation(
                payload=WorkspaceInvitationCreate(
                    email="tenant-b-api@example.com",
                    role="viewer",
                ),
                current_user=owner_b,
                tenant=tenant_b,
                session=session,
            )

            tenant_a = SimpleNamespace(
                org_id=organization_a.id,
                role="owner",
            )

            with pytest.raises(
                HTTPException,
            ) as foreign_revoke:
                await workspace_api.revoke_workspace_invitation(
                    invitation_id=created.id,
                    tenant=tenant_a,
                    session=session,
                )

            assert foreign_revoke.value.status_code == 404

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()
