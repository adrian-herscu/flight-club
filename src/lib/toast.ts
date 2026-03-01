/**
 * Simple toast notification helper
 * Can be replaced with a proper toast library later
 */

type ToastType = "success" | "error" | "info" | "warning";

export function showToast(message: string, type: ToastType = "info") {
  // For now, use alert, but this can be replaced with a proper toast UI
  // like react-hot-toast, sonner, or a custom component
  if (type === "error") {
    alert(`❌ ${message}`);
  } else if (type === "success") {
    alert(`✅ ${message}`);
  } else {
    alert(message);
  }
}

export function showError(error: Error | string) {
  const message = error instanceof Error ? error.message : error;
  showToast(message, "error");
}

export function showSuccess(message: string) {
  showToast(message, "success");
}
