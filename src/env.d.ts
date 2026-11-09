/// <reference types="@rsbuild/core/types" />

// Make import.meta.env strict, so unknown variables are a type error rather than `any`.
interface RsbuildTypeOptions {
  strictImportMetaEnv: true;
}

interface ImportMetaEnv {
  /** "real" sends requests to the real endpoints. Anything else (or unset) uses MSW mocks. */
  readonly PUBLIC_API_MODE?: string;
}
