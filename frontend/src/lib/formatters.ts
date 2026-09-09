// Convert an API monetary value into a normal JavaScript number.
export function toNumber(
  // Accept numbers as well as strings because Decimal API values can be serialized as strings.
  value: number | string,
): number {
  // Convert the supplied value into a JavaScript number.
  const parsedValue = Number(value);

  // Return zero when the API value cannot be converted safely.
  return Number.isFinite(parsedValue)
    ? parsedValue
    : 0;
}


// Format a monetary amount using the currency returned by the backend.
export function formatCurrency(
  // Receive the numeric monetary amount.
  value: number,

  // Use USD when the backend does not explicitly provide another currency.
  currency = "USD",
): string {
  // Normalize sub-cent values so tiny AWS adjustments never
  // appear as confusing values such as "-0,00 $".
  const displayValue =
    Math.abs(value) < 0.005
      ? 0
      : value;

  // Create a localized currency representation.
  return new Intl.NumberFormat(
    "de-DE",
    {
      // Display the number as currency.
      style: "currency",

      // Use the backend-provided billing currency.
      currency,
    },
  ).format(displayValue);
}


// Format provider billing records while preserving visible
// evidence of genuine non-zero sub-cent activity.
export function formatBillingAmount(
  value: number,
  currency = "USD",
): string {
  // Keep genuine zero as normal currency.
  if (value === 0) {
    return formatCurrency(
      0,
      currency,
    );
  }

  // Express positive/negative sub-cent activity without
  // pretending it is exactly zero.
  if (
    Math.abs(
      value,
    ) < 0.01
  ) {
    const oneCent =
      formatCurrency(
        0.01,
        currency,
      );

    return value > 0
      ? `< ${oneCent}`
      : `Credit < ${oneCent}`;
  }

  return formatCurrency(
    value,
    currency,
  );
}


// Format very small billing values for charts without hiding
// genuine AWS micro-cost activity behind two-decimal rounding.
export function formatChartCurrency(
  value: number,
  currency = "USD",
): string {
  // Keep genuine zero consistent with the normal application formatter.
  if (value === 0) {
    return formatCurrency(
      0,
      currency,
    );
  }

  // Inspect the magnitude so small AWS billing records receive
  // enough decimal places to remain visually distinguishable.
  const absoluteValue =
    Math.abs(
      value,
    );

  // Use progressively greater precision for smaller values.
  const maximumFractionDigits =
    absoluteValue >= 1
      ? 2
      : absoluteValue >= 0.01
        ? 4
        : absoluteValue >= 0.0001
          ? 6
          : 8;

  // Preserve normal two-decimal currency presentation for values
  // of at least one currency unit.
  const minimumFractionDigits =
    absoluteValue >= 1
      ? 2
      : 0;

  return new Intl.NumberFormat(
    "de-DE",
    {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    },
  ).format(
    value,
  );
}


// Format an ISO timestamp for the application UI.
export function formatTimestamp(
  // Allow nullable API timestamps.
  value: string | null | undefined,
): string {
  // Return a friendly value when no timestamp exists.
  if (!value) {
    return "Never";
  }

  // Convert the ISO timestamp into a JavaScript date.
  const date = new Date(value);

  // Protect the UI from invalid date values.
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  // Return localized date and time information.
  return new Intl.DateTimeFormat(
    "de-DE",
    {
      // Display the date.
      dateStyle: "medium",

      // Display the time.
      timeStyle: "short",
    },
  ).format(date);
}
