import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
};

export type AgentTabParamList = {
  AgentHome: undefined;
  AgentHistory: undefined;
  AgentRequests: undefined;
  AgentNotifications: undefined;
  AgentProfile: undefined;
};

export type AgentStackParamList = {
  AgentTabs: NavigatorScreenParams<AgentTabParamList>;
  AgentIntervention: { id: string };
  AgentAbsenceForm: undefined;
  AgentChangePassword: undefined;
  AgentSyncQueue: undefined;
  AgentAvailability: undefined;
  AgentChat: undefined;
  AgentInventoryScanner: undefined;
  AgentPlanning: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Agent: NavigatorScreenParams<AgentStackParamList>;
};
