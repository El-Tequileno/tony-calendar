"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { AddressResult, AddressSearchResponse } from "@/lib/addresses";
export function AddressField({
  value,
  city,
  province,
  disabled,
  onChange,
  onSelect,
  kind = "address",
}: {
  value: string;
  city: string;
  province: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSelect: (result: AddressResult) => void;
  kind?: "address" | "venue";
}) {
  const id = useId();
  const requestId = useRef(0);
  const [results, setResults] = useState<AddressResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [provider, setProvider] = useState<AddressSearchResponse["provider"]>();
  const label = kind === "venue" ? "Venue name" : "Address";
  useEffect(() => {
    requestId.current++;
    setSearching(false);
    setResults([]);
    setMessage("");
  }, [value, city, province, kind]);
  return (
    <div className="field full address-field">
      <label htmlFor={id}>{label}</label>
      <div className="address-search-row">
        <input
          id={id}
          autoComplete={kind === "venue" ? "off" : "street-address"}
          value={value}
          disabled={disabled}
          placeholder={
            kind === "venue" ? "Business or venue name" : "Street address"
          }
          onChange={(event) => {
            requestId.current++;
            setSearching(false);
            setResults([]);
            setMessage("");
            onChange(event.target.value);
          }}
        />
        <Button
          variant="secondary"
          aria-label={`Search ${kind === "venue" ? "venues" : "addresses"}`}
          disabled={disabled || searching || value.trim().length < 3}
          onClick={async () => {
            const current = ++requestId.current;
            setSearching(true);
            setResults([]);
            setMessage("");
            try {
              const response = await api<AddressSearchResponse>(
                "/api/addresses",
                {
                  method: "POST",
                  body: JSON.stringify({
                    query: value,
                    city,
                    province,
                    kind,
                  }),
                },
              );
              if (current !== requestId.current) return;
              setResults(response.results);
              setProvider(response.provider);
              if (!response.results.length)
                setMessage(
                  "No matches found. Check the name or address and city, or enter the details manually.",
                );
            } catch (error) {
              if (current === requestId.current)
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "Unable to search. Enter the address manually.",
                );
            } finally {
              if (current === requestId.current) setSearching(false);
            }
          }}
        >
          <Search size={14} />
          {searching ? "Searching…" : "Search"}
        </Button>
      </div>
      <small>
        {kind === "venue"
          ? "Search a Canadian business or venue. Set the city above to narrow results."
          : "Search a Canadian street address, or enter it manually."}
      </small>
      {!!results.length && (
        <ul
          className="address-results"
          aria-label={
            kind === "venue" ? "Matching venues" : "Matching addresses"
          }
        >
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onSelect(result);
                  setResults([]);
                  setMessage(
                    "Location selected. Check the details and complete any missing information.",
                  );
                }}
              >
                <MapPin size={15} />
                <span>{result.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && <small role="status">{message}</small>}
      {provider && (
        <small className="address-attribution">
          {provider === "geoapify" ? (
            <>
              Powered by{" "}
              <a
                href="https://www.geoapify.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Geoapify
              </a>
              {" · "}©{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
              >
                OpenStreetMap contributors
              </a>
            </>
          ) : (
            <>
              Address search:{" "}
              <a
                href="https://natural-resources.canada.ca/maps-tools-publications/satellite-elevation-air-photos/geolocation-service"
                target="_blank"
                rel="noopener noreferrer"
              >
                Natural Resources Canada
              </a>
            </>
          )}
        </small>
      )}
    </div>
  );
}
