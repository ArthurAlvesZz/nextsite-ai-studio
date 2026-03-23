import { useState, useEffect } from 'react';

export interface MonthGoal {
  totalMonthlySalesGoal: number;
  totalMonthlyVideoGoal: number;
  dailySalesGoal?: number;
  dailyVideoGoal?: number;
  individualGoals?: {
    [memberId: string]: {
      sales?: number;
      videos?: number;
    }
  }
}

export interface GoalSettings {
  months: { [key: string]: MonthGoal };
  defaultIndividualSalesGoal: number;
  defaultIndividualVideoGoal: number;
}

const DEFAULT_GOALS: GoalSettings = {
  months: {},
  defaultIndividualSalesGoal: 5000,
  defaultIndividualVideoGoal: 10
};

export function useGoalSettings() {
  const [goalSettings, setGoalSettings] = useState<GoalSettings>(() => {
    const saved = localStorage.getItem('goal_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration for old format
      if (!parsed.months) {
        return {
          months: {
            [new Date().toISOString().substring(0, 7)]: {
              totalMonthlySalesGoal: parsed.totalMonthlySalesGoal || 50000,
              totalMonthlyVideoGoal: parsed.totalMonthlyVideoGoal || 100
            }
          },
          defaultIndividualSalesGoal: 5000,
          defaultIndividualVideoGoal: 10
        };
      }
      return parsed;
    }
    return DEFAULT_GOALS;
  });

  useEffect(() => {
    localStorage.setItem('goal_settings', JSON.stringify(goalSettings));
  }, [goalSettings]);

  const updateGoalSettings = (newGoals: Partial<GoalSettings>) => {
    setGoalSettings(prev => ({ ...prev, ...newGoals }));
  };

  const updateMonthGoal = (monthKey: string, goal: Partial<MonthGoal>) => {
    setGoalSettings(prev => ({
      ...prev,
      months: {
        ...prev.months,
        [monthKey]: {
          ...(prev.months[monthKey] || { totalMonthlySalesGoal: 0, totalMonthlyVideoGoal: 0 }),
          ...goal
        }
      }
    }));
  };

  return { goalSettings, updateGoalSettings, updateMonthGoal };
}
