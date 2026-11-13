"use client";

import {
  ChangeEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import { googleLocationSchema, type LabelledLocation } from "@/lib/googleLocation";
import Type from "../Type";
import Label from "./Label";
import { getInputClassName } from "./Input";

type AutocompletePrediction = {
  description: string;
  place_id: string;
};

type PlaceResult = {
  geometry?: { location?: unknown };
};

type ServiceCallback<T> = (result: T | null, status: string) => void;

type AutocompleteSessionToken = object;

type GoogleMapsApi = {
  places: {
    AutocompleteService: new () => {
      getPlacePredictions: (
        request: { input: string; sessionToken: AutocompleteSessionToken },
        callback: ServiceCallback<AutocompletePrediction[]>,
      ) => void;
    };
    PlacesService: new (attributionContainer: HTMLElement) => {
      getDetails: (
        request: {
          placeId: string;
          fields: string[];
          sessionToken: AutocompleteSessionToken;
        },
        callback: ServiceCallback<PlaceResult>,
      ) => void;
    };
    AutocompleteSessionToken: new () => AutocompleteSessionToken;
    PlacesServiceStatus: { OK: string; ZERO_RESULTS: string };
  };
};

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
    onGoogleMapsLoaded?: () => void;
    gm_authFailure?: () => void;
  }
}

const placeDetailFields = [
  "address_components",
  "adr_address",
  "formatted_address",
  "geometry",
  "name",
  "place_id",
  "types",
  "url",
  "utc_offset_minutes",
  "vicinity",
];

const PREDICTIONS_DEBOUNCE_MS = 250;

const googleMapsScriptId = "google-maps-script";

let googleMapsPromise: Promise<GoogleMapsApi> | null = null;
let googleMapsAuthFailed = false;
const authFailureListeners = new Set<() => void>();

const loadGoogleMaps = (apiKey: string) => {
  const loadedMaps = window.google?.maps;
  if (loadedMaps?.places) {
    return Promise.resolve(loadedMaps);
  }
  googleMapsPromise ??= new Promise<GoogleMapsApi>((resolve, reject) => {
    const onError = () => {
      googleMapsPromise = null;
      document.getElementById(googleMapsScriptId)?.remove();
      reject(new Error("Failed to load Google Maps"));
    };
    window.gm_authFailure = () => {
      googleMapsAuthFailed = true;
      authFailureListeners.forEach((listener) => listener());
    };
    window.onGoogleMapsLoaded = () => {
      const maps = window.google?.maps;
      if (maps?.places) {
        resolve(maps);
      } else {
        onError();
      }
    };
    if (document.getElementById(googleMapsScriptId)) {
      return;
    }
    const script = document.createElement("script");
    script.id = googleMapsScriptId;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=places&loading=async&callback=onGoogleMapsLoaded`;
    script.onerror = onError;
    document.head.appendChild(script);
  });
  return googleMapsPromise;
};

type GoogleMapsState =
  | { status: "loading" | "error"; maps: null }
  | { status: "loaded"; maps: GoogleMapsApi };

type GoogleMapsStatus = GoogleMapsState["status"] | "idle" | "unavailable";

const useGoogleMaps = (
  apiKey: string | undefined,
  requested: boolean,
): { status: GoogleMapsStatus; maps: GoogleMapsApi | null } => {
  const [state, setState] = useState<GoogleMapsState>({
    status: "loading",
    maps: null,
  });
  useEffect(() => {
    if (!apiKey || !requested) {
      return;
    }
    let cancelled = false;
    const onError = () => !cancelled && setState({ status: "error", maps: null });
    authFailureListeners.add(onError);
    void loadGoogleMaps(apiKey).then(
      (maps) =>
        googleMapsAuthFailed
          ? onError()
          : !cancelled && setState({ status: "loaded", maps }),
      onError,
    );
    return () => {
      cancelled = true;
      authFailureListeners.delete(onError);
    };
  }, [apiKey, requested]);
  if (!apiKey) {
    return { status: "unavailable", maps: null };
  }
  return requested ? state : { status: "idle", maps: null };
};

type FetchedPredictions = {
  query: string;
  predictions: AutocompletePrediction[];
};

export default function LocationInput({
  value,
  setValue,
  label,
}: Readonly<{
  value: LabelledLocation | null;
  setValue: (value: LabelledLocation | null) => void;
  label?: string;
}>) {
  const inputId = useId();
  const listboxId = useId();
  const statusId = useId();
  const [mapsRequested, setMapsRequested] = useState(false);
  const { status: mapsStatus, maps } = useGoogleMaps(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    mapsRequested,
  );
  const [editingText, setEditingText] = useState<string | null>(null);
  const [fetched, setFetched] = useState<FetchedPredictions | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sessionTokenRef = useRef<AutocompleteSessionToken | null>(null);

  const services = useMemo(
    () =>
      maps && {
        autocomplete: new maps.places.AutocompleteService(),
        places: new maps.places.PlacesService(document.createElement("div")),
      },
    [maps],
  );

  const query = editingText?.trim() ?? "";

  const currentLabel = value?.label;

  useEffect(() => {
    if (!query || query === currentLabel || !maps || !services) {
      return;
    }
    debounceTimeoutRef.current = setTimeout(() => {
      const requestId = ++requestIdRef.current;
      sessionTokenRef.current ??= new maps.places.AutocompleteSessionToken();
      services.autocomplete.getPlacePredictions(
        { input: query, sessionToken: sessionTokenRef.current },
        (predictions, status) => {
          if (requestId !== requestIdRef.current) {
            return;
          }
          const { OK, ZERO_RESULTS } = maps.places.PlacesServiceStatus;
          const succeeded = status === OK || status === ZERO_RESULTS;
          setError(
            succeeded ? null : "Couldn't search for locations, please try again",
          );
          setFetched({ query, predictions: predictions ?? [] });
          setActiveIndex(-1);
        },
      );
    }, PREDICTIONS_DEBOUNCE_MS);
    return () => clearTimeout(debounceTimeoutRef.current);
  }, [query, currentLabel, maps, services]);

  const predictions = query && fetched ? fetched.predictions : [];
  const listOpen = predictions.length > 0;
  const noResults = !!query && fetched?.query === query && !predictions.length;

  const clearPredictions = () => {
    clearTimeout(debounceTimeoutRef.current);
    ++requestIdRef.current;
    setFetched(null);
  };

  const selectPrediction = (prediction: AutocompletePrediction) => {
    if (!maps || !services) {
      return;
    }
    setPendingLabel(prediction.description);
    setEditingText(null);
    clearPredictions();
    setActiveIndex(-1);
    sessionTokenRef.current ??= new maps.places.AutocompleteSessionToken();
    services.places.getDetails(
      {
        placeId: prediction.place_id,
        fields: placeDetailFields,
        sessionToken: sessionTokenRef.current,
      },
      (place, status) => {
        setPendingLabel(null);
        sessionTokenRef.current = null;
        const googleLocation = googleLocationSchema.safeParse(
          JSON.parse(JSON.stringify(place)),
        );
        if (
          status !== maps.places.PlacesServiceStatus.OK ||
          !googleLocation.success
        ) {
          setError("Couldn't fetch that location, please try again");
          return;
        }
        setError(null);
        setValue({
          label: prediction.description,
          googleLocation: googleLocation.data,
        });
      },
    );
  };

  const onChange = (ev: ChangeEvent<HTMLInputElement>) => {
    const text = ev.target.value;
    setEditingText(text);
    if (!text.trim() && value) {
      setValue(null);
    }
  };

  const onKeyDown = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Escape") {
      if (listOpen) {
        ev.preventDefault();
      }
      clearPredictions();
      return;
    }
    if (!listOpen) {
      return;
    }
    switch (ev.key) {
      case "ArrowDown":
        ev.preventDefault();
        setActiveIndex((activeIndex + 1) % predictions.length);
        break;
      case "ArrowUp":
        ev.preventDefault();
        setActiveIndex((activeIndex <= 0 ? predictions.length : activeIndex) - 1);
        break;
      case "Enter":
        if (activeIndex >= 0) {
          ev.preventDefault();
          selectPrediction(predictions[activeIndex]);
        }
        break;
    }
  };

  const onBlur = () => {
    setEditingText(null);
    clearPredictions();
    setActiveIndex(-1);
  };

  const getOptionId = (index: number) => `${listboxId}-${index}`;

  const getStatusMessage = () => {
    switch (mapsStatus) {
      case "idle":
        return null;
      case "unavailable":
        return { text: "Location search is unavailable", isError: false };
      case "loading":
        return { text: "Loading location search...", isError: false };
      case "error":
        return {
          text: "Couldn't load location search, please refresh the page to try again",
          isError: true,
        };
    }
    if (pendingLabel) {
      return { text: "Fetching location...", isError: false };
    }
    if (error) {
      return { text: error, isError: true };
    }
    return noResults ? { text: "No locations found", isError: false } : null;
  };
  const statusMessage = getStatusMessage();

  return (
    <div data-component="LocationInput" className="relative">
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <input
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={listOpen}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? getOptionId(activeIndex) : undefined
        }
        aria-describedby={statusId}
        value={editingText ?? pendingLabel ?? value?.label ?? ""}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => {
          setMapsRequested(true);
          setEditingText(value?.label ?? "");
        }}
        onBlur={onBlur}
        placeholder="Search for a location"
        disabled={mapsStatus === "unavailable" || mapsStatus === "error"}
        className={getInputClassName("underline")}
      />
      <div
        hidden={!listOpen}
        className="
          absolute inset-x-0 top-full z-10 mt-1 rounded border border-gray-200
          bg-surface-floating shadow-md py-1
        "
      >
        <ul id={listboxId} role="listbox" className="max-h-80 overflow-y-auto">
          {predictions.map((prediction, index) => (
            <li
              key={prediction.place_id}
              id={getOptionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(ev) => ev.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectPrediction(prediction)}
              className={clsx(
                "cursor-pointer px-3 py-2 text-gray-1000",
                index === activeIndex && "bg-surface-floating-hover",
              )}
            >
              <Type style="bodySmall">{prediction.description}</Type>
            </li>
          ))}
        </ul>
      </div>
      <div id={statusId} aria-live="polite">
        {statusMessage && (
          <Type
            style="bodySmall"
            className={clsx(
              "mt-1",
              statusMessage.isError ? "text-error" : "text-gray-600",
            )}
          >
            {statusMessage.text}
          </Type>
        )}
      </div>
    </div>
  );
}
