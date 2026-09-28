export type MeasurementField = {
  key: string;
  label: string;
};

export function isValidMeasurementValue(value: unknown): value is string | number {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 1 && value <= 120;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return false;

  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 120;
}

export function parseMeasurementValues(
  rawValue: string | undefined,
  fields: MeasurementField[]
): Record<string, string> {
  if (!rawValue) return {};

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const stored = parsed as Record<string, unknown>;
    return Object.fromEntries(fields.flatMap((field) => {
      const value = stored[field.key];
      return typeof value === 'number' && isValidMeasurementValue(value)
        ? [[field.key, String(value)]]
        : [];
    }));
  } catch {
    return {};
  }
}
