/**
 * Any structured data object. (The type is generic `object` because `Record<string, unknown>`
 * would enforce that passed data has an index signature, and `Record<string, any>` allows
 * access of arbitrary properties on the data without type checking.)
 */
export type LogStructuredData = object;
