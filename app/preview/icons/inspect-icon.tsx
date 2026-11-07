export function InspectIcon({ preview }: { preview: boolean }) {
  return (
<svg
              aria-hidden="true"
              width="24"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {preview ? (
                <>
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              ) : (
                <>
                  <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" />
                </>
              )}
            </svg>
  );
}
