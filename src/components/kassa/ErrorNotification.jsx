import React from "react";

/**
 * Xato bildirishnomasi komponenti
 * Foydalanish: <ErrorNotification message="Xato xabari" onDismiss={handleDismiss} />
 */
export default function ErrorNotification({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      className="alert alert-danger alert-dismissible fade show"
      role="alert"
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 9999,
        maxWidth: "400px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <strong>⚠️ Xato!</strong>
      <p className="mb-0" style={{ marginTop: "8px" }}>
        {message}
      </p>
      {onDismiss && (
        <button
          type="button"
          className="btn-close"
          onClick={onDismiss}
          aria-label="Close"
        ></button>
      )}
    </div>
  );
}
