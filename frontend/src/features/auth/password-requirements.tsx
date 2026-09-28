import {
  Check,
  Circle,
} from "lucide-react";

import {
  getPasswordRequirementState,
} from "@/features/auth/password-policy";


interface PasswordRequirementsProps {
  password: string;
  advisory?: boolean;
}


export function PasswordRequirements({
  password,
  advisory = false,
}: PasswordRequirementsProps) {
  const state =
    getPasswordRequirementState(password);

  const requirements = [
    {
      label: "12-128 characters",
      satisfied: state.length,
    },
    {
      label: "At least one lowercase letter",
      satisfied: state.lowercase,
    },
    {
      label: "At least one uppercase letter",
      satisfied: state.uppercase,
    },
    {
      label: "At least one number",
      satisfied: state.number,
    },
    {
      label: "At least one special character (not whitespace)",
      satisfied: state.special,
    },
  ];

  return (
    <div
      className="rounded-xl border border-border/60 bg-card/25 p-3.5"
    >
      <p className="text-xs font-semibold text-foreground">
        {advisory
          ? "New account password requirements"
          : "Password requirements"}
      </p>

      {advisory && (
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          These rules apply only if this invitation creates a new account.
          If you already have a CloudOps account, enter your current password
          even if it was created under an older password policy.
        </p>
      )}

      <ul
        aria-live="polite"
        className="mt-3 grid gap-2 sm:grid-cols-2"
      >
        {requirements.map(
          (requirement) => (
            <li
              className={
                requirement.satisfied
                  ? "flex items-start gap-2 text-xs text-emerald-300"
                  : "flex items-start gap-2 text-xs text-muted-foreground"
              }
              key={requirement.label}
            >
              {requirement.satisfied
                ? (
                    <Check className="mt-0.5 size-3.5 shrink-0" />
                  )
                : (
                    <Circle className="mt-0.5 size-3.5 shrink-0" />
                  )}

              <span>
                {requirement.label}
              </span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
