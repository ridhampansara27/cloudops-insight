"""Central policy for passwords assigned to new credentials."""

PASSWORD_MIN_LENGTH = 12
PASSWORD_MAX_LENGTH = 128


def validate_new_password(password: str) -> str:
    """Validate a password before assigning it as a new credential."""

    if not PASSWORD_MIN_LENGTH <= len(password) <= PASSWORD_MAX_LENGTH:
        raise ValueError("Password does not meet the required security policy.")

    has_lowercase = any(character.islower() for character in password)

    has_uppercase = any(character.isupper() for character in password)

    has_number = any(character.isdigit() for character in password)

    has_special = any(
        not character.isalnum() and not character.isspace() for character in password
    )

    if not all(
        (
            has_lowercase,
            has_uppercase,
            has_number,
            has_special,
        )
    ):
        raise ValueError("Password does not meet the required security policy.")

    return password
