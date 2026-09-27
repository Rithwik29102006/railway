import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  TrackSection, Asset, MaintenanceRequest, Train, Crew, 
  WhatIfParameters, ActiveTab 
} from '../types';
import { 
  fetchRailwayData, runOptimizationAPI, 
  triggerDisruptionReplanAPI, createMaintenanceRequestAPI, DEFAULT_PARAMS 
} from '../api/client';
import type { ExtendedResult } from '../engine/planner';

export type OptimizationResult = ExtendedResult;
export interface ReplanSummary {
  message: string;
  shifts_applied: Array<Record<string, string>>;
}

interface RailOptContextType {
  sections: TrackSection[];
  assets: Asset[];
  requests: MaintenanceRequest[];
  trains: Train[];
  crews: Crew[];
  result: OptimizationResult | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOptimizing: boolean;
  optimizationStep: number;
  demoModeActive: boolean;
  whatIfParams: WhatIfParameters;
  setWhatIfParams: React.Dispatch<React.SetStateAction<WhatIfParameters>>;
  selectedSection: TrackSection | null;
  setSelectedSection: (sec: TrackSection | null) => void;
  selectedAsset: Asset | null;
  setSelectedAsset: (asset: Asset | null) => void;
  architectureModalOpen: boolean;
  setArchitectureModalOpen: (open: boolean) => void;
  disruptionModalOpen: boolean;
  setDisruptionModalOpen: (open: boolean) => void;
  newRequestModalOpen: boolean;
  setNewRequestModalOpen: (open: boolean) => void;
  systemTime: string;
  triggerOptimization: (customParams?: WhatIfParameters) => Promise<void>;
  triggerPresetScenario: (preset: 'A' | 'B' | 'C' | 'D' | 'E') => Promise<void>;
  triggerDisruptionReplan: (additionalMins: number, reason: string, blockId?: string) => Promise<void>;
  addMaintenanceRequest: (req: MaintenanceRequest) => Promise<void>;
  startJudgeDemoFlow: () => Promise<void>;
  lastReplan: ReplanSummary | null;
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
}

const RailOptContext = createContext<RailOptContextType | undefined>(undefined);

export const RailOptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sections, setSections] = useState<TrackSection[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationStep, setOptimizationStep] = useState<number>(0);
  const [demoModeActive, setDemoModeActive] = useState<boolean>(false);
  const [selectedSection, setSelectedSection] = useState<TrackSection | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [architectureModalOpen, setArchitectureModalOpen] = useState<boolean>(false);
  const [disruptionModalOpen, setDisruptionModalOpen] = useState<boolean>(false);
  const [newRequestModalOpen, setNewRequestModalOpen] = useState<boolean>(false);

  const [whatIfParams, setWhatIfParams] = useState<WhatIfParameters>(DEFAULT_PARAMS);
  const [lastReplan, setLastReplan] = useState<ReplanSummary | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Simulated live clock in railway HH:MM:SS format
  const [systemTime, setSystemTime] = useState<string>('01:15:20 IST');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setSystemTime(now.toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial load
  useEffect(() => {
    async function loadData() {
      const data = await fetchRailwayData();
      setSections(data.sections);
      setAssets(data.assets);
      setRequests(data.requests);
      setTrains(data.trains);
      setCrews(data.crews);

      // Pre-compute the plan so every screen is populated on first load
      const optResult = await runOptimizationAPI(DEFAULT_PARAMS);
      setResult(optResult);
    }
    loadData();
  }, []);

  const triggerOptimization = async (customParams?: WhatIfParameters) => {
    setIsOptimizing(true);
    setLastReplan(null);
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    setOptimizationStep(1); await wait(250);  // data ingestion
    setOptimizationStep(2); await wait(250);  // constraint build
    setOptimizationStep(3); await wait(250);  // candidate windows
    setOptimizationStep(4);                   // search – the real solver runs here
    const p = customParams || whatIfParams;
    const res = await runOptimizationAPI(p);
    setResult(res);
    setOptimizationStep(5); await wait(350);
    setIsOptimizing(false);
    setOptimizationStep(0);
  };

  const triggerPresetScenario = async (preset: 'A' | 'B' | 'C' | 'D' | 'E') => {
    const updatedParams: WhatIfParameters = {
      ...DEFAULT_PARAMS,
      maintenance_requests_count: requests.length,
      scenario_preset: preset,
      train_traffic_level_pct: preset === 'B' ? 150 : 100,
      maintenance_duration_multiplier: preset === 'E' ? 1.25 : 1.0,
      available_block_window_multiplier: preset === 'D' ? 0.85 : 1.0,
      crew_availability_count: preset === 'C' ? DEFAULT_PARAMS.crew_availability_count : DEFAULT_PARAMS.crew_availability_count,
      emergency_request_priority: preset === 'C' ? 'EMERGENCY' : undefined
    };
    setWhatIfParams(updatedParams);
    await triggerOptimization(updatedParams);
  };

  const triggerDisruptionReplan = async (additionalMins: number, reason: string, blockId?: string) => {
    setIsOptimizing(true);
    setOptimizationStep(4);
    // the overrunning block: the longest block currently in the plan
    const target = result?.scheduled_blocks.find(b => b.block_id === blockId)
      || [...(result?.scheduled_blocks || [])].sort((a, b) => b.duration_minutes - a.duration_minutes)[0];
    const res = await triggerDisruptionReplanAPI({
      block_id: target?.block_id || '',
      additional_minutes: additionalMins,
      reason
    });
    if (res?.result) {
      setResult({
        ...res.result,
        ai_insights: [`DISRUPTION: ${reason}. ${res.re_optimization_summary.message}`, ...res.result.ai_insights],
      });
      setLastReplan({ message: res.re_optimization_summary.message, shifts_applied: res.re_optimization_summary.shifts_applied });
    }
    await new Promise(r => setTimeout(r, 400));
    setIsOptimizing(false);
    setOptimizationStep(0);
  };

  const addMaintenanceRequest = async (newReq: MaintenanceRequest) => {
    await createMaintenanceRequestAPI(newReq);
    setRequests(prev => [newReq, ...prev.filter(r => r.id !== newReq.id)]);
    const p = { ...whatIfParams, maintenance_requests_count: (whatIfParams.maintenance_requests_count || requests.length) + 1 };
    setWhatIfParams(p);
    await triggerOptimization(p);
  };

  const startJudgeDemoFlow = async () => {
    setDemoModeActive(true);
    // Sequence: Jump to Dashboard -> Show Network -> AI Block Planner -> Generate Plan -> Show Results
    setActiveTab('planner');
    await new Promise(r => setTimeout(r, 600));
    await triggerOptimization();
    setActiveTab('results');
  };

  return (
    <RailOptContext.Provider
      value={{
        sections,
        assets,
        requests,
        trains,
        crews,
        result,
        activeTab,
        setActiveTab,
        isOptimizing,
        optimizationStep,
        demoModeActive,
        whatIfParams,
        setWhatIfParams,
        selectedSection,
        setSelectedSection,
        selectedAsset,
        setSelectedAsset,
        architectureModalOpen,
        setArchitectureModalOpen,
        disruptionModalOpen,
        setDisruptionModalOpen,
        newRequestModalOpen,
        setNewRequestModalOpen,
        systemTime,
        triggerOptimization,
        triggerPresetScenario,
        triggerDisruptionReplan,
        addMaintenanceRequest,
        startJudgeDemoFlow,
        lastReplan,
        selectedBlockId,
        setSelectedBlockId
      }}
    >
      {children}
    </RailOptContext.Provider>
  );
};

export const useRailOpt = () => {
  const context = useContext(RailOptContext);
  if (!context) {
    throw new Error('useRailOpt must be used within a RailOptProvider');
  }
  return context;
};
