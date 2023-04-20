import { LikeOutlined } from "@ant-design/icons";
import { Statistic } from "antd";
import dayjs  from "dayjs";
import { TimeEntry } from "../../types";
import { weekdaysInMonth } from "../../utils";

const LoggedHoursStatistic = ({
  date,
  entries,
}: {
  date: dayjs.Dayjs;
  entries?: TimeEntry[];
}) => {
  const hoursInMonth = weekdaysInMonth(date.year(), date.month()) * 8;
  const trackedHoursInMonth = entries?.reduce(
    (acc, entry) => acc + entry.hours,
    0
  );

  return (
    <Statistic
      loading={!entries}
      title="Total logged hours"
      value={trackedHoursInMonth}
      suffix={` / ${hoursInMonth}`}
      prefix={(trackedHoursInMonth || 0) >= hoursInMonth && <LikeOutlined />}
    />
  );
};

export default LoggedHoursStatistic;
