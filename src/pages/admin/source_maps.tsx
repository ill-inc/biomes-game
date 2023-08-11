import { AdminPage } from "@/client/components/admin/AdminPage";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import styles from "@/client/styles/admin.module.css";
import type {
  ApplySourceMapRequest,
  ApplySourceMapResponse,
} from "@/pages/api/admin/apply_source_map";
import { jsonPost } from "@/shared/util/fetch_helpers";
import React, { useCallback, useState } from "react";

const errorCallstackExample = `Error: /sync/subscribe UNAVAILABLE: WebSocket not connected
    at https://static.biomes.gg/_next/static/chunks/7572-acfe4b18399fa14c.js:1:61747
    at l (https://static.biomes.gg/_next/static/chunks/main-010abbdd1b7536ab.js:1:95143)
    at Generator._invoke (https://static.biomes.gg/_next/static/chunks/main-010abbdd1b7536ab.js:1:94931)
    at P.forEach.e.<computed> [as next] (https://static.biomes.gg/_next/static/chunks/main-010abbdd1b7536ab.js:1:95566)
`;

const singleLineExample = `7572-acfe4b18399fa14c.js:1:202991`;

export const SourceMaps: React.FunctionComponent<{}> = ({}) => {
  const [isApplying, setIsApplying] = useState(false);
  const [inputLines, setInputLines] = useState("");
  const [outputLines, setOutputLines] = useState("");
  const [error, setError] = useError();

  const applySourceMap = useCallback(async () => {
    setIsApplying(true);

    try {
      const response = await jsonPost<
        ApplySourceMapResponse,
        ApplySourceMapRequest
      >("/api/admin/apply_source_map", {
        inputLines,
      });
      setOutputLines(response.outputLines);
    } catch (error: any) {
      setError(error);
    } finally {
      setIsApplying(false);
    }
  }, [inputLines]);

  const [showExamples, setShowExamples] = useState(false);

  return (
    <AdminPage>
      <div className={styles["source-maps-page"]}>
        <h1>Source Map Applier</h1>
        <p>
          Copy + paste a callstack into the input text box, press the button,
          and see the corresponding source mapped output with proper filenames
          and line numbers. The input can be anything, the tool will process
          each line independently and if it matches a pattern, the mapping will
          be applied and returned, otherwise the original line contents will be
          unchanged.
        </p>

        <section>
          <h2>
            Example Inputs{" "}
            <span
              className={styles["expand-button"]}
              onClick={() => setShowExamples((x) => !x)}
            >
              [{showExamples ? "-" : "+"}]
            </span>
          </h2>
          {showExamples ? (
            <div className={styles["example-inputs"]}>
              <h3>Multiline Callstack</h3>
              <textarea
                readOnly
                spellCheck="false"
                value={errorCallstackExample}
              ></textarea>
              <h3>Single line</h3>
              <textarea
                readOnly
                spellCheck="false"
                value={singleLineExample}
              ></textarea>
            </div>
          ) : (
            <></>
          )}
        </section>

        <section className={styles["source-maps-input-section"]}>
          <h2>Input obfuscated callstack:</h2>
          <textarea
            value={inputLines}
            spellCheck="false"
            onChange={(e) => {
              setInputLines(e.target.value);
            }}
          ></textarea>
          <button
            className="button primary"
            onClick={() => {
              setIsApplying(true);
              void applySourceMap();
            }}
            disabled={isApplying}
          >
            Convert
          </button>
        </section>
        <section className={styles["source-maps-output-section"]}>
          <h2>Source mapped output:</h2>
          <MaybeError error={error} />
          <textarea
            className="source-maps-output-text"
            readOnly
            spellCheck="false"
            value={isApplying ? "Loading..." : outputLines}
          ></textarea>
        </section>
      </div>
    </AdminPage>
  );
};

export default SourceMaps;
