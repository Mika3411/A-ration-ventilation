import { useId } from "react";
import { CircleHelp } from "lucide-react";

export function AdminHelpTooltip({ text }) {
  const tooltipId = useId();

  return (
    <span className="admin-help-tooltip">
      <span
        className="admin-help-trigger"
        tabIndex={0}
        aria-describedby={tooltipId}
        aria-label="Aide"
      >
        <CircleHelp size={15} aria-hidden="true" />
      </span>
      <span className="admin-help-bubble" id={tooltipId} role="tooltip">
        {text}
      </span>
    </span>
  );
}

export function AdminFieldLabel({ label, help }) {
  return (
    <span className="admin-field-label">
      <span>{label}</span>
      <AdminHelpTooltip text={help} />
    </span>
  );
}
