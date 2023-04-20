import dayjs from "dayjs";
import { useState } from "react";
import { TimeEntry } from "../../types";
import { usePrimaryTask } from "../../utils";
import FillEntriesButton from "./FillEntriesButton";

const FillMonthButton = ({
  days,
  loadMonth,
  onCreatedEntries,
}: {
  days: dayjs.Dayjs[];
  loadMonth: () => Promise<void>;
  onCreatedEntries: (entries: TimeEntry[]) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const primaryTask = usePrimaryTask();

  if (!primaryTask || !days.length) {
    return null;
  }

  return (
    <FillEntriesButton
      label="Fill empty days with work"
      type="primary"
      days={days}
      loading={loading}
      setLoading={setLoading}
      task={primaryTask}
      loadMonth={loadMonth}
      onCreatedEntries={onCreatedEntries}
    />
  );
};

export default FillMonthButton;
