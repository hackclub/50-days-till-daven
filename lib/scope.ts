// /global shows every haven, or only the ones in the US.
export type Scope = "world" | "us";

export const inScope = (country: string, scope: Scope) => scope === "world" || country === "United States";
