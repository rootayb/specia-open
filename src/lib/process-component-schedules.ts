export type ProcessComponentSchedule = {
  label: string;
  startDate: string;
  endDate: string;
  evaluationDate: string;
};

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

function uniqueValues(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = normalizeLabel(value);
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

export function formatProcessComponentEvaluationDate(value?: string | null) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return "";
  }

  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue);
  if (!isoDateMatch) {
    return trimmedValue;
  }

  const [, year, month, day] = isoDateMatch;
  return `${day}/${month}/${year}`;
}

type ParseOptions = {
  fallbackStartDate?: string;
  fallbackEndDate?: string;
  fallbackEvaluationDates?: string[];
};

export function parseProcessComponentSchedules(
  value: unknown,
  options: ParseOptions = {},
): ProcessComponentSchedule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const fallbackStartDate = options.fallbackStartDate?.trim() ?? "";
  const fallbackEndDate = options.fallbackEndDate?.trim() ?? "";
  const fallbackEvaluationDate =
    options.fallbackEvaluationDates?.map((item) => item.trim()).find(Boolean) ??
    formatProcessComponentEvaluationDate(fallbackEndDate);

  const schedules = new Map<string, ProcessComponentSchedule>();

  value.forEach((item) => {
    if (typeof item === "string") {
      const label = item.trim();
      if (!label) {
        return;
      }

      schedules.set(normalizeLabel(label), {
        label,
        startDate: fallbackStartDate,
        endDate: fallbackEndDate,
        evaluationDate: fallbackEvaluationDate,
      });
      return;
    }

    if (!item || typeof item !== "object") {
      return;
    }

    const label = readText(
      (item as Record<string, unknown>).label ??
        (item as Record<string, unknown>).name ??
        (item as Record<string, unknown>).value ??
        (item as Record<string, unknown>).title,
    );

    if (!label) {
      return;
    }

    const startDate = readText((item as Record<string, unknown>).startDate) || fallbackStartDate;
    const endDate = readText((item as Record<string, unknown>).endDate) || fallbackEndDate;
    const evaluationDate =
      readText((item as Record<string, unknown>).evaluationDate) ||
      formatProcessComponentEvaluationDate(endDate) ||
      fallbackEvaluationDate;

    const key = normalizeLabel(label);
    const previous = schedules.get(key);

    schedules.set(key, {
      label,
      startDate: startDate || previous?.startDate || "",
      endDate: endDate || previous?.endDate || "",
      evaluationDate: evaluationDate || previous?.evaluationDate || "",
    });
  });

  return Array.from(schedules.values());
}

export function getProcessComponentLabels(
  value: unknown,
  options: ParseOptions = {},
) {
  return parseProcessComponentSchedules(value, options).map((item) => item.label);
}

export function syncProcessComponentSchedules(
  labels: string[],
  currentSchedules: ProcessComponentSchedule[],
) {
  const existing = new Map(
    currentSchedules.map((item) => [normalizeLabel(item.label), item] as const),
  );

  return uniqueValues(
    labels
      .map((item) => item.trim())
      .filter(Boolean),
  ).map((label) => {
    const previous = existing.get(normalizeLabel(label));
    const endDate = previous?.endDate ?? "";

    return {
      label,
      startDate: previous?.startDate ?? "",
      endDate,
      evaluationDate: formatProcessComponentEvaluationDate(endDate),
    } satisfies ProcessComponentSchedule;
  });
}

export function derivePlanRowDateSummary(schedules: ProcessComponentSchedule[]) {
  const startDates = schedules
    .map((item) => item.startDate.trim())
    .filter(Boolean)
    .sort();
  const endDates = schedules
    .map((item) => item.endDate.trim())
    .filter(Boolean)
    .sort();

  return {
    startDate: startDates[0] ?? "",
    endDate: endDates[endDates.length - 1] ?? "",
    evaluationDates: uniqueValues(
      schedules
        .map((item) => formatProcessComponentEvaluationDate(item.endDate))
        .filter(Boolean),
    ),
  };
}

export function serializeProcessComponentSchedules(
  labels: string[],
  schedules: ProcessComponentSchedule[],
  options: ParseOptions = {},
) {
  const synced = syncProcessComponentSchedules(
    labels,
    schedules.length > 0 ? schedules : parseProcessComponentSchedules(labels, options),
  );

  return synced.map((item) => ({
    label: item.label,
    startDate: item.startDate || options.fallbackStartDate?.trim() || "",
    endDate: item.endDate || options.fallbackEndDate?.trim() || "",
    evaluationDate:
      formatProcessComponentEvaluationDate(item.endDate) ||
      options.fallbackEvaluationDates?.find(Boolean)?.trim() ||
      "",
  }));
}
