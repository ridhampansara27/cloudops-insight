export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_MAX_LENGTH = 128;


export interface PasswordRequirementState {
  length: boolean;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}


export function getPasswordRequirementState(
  password: string,
): PasswordRequirementState {
  const characters =
    Array.from(password);

  return {
    length:
      password.length >= PASSWORD_MIN_LENGTH &&
      password.length <= PASSWORD_MAX_LENGTH,

    lowercase:
      characters.some(
        (character) =>
          character.toLocaleLowerCase() === character &&
          character.toLocaleUpperCase() !== character,
      ),

    uppercase:
      characters.some(
        (character) =>
          character.toLocaleUpperCase() === character &&
          character.toLocaleLowerCase() !== character,
      ),

    number:
      characters.some(
        (character) =>
          /\p{N}/u.test(character),
      ),

    special:
      characters.some(
        (character) =>
          !/\p{L}|\p{N}|\s/u.test(character),
      ),
  };
}


export function isStrongNewPassword(
  password: string,
): boolean {
  const requirements =
    getPasswordRequirementState(password);

  return (
    requirements.length &&
    requirements.lowercase &&
    requirements.uppercase &&
    requirements.number &&
    requirements.special
  );
}
