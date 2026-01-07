/**
 * It's common to check nullable boolean fields as "not equal to true" instead
 * of "equal to false", in order to treat a null field as falsy. This is done
 * in Postgres with `"field" IS NOT TRUE` instead of `"field" <> TRUE`, but
 * unfortunately drizzle always compiles to the latter. This helper can be used
 * to force the correct check.
 */
export const isNotTrue = { OR: [{ isNull: true as const }, { eq: false }] };
