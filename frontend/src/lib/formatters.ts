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