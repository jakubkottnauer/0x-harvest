import React from "react";
import { Card, Col, Form, InputNumber, Row, Select } from "antd";
import type { GetServerSideProps, NextPage } from "next";
import dayjs from "dayjs";
import {
  DEFAULT_VACATION_ALLOWANCE,
  getVacationAllowance,
  usePrimaryTask,
  VACATION_ALLOWANCE_KEY,
} from "../utils";
import { specialTasks, useProjectAssignments } from "../lib/api";
import { observer } from "mobx-react-lite";
import { useUserSettingState } from "../stores/UserSettingsStore";
import { cachePage } from "../lib/caching";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  cachePage(res);
  return {
    props: {},
  };
};

const Settings: NextPage = () => {
  return (
    <Row gutter={20}>
      <Col md={12} xs={24}>
        <VacationAllowanceCard />
      </Col>
      <Col md={12} xs={24}>
        <PrimaryTaskCard />
      </Col>
    </Row>
  );
};

const VacationAllowanceCard = () => {
  const thisYear = dayjs().year();
  const years = [thisYear - 2, thisYear - 1, thisYear, thisYear + 1];

  const [vacationAllowance, setVacationAllowance] = React.useState(() => {
    let values = getVacationAllowance();
    return cleanupValues(values, years);
  });

  return (
    <Card>
      <Card.Meta
        title="Vacation allowance per year"
        description="The amount of paid vacation days you have available per year. The values are persisted locally in your browser and are only used to show statistics."
      />
      <Form style={{ marginTop: 20 }}>
        {years.map((year) => (
          <Form.Item key={year} label={year}>
            <InputNumber
              value={vacationAllowance[year]}
              placeholder={DEFAULT_VACATION_ALLOWANCE.toString()}
              min={0}
              max={50}
              onChange={(val) => {
                let newValue = { ...vacationAllowance };
                if (typeof val === "number") {
                  newValue[year] = val;
                } else {
                  delete newValue[year];
                }
                newValue = cleanupValues(newValue, years);
                localStorage.setItem(
                  VACATION_ALLOWANCE_KEY,
                  JSON.stringify(newValue)
                );
                setVacationAllowance(newValue);
              }}
            />
          </Form.Item>
        ))}
      </Form>
    </Card>
  );
};

const PrimaryTaskCard = observer(() => {
  const { data: projectAssignments } = useProjectAssignments();
  const userSettingsState = useUserSettingState();
  const primaryTask = usePrimaryTask();
  return (
    <Card>
      <Card.Meta
        title="Work task"
        description="The task that you consider to be your main 'work'. Used when filling in a whole week/month in a single click. If not specified, the most-used task in the past 30 days will be used."
      />
      <Select
        placeholder={primaryTask?.taskName}
        value={userSettingsState.primaryTaskId}
        style={{ marginTop: 20, width: 300 }}
        onChange={(value: number) => {
          userSettingsState.primaryTaskId = value;
        }}
      >
        {projectAssignments?.map((p) => (
          <Select.OptGroup key={p.project.id} label={p.project.name}>
            {p.task_assignments.map((t) => {
              const override = specialTasks[t.task.id];
              return (
                <Select.Option key={t.task.id} value={t.task.id}>
                  <>
                    {t.task.name} {override?.emoji}
                  </>
                </Select.Option>
              );
            })}
          </Select.OptGroup>
        ))}
      </Select>
    </Card>
  );
});

const cleanupValues = (
  allowance: Record<number, number>,
  validYears: number[]
) => {
  const copy = { ...allowance };
  for (const y of Object.keys(copy)) {
    const yearInt = parseInt(y);
    if (!validYears.includes(yearInt)) {
      // cleaning up old/invalid values
      delete copy[yearInt];
    }
  }

  return copy;
};

export default Settings;
