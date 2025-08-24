import { SearchDocument } from "./searchDocuments";

export type SearchResult = {
  hits: SearchDocument[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  exhaustiveNbHits: boolean;
  exhaustiveType: boolean;
  exhaustive: {
    nbHits: boolean;
    typo: boolean;
  };
  query: string;
  params: string;
  index: string;
  processingTimeMS: number;
  processingTimingsMS: {
    request: {
      roundTrip: number;
    };
  };
  serverTimeMS: number;
  facets_stats?: Record<string, { min: number; max: number }>;
  facets?: Record<string, Record<string | number, number>>;
};
