"""Authenticated customer support ticket endpoints."""

import logging
import re
from datetime import (
    UTC,
    datetime,
)
from uuid import uuid4

from fastapi import (
    APIRouter,
    HTTPException,
    Request,
    status,
)

from app.api.dependencies import (
    CurrentTenant,
    CurrentUser,
    DatabaseSession,
)
from app.models.organization import Organization
from app.schemas.support import (
    SupportTicketCreate,
    SupportTicketResponse,
)
from app.services.auth_email_service import (
    AuthEmailService,
    SupportEmailDeliveryError,
    VerificationEmailConfigurationError,
)
from app.services.rate_limit_service import (
    limit_support_ticket,
)

logger = logging.getLogger(
    __name__,
)


router = APIRouter()


# Reject a narrow set of unmistakable credential formats.
#
# This is intentionally conservative: it catches obvious secrets without
# attempting to inspect or retain arbitrary customer text as "credentials".
_OBVIOUS_SECRET_PATTERN = re.compile(
    r"""
    (
        \b(?:AKIA|ASIA)[A-Z0-9]{16}\b
        |
        -----BEGIN[ ](?:RSA[ ]|EC[ ]|OPENSSH[ ])?PRIVATE[ ]KEY-----
        |
        aws_secret_access_key\s*[:=]
        |
        authorization\s*:\s*bearer\s+\S+
    )
    """,
    re.IGNORECASE | re.VERBOSE,
)


@router.post(
    "/tickets",
    response_model=SupportTicketResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_support_ticket(
    payload: SupportTicketCreate,
    request: Request,
    current_user: CurrentUser,
    tenant: CurrentTenant,
    session: DatabaseSession,
) -> SupportTicketResponse:
    """Email one tenant-bound support request to the support inbox."""

    await limit_support_ticket(
        request,
        user_id=current_user.id,
        organization_id=tenant.organization_id,
    )

    combined_text = payload.subject + "\n" + payload.message

    if _OBVIOUS_SECRET_PATTERN.search(
        combined_text,
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Remove credentials or secret material before "
                "submitting a support request."
            ),
        )

    organization = await session.get(
        Organization,
        tenant.organization_id,
    )

    if organization is None or not organization.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    submitted_at = datetime.now(
        UTC,
    )

    ticket_id = (
        "SUP-"
        + submitted_at.strftime(
            "%Y%m%d",
        )
        + "-"
        + uuid4().hex[:8].upper()
    )

    try:
        await AuthEmailService().send_support_ticket(
            ticket_id=ticket_id,
            category=payload.category,
            subject=payload.subject,
            support_message=payload.message,
            user_name=current_user.full_name,
            user_email=current_user.email,
            user_id=str(
                current_user.id,
            ),
            organization_name=organization.name,
            organization_id=str(
                organization.id,
            ),
            organization_role=tenant.role,
            submitted_at=submitted_at,
        )

    except VerificationEmailConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Support email delivery is currently unavailable.",
        ) from error

    except SupportEmailDeliveryError as error:
        logger.exception(
            "Support ticket email delivery failed.",
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=("Support ticket could not be delivered. Please try again shortly."),
        ) from error

    return SupportTicketResponse(
        ticket_id=ticket_id,
        submitted_at=submitted_at,
    )
