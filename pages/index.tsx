import { Button, Col, Row, Space, Typography } from "antd";
import classnames from "classnames";
import dayjs from "dayjs";
import type { GetServerSideProps, NextPage } from "next";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import CreateEntryButton from "../components/entries/CreateEntryButton";
import DeleteEntryButton from "../components/entries/DeleteEntryButton";
import EntryNoteInput from "../components/entries/EntryNoteInput";
import EntryTimeInput from "../components/entries/EntryTimeInput";
import FillEntriesButton from "../components/entries/FillEntriesButton";
import FillMonthButton from "../components/entries/FillMonthButton";
import LoggedHoursStatistic from "../components/entries/LoggedHoursStatistic";
import MonthNavigation from "../components/entries/MonthNavigation";
import TableLoader from "../components/entries/TableLoader";
import TaskHoursStatistic from "../components/entries/TaskHoursStatistic";
import TaskNameWithTooltip from "../components/entries/TaskNameWithTooltip";
import { HARVEST_DATE_FORMAT, useTimeEntries } from "../lib/api";
import { cachePage } from "../lib/caching";
import { TimeEntry } from "../types";
import { Day, getDaysInMonthRange, usePrimaryTask } from "../utils";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  cachePage(res);
  return {
    props: {},
  };
};

const Home: NextPage = () => {
  return <TimeEntries />;
};

export default Home;

const TimeEntries = () => {
  const { mutate } = useSWRConfig();
  const primaryTask = usePrimaryTask();
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [currentMonth, setCurrentMonth] = useState(dayjs().month());

  const currentDate = useMemo(
    () => dayjs(new Date(currentYear, currentMonth, 1)),
    [currentYear, currentMonth]
  );

  const formattedDate = currentDate.format("MMMM YYYY");

  const { data: entries, cacheKey } = useTimeEntries(
    currentDate.startOf("month"),
    currentDate.endOf("month")
  );

  const setEntries = (
    fn: (newEntries: TimeEntry[] | undefined) => TimeEntry[] | undefined
  ) => {
    mutate(cacheKey, fn, false);
  };

  const loadMonth = () => mutate(cacheKey);
  const dayList = getDaysInMonthRange(
    currentDate.year(),
    currentDate.month()
  ).reverse();

  const emptyDays = entries
    ? dayList.filter((d) => {
        if (!d.isBusinessDay) {
          return false;
        }

        const harvestDate = d.date.format(HARVEST_DATE_FORMAT);
        const dayEntries = entries.filter((e) => e.spent_date === harvestDate);
        return !dayEntries.length;
      })
    : [];

  return (
    <>
      <MonthNavigation
        currentMonth={currentMonth}
        currentYear={currentYear}
        changeDate={(year, month) => {
          setCurrentYear(year);
          setCurrentMonth(month);
        }}
      />
      <Typography.Title level={4}>
        {formattedDate}{" "}
        {(dayjs().year() !== currentYear ||
            dayjs().month() !== currentMonth) && (
          <Button
            type="link"
            onClick={() => {
              setCurrentYear(dayjs().year());
              setCurrentMonth(dayjs().month());
            }}
          >
            go to current month
          </Button>
        )}
      </Typography.Title>

      <Row>
        <Col lg={5} sm={8} xs={12}>
          <LoggedHoursStatistic date={currentDate} entries={entries} />
        </Col>
        <Col sm={12} xs={12}>
          <TaskHoursStatistic entries={entries} />
        </Col>
      </Row>
      {primaryTask && entries && emptyDays.length > 0 && (
        <Row style={{ marginTop: 20 }}>
          <Col xs={24}>
            <FillMonthButton
              loadMonth={loadMonth}
              days={emptyDays.map((d) => d.date)}
              onCreatedEntries={(newEntries) => {
                setEntries((prevEntries) => {
                  if (!prevEntries) {
                    return prevEntries;
                  }
                  return [...prevEntries, newEntries]
                    .flat()
                    .sort((a, b) => b.spent_date.localeCompare(a.spent_date));
                });
              }}
            />
          </Col>
        </Row>
      )}
      <div style={{ marginTop: 20 }}>
        {entries ? (
          <>
            <br />
            <div>
              {dayList.map((day) => {
                const harvestDate = day.date.format(HARVEST_DATE_FORMAT);
                const dayEntries = entries.filter(
                  (e) => e.spent_date === harvestDate
                );

                const isMonday = day.date.isoWeekday() === 1;
                const isFriday = day.date.isoWeekday() === 5;
                const marginSize = 6;
                const style = isMonday
                  ? { marginTop: marginSize }
                  : isFriday
                  ? { marginBottom: marginSize }
                  : day.isBusinessDay
                  ? { marginTop: marginSize, marginBottom: marginSize }
                  : {};

                const commonProps = {
                  day,
                  setEntries,
                  loadMonth,
                  entries,
                };

                if (!dayEntries.length) {
                  return (
                    <div key={harvestDate} style={style}>
                      <TimeEntryRow
                        {...commonProps}
                        key={harvestDate}
                        showDate
                      />
                    </div>
                  );
                }
                return (
                  <div key={harvestDate} style={style}>
                    {dayEntries.map((entry, entryIdx) => (
                      <TimeEntryRow
                        {...commonProps}
                        key={entryIdx}
                        entry={entry}
                        showDate={!entryIdx}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <TableLoader />
        )}
      </div>
    </>
  );
};

const TimeEntryRow = ({
  day,
  entry,
  showDate,
  loadMonth,
  setEntries,
  entries,
}: {
  day: Day;
  entry?: TimeEntry;
  showDate?: boolean;
  loadMonth: () => Promise<void>;
  setEntries: (
    fn: (e: TimeEntry[] | undefined) => TimeEntry[] | undefined
  ) => void;
  entries: TimeEntry[];
}) => {
  const [loading, setLoading] = useState(false);
  const primaryTask = usePrimaryTask();

  const rowHeight = 36;

  return (
    <Row
      style={{ height: rowHeight }}
      className={classnames(
        "time-entry-row",
        !day.isBusinessDay && "time-entry-row-weekend"
      )}
    >
      <Col
        xl={3}
        md={4}
        sm={2}
        xs={2}
        style={{
          fontWeight: day.date.isSame(new Date(), "date") ? "bold" : undefined,
        }}
      >
        {showDate && (
          <>
            <span className="hide-below-md">{day.date.format("YYYY-MM-")}</span>
            <span>{day.date.format("DD")}</span>
          </>
        )}
      </Col>
      <Col xl={4} md={5} sm={4} xs={6}>
        {entry && <TaskNameWithTooltip entry={entry} />}
      </Col>
      <Col
        xl={9}
        lg={7}
        sm={6}
        xs={9}
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        {day.isBusinessDay ? (
          entry ? (
            <EntryNoteInput
              entry={entry}
              loadMonth={loadMonth}
              setEntries={setEntries}
            />
          ) : (
            <CreateEntryButton
              day={day}
              loadMonth={loadMonth}
              setEntries={setEntries}
            />
          )
        ) : (
          <i>weekend</i>
        )}
      </Col>
      <Col lg={3} sm={4} xs={5} style={{ textAlign: "center", paddingLeft: 8 }}>
        {entry?.hours && (
          <EntryTimeInput
            entry={entry}
            loadMonth={loadMonth}
            setEntries={setEntries}
          />
        )}
        {!entry && day.date.isoWeekday() === 1 && primaryTask && (
          <FillEntriesButton
            label="Fill week"
            days={Array(5)
              .fill(1)
              .map((_, idx) => {
                const current = day.date.add(idx, "day");
                const notInThisMonth = current.month() !== day.date.month();
                const hasTimeEntry = entries.some(
                  (e) => e.spent_date === current.format(HARVEST_DATE_FORMAT)
                );
                if (notInThisMonth || hasTimeEntry) {
                  return;
                }
                return current;
              })
              .filter((d): d is dayjs.Dayjs => !!d)}
            loading={loading}
            setLoading={setLoading}
            task={primaryTask}
            loadMonth={loadMonth}
            onCreatedEntries={(newEntries) => {
              setEntries((prevEntries) => {
                if (!prevEntries) {
                  return prevEntries;
                }
                return [...prevEntries, newEntries]
                  .flat()
                  .sort((a, b) => b.spent_date.localeCompare(a.spent_date));
              });
            }}
          />
        )}
      </Col>
      <Col md={5} sm={6} xs={0} style={{ textAlign: "center" }}>
        {entry && (
          <span className="buttons">
            <Space>
              <DeleteEntryButton
                entry={entry}
                loadMonth={loadMonth}
                onDeleteSuccess={() => {
                  setEntries((entries) =>
                    entries?.filter((e) => e.id !== entry.id)
                  );
                }}
              />
              <CreateEntryButton
                day={day}
                loadMonth={loadMonth}
                setEntries={setEntries}
                type="small"
              />
            </Space>
          </span>
        )}
      </Col>
    </Row>
  );
};
