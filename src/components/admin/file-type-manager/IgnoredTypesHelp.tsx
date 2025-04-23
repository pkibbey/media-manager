type IgnoredTypesHelpProps = {
  showIgnoredTypesHelp: boolean;
  setShowIgnoredTypesHelp: (show: boolean) => void;
};

export function IgnoredTypesHelp({
  showIgnoredTypesHelp,
  setShowIgnoredTypesHelp,
}: IgnoredTypesHelpProps) {
  return (
    <div className="relative">
      <button
        onClick={() => setShowIgnoredTypesHelp(!showIgnoredTypesHelp)}
        className="text-sm text-primary hover:underline flex items-center gap-1"
      >
        {showIgnoredTypesHelp ? 'Hide' : 'Show'} information about ignored file
        types
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <title>Information icon</title>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>

      {showIgnoredTypesHelp && (
        <div className="mt-2 p-4 border rounded-md bg-muted/50">
          <h4 className="font-medium mb-2">About Ignored File Types</h4>
          <p className="text-sm mb-2">
            When you mark a file type as "ignored":
          </p>
          <ul className="list-disc pl-5 text-sm space-y-1 mb-2">
            <li>
              Files with this extension will be skipped during folder scanning
            </li>
            <li>
              Existing files with this extension will remain in the database
            </li>
            <li>No new files of this type will be added during future scans</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            This is useful for excluding file types that you don't want to
            manage in this application, such as system files, thumbnails, or
            other non-media formats.
          </p>
        </div>
      )}
    </div>
  );
}
