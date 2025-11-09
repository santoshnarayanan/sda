/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // Add any other custom variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
