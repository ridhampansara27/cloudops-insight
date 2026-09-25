import type {
  ReactNode,
} from "react";

import {
  ArrowLeft,
  CloudCog,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  LegalFooter,
} from "@/components/legal/legal-footer";


const CONTACT_EMAIL =
  "support@cloudopsinsight.tech";

const LAST_UPDATED =
  "24 September 2026";


interface LegalPageShellProps {
  eyebrow: string;

  title: string;

  description: string;

  children: ReactNode;
}


function LegalPageShell({
  eyebrow,
  title,
  description,
  children,
}: LegalPageShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[5%] top-0 size-[28rem] rounded-full bg-cyan-500/[0.05] blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-[5%] size-[30rem] rounded-full bg-violet-500/[0.045] blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-4xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            className="inline-flex items-center gap-3"
            to="/"
          >
            <span className="flex size-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300">
              <CloudCog className="size-5" />
            </span>

            <span>
              <span className="block text-sm font-semibold">
                CloudOps Insight
              </span>

              <span className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Legal information
              </span>
            </span>
          </Link>

          <Link
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            to="/"
          >
            <ArrowLeft className="size-4" />
            Back to CloudOps Insight
          </Link>
        </header>

        <article className="overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="border-b border-border/50 p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              {eyebrow}
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              {description}
            </p>

            <p className="mt-4 text-xs text-muted-foreground">
              Last updated: {LAST_UPDATED}
            </p>
          </div>

          <div className="space-y-10 p-6 sm:p-8 lg:p-10">
            {children}
          </div>
        </article>

        <LegalFooter className="mt-6 border-t border-border/50 pt-5" />
      </div>
    </main>
  );
}


interface LegalSectionProps {
  title: string;

  children: ReactNode;
}


function LegalSection({
  title,
  children,
}: LegalSectionProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">
        {title}
      </h2>

      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}


function ContactEmail() {
  return (
    <a
      className="font-medium text-cyan-300 transition-colors hover:text-cyan-200"
      href={`mailto:${CONTACT_EMAIL}`}
    >
      {CONTACT_EMAIL}
    </a>
  );
}


export function PrivacyPage() {
  return (
    <LegalPageShell
      description="This notice explains how CloudOps Insight handles personal data and cloud integration data."
      eyebrow="Data protection"
      title="Privacy Policy"
    >
      <LegalSection title="1. Controller">
        <p>
          CloudOps Insight is currently operated by
          {" "}
          <strong className="text-foreground">
            Ridham Pansara
          </strong>
          {" "}
          as an individual operator and student project.
        </p>

        <p>
          Postal address:
          <br />
          Luisenstr. 2
          <br />
          76137 Karlsruhe
          <br />
          Germany
        </p>

        <p>
          Email:
          {" "}
          <ContactEmail />
        </p>
      </LegalSection>

      <LegalSection title="2. Data CloudOps Insight may process">
        <p>
          Depending on how you use the service, CloudOps Insight may
          process account information such as your name and email
          address, authentication and security metadata, workspace
          membership and invitation information, and password hashes.
        </p>

        <p>
          When you connect AWS, the service may process integration
          metadata such as AWS account identifiers, role configuration,
          regions and synchronization state.
        </p>

        <p>
          CloudOps Insight may also import cloud inventory, resource
          metadata, tags, cost information, metrics, incidents and
          recommendations for the workspace that owns the integration.
        </p>

        <p>
          Infrastructure and security logs may contain technical
          information such as request timestamps, IP addresses, user
          agents and error information where produced by the hosting,
          security or application infrastructure.
        </p>
      </LegalSection>

      <LegalSection title="3. Why we process data">
        <p>
          Data is processed to provide accounts and workspaces,
          authenticate users, connect requested cloud integrations,
          synchronize cloud information, operate monitoring and FinOps
          functionality, provide transactional email, prevent abuse
          and protect the security of the service.
        </p>

        <p>
          Depending on the processing activity, the legal basis may
          include performance of a requested service or contract,
          legitimate interests in operating and securing CloudOps
          Insight, compliance with legal obligations, or consent where
          consent is specifically requested.
        </p>
      </LegalSection>

      <LegalSection title="4. Service providers">
        <p>
          CloudOps Insight currently relies on infrastructure and
          service providers that may process data on behalf of the
          project, including Oracle Cloud Infrastructure for hosting,
          Cloudflare for network, DNS, security and email-routing
          services, and Resend for transactional email.
        </p>

        <p>
          AWS APIs are accessed only for cloud integrations configured
          by the relevant workspace. Processing by third-party
          providers remains subject to their respective contractual
          and data-protection arrangements.
        </p>
      </LegalSection>

      <LegalSection title="5. International processing">
        <p>
          Some service providers may operate infrastructure or support
          functions outside the European Economic Area. Where legally
          required, appropriate transfer safeguards must be used.
        </p>
      </LegalSection>

      <LegalSection title="6. Retention and deletion">
        <p>
          Account and workspace data is retained while needed to
          operate the requested service, subject to security,
          operational and legal requirements.
        </p>

        <p>
          Disconnecting an AWS integration stops normal future access
          while allowing imported history to remain in CloudOps
          Insight. Permanently removing an AWS integration deletes the
          integration and its imported CloudOps data according to the
          account-lifecycle controls provided by the application.
        </p>

        <p>
          Users can also request or perform CloudOps account deletion
          subject to shared-workspace ownership protections. Limited
          backup or security-log retention may still apply where
          technically or legally necessary.
        </p>
      </LegalSection>

      <LegalSection title="7. Authentication technologies">
        <p>
          CloudOps Insight uses authentication and session technology
          required to keep users signed in and protect accounts.
          Authentication cookies are not used for advertising.
        </p>
      </LegalSection>

      <LegalSection title="8. Your rights">
        <p>
          Depending on applicable data-protection law, you may have
          rights to access, correct, delete or restrict processing of
          your personal data, object to certain processing, request
          portability, withdraw consent where processing relies on
          consent, and lodge a complaint with a competent supervisory
          authority.
        </p>

        <p>
          Contact
          {" "}
          <ContactEmail />
          {" "}
          for privacy-related requests.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to this notice">
        <p>
          This privacy notice may be updated as CloudOps Insight and
          its processing activities change. Material changes should be
          reflected on this page before the affected functionality is
          introduced or materially changed.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}


export function TermsPage() {
  return (
    <LegalPageShell
      description="These terms describe the basic rules for using CloudOps Insight."
      eyebrow="Service terms"
      title="Terms of Use"
    >
      <LegalSection title="1. Service status">
        <p>
          CloudOps Insight is currently operated as a student-built
          service by Ridham Pansara. The service is currently offered
          without a paid subscription and without a service-level
          agreement unless expressly agreed otherwise.
        </p>
      </LegalSection>

      <LegalSection title="2. Accounts and workspaces">
        <p>
          You are responsible for providing accurate account
          information, protecting your credentials and maintaining
          appropriate workspace membership and ownership.
        </p>

        <p>
          You must not attempt to access another customer's workspace,
          cloud account or data without authorization.
        </p>
      </LegalSection>

      <LegalSection title="3. AWS integrations">
        <p>
          You are responsible for the AWS account, IAM role and
          permissions that you choose to connect to CloudOps Insight.
          Do not grant permissions broader than those required for the
          features you intend to use.
        </p>

        <p>
          Removing an integration from CloudOps Insight removes
          CloudOps-side integration and imported data as described by
          the product. It does not delete resources from your AWS
          account.
        </p>
      </LegalSection>

      <LegalSection title="4. Acceptable use">
        <p>
          You may not use CloudOps Insight to violate law, compromise
          systems without authorization, interfere with the service,
          bypass tenant or security controls, distribute malware, or
          attempt to obtain another user's credentials or data.
        </p>
      </LegalSection>

      <LegalSection title="5. Availability">
        <p>
          CloudOps Insight is an evolving student-built service.
          Features may change, become temporarily unavailable, contain
          defects or be discontinued. No uptime or support-response
          guarantee is currently provided unless expressly agreed
          otherwise.
        </p>
      </LegalSection>

      <LegalSection title="6. Data and account lifecycle">
        <p>
          CloudOps Insight provides controls to disconnect cloud
          integrations, permanently remove imported integration data
          and delete CloudOps user accounts. Shared-workspace data may
          remain when required to protect other workspace members and
          ownership continuity.
        </p>
      </LegalSection>

      <LegalSection title="7. Intellectual property">
        <p>
          CloudOps Insight software, branding and original interface
          materials remain protected by applicable intellectual
          property law. These terms do not transfer ownership of the
          service or its source code.
        </p>
      </LegalSection>

      <LegalSection title="8. Liability">
        <p>
          CloudOps Insight is an evolving software service. To the
          extent permitted by applicable law, no guarantee is made
          that recommendations, cost information, monitoring results
          or imported cloud information will always be complete,
          current or error-free.
        </p>

        <p>
          Nothing in these terms excludes or limits liability where
          exclusion or limitation is not permitted by applicable law.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes">
        <p>
          These terms may be updated as the service changes. Material
          contractual changes should be communicated appropriately
          before they take effect.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact and applicable law">
        <p>
          Questions about these terms can be sent to
          {" "}
          <ContactEmail />.
        </p>

        <p>
          The project is operated from Germany. Mandatory consumer
          protections and other non-waivable rights remain unaffected.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}


export function ImpressumPage() {
  return (
    <LegalPageShell
      description="Provider information for CloudOps Insight."
      eyebrow="Provider information"
      title="Impressum"
    >

      <LegalSection title="Provider">
        <p>
          <strong className="text-foreground">
            Ridham Pansara
          </strong>
        </p>

        <p>
          Individual operator
          <br />
          CloudOps Insight student project
        </p>

        <p>
          Luisenstr. 2
          <br />
          76137 Karlsruhe
          <br />
          Germany
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Email:
          {" "}
          <ContactEmail />
        </p>
      </LegalSection>

      <LegalSection title="Registration information">
        <p>
          CloudOps Insight is operated by Ridham Pansara as an
          individual operator and is not operated through a registered
          company.
        </p>

        <p>
          No commercial-register entry and no VAT identification
          number are currently held for CloudOps Insight.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}


export function ContactPage() {
  return (
    <LegalPageShell
      description="Contact CloudOps Insight for product support, privacy requests or responsible security reports."
      eyebrow="Get in touch"
      title="Contact"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background/30 p-5">
          <Mail className="size-5 text-cyan-300" />

          <h2 className="mt-4 font-semibold">
            General support
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Questions about your account, workspace or CloudOps
            features.
          </p>

          <p className="mt-4 text-sm">
            <ContactEmail />
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/30 p-5">
          <ShieldCheck className="size-5 text-emerald-300" />

          <h2 className="mt-4 font-semibold">
            Privacy and security
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use the same contact address for privacy requests or
            responsible security reports.
          </p>

          <p className="mt-4 text-sm">
            <ContactEmail />
          </p>
        </div>
      </div>

      <LegalSection title="Security reports">
        <p>
          If you believe you found a security vulnerability, describe
          the affected feature and enough reproduction information for
          the issue to be investigated.
        </p>

        <p>
          Do not email AWS access keys, passwords, private keys,
          refresh tokens or other live credentials.
        </p>
      </LegalSection>

      <LegalSection title="Operator">
        <p>
          CloudOps Insight is currently operated by
          {" "}
          <strong className="text-foreground">
            Ridham Pansara
          </strong>
          {" "}
          as an individual student project.
        </p>

        <p>
          Luisenstr. 2
          <br />
          76137 Karlsruhe
          <br />
          Germany
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
