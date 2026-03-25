import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

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
  const [goalSettings, setGoalSettings] = useState<GoalSettings>(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'goals', 'global');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setGoalSettings(docSnap.data() as GoalSettings);
      } else {
        // Initialize with defaults if not exists
        setDoc(docRef, DEFAULT_GOALS);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'goals/global');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateGoalSettings = async (newGoals: Partial<GoalSettings>) => {
    try {
      const docRef = doc(db, 'goals', 'global');
      await setDoc(docRef, { ...goalSettings, ...newGoals }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'goals/global');
      throw error;
    }
  };

  const updateMonthGoal = async (monthKey: string, goal: Partial<MonthGoal>) => {
    try {
      const docRef = doc(db, 'goals', 'global');
      const updatedMonths = {
        ...goalSettings.months,
        [monthKey]: {
          ...(goalSettings.months[monthKey] || { totalMonthlySalesGoal: 0, totalMonthlyVideoGoal: 0 }),
          ...goal
        }
      };
      await setDoc(docRef, { months: updatedMonths }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'goals/global');
      throw error;
    }
  };

  return { goalSettings, updateGoalSettings, updateMonthGoal, loading };
}
