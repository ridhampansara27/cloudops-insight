import {
  Link,
} from "react-router-dom";

import {
  cn,
} from "@/lib/utils";


interface LegalFooterProps {
  className?: string;

  compact?: boolean;
}


const legalLinks = [
  {
    label: "Privacy",
    href: "/privacy",
  },
  {
    label: "Terms",
    href: "/terms",
  },
  {
    label: "Impressum",
    href: "/impressum",
  },
  {
    label: "Contact",
    href: "/contact",
  },
] as const;


export function LegalFooter({
  className,
  compact = false,
}: LegalFooterProps) {
  return (
    <footer
      className={cn(
        "text-xs text-muted-foreground",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-2",
          !compact &&
            "justify-between",
        )}
      >
        {!compact && (
          <p>
            © 2026 CloudOps Insight
          </p>
        )}

        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
        >
          {legalLinks.map(
            (item) => (
              <Link
                className="transition-colors hover:text-foreground"
                key={item.href}
                to={item.href}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}
