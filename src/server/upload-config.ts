export function netlifyUploadsEnabled() {
  return !!(
    process.env.NETLIFY ||
    process.env.NETLIFY_BLOBS_CONTEXT ||
    (globalThis as typeof globalThis & { netlifyBlobsContext?: string })
      .netlifyBlobsContext
  );
}
export function uploadsEnabled() {
  return netlifyUploadsEnabled() || process.env.NODE_ENV === "development";
}
