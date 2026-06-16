import type { JsonRecord } from "../typeHelpers";
import { isAnyTest, isDevelopment } from "../environment";

export const showAnalyticsDebug = () => isDevelopment && !isAnyTest();

export type AnalyticsEvent = {
  type: string;
  timestamp: Date;
  props: JsonRecord;
};
