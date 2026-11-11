const ACCOUNT_SESSION_LOCK = "mindvault-sync";

export const withAccountSessionLock = async <T>(
  operation: () => Promise<T>,
): Promise<T> => {
  if (typeof navigator === "undefined") {
    throw new Error("Browser environment is required.");
  }

  if (!navigator.locks) {
    return operation();
  }

  return navigator.locks.request(
    ACCOUNT_SESSION_LOCK,
    { mode: "exclusive" },
    operation,
  );
};