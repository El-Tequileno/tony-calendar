"use client";
import { useId, useRef, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { PROVINCES } from "@/lib/constants";
import type { AddressResult } from "@/lib/addresses";
export function AddressField({
  value,
  city,
  province,
  disabled,
  onChange,
  onSelect,
}: {
  value: string;
  city: string;
  province: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSelect: (result: AddressResult) => void;
}) {
  const id = useId();
  const requestId = useRef(0);
  const [results, setResults] = useState<AddressResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="field full address-field">
      <label htmlFor={id}>Address</label>
      <div className="address-search-row">
        <input
          id={id}
          autoComplete="street-address"
          value={value}
          disabled={disabled}
          placeholder="Street address"
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
          disabled={disabled || searching || value.trim().length < 4}
          onClick={async () => {
            const current = ++requestId.current;
            setSearching(true);
            setResults([]);
            setMessage("");
            try {
              const response = await api<{ results: AddressResult[] }>(
                "/api/addresses",
                {
                  method: "POST",
                  body: JSON.stringify({
                    query: [value, city, PROVINCES[province]]
                      .filter(Boolean)
                      .join(", "),
                  }),
                },
              );
              if (current !== requestId.current) return;
              setResults(response.results);
              if (!response.results.length)
                setMessage(
                  "No matching street address found. Add the city to your search or enter the details manually.",
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
        Search a Canadian street address and city, or enter it manually.
      </small>
      {!!results.length && (
        <ul className="address-results" aria-label="Matching addresses">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onSelect(result);
                  setResults([]);
                  setMessage(
                    "Address selected. Check the details and enter the full postal code if needed.",
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
      <small className="address-attribution">
        Address search:{" "}
        <a
          href="https://natural-resources.canada.ca/maps-tools-publications/satellite-elevation-air-photos/geolocation-service"
          target="_blank"
          rel="noopener noreferrer"
        >
          Natural Resources Canada
        </a>
      </small>
    </div>
  );
}
