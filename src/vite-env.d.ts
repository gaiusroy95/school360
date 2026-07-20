/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEMO_VERSION?: string;
  readonly VITE_DEMO_VERSION?: string;
  readonly GEMINI_API_KEY?: string;
  readonly APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
