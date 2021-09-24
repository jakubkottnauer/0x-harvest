import { useMemo, useState } from "react";
import type { NextPage } from "next";
import moment from "moment";
import {
  DeleteOutlined,
  LeftOutlined,
  LikeOutlined,
  PlusOutlined,
  RightOutlined,
} from "@ant-design/icons";
import CommonLayout from "../components/layout/CommonLayout";
import {
  Button,
  Dropdown,
  Input,
  Menu,
  PageHeader,
  Skeleton,
  Space,
  Statistic,
  message,
} from "antd";
import { useSWRConfig } from "swr";
import { Day, getDaysInMonthRange, groupBy, weekdaysInMonth } from "../utils";
import { TimeEntry } from "../types";
import {
  createTimeEntry,
  deleteTimeEntry,
  FALLBACK_HOURS,
  PRIMARY_TASK_ID,
  projects,
  specialTasks,
  updateTimeEntry,
  useTimeEntries,
} from "../lib/api";
import { requireAuth } from "../lib/routeGuards";

export const getServerSideProps = requireAuth;

const Home: NextPage = () => {
  return (
    <CommonLayout>
      <TimeEntries />
    </CommonLayout>
  );
};

export default Home;

const TimeEntries = () => {
  const { mutate } = useSWRConfig();

  const [currentYear, setCurrentYear] = useState(moment().year());
  const [currentMonth, setCurrentMonth] = useState(moment().month());
  const currentDate = useMemo(
    () => moment(new Date(currentYear, currentMonth, 1)),
    [currentYear, currentMonth]
  );
  const formattedDate = currentDate.format("MMMM YYYY");

  const { data: entries, cacheKey } = useTimeEntries(
    currentDate.clone().startOf("month"),
    currentDate.clone().endOf("month")
  );

  const setEntries = (
    fn: (newEntries: TimeEntry[] | undefined) => TimeEntry[] | undefined
  ) => {
    mutate(cacheKey, fn, false);
  };

  const loadMonth = () => mutate(cacheKey);

  const daysMissingNotes = entries?.filter(
    (entry) =>
      !entry.notes &&
      Object.values(specialTasks).find(
        (t) => t.harvestProjectId === entry.project.id
      )?.noteRequired
  ).length;
  const hoursInMonth =
    weekdaysInMonth(currentDate.year(), currentDate.month()) * 8;
  const trackedHoursInMonth = entries?.reduce(
    (acc, entry) => acc + entry.hours,
    0
  );
  const clientHours = entries
    ?.filter((e) => e.task.id === PRIMARY_TASK_ID)
    .reduce((acc, entry) => acc + entry.hours, 0);
  return (
    <div>
      <PageHeader
        title={formattedDate}
        breadcrumbRender={() => {
          return (
            <>
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentYear(currentYear - 1);
                    setCurrentMonth(11);
                  } else {
                    setCurrentMonth(currentMonth - 1);
                  }
                }}
              >
                <LeftOutlined />
                previous
              </Button>
              <Button
                type="link"
                style={{ padding: 0, marginLeft: 30 }}
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentYear(currentYear + 1);
                    setCurrentMonth(0);
                  } else {
                    setCurrentMonth(currentMonth + 1);
                  }
                }}
              >
                next
                <RightOutlined />
              </Button>
            </>
          );
        }}
        subTitle={
          moment().year() !== currentYear ||
          (moment().month() !== currentMonth && (
            <Button
              type="link"
              onClick={() => {
                setCurrentYear(moment().year());
                setCurrentMonth(moment().month());
              }}
            >
              jump to current month
            </Button>
          ))
        }
      >
        <Space size="large">
          <Statistic
            loading={!entries}
            title="Days missing a note"
            value={daysMissingNotes}
            prefix={
              !daysMissingNotes &&
              trackedHoursInMonth === hoursInMonth && <LikeOutlined />
            }
          />
          <Statistic
            loading={!entries}
            title="Total tracked hours"
            value={trackedHoursInMonth}
            suffix={` / ${hoursInMonth}`}
            prefix={trackedHoursInMonth === hoursInMonth && <LikeOutlined />}
          />
          <Statistic
            loading={!entries}
            title="Tracked hours for client"
            value={clientHours}
          />
        </Space>
      </PageHeader>
      <div style={{ marginLeft: 20 }}>
        {entries ? (
          <>
            <br />
            <div className="antd-table">
              <div className="antd-table-container">
                <div className="antd-table-content">
                  <table>
                    <tbody className="ant-table-tbody">
                      {getDaysInMonthRange(
                        currentDate.year(),
                        currentDate.month()
                      )
                        .reverse()
                        .map((day) => {
                          const harvestDate = day.date.format("YYYY-MM-DD");
                          const dayEntries = entries.filter(
                            (e) => e.spent_date === harvestDate
                          );
                          if (!dayEntries.length) {
                            return (
                              <TimeEntryRow
                                day={day}
                                key={harvestDate}
                                showDate
                                loadMonth={loadMonth}
                                setEntries={setEntries}
                              />
                            );
                          }
                          return dayEntries.map((entry, entryIdx) => (
                            <TimeEntryRow
                              day={day}
                              key={entry.id}
                              entry={entry}
                              showDate={!entryIdx}
                              loadMonth={loadMonth}
                              setEntries={setEntries}
                            />
                          ));
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <Skeleton active />
            <Skeleton active />
            <Skeleton active />
            <Skeleton active />
            <Skeleton active />
            <Skeleton active />
            <Skeleton active />
          </>
        )}
      </div>
    </div>
  );
};

const TimeEntryRow = ({
  day,
  entry,
  showDate,
  loadMonth,
  setEntries,
}: {
  day: Day;
  entry?: TimeEntry;
  showDate?: boolean;
  loadMonth: () => Promise<void>;
  setEntries: (
    fn: (e: TimeEntry[] | undefined) => TimeEntry[] | undefined
  ) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const tdStyle = { padding: 3 };
  const specialTask = Object.values(specialTasks).find(
    (t) => t.harvestTaskId === entry?.task.id
  );
  return (
    <tr className="ant-table-row" style={{ height: 35 }}>
      <td
        style={{
          ...tdStyle,
          width: 150,
          fontWeight: day.date.isSame(new Date(), "date") ? "bold" : undefined,
        }}
        className="ant-table-cell"
      >
        {showDate && day.date.format("YYYY-MM-DD")}
      </td>
      <td style={{ ...tdStyle, textAlign: "center" }}>
        {!specialTask?.hideNote && (
          <>{specialTask?.displayName ?? entry?.task.name}</>
        )}
      </td>
      <td
        style={{ ...tdStyle, width: 500, textAlign: "center" }}
        className="ant-table-cell"
      >
        {day.isBusinessDay && !specialTask?.hideNote ? (
          <TimeEntryInput
            day={day}
            entry={entry}
            loadMonth={loadMonth}
            setEntries={setEntries}
          />
        ) : specialTask?.hideNote ? (
          <i>
            {specialTask.emoji} {specialTask.displayName} {specialTask.emoji}
          </i>
        ) : (
          <i>weekend</i>
        )}
      </td>
      <td
        style={{ ...tdStyle, width: 70, textAlign: "center" }}
        className="ant-table-cell"
      >
        {entry?.hours && `${entry.hours} hours`}
        {!entry && day.date.isoWeekday() === 1 && (
          <Button
            disabled={loading}
            loading={loading}
            onClick={async () => {
              setLoading(true);
              const currentDate = day.date.clone();
              const promises = Array(5)
                .fill(1)
                .map(() => {
                  const promise = createTimeEntry(
                    currentDate.format("YYYY-MM-DD"),
                    specialTasks.diceJakub.harvestProjectId,
                    specialTasks.diceJakub.harvestTaskId
                  );
                  currentDate.add(1, "day");
                  return promise;
                });

              const responses = await Promise.all(promises);
              setLoading(false);
              if (responses.every((r) => r.status === 201)) {
                message.success("New entries created!");

                setEntries((prevEntries) => {
                  if (!prevEntries) {
                    return prevEntries;
                  }
                  return [...prevEntries, responses.map((r) => r.data)]
                    .flat()
                    .sort((a, b) => b.spent_date.localeCompare(a.spent_date));
                });
              } else {
                message.error("Something went wrong while creating entries.");
                await loadMonth();
              }
            }}
          >
            <PlusOutlined /> {specialTasks.diceJakub.displayName} entries for
            this week
          </Button>
        )}
      </td>
      <td className="ant-table-cell" style={tdStyle}>
        {entry && (
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={async () => {
              setEntries((entries) =>
                entries?.filter((e) => e.id !== entry.id)
              );
              const response = await deleteTimeEntry(entry.id);
              if (response.status === 200) {
                message.success("Entry deleted!");
              } else {
                message.error("Something went wrong while deleting entry.");
                await loadMonth();
              }
            }}
          />
        )}
      </td>
    </tr>
  );
};

const TimeEntryInput = ({
  day,
  entry,
  loadMonth,
  setEntries,
}: {
  day: Day;
  entry?: TimeEntry;
  loadMonth: () => Promise<void>;
  setEntries: (
    fn: (e: TimeEntry[] | undefined) => TimeEntry[] | undefined
  ) => void;
}) => {
  const [notes, setNotes] = useState(entry?.notes || "");
  const [loading, setLoading] = useState(false);

  const createEntry = async (
    projectId: number,
    taskId: number,
    hours?: number
  ) => {
    setLoading(true);
    const response = await createTimeEntry(
      day.date.format("YYYY-MM-DD"),
      projectId,
      taskId,
      hours
    );
    setLoading(false);
    if (response.status === 201) {
      message.success("New entry created!");

      setEntries((prevEntries) => {
        if (!prevEntries) {
          return prevEntries;
        }
        return [...prevEntries, response.data].sort((a, b) =>
          b.spent_date.localeCompare(a.spent_date)
        );
      });
    } else {
      message.error("Something went wrong while creating entry.");
      await loadMonth();
    }
  };

  if (!entry) {
    const menu = (
      <Menu>
        {Array.from(
          groupBy(
            Object.values(specialTasks).filter(
              (t) => t.harvestTaskId !== PRIMARY_TASK_ID
            ),
            "harvestProjectId"
          ).entries()
        ).map(([projectId, tasks]) => (
          <Menu.ItemGroup
            key={projectId}
            title={projects[projectId] || projectId}
          >
            {tasks.map((t) => (
              <Menu.Item
                key={t.harvestTaskId}
                icon={<PlusOutlined />}
                onClick={async () =>
                  await createEntry(
                    t.harvestProjectId,
                    t.harvestTaskId,
                    t.defaultHours
                  )
                }
              >
                {t.displayName} {t.emoji}
              </Menu.Item>
            ))}
          </Menu.ItemGroup>
        ))}
      </Menu>
    );

    const primaryTask = Object.values(specialTasks).find(
      (t) => t.harvestTaskId === PRIMARY_TASK_ID
    );
    return (
      <>
        <Dropdown.Button
          overlay={menu}
          disabled={loading || !primaryTask}
          onClick={async () => {
            if (primaryTask) {
              await createEntry(
                primaryTask.harvestProjectId,
                primaryTask.harvestTaskId,
                primaryTask.defaultHours
              );
            }
          }}
        >
          <PlusOutlined /> {primaryTask?.defaultHours || FALLBACK_HOURS} hour{" "}
          {primaryTask?.displayName} entry
        </Dropdown.Button>
      </>
    );
  }

  return (
    <>
      <Input
        disabled={loading}
        value={notes}
        onChange={(e) => setNotes(e.currentTarget.value)}
        onBlur={async () => {
          if (notes === entry.notes) {
            return;
          }
          setLoading(true);
          const response = await updateTimeEntry(entry.id, notes);
          setLoading(false);
          if (response.status === 200) {
            message.success("Note saved!");
            setEntries((prevEntries) => {
              if (!prevEntries) {
                return prevEntries;
              }
              const entriesCopy = [...prevEntries];
              const updatedEntryIdx = entriesCopy.findIndex(
                (e) => e.id === response.data.id
              );
              entriesCopy[updatedEntryIdx] = response.data;
              return entriesCopy;
            });
          } else {
            message.error("Something went wrong while saving note.");
            await loadMonth();
          }
        }}
      />
    </>
  );
};
