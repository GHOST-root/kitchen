import React, { useMemo } from "react";

export default function HeaderBar(props) {
  // Eski loyihalardagi turli prop nomlarini ham ushlab olamiz
  const branch = props.branch ?? props.filial ?? props.filialId ?? 1;
  const cashier = props.cashier ?? props.cashierName ?? props.kassir ?? "Bahodirjon";
  const shiftLabel = props.shiftLabel ?? props.shift ?? props.smena ?? "Ochiq";

  const isLive =
    props.isLive ??
    props.syncLive ??
    props.isSyncLive ??
    props.online ??
    true;

  const syncLabel =
    props.syncLabel ??
    props.syncText ??
    props.syncStatus ??
    (isLive ? "Live" : "Offline");

  // ✅ Button ishlashi uchun: qaysi handler bo‘lsa, o‘shani chaqiramiz
  const toggleSync = useMemo(() => {
    return (
      props.onToggleSync ||
      props.onSyncToggle ||
      props.toggleSync ||
      props.onToggle ||
      props.onToggleOnline ||
      null
    );
  }, [props]);

  // Button matnini ham eski holatga o‘xshatamiz
  const syncBtnText = isLive ? "Sinx o‘chirish" : "Sinx yoqish";

  return (
    <div className="wf-header">
      <div className="wf-row wf-top">
        <div className="wf-left">
          <span className="wf-icon" aria-hidden="true">
            💰
          </span>
          <span className="wf-title">KASSA POS</span>
        </div>

        <div className="wf-right">
          <div className="wf-kv">
            Kassir: <span className="wf-v">{cashier}</span>
          </div>

          <div className="wf-kv">
            Smena: <span className="wf-v">{shiftLabel}</span>
          </div>

          <button
            type="button"
            className="wf-btn"
            onClick={() => toggleSync && toggleSync()}
            disabled={!toggleSync}
            title={!toggleSync ? "Handler topilmadi (onToggleSync)" : ""}
          >
            {syncBtnText}
          </button>
        </div>
      </div>

      <div className="wf-row wf-bottom">
        <div className="wf-left">
          <div className="wf-kv">
            Filial: <span className="wf-v">{branch}</span>
          </div>
        </div>

        <div className="wf-center">
          <div className="wf-kv">
            Sinx:{" "}
            <span className="wf-sync">
              {syncLabel}
              <span className={`wf-dot ${isLive ? "on" : "off"}`} aria-hidden="true">
                ●
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
 