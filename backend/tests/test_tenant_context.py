from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.dependencies import get_tenant_context
from app.core.tenancy import TenantContext, ensure_tenant_role
from app.models.budget import Budget
from app.models.cloud_account import CloudAccount


class FakeScalarResult:
    def __init__(self, memberships):
        self._memberships = memberships

    def all(self):
        return self._memberships


class FakeExecuteResult:
    def __init__(self, memberships):
        self._memberships = memberships

    def scalars(self):
        return FakeScalarResult(
            self._memberships,
        )


class FakeSession:
    def __init__(self, memberships):
        self._memberships = memberships

    async def execute(self, _statement):
        return FakeExecuteResult(
            self._memberships,
        )


def make_context(
    role: str,
) -> TenantContext:
    user_id = uuid4()

    return TenantContext(
        organization_id=uuid4(),
        membership_id=uuid4(),
        user_id=user_id,
        role=role,
    )


def test_cloud_account_requires_organization_fk() -> None:
    column = CloudAccount.__table__.c.organization_id

    assert column.nullable is False
    assert {foreign_key.target_fullname for foreign_key in column.foreign_keys} == {
        "organizations.id",
    }


def test_budget_requires_organization_fk() -> None:
    column = Budget.__table__.c.organization_id

    assert column.nullable is False
    assert {foreign_key.target_fullname for foreign_key in column.foreign_keys} == {
        "organizations.id",
    }


@pytest.mark.asyncio
async def test_single_membership_resolves_automatically() -> None:
    user_id = uuid4()
    organization_id = uuid4()

    membership = SimpleNamespace(
        id=uuid4(),
        organization_id=organization_id,
        role="admin",
    )

    context = await get_tenant_context(
        current_user=SimpleNamespace(
            id=user_id,
        ),
        session=FakeSession(
            [
                membership,
            ]
        ),
        x_organization_id=None,
    )

    assert context.user_id == user_id
    assert context.organization_id == organization_id
    assert context.role == "admin"


@pytest.mark.asyncio
async def test_user_without_membership_is_rejected() -> None:
    with pytest.raises(
        HTTPException,
    ) as error:
        await get_tenant_context(
            current_user=SimpleNamespace(
                id=uuid4(),
            ),
            session=FakeSession(
                [],
            ),
            x_organization_id=None,
        )

    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_multi_organization_user_must_select_tenant() -> None:
    memberships = [
        SimpleNamespace(
            id=uuid4(),
            organization_id=uuid4(),
            role="owner",
        ),
        SimpleNamespace(
            id=uuid4(),
            organization_id=uuid4(),
            role="viewer",
        ),
    ]

    with pytest.raises(
        HTTPException,
    ) as error:
        await get_tenant_context(
            current_user=SimpleNamespace(
                id=uuid4(),
            ),
            session=FakeSession(
                memberships,
            ),
            x_organization_id=None,
        )

    assert error.value.status_code == 400


@pytest.mark.asyncio
async def test_invalid_organization_header_returns_404() -> None:
    with pytest.raises(
        HTTPException,
    ) as error:
        await get_tenant_context(
            current_user=SimpleNamespace(
                id=uuid4(),
            ),
            session=FakeSession(
                [],
            ),
            x_organization_id="not-a-uuid",
        )

    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_unavailable_requested_organization_returns_404() -> None:
    with pytest.raises(
        HTTPException,
    ) as error:
        await get_tenant_context(
            current_user=SimpleNamespace(
                id=uuid4(),
            ),
            session=FakeSession(
                [],
            ),
            x_organization_id=str(
                uuid4(),
            ),
        )

    assert error.value.status_code == 404


def test_owner_passes_admin_level_authorization() -> None:
    context = make_context(
        "owner",
    )

    assert (
        ensure_tenant_role(
            context,
            frozenset(
                {
                    "owner",
                    "admin",
                }
            ),
        )
        == context
    )


def test_viewer_cannot_use_admin_level_authorization() -> None:
    context = make_context(
        "viewer",
    )

    with pytest.raises(
        HTTPException,
    ) as error:
        ensure_tenant_role(
            context,
            frozenset(
                {
                    "owner",
                    "admin",
                }
            ),
        )

    assert error.value.status_code == 403


def test_unknown_configured_role_fails_closed() -> None:
    context = make_context(
        "owner",
    )

    with pytest.raises(
        ValueError,
    ):
        ensure_tenant_role(
            context,
            frozenset(
                {
                    "super-admin-that-does-not-exist",
                }
            ),
        )
