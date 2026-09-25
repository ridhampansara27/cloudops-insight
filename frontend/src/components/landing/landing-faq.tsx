const faqItems = [
  {
    question: "How does CloudOps Insight access AWS?",
    answer:
      "CloudOps Insight uses a customer-configured cross-account IAM role together with a CloudOps-generated ExternalId so the workspace can validate and synchronize supported AWS data securely.",
  },
  {
    question: "Does CloudOps Insight delete my AWS resources?",
    answer:
      "The current customer integration flow is designed around read-oriented visibility and analysis. Removing a CloudOps integration removes CloudOps-side imported data, not the customer’s AWS resources.",
  },
  {
    question: "What happens if I disconnect AWS?",
    answer:
      "Disconnecting an AWS integration stops normal future synchronization. Previously imported CloudOps data can remain for historical visibility, depending on the lifecycle action you choose.",
  },
  {
    question: "What information can I analyze in CloudOps Insight?",
    answer:
      "The current platform focuses on synchronized AWS inventory, supported CloudWatch monitoring samples, AWS Cost Explorer billing views, resource health context, incidents and recommendations.",
  },
  {
    question: "Can different customers access each other's data?",
    answer:
      "CloudOps Insight workspaces are designed to be tenant-isolated. Final commercial readiness also includes a dedicated tenant-security validation phase.",
  },
  {
    question: "Who is CloudOps Insight for?",
    answer:
      "CloudOps Insight is aimed at cloud engineers, DevOps teams, platform teams and FinOps-aware engineering organizations that want a unified operational command center.",
  },
] as const;

export function LandingFaq() {
  return (
    <div className="mx-auto grid w-full max-w-[340px] gap-3 sm:max-w-none sm:gap-4">
      {faqItems.map((item) => (
        <details
          className="group rounded-3xl border border-border/60 bg-card/45 p-6"
          key={item.question}
        >
          <summary className="cursor-pointer list-none text-left">
            <div className="flex items-center justify-between gap-4">
              <span className="text-base font-semibold">
                {item.question}
              </span>

              <span className="text-cyan-300 transition group-open:rotate-45">
                +
              </span>
            </div>
          </summary>

          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}