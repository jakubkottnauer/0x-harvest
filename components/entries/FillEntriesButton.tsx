import { PlusOutlined } from "@ant-design/icons";
import { Button, message } from "antd";
import { ButtonType } from "antd/lib/button";
import dayjs from "dayjs";
import { createTimeEntry, HARVEST_DATE_FORMAT } from "../../lib/api";
import { TaskWithProject, TimeEntry } from "../../types";

const FillEntriesButton = ({
  days,
  loading,
  setLoading,
  task,
  loadMonth,
  onCreatedEntries,
  label,
  type,
}: {
  days: dayjs.Dayjs[];
  loading: boolean;
  setLoading: (value: boolean) => void;
  task: TaskWithProject;
  loadMonth: () => Promise<void>;
  onCreatedEntries: (entries: TimeEntry[]) => void;
  label: string;
  type?: ButtonType;
}) => {
  return (
    <Button
      disabled={loading}
      loading={loading}
      type={type}
      onClick={async () => {
        setLoading(true);
        const promises = days.map((day) =>
          createTimeEntry(
            day.format(HARVEST_DATE_FORMAT),
            task.projectId,
            task.taskId
          )
        );

        const responses = await Promise.all(promises);
        setLoading(false);
        if (!promises.length) {
          message.info("No new entries created.");
        } else if (responses.every((r) => r.status === 201)) {
          message.success(
            `${responses.length} new ${
              responses.length === 1 ? "entry" : "entries"
            } created!`
          );
          onCreatedEntries(responses.map((r) => r.data));
        } else {
          message.error("Something went wrong while creating entries.");
          await loadMonth();
        }
      }}
    >
      <PlusOutlined /> {label}
    </Button>
  );
};

export default FillEntriesButton;
